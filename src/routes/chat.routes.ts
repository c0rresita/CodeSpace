import { Router, Request, Response } from 'express';
import { chatService } from '../services/chat.service';

const router = Router();

// Obtener historial de chat de un workspace
router.get('/:workspaceId/messages', async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        
        const messages = await chatService.getWorkspaceMessages(workspaceId, limit);
        
        res.json({
            success: true,
            messages,
            count: messages.length
        });
    } catch (error) {
        console.error('Error obteniendo mensajes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener mensajes' 
        });
    }
});

// Obtener estadísticas de chat de un workspace
router.get('/:workspaceId/stats', async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        
        const stats = await chatService.getChatStats(workspaceId);
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener estadísticas' 
        });
    }
});

// Eliminar mensajes de un workspace (solo admin)
router.delete('/:workspaceId/messages', async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        
        const deleted = await chatService.deleteWorkspaceMessages(workspaceId);
        
        res.json({
            success: deleted,
            message: deleted ? 'Mensajes eliminados correctamente' : 'Error al eliminar mensajes'
        });
    } catch (error) {
        console.error('Error eliminando mensajes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al eliminar mensajes' 
        });
    }
});

export default router;
