import { Router, Request, Response } from 'express';
import * as ticketService from '../services/ticket.service';
import { requireAdmin } from '../middleware/auth';

const router = Router();

function isAdminSession(req: Request): boolean {
    return Boolean(req.session && (req.session.isAdmin || req.session.isModerator));
}

function canAccessTicket(req: Request, ticket: any): boolean {
    if (isAdminSession(req)) {
        return true;
    }

    return Boolean(req.session?.userId && ticket.userId === req.session.userId);
}

// Crear un nuevo ticket
router.post('/create', async (req: Request, res: Response) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ error: 'Debes iniciar sesión para crear tickets' });
        }

        const { workspaceId, title, description, category, priority } = req.body;

        if (!workspaceId || !title || !description) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const ticket = await ticketService.createTicket({
            workspaceId,
            userId: req.session.userId,
            userEmail: req.session.userEmail,
            userUsername: req.session.userUsername,
            userNickname: req.session.userNickname,
            sessionId: req.sessionID,
            title,
            description,
            category: category || 'other',
            priority: priority || 'medium'
        });

        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Error creando ticket:', error);
        res.status(500).json({ error: 'Error al crear ticket' });
    }
});

// Obtener tickets de un workspace
router.get('/workspace/:workspaceId', async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;

        if (!req.session?.userId && !isAdminSession(req)) {
            return res.status(401).json({ error: 'Debes iniciar sesión para ver tus tickets' });
        }

        const tickets = await ticketService.getWorkspaceTickets(
            workspaceId,
            req.session?.userId,
            isAdminSession(req)
        );

        res.json(tickets);
    } catch (error) {
        console.error('Error obteniendo tickets:', error);
        res.status(500).json({ error: 'Error al obtener tickets' });
    }
});

// Obtener un ticket específico
router.get('/:ticketId', async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const ticket = await ticketService.getTicketById(ticketId);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        if (!canAccessTicket(req, ticket)) {
            return res.status(403).json({ error: 'No tienes acceso a este ticket' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error obteniendo ticket:', error);
        res.status(500).json({ error: 'Error al obtener ticket' });
    }
});

// Marcar respuestas como leídas
router.post('/:ticketId/read', async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const ticket = await ticketService.getTicketById(ticketId);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        if (!canAccessTicket(req, ticket)) {
            return res.status(403).json({ error: 'No tienes acceso a este ticket' });
        }

        const updatedTicket = await ticketService.markTicketResponsesAsRead(
            ticketId,
            isAdminSession(req) ? 'admin' : 'user'
        );

        res.json({ success: true, ticket: updatedTicket });
    } catch (error) {
        console.error('Error marcando ticket como leído:', error);
        res.status(500).json({ error: 'Error al actualizar lectura del ticket' });
    }
});

// Agregar respuesta a un ticket
router.post('/:ticketId/response', async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const existingTicket = await ticketService.getTicketById(ticketId);
        if (!existingTicket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        const adminSession = isAdminSession(req);
        if (!adminSession && !req.session?.userId) {
            return res.status(401).json({ error: 'Debes iniciar sesión para responder tickets' });
        }

        if (!canAccessTicket(req, existingTicket)) {
            return res.status(403).json({ error: 'No tienes acceso a este ticket' });
        }

        const ticket = await ticketService.addTicketResponse(ticketId, {
            userId: adminSession ? (req.session?.userEmail || 'admin') : req.session!.userId!,
            message,
            isAdmin: adminSession,
            authorName: adminSession
                ? (req.session?.userEmail || 'Administrador')
                : (req.session?.userNickname || req.session?.userUsername || 'Usuario')
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        const updatedTicket = await ticketService.markTicketResponsesAsRead(
            ticketId,
            adminSession ? 'admin' : 'user'
        );

        // Emitir evento socket para actualización en tiempo real
        const io = (req as any).io;
        if (io) {
            io.to(ticket.workspaceId).emit('ticket-refresh', { ticketId });
        }

        res.json({ success: true, ticket: updatedTicket || ticket });
    } catch (error) {
        console.error('Error agregando respuesta:', error);
        res.status(500).json({ error: 'Error al agregar respuesta' });
    }
});

// Cambiar estado de un ticket (admin)
router.patch('/:ticketId/status', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Estado requerido' });
        }

        const ticket = await ticketService.updateTicketStatus(
            ticketId,
            status,
            req.session?.adminEmail || 'admin'
        );

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        const io = (req as any).io;
        if (io) {
            io.to(ticket.workspaceId).emit('ticket-refresh', { ticketId });
        }

        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// Obtener todos los tickets (admin)
router.get('/admin/all', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { status, category, priority } = req.query;

        const tickets = await ticketService.getAllTickets({
            status: status as string,
            category: category as string,
            priority: priority as string
        });

        res.json(tickets);
    } catch (error) {
        console.error('Error obteniendo tickets:', error);
        res.status(500).json({ error: 'Error al obtener tickets' });
    }
});

// Eliminar un ticket (admin)
router.delete('/:ticketId', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        await ticketService.deleteTicket(ticketId);

        res.json({ success: true });
    } catch (error) {
        console.error('Error eliminando ticket:', error);
        res.status(500).json({ error: 'Error al eliminar ticket' });
    }
});

export default router;
