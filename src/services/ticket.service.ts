import { promises as fs } from 'fs';
import path from 'path';
import { isDatabaseConnected } from '../database/connection';

const TICKETS_DIR = path.join(process.cwd(), 'tickets-data');

type TicketResponseRecord = {
    userId: string;
    message: string;
    isAdmin: boolean;
    authorName?: string;
    timestamp: string | Date;
    readByUser?: boolean;
    readByAdmin?: boolean;
};

type TicketRecord = {
    _id: string;
    workspaceId: string;
    userId: string;
    userEmail?: string;
    userUsername?: string;
    userNickname?: string;
    sessionId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    responses: TicketResponseRecord[];
    createdAt: string | Date;
    updatedAt: string | Date;
    resolvedAt?: string | Date;
    resolvedBy?: string;
    unreadUserCount?: number;
    unreadAdminCount?: number;
};

function normalizeResponse(response: any): TicketResponseRecord {
    const isAdmin = response?.isAdmin === true;
    return {
        userId: response?.userId || '',
        message: response?.message || '',
        isAdmin,
        authorName: response?.authorName || (isAdmin ? 'Administrador' : 'Usuario'),
        timestamp: response?.timestamp || new Date().toISOString(),
        readByUser: typeof response?.readByUser === 'boolean' ? response.readByUser : !isAdmin,
        readByAdmin: typeof response?.readByAdmin === 'boolean' ? response.readByAdmin : isAdmin
    };
}

function normalizeTicket(ticket: any): TicketRecord {
    const responses = Array.isArray(ticket?.responses)
        ? ticket.responses.map(normalizeResponse)
        : [];

    return {
        ...ticket,
        responses,
        userNickname: ticket?.userNickname || ticket?.userUsername || ticket?.userEmail,
        unreadUserCount: responses.filter((response) => response.isAdmin && !response.readByUser).length,
        unreadAdminCount: responses.filter((response) => !response.isAdmin && !response.readByAdmin).length
    };
}

async function readJsonTicket(ticketId: string): Promise<TicketRecord | null> {
    try {
        const filePath = path.join(TICKETS_DIR, `${ticketId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return normalizeTicket(JSON.parse(content));
    } catch {
        return null;
    }
}

async function writeJsonTicket(ticketId: string, ticket: TicketRecord): Promise<void> {
    const filePath = path.join(TICKETS_DIR, `${ticketId}.json`);
    await fs.writeFile(filePath, JSON.stringify(ticket, null, 2));
}

async function readAllJsonTickets(): Promise<TicketRecord[]> {
    await ensureTicketsDir();
    const files = await fs.readdir(TICKETS_DIR);
    const tickets = await Promise.all(
        files
            .filter((file) => file.endsWith('.json'))
            .map(async (file) => {
                const content = await fs.readFile(path.join(TICKETS_DIR, file), 'utf-8');
                return normalizeTicket(JSON.parse(content));
            })
    );

    return tickets.sort(
        (first, second) =>
            new Date(second.updatedAt || second.createdAt).getTime() -
            new Date(first.updatedAt || first.createdAt).getTime()
    );
}

// Asegurar que existe el directorio de tickets
export async function ensureTicketsDir(): Promise<void> {
    try {
        await fs.access(TICKETS_DIR);
    } catch {
        await fs.mkdir(TICKETS_DIR, { recursive: true });
        console.log('📁 Directorio tickets-data creado');
    }
}

// Generar ID único para tickets en JSON
function generateTicketId(): string {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Crear ticket
export async function createTicket(data: {
    workspaceId: string;
    userId: string;
    userEmail?: string;
    userUsername?: string;
    userNickname?: string;
    sessionId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
}): Promise<any> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        const ticket = await Ticket.create({
            ...data,
            status: 'open',
            responses: []
        });
        return normalizeTicket(ticket.toObject());
    } else {
        // Usar JSON
        await ensureTicketsDir();
        const ticketId = generateTicketId();
        const ticket: TicketRecord = normalizeTicket({
            _id: ticketId,
            ...data,
            status: 'open',
            responses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        await writeJsonTicket(ticketId, ticket);
        return ticket;
    }
}

// Obtener tickets de un workspace
export async function getWorkspaceTickets(workspaceId: string, userId?: string, includeAll = false): Promise<any[]> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        const filter: any = { workspaceId };
        
        if (!includeAll && userId) {
            filter.userId = userId;
        }
        
        const tickets = await Ticket.find(filter).sort({ updatedAt: -1, createdAt: -1 }).lean();
        return tickets.map(normalizeTicket);
    } else {
        // Usar JSON
        const tickets = await readAllJsonTickets();
        return tickets.filter((ticket) => {
            if (ticket.workspaceId !== workspaceId) return false;
            if (includeAll) return true;
            return userId ? ticket.userId === userId : false;
        });
    }
}

export async function getUserTickets(userId: string): Promise<TicketRecord[]> {
    if (isDatabaseConnected()) {
        const Ticket = (await import('../models/Ticket')).default;
        const tickets = await Ticket.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
        return tickets.map(normalizeTicket);
    }

    const tickets = await readAllJsonTickets();
    return tickets.filter((ticket) => ticket.userId === userId);
}

export async function getUserNotificationInbox(userId: string): Promise<{
    unreadCount: number;
    notifications: Array<{
        id: string;
        ticketId: string;
        workspaceId: string;
        title: string;
        message: string;
        createdAt: string | Date;
        status: string;
        priority: string;
        authorName: string;
    }>;
    tickets: Array<{
        _id: string;
        workspaceId: string;
        title: string;
        status: string;
        category: string;
        priority: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        unreadCount: number;
        lastMessage: null | {
            message: string;
            isAdmin: boolean;
            timestamp: string | Date;
            authorName?: string;
        };
    }>;
}> {
    const tickets = await getUserTickets(userId);
    const notifications = tickets
        .flatMap((ticket) =>
            ticket.responses
                .filter((response) => response.isAdmin && !response.readByUser)
                .map((response, index) => ({
                    id: `${ticket._id}_${new Date(response.timestamp).getTime()}_${index}`,
                    ticketId: ticket._id,
                    workspaceId: ticket.workspaceId,
                    title: ticket.title,
                    message: response.message,
                    createdAt: response.timestamp,
                    status: ticket.status,
                    priority: ticket.priority,
                    authorName: response.authorName || 'Administrador'
                }))
        )
        .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());

    return {
        unreadCount: notifications.length,
        notifications,
        tickets: tickets.map((ticket) => ({
            _id: ticket._id,
            workspaceId: ticket.workspaceId,
            title: ticket.title,
            status: ticket.status,
            category: ticket.category,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            unreadCount: ticket.unreadUserCount || 0,
            lastMessage: ticket.responses.length ? ticket.responses[ticket.responses.length - 1] : null
        }))
    };
}

// Obtener un ticket específico
export async function getTicketById(ticketId: string): Promise<any | null> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        const ticket = await Ticket.findById(ticketId).lean();
        return ticket ? normalizeTicket(ticket) : null;
    } else {
        // Usar JSON
        return readJsonTicket(ticketId);
    }
}

export async function markTicketResponsesAsRead(ticketId: string, reader: 'user' | 'admin'): Promise<any | null> {
    if (isDatabaseConnected()) {
        const Ticket = (await import('../models/Ticket')).default;
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return null;

        let changed = false;
        ticket.responses = ticket.responses.map((response: any) => {
            const nextResponse = {
                ...response.toObject?.() || response,
                ...normalizeResponse(response)
            } as any;

            if (reader === 'user' && nextResponse.isAdmin && !nextResponse.readByUser) {
                nextResponse.readByUser = true;
                changed = true;
            }
            if (reader === 'admin' && !nextResponse.isAdmin && !nextResponse.readByAdmin) {
                nextResponse.readByAdmin = true;
                changed = true;
            }

            return nextResponse;
        }) as any;

        if (changed) {
            await ticket.save();
        }

        return normalizeTicket(ticket.toObject());
    }

    const ticket = await readJsonTicket(ticketId);
    if (!ticket) return null;

    let changed = false;
    ticket.responses = ticket.responses.map((response) => {
        const nextResponse = normalizeResponse(response);
        if (reader === 'user' && nextResponse.isAdmin && !nextResponse.readByUser) {
            nextResponse.readByUser = true;
            changed = true;
        }
        if (reader === 'admin' && !nextResponse.isAdmin && !nextResponse.readByAdmin) {
            nextResponse.readByAdmin = true;
            changed = true;
        }
        return nextResponse;
    });

    if (changed) {
        ticket.updatedAt = new Date().toISOString();
        await writeJsonTicket(ticketId, ticket);
    }

    return normalizeTicket(ticket);
}

// Agregar respuesta a un ticket
export async function addTicketResponse(ticketId: string, data: {
    userId: string;
    message: string;
    isAdmin: boolean;
    authorName?: string;
}): Promise<any | null> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return null;
        
        ticket.responses.push({
            userId: data.userId,
            message: data.message,
            isAdmin: data.isAdmin,
            authorName: data.authorName || (data.isAdmin ? 'Administrador' : 'Usuario'),
            timestamp: new Date(),
            readByUser: !data.isAdmin,
            readByAdmin: data.isAdmin
        });
        
        await ticket.save();
        return normalizeTicket(ticket.toObject());
    } else {
        // Usar JSON
        const ticket = await readJsonTicket(ticketId);
        if (!ticket) return null;
        
        ticket.responses.push({
            userId: data.userId,
            message: data.message,
            isAdmin: data.isAdmin,
            authorName: data.authorName || (data.isAdmin ? 'Administrador' : 'Usuario'),
            timestamp: new Date().toISOString(),
            readByUser: !data.isAdmin,
            readByAdmin: data.isAdmin
        });
        
        ticket.updatedAt = new Date().toISOString();
        
        await writeJsonTicket(ticketId, ticket);
        return normalizeTicket(ticket);
    }
}

// Cambiar estado de un ticket
export async function updateTicketStatus(ticketId: string, status: string, resolvedBy?: string): Promise<any | null> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return null;
        
        ticket.status = status as any;
        
        if (status === 'resolved' || status === 'closed') {
            ticket.resolvedAt = new Date();
            if (resolvedBy) ticket.resolvedBy = resolvedBy;
        }
        
        await ticket.save();
        return normalizeTicket(ticket.toObject());
    } else {
        // Usar JSON
        const ticket = await readJsonTicket(ticketId);
        if (!ticket) return null;
        
        ticket.status = status;
        
        if (status === 'resolved' || status === 'closed') {
            ticket.resolvedAt = new Date().toISOString();
            if (resolvedBy) ticket.resolvedBy = resolvedBy;
        }
        
        ticket.updatedAt = new Date().toISOString();
        
        await writeJsonTicket(ticketId, ticket);
        return normalizeTicket(ticket);
    }
}

// Obtener todos los tickets (admin)
export async function getAllTickets(filters?: {
    status?: string;
    category?: string;
    priority?: string;
}): Promise<any[]> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        const filter: any = {};
        if (filters?.status) filter.status = filters.status;
        if (filters?.category) filter.category = filters.category;
        if (filters?.priority) filter.priority = filters.priority;
        
        const tickets = await Ticket.find(filter).sort({ updatedAt: -1, createdAt: -1 }).lean();
        return tickets.map(normalizeTicket);
    } else {
        // Usar JSON
        const tickets = await readAllJsonTickets();
        return tickets.filter((ticket) => {
            if (filters?.status && ticket.status !== filters.status) return false;
            if (filters?.category && ticket.category !== filters.category) return false;
            if (filters?.priority && ticket.priority !== filters.priority) return false;
            return true;
        });
    }
}

// Eliminar ticket
export async function deleteTicket(ticketId: string): Promise<boolean> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        await Ticket.findByIdAndDelete(ticketId);
        return true;
    } else {
        // Usar JSON
        try {
            const filePath = path.join(TICKETS_DIR, `${ticketId}.json`);
            await fs.unlink(filePath);
            return true;
        } catch {
            return false;
        }
    }
}
