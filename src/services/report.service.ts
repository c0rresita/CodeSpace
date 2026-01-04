import { Report, ReportSummary, WorkspaceReport, SecurityReport } from '../models/Report';
import * as logService from './log.service';
import { workspaces, calculateWorkspaceSize, countFiles } from './workspace.service';

export function generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function generateSummaryReport(filters?: any): Promise<ReportSummary> {
    const logs = await logService.getAllLogs();
    const blockedIPs = await logService.getBlockedIPs();
    
    let totalStorage = 0;
    let totalUsers = 0;
    const workspaceAccesses: { [id: string]: number } = {};
    const workspaceUsers: { [id: string]: number } = {};
    
    // Calcular estadísticas de workspaces
    for (const [id, workspace] of workspaces.entries()) {
        totalStorage += calculateWorkspaceSize(workspace.structure);
        totalUsers += workspace.users || 0;
        
        // Contar accesos por workspace desde los logs
        const workspaceLogs = logs.filter(log => log.workspaceId === id);
        workspaceAccesses[id] = workspaceLogs.length;
        workspaceUsers[id] = workspace.users || 0;
    }
    
    // Top workspaces por accesos
    const topWorkspaces = Object.entries(workspaceAccesses)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id, accesses]) => ({
            id,
            accesses,
            users: workspaceUsers[id] || 0
        }));
    
    // Accesos por hora
    const accessByHour: { [hour: string]: number } = {};
    for (let i = 0; i < 24; i++) {
        accessByHour[i.toString().padStart(2, '0')] = 0;
    }
    
    logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours().toString().padStart(2, '0');
        accessByHour[hour]++;
    });
    
    // Accesos por día (últimos 7 días)
    const accessByDay: { [day: string]: number } = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        accessByDay[key] = 0;
    }
    
    logs.forEach(log => {
        const day = new Date(log.timestamp).toISOString().split('T')[0];
        if (accessByDay.hasOwnProperty(day)) {
            accessByDay[day]++;
        }
    });
    
    return {
        totalWorkspaces: workspaces.size,
        totalAccesses: logs.length,
        totalBlockedIPs: blockedIPs.length,
        totalStorage,
        averageUsersPerWorkspace: workspaces.size > 0 ? totalUsers / workspaces.size : 0,
        topWorkspaces,
        accessByHour,
        accessByDay
    };
}

export async function generateWorkspaceReport(workspaceId: string): Promise<WorkspaceReport | null> {
    const workspace = workspaces.get(workspaceId);
    if (!workspace) return null;
    
    const logs = await logService.getWorkspaceLogs(workspaceId);
    const size = calculateWorkspaceSize(workspace.structure);
    const fileCount = countFiles(workspace.structure);
    
    // Contar mensajes de chat si existe
    let chatMessages = 0;
    // La propiedad chat puede no estar en el tipo, así que usamos any
    const workspaceAny = workspace as any;
    if (workspaceAny.chat && Array.isArray(workspaceAny.chat)) {
        chatMessages = workspaceAny.chat.length;
    }
    
    return {
        workspaceId,
        created: new Date(workspace.created || Date.now()),
        totalFiles: fileCount,
        totalSize: size,
        totalAccesses: logs.length,
        totalUsers: workspace.users || 0,
        lastAccess: workspace.lastAccess ? new Date(workspace.lastAccess) : new Date(),
        hasPassword: !!workspace.password,
        chatMessages
    };
}

export async function generateSecurityReport(filters?: any): Promise<SecurityReport> {
    const logs = await logService.getAllLogs();
    const blockedIPs = await logService.getBlockedIPs();
    
    // Agrupar IPs bloqueadas por razón
    const blockedByReason: { [reason: string]: number } = {};
    blockedIPs.forEach((blocked: any) => {
        const reason = blocked.reason || 'No especificada';
        blockedByReason[reason] = (blockedByReason[reason] || 0) + 1;
    });
    
    // Amenazas recientes (últimas 10)
    const recentThreats = blockedIPs
        .sort((a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime())
        .slice(0, 10)
        .map(blocked => ({
            ip: blocked.ip,
            reason: blocked.reason || 'No especificada',
            timestamp: new Date(blocked.blockedAt)
        }));
    
    // Accesos por IP
    const accessesByIPMap: { [ip: string]: { count: number; lastAccess: Date } } = {};
    logs.forEach(log => {
        if (!accessesByIPMap[log.ip]) {
            accessesByIPMap[log.ip] = {
                count: 0,
                lastAccess: new Date(log.timestamp)
            };
        }
        accessesByIPMap[log.ip].count++;
        const logDate = new Date(log.timestamp);
        if (logDate > accessesByIPMap[log.ip].lastAccess) {
            accessesByIPMap[log.ip].lastAccess = logDate;
        }
    });
    
    const accessesByIP = Object.entries(accessesByIPMap)
        .map(([ip, data]) => ({
            ip,
            count: data.count,
            lastAccess: data.lastAccess
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    
    return {
        totalBlockedIPs: blockedIPs.length,
        totalAccessAttempts: logs.length,
        blockedByReason,
        recentThreats,
        accessesByIP
    };
}

export async function generateCustomReport(
    type: 'workspace' | 'access' | 'security' | 'performance' | 'custom',
    filters?: any
): Promise<Report> {
    const reportId = generateReportId();
    let data: any = null;
    let title = '';
    let description = '';
    
    switch (type) {
        case 'workspace':
            data = await generateSummaryReport(filters);
            title = 'Reporte de Workspaces';
            description = 'Reporte detallado sobre todos los workspaces del sistema';
            break;
        case 'access':
            data = await logService.getAllLogs();
            title = 'Reporte de Accesos';
            description = 'Histórico de todos los accesos al sistema';
            break;
        case 'security':
            data = await generateSecurityReport(filters);
            title = 'Reporte de Seguridad';
            description = 'Análisis de seguridad e IPs bloqueadas';
            break;
        default:
            data = await generateSummaryReport(filters);
            title = 'Reporte General';
            description = 'Reporte general del sistema';
    }
    
    return {
        id: reportId,
        title,
        description,
        type,
        createdAt: new Date(),
        createdBy: 'admin',
        data,
        filters
    };
}

export function exportReportToJSON(report: Report): string {
    return JSON.stringify(report, null, 2);
}

export function exportReportToCSV(report: Report): string {
    // Implementación básica para exportar a CSV
    let csv = `${report.title}\n${report.description}\n\n`;
    csv += `Generado: ${report.createdAt.toISOString()}\n\n`;
    
    if (report.type === 'access' && Array.isArray(report.data)) {
        csv += 'Timestamp,IP,User Agent,Workspace ID\n';
        report.data.forEach((log: any) => {
            csv += `${log.timestamp},${log.ip},${log.userAgent},${log.workspaceId || ''}\n`;
        });
    } else {
        csv += JSON.stringify(report.data, null, 2);
    }
    
    return csv;
}
