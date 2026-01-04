import AccessLog from '../models/AccessLog';
import BlockedIP from '../models/BlockedIP';
import { isDatabaseConnected } from '../database/connection';

// Registrar acceso
export async function logAccess(data: {
    ip: string;
    workspaceId: string;
    userId: string;
    sessionId: string;
    action: string;
    userAgent?: string;
}): Promise<void> {
    if (!isDatabaseConnected()) return;
    
    try {
        // Verificar si la IP está bloqueada
        const blocked = await isIPBlocked(data.ip);
        
        await AccessLog.create({
            ...data,
            blocked,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error registrando acceso:', error);
    }
}

// Verificar si una IP está bloqueada
export async function isIPBlocked(ip: string): Promise<boolean> {
    if (!isDatabaseConnected()) return false;
    
    try {
        const blocked = await BlockedIP.findOne({
            ip,
            $or: [
                { permanent: true },
                { expiresAt: { $gt: new Date() } }
            ]
        });
        
        return !!blocked;
    } catch (error) {
        console.error('Error verificando IP bloqueada:', error);
        return false;
    }
}

// Bloquear IP
export async function blockIP(ip: string, reason: string, blockedBy: string, duration?: number): Promise<void> {
    if (!isDatabaseConnected()) {
        console.warn('MongoDB no conectado. No se puede bloquear IP.');
        return;
    }
    
    try {
        const expiresAt = duration ? new Date(Date.now() + duration * 1000) : undefined;
        
        await BlockedIP.findOneAndUpdate(
            { ip },
            {
                ip,
                reason,
                blockedBy,
                blockedAt: new Date(),
                expiresAt,
                permanent: !duration,
                $inc: { attempts: 1 }
            },
            { upsert: true }
        );
        
        console.log(`IP bloqueada: ${ip} - Razón: ${reason}`);
    } catch (error) {
        console.error('Error bloqueando IP:', error);
    }
}

// Desbloquear IP
export async function unblockIP(ip: string): Promise<void> {
    if (!isDatabaseConnected()) {
        console.warn('MongoDB no conectado. No se puede desbloquear IP.');
        return;
    }
    
    try {
        await BlockedIP.deleteOne({ ip });
        console.log(`IP desbloqueada: ${ip}`);
    } catch (error) {
        console.error('Error desbloqueando IP:', error);
    }
}

// Obtener estadísticas de IPs
export async function getIPStats(limit: number = 10) {
    if (!isDatabaseConnected()) return [];
    
    try {
        const stats = await AccessLog.aggregate([
            {
                $group: {
                    _id: '$ip',
                    totalAccess: { $sum: 1 },
                    workspaces: { $addToSet: '$workspaceId' },
                    lastAccess: { $max: '$timestamp' },
                    blockedAttempts: {
                        $sum: { $cond: ['$blocked', 1, 0] }
                    }
                }
            },
            {
                $project: {
                    ip: '$_id',
                    totalAccess: 1,
                    workspacesCount: { $size: '$workspaces' },
                    lastAccess: 1,
                    blockedAttempts: 1
                }
            },
            { $sort: { totalAccess: -1 } },
            { $limit: limit }
        ]);
        
        return stats;
    } catch (error) {
        console.error('Error obteniendo estadísticas de IP:', error);
        return [];
    }
}

// Obtener estadísticas de workspaces
export async function getWorkspaceStats(limit: number = 10) {
    if (!isDatabaseConnected()) return [];
    
    try {
        const stats = await AccessLog.aggregate([
            {
                $group: {
                    _id: '$workspaceId',
                    totalAccess: { $sum: 1 },
                    uniqueIPs: { $addToSet: '$ip' },
                    uniqueUsers: { $addToSet: '$userId' },
                    lastAccess: { $max: '$timestamp' }
                }
            },
            {
                $project: {
                    workspaceId: '$_id',
                    totalAccess: 1,
                    uniqueIPsCount: { $size: '$uniqueIPs' },
                    uniqueUsersCount: { $size: '$uniqueUsers' },
                    lastAccess: 1
                }
            },
            { $sort: { totalAccess: -1 } },
            { $limit: limit }
        ]);
        
        return stats;
    } catch (error) {
        console.error('Error obteniendo estadísticas de workspace:', error);
        return [];
    }
}

// Obtener actividad reciente
export async function getRecentActivity(limit: number = 50) {
    if (!isDatabaseConnected()) return [];
    
    try {
        const activity = await AccessLog.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .select('ip workspaceId action timestamp blocked userAgent')
            .lean();
        
        return activity;
    } catch (error) {
        console.error('Error obteniendo actividad reciente:', error);
        return [];
    }
}

// Obtener IPs bloqueadas
export async function getBlockedIPs() {
    if (!isDatabaseConnected()) return [];
    
    try {
        const blocked = await BlockedIP.find()
            .sort({ blockedAt: -1 })
            .lean();
        
        return blocked;
    } catch (error) {
        console.error('Error obteniendo IPs bloqueadas:', error);
        return [];
    }
}

// Limpiar logs antiguos (más de 90 días)
export async function cleanOldLogs(): Promise<void> {
    if (!isDatabaseConnected()) return;
    
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const result = await AccessLog.deleteMany({ timestamp: { $lt: ninetyDaysAgo } });
        
        if (result.deletedCount > 0) {
            console.log(`Logs antiguos eliminados: ${result.deletedCount}`);
        }
    } catch (error) {
        console.error('Error limpiando logs antiguos:', error);
    }
}

// Obtener todos los logs
export async function getAllLogs() {
    if (!isDatabaseConnected()) return [];
    
    try {
        const logs = await AccessLog.find()
            .sort({ timestamp: -1 })
            .lean();
        
        return logs;
    } catch (error) {
        console.error('Error obteniendo todos los logs:', error);
        return [];
    }
}

// Obtener logs de un workspace específico
export async function getWorkspaceLogs(workspaceId: string) {
    if (!isDatabaseConnected()) return [];
    
    try {
        const logs = await AccessLog.find({ workspaceId })
            .sort({ timestamp: -1 })
            .lean();
        
        return logs;
    } catch (error) {
        console.error('Error obteniendo logs del workspace:', error);
        return [];
    }
}
