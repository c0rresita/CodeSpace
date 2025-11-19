import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { requireAdmin } from '../middleware/auth';
import { workspaces, cleanupExpiredWorkspaces, calculateWorkspaceSize, countFiles } from '../services/workspace.service';
import { config } from '../config';

const router = Router();
const DATA_DIR = path.join(process.cwd(), config.dataDir);

// Obtener todos los workspaces
router.get('/workspaces', requireAdmin, async (req: Request, res: Response) => {
    try {
        const workspaceList = [];
        let totalStorage = 0;
        let totalUsers = 0;
        let activeNow = 0;
        
        for (const [id, workspace] of workspaces.entries()) {
            const size = calculateWorkspaceSize(workspace.structure);
            const fileCount = countFiles(workspace.structure);
            
            totalStorage += size;
            totalUsers += workspace.users || 0;
            if (workspace.users > 0) activeNow++;
            
            workspaceList.push({
                id,
                size,
                files: fileCount,
                users: workspace.users || 0,
                created: workspace.created || new Date(),
                lastAccess: workspace.lastAccess || Date.now(),
                hasPassword: !!workspace.password
            });
        }
        
        res.json({
            workspaces: workspaceList,
            stats: {
                total: workspaceList.length,
                totalUsers,
                totalStorage,
                activeNow
            }
        });
    } catch (error) {
        console.error('Error obteniendo workspaces:', error);
        res.status(500).json({ error: 'Error al obtener workspaces' });
    }
});

// Eliminar workspace
router.delete('/workspaces/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        workspaces.delete(id);
        
        const filePath = path.join(DATA_DIR, `${id}.json`);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // Archivo no existe
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error eliminando workspace:', error);
        res.status(500).json({ error: 'Error al eliminar workspace' });
    }
});

// Limpieza manual
router.post('/cleanup', requireAdmin, async (req: Request, res: Response) => {
    try {
        await cleanupExpiredWorkspaces();
        res.json({ success: true });
    } catch (error) {
        console.error('Error en limpieza:', error);
        res.status(500).json({ error: 'Error al limpiar workspaces' });
    }
});

// Obtener usuarios activos
router.get('/active-users', requireAdmin, async (req: Request, res: Response) => {
    try {
        const activeWorkspaces = [];
        let totalUniqueUsers = 0;
        let totalSessions = 0;

        for (const [id, workspace] of workspaces.entries()) {
            if (workspace.uniqueUsers && workspace.uniqueUsers.size > 0) {
                const uniqueUsers = workspace.uniqueUsers.size;
                // @ts-ignore
                const sessions = workspace.sessionSockets ? 
                    // @ts-ignore
                    Array.from(workspace.sessionSockets.values()).reduce((acc, set) => acc + set.size, 0) : 0;

                activeWorkspaces.push({
                    id,
                    uniqueUsers,
                    totalSessions: sessions
                });

                totalUniqueUsers += uniqueUsers;
                // @ts-ignore
                totalSessions += sessions;
            }
        }

        res.json({
            activeWorkspaces,
            totalUniqueUsers,
            totalSessions
        });
    } catch (error) {
        console.error('Error obteniendo usuarios activos:', error);
        res.status(500).json({ error: 'Error al obtener usuarios activos' });
    }
});

export default router;
