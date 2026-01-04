import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import bcrypt from 'bcrypt';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { workspaces, cleanupExpiredWorkspaces, calculateWorkspaceSize, countFiles } from '../services/workspace.service';
import { config } from '../config';
import * as logService from '../services/log.service';
import * as reportService from '../services/report.service';

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

// Obtener información del usuario actual
router.get('/user-info', requireAdmin, async (req: Request, res: Response) => {
    try {
        // Si no hay isAdmin explícito pero tiene acceso, verificar si es admin por email
        const isAdmin = req.session.isAdmin === true || 
                       (req.session.userEmail === config.adminEmail);
        
        res.json({
            isAdmin: isAdmin,
            isModerator: req.session.isModerator || false,
            email: req.session.userEmail || config.adminEmail
        });
    } catch (error) {
        console.error('Error obteniendo info de usuario:', error);
        res.status(500).json({ error: 'Error al obtener información' });
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

// Obtener estadísticas de IPs
router.get('/stats/ips', requireAdmin, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const stats = await logService.getIPStats(limit);
        res.json(stats);
    } catch (error) {
        console.error('Error obteniendo estadísticas de IPs:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// Obtener estadísticas de workspaces
router.get('/stats/workspaces', requireAdmin, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const stats = await logService.getWorkspaceStats(limit);
        res.json(stats);
    } catch (error) {
        console.error('Error obteniendo estadísticas de workspaces:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// Obtener actividad reciente
router.get('/activity/recent', requireAdmin, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const activity = await logService.getRecentActivity(limit);
        res.json(activity);
    } catch (error) {
        console.error('Error obteniendo actividad reciente:', error);
        res.status(500).json({ error: 'Error al obtener actividad' });
    }
});

// Obtener IPs bloqueadas
router.get('/blocked-ips', requireAdmin, async (req: Request, res: Response) => {
    try {
        const blocked = await logService.getBlockedIPs();
        res.json(blocked);
    } catch (error) {
        console.error('Error obteniendo IPs bloqueadas:', error);
        res.status(500).json({ error: 'Error al obtener IPs bloqueadas' });
    }
});

// Bloquear IP
router.post('/block-ip', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { ip, reason, duration } = req.body;
        const adminEmail = req.session?.adminEmail || 'admin';
        
        if (!ip || !reason) {
            return res.status(400).json({ error: 'IP y razón son requeridos' });
        }
        
        await logService.blockIP(ip, reason, adminEmail, duration);
        res.json({ success: true, message: 'IP bloqueada correctamente' });
    } catch (error) {
        console.error('Error bloqueando IP:', error);
        res.status(500).json({ error: 'Error al bloquear IP' });
    }
});

// Desbloquear IP
router.post('/unblock-ip', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { ip } = req.body;
        
        if (!ip) {
            return res.status(400).json({ error: 'IP es requerida' });
        }
        
        await logService.unblockIP(ip);
        res.json({ success: true, message: 'IP desbloqueada correctamente' });
    } catch (error) {
        console.error('Error desbloqueando IP:', error);
        res.status(500).json({ error: 'Error al desbloquear IP' });
    }
});

// ================= RUTAS DE REPORTES =================

// Obtener reporte general
router.get('/reports/summary', requireAdmin, async (req: Request, res: Response) => {
    try {
        const filters = req.query;
        const summary = await reportService.generateSummaryReport(filters);
        res.json(summary);
    } catch (error) {
        console.error('Error generando reporte general:', error);
        res.status(500).json({ error: 'Error al generar reporte' });
    }
});

// Obtener reporte de workspace específico
router.get('/reports/workspace/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const report = await reportService.generateWorkspaceReport(id);
        
        if (!report) {
            return res.status(404).json({ error: 'Workspace no encontrado' });
        }
        
        res.json(report);
    } catch (error) {
        console.error('Error generando reporte de workspace:', error);
        res.status(500).json({ error: 'Error al generar reporte' });
    }
});

// Obtener reporte de seguridad
router.get('/reports/security', requireAdmin, async (req: Request, res: Response) => {
    try {
        const filters = req.query;
        const report = await reportService.generateSecurityReport(filters);
        res.json(report);
    } catch (error) {
        console.error('Error generando reporte de seguridad:', error);
        res.status(500).json({ error: 'Error al generar reporte' });
    }
});

// Generar reporte personalizado
router.post('/reports/generate', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { type, filters } = req.body;
        
        if (!type) {
            return res.status(400).json({ error: 'Tipo de reporte es requerido' });
        }
        
        const report = await reportService.generateCustomReport(type, filters);
        res.json(report);
    } catch (error) {
        console.error('Error generando reporte personalizado:', error);
        res.status(500).json({ error: 'Error al generar reporte' });
    }
});

// Exportar reporte en diferentes formatos
router.post('/reports/export', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { report, format } = req.body;
        
        if (!report || !format) {
            return res.status(400).json({ error: 'Reporte y formato son requeridos' });
        }
        
        let content: string;
        let contentType: string;
        let filename: string;
        
        switch (format) {
            case 'json':
                content = reportService.exportReportToJSON(report);
                contentType = 'application/json';
                filename = `${report.id}.json`;
                break;
            case 'csv':
                content = reportService.exportReportToCSV(report);
                contentType = 'text/csv';
                filename = `${report.id}.csv`;
                break;
            default:
                return res.status(400).json({ error: 'Formato no soportado' });
        }
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);
        res.send(content);
    } catch (error) {
        console.error('Error exportando reporte:', error);
        res.status(500).json({ error: 'Error al exportar reporte' });
    }
});

// Establecer o cambiar contraseña de workspace (admin)
router.post('/workspace/password', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { workspaceId, password } = req.body;
        
        if (!workspaceId || !password) {
            return res.status(400).json({ error: 'Workspace ID y contraseña son requeridos' });
        }
        
        const workspace = workspaces.get(workspaceId);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace no encontrado' });
        }
        
        if (password.length < 4) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        workspace.password = hashedPassword;
        
        // Guardar workspace
        const workspacePath = path.join(DATA_DIR, `${workspaceId}.json`);
        await fs.writeFile(workspacePath, JSON.stringify(workspace, null, 2));
        
        console.log(`🔑 [ADMIN] Contraseña ${workspace.password ? 'cambiada' : 'establecida'} para workspace: ${workspaceId}`);
        
        res.json({ 
            success: true, 
            message: workspace.password ? 'Contraseña cambiada exitosamente' : 'Contraseña establecida exitosamente' 
        });
    } catch (error) {
        console.error('Error al establecer contraseña:', error);
        res.status(500).json({ error: 'Error al establecer contraseña' });
    }
});

// Quitar contraseña de workspace (admin)
router.delete('/workspace/password', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.body;
        
        if (!workspaceId) {
            return res.status(400).json({ error: 'Workspace ID es requerido' });
        }
        
        const workspace = workspaces.get(workspaceId);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace no encontrado' });
        }
        
        if (!workspace.password) {
            return res.status(400).json({ error: 'El workspace no tiene contraseña' });
        }
        
        delete workspace.password;
        
        // Guardar workspace
        const workspacePath = path.join(DATA_DIR, `${workspaceId}.json`);
        await fs.writeFile(workspacePath, JSON.stringify(workspace, null, 2));
        
        console.log(`🔓 [ADMIN] Contraseña eliminada del workspace: ${workspaceId}`);
        
        res.json({ success: true, message: 'Contraseña eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar contraseña:', error);
        res.status(500).json({ error: 'Error al eliminar contraseña' });
    }
});

// ====================
// MODERADORES
// ====================

// Obtener todos los moderadores (solo admin principal)
router.get('/moderators', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const moderatorsPath = path.join(DATA_DIR, 'moderators.json');
        
        let moderators = [];
        try {
            const data = await fs.readFile(moderatorsPath, 'utf-8');
            moderators = JSON.parse(data);
        } catch (error) {
            // Si no existe el archivo, devolver array vacío
            moderators = [];
        }
        
        // No enviar las contraseñas
        const safeModerators = moderators.map((mod: any) => ({
            email: mod.email,
            name: mod.name,
            active: mod.active !== false, // Por defecto activo
            createdAt: mod.createdAt,
            lastLogin: mod.lastLogin
        }));
        
        res.json({ moderators: safeModerators });
    } catch (error) {
        console.error('Error cargando moderadores:', error);
        res.status(500).json({ error: 'Error al cargar moderadores' });
    }
});

// Crear nuevo moderador (solo admin principal)
router.post('/moderators', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { email, name, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        const moderatorsPath = path.join(DATA_DIR, 'moderators.json');
        
        let moderators = [];
        try {
            const data = await fs.readFile(moderatorsPath, 'utf-8');
            moderators = JSON.parse(data);
        } catch (error) {
            moderators = [];
        }
        
        // Verificar si ya existe
        if (moderators.some((mod: any) => mod.email === email)) {
            return res.status(400).json({ error: 'Ya existe un moderador con ese email' });
        }
        
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newModerator = {
            email,
            name: name || '',
            password: hashedPassword,
            active: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        moderators.push(newModerator);
        await fs.writeFile(moderatorsPath, JSON.stringify(moderators, null, 2));
        
        console.log(`👮 [ADMIN] Nuevo moderador creado: ${email}`);
        
        res.json({ success: true, message: 'Moderador creado exitosamente' });
    } catch (error) {
        console.error('Error creando moderador:', error);
        res.status(500).json({ error: 'Error al crear moderador' });
    }
});

// Cambiar estado de moderador (activo/inactivo) - solo admin principal
router.put('/moderators/status', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { email, active } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }
        
        const moderatorsPath = path.join(DATA_DIR, 'moderators.json');
        
        let moderators = [];
        try {
            const data = await fs.readFile(moderatorsPath, 'utf-8');
            moderators = JSON.parse(data);
        } catch (error) {
            return res.status(404).json({ error: 'No se encontraron moderadores' });
        }
        
        const moderatorIndex = moderators.findIndex((mod: any) => mod.email === email);
        if (moderatorIndex === -1) {
            return res.status(404).json({ error: 'Moderador no encontrado' });
        }
        
        moderators[moderatorIndex].active = active;
        await fs.writeFile(moderatorsPath, JSON.stringify(moderators, null, 2));
        
        console.log(`👮 [ADMIN] Moderador ${active ? 'activado' : 'desactivado'}: ${email}`);
        
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// Eliminar moderador (solo admin principal)
router.delete('/moderators', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }
        
        const moderatorsPath = path.join(DATA_DIR, 'moderators.json');
        
        let moderators = [];
        try {
            const data = await fs.readFile(moderatorsPath, 'utf-8');
            moderators = JSON.parse(data);
        } catch (error) {
            return res.status(404).json({ error: 'No se encontraron moderadores' });
        }
        
        const filteredModerators = moderators.filter((mod: any) => mod.email !== email);
        
        if (filteredModerators.length === moderators.length) {
            return res.status(404).json({ error: 'Moderador no encontrado' });
        }
        
        await fs.writeFile(moderatorsPath, JSON.stringify(filteredModerators, null, 2));
        
        console.log(`👮 [ADMIN] Moderador eliminado: ${email}`);
        
        res.json({ success: true, message: 'Moderador eliminado' });
    } catch (error) {
        console.error('Error eliminando moderador:', error);
        res.status(500).json({ error: 'Error al eliminar moderador' });
    }
});

export default router;
