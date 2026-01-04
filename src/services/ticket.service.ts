import { promises as fs } from 'fs';
import path from 'path';
import { isDatabaseConnected } from '../database/connection';

const TICKETS_DIR = path.join(process.cwd(), 'tickets-data');

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
        return ticket.toObject();
    } else {
        // Usar JSON
        await ensureTicketsDir();
        const ticketId = generateTicketId();
        const ticket = {
            _id: ticketId,
            ...data,
            status: 'open',
            responses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const filePath = path.join(TICKETS_DIR, `${ticketId}.json`);
        await fs.writeFile(filePath, JSON.stringify(ticket, null, 2));
        return ticket;
    }
}

// Obtener tickets de un workspace
export async function getWorkspaceTickets(workspaceId: string, userId?: string, sessionId?: string): Promise<any[]> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        const filter: any = { workspaceId };
        
        if (userId && sessionId) {
            filter.$or = [
                { userId, sessionId },
                { status: 'resolved' }
            ];
        }
        
        return await Ticket.find(filter).sort({ createdAt: -1 }).lean();
    } else {
        // Usar JSON
        await ensureTicketsDir();
        const files = await fs.readdir(TICKETS_DIR);
        const tickets = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await fs.readFile(path.join(TICKETS_DIR, file), 'utf-8');
                const ticket = JSON.parse(content);
                
                if (ticket.workspaceId === workspaceId) {
                    // Filtrar por usuario si se especifica
                    if (!userId || !sessionId) {
                        tickets.push(ticket);
                    } else {
                        if ((ticket.userId === userId && ticket.sessionId === sessionId) || ticket.status === 'resolved') {
                            tickets.push(ticket);
                        }
                    }
                }
            }
        }
        
        return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
}

// Obtener un ticket específico
export async function getTicketById(ticketId: string): Promise<any | null> {
    if (isDatabaseConnected()) {
        // Usar MongoDB
        const Ticket = (await import('../models/Ticket')).default;
        return await Ticket.findById(ticketId).lean();
    } else {
        // Usar JSON
        try {
            const filePath = path.join(TICKETS_DIR, `${ticketId}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }
}

// Agregar respuesta a un ticket
export async function addTicketResponse(ticketId: string, data: {
    userId: string;
    message: string;
    isAdmin: boolean;
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
            timestamp: new Date()
        });
        
        await ticket.save();
        return ticket.toObject();
    } else {
        // Usar JSON
        const ticket = await getTicketById(ticketId);
        if (!ticket) return null;
        
        ticket.responses.push({
            userId: data.userId,
            message: data.message,
            isAdmin: data.isAdmin,
            timestamp: new Date().toISOString()
        });
        
        ticket.updatedAt = new Date().toISOString();
        
        const filePath = path.join(TICKETS_DIR, `${ticketId}.json`);
        await fs.writeFile(filePath, JSON.stringify(ticket, null, 2));
        return ticket;
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
        return ticket.toObject();
    } else {
        // Usar JSON
        const ticket = await getTicketById(ticketId);
        if (!ticket) return null;
        
        ticket.status = status;
        
        if (status === 'resolved' || status === 'closed') {
            ticket.resolvedAt = new Date().toISOString();
            if (resolvedBy) ticket.resolvedBy = resolvedBy;
        }
        
        ticket.updatedAt = new Date().toISOString();
        
        const filePath = path.join(TICKETS_DIR, `${ticketId}.json`);
        await fs.writeFile(filePath, JSON.stringify(ticket, null, 2));
        return ticket;
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
        
        return await Ticket.find(filter).sort({ createdAt: -1 }).lean();
    } else {
        // Usar JSON
        await ensureTicketsDir();
        const files = await fs.readdir(TICKETS_DIR);
        const tickets = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await fs.readFile(path.join(TICKETS_DIR, file), 'utf-8');
                const ticket = JSON.parse(content);
                
                // Aplicar filtros
                if (filters?.status && ticket.status !== filters.status) continue;
                if (filters?.category && ticket.category !== filters.category) continue;
                if (filters?.priority && ticket.priority !== filters.priority) continue;
                
                tickets.push(ticket);
            }
        }
        
        return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
