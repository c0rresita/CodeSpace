import { Router, Request, Response } from 'express';
import * as ticketService from '../services/ticket.service';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Crear un nuevo ticket
router.post('/create', async (req: Request, res: Response) => {
    try {
        const { workspaceId, userId, sessionId, title, description, category, priority } = req.body;

        if (!workspaceId || !userId || !sessionId || !title || !description) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const ticket = await ticketService.createTicket({
            workspaceId,
            userId,
            sessionId,
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
        const { userId, sessionId } = req.query;

        const tickets = await ticketService.getWorkspaceTickets(
            workspaceId,
            userId as string,
            sessionId as string
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

        res.json(ticket);
    } catch (error) {
        console.error('Error obteniendo ticket:', error);
        res.status(500).json({ error: 'Error al obtener ticket' });
    }
});

// Agregar respuesta a un ticket
router.post('/:ticketId/response', async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { userId, message, isAdmin } = req.body;

        if (!userId || !message) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const ticket = await ticketService.addTicketResponse(ticketId, {
            userId,
            message,
            isAdmin: isAdmin || false
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        // Emitir evento socket para actualización en tiempo real
        const io = (req as any).io;
        if (io) {
            io.to(ticket.workspaceId).emit('ticket-refresh', { ticketId });
        }

        res.json({ success: true, ticket });
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
