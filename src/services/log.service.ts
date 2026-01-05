import AccessLog from '../models/AccessLog';
import BlockedIP from '../models/BlockedIP';
import { isDatabaseConnected } from '../database/connection';
import { promises as fs } from 'fs';
import path from 'path';

// Archivo JSON para guardar IPs bloqueadas cuando no hay MongoDB
const BLOCKED_IPS_FILE = path.join(process.cwd(), 'workspaces-data', 'blocked-ips.json');

// Funciones auxiliares para gestionar IPs bloqueadas en JSON
async function loadBlockedIPsFromFile(): Promise<any[]> {
    try {
        await fs.mkdir(path.dirname(BLOCKED_IPS_FILE), { recursive: true });
        const data = await fs.readFile(BLOCKED_IPS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, devolver array vacío
        return [];
    }
}

async function saveBlockedIPsToFile(blockedIPs: any[]): Promise<void> {
    try {
        await fs.mkdir(path.dirname(BLOCKED_IPS_FILE), { recursive: true });
        await fs.writeFile(BLOCKED_IPS_FILE, JSON.stringify(blockedIPs, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error guardando IPs bloqueadas:', error);
    }
}

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
    if (isDatabaseConnected()) {
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
    } else {
        // Usar archivo JSON como fallback
        try {
            const blockedIPs = await loadBlockedIPsFromFile();
            const now = new Date();
            
            const blocked = blockedIPs.find(item => 
                item.ip === ip && 
                (item.permanent || (item.expiresAt && new Date(item.expiresAt) > now))
            );
            
            return !!blocked;
        } catch (error) {
            console.error('Error verificando IP bloqueada desde archivo:', error);
            return false;
        }
    }
}

// Bloquear IP
export async function blockIP(ip: string, reason: string, blockedBy: string, duration?: number): Promise<void> {
    if (isDatabaseConnected()) {
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
    } else {
        // Usar archivo JSON como fallback
        try {
            const blockedIPs = await loadBlockedIPsFromFile();
            const expiresAt = duration ? new Date(Date.now() + duration * 1000) : undefined;
            
            // Buscar si ya existe
            const existingIndex = blockedIPs.findIndex(item => item.ip === ip);
            
            const blockedIPData = {
                ip,
                reason,
                blockedBy,
                blockedAt: new Date().toISOString(),
                expiresAt: expiresAt?.toISOString(),
                permanent: !duration,
                attempts: existingIndex >= 0 ? blockedIPs[existingIndex].attempts + 1 : 1
            };
            
            if (existingIndex >= 0) {
                blockedIPs[existingIndex] = blockedIPData;
            } else {
                blockedIPs.push(blockedIPData);
            }
            
            await saveBlockedIPsToFile(blockedIPs);
            console.log(`IP bloqueada (JSON): ${ip} - Razón: ${reason}`);
        } catch (error) {
            console.error('Error bloqueando IP en archivo:', error);
        }
    }
}

// Desbloquear IP
export async function unblockIP(ip: string): Promise<void> {
    if (isDatabaseConnected()) {
        try {
            await BlockedIP.deleteOne({ ip });
            console.log(`IP desbloqueada: ${ip}`);
        } catch (error) {
            console.error('Error desbloqueando IP:', error);
        }
    } else {
        // Usar archivo JSON como fallback
        try {
            const blockedIPs = await loadBlockedIPsFromFile();
            const filteredIPs = blockedIPs.filter(item => item.ip !== ip);
            await saveBlockedIPsToFile(filteredIPs);
            console.log(`IP desbloqueada (JSON): ${ip}`);
        } catch (error) {
            console.error('Error desbloqueando IP en archivo:', error);
        }
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
    if (isDatabaseConnected()) {
        try {
            const blocked = await BlockedIP.find()
                .sort({ blockedAt: -1 })
                .lean();
            
            return blocked;
        } catch (error) {
            console.error('Error obteniendo IPs bloqueadas:', error);
            return [];
        }
    } else {
        // Usar archivo JSON como fallback
        try {
            const blockedIPs = await loadBlockedIPsFromFile();
            // Filtrar las que han expirado
            const now = new Date();
            const activeBlocked = blockedIPs.filter(item => 
                item.permanent || (item.expiresAt && new Date(item.expiresAt) > now)
            );
            // Ordenar por fecha de bloqueo (más recientes primero)
            return activeBlocked.sort((a, b) => 
                new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime()
            );
        } catch (error) {
            console.error('Error obteniendo IPs bloqueadas desde archivo:', error);
            return [];
        }
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

// Obtener accesos por hora (últimas 24 horas)
export async function getAccessByHour() {
    if (!isDatabaseConnected()) {
        // Inicializar con 0s si no hay base de datos
        const accessByHour: { [hour: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            accessByHour[i.toString().padStart(2, '0')] = 0;
        }
        return accessByHour;
    }
    
    try {
        const logs = await AccessLog.find({
            action: { $in: ['join', 'password_attempt'] } // Solo contar conexiones
        })
        .sort({ timestamp: -1 })
        .lean();
        
        // Inicializar todas las horas en 0
        const accessByHour: { [hour: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            accessByHour[i.toString().padStart(2, '0')] = 0;
        }
        
        // Contar accesos por hora
        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours().toString().padStart(2, '0');
            accessByHour[hour]++;
        });
        
        return accessByHour;
    } catch (error) {
        console.error('Error obteniendo accesos por hora:', error);
        const accessByHour: { [hour: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            accessByHour[i.toString().padStart(2, '0')] = 0;
        }
        return accessByHour;
    }
}
