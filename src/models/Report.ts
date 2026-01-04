export interface Report {
    id: string;
    title: string;
    description: string;
    type: 'workspace' | 'access' | 'security' | 'performance' | 'custom';
    createdAt: Date;
    createdBy: string;
    data: any;
    filters?: {
        dateFrom?: Date;
        dateTo?: Date;
        workspaceId?: string;
        [key: string]: any;
    };
}

export interface ReportSummary {
    totalWorkspaces: number;
    totalAccesses: number;
    totalBlockedIPs: number;
    totalStorage: number;
    averageUsersPerWorkspace: number;
    topWorkspaces: Array<{
        id: string;
        accesses: number;
        users: number;
    }>;
    accessByHour: { [hour: string]: number };
    accessByDay: { [day: string]: number };
}

export interface WorkspaceReport {
    workspaceId: string;
    created: Date;
    totalFiles: number;
    totalSize: number;
    totalAccesses: number;
    totalUsers: number;
    lastAccess: Date;
    hasPassword: boolean;
    chatMessages: number;
}

export interface SecurityReport {
    totalBlockedIPs: number;
    totalAccessAttempts: number;
    blockedByReason: { [reason: string]: number };
    recentThreats: Array<{
        ip: string;
        reason: string;
        timestamp: Date;
    }>;
    accessesByIP: Array<{
        ip: string;
        count: number;
        lastAccess: Date;
    }>;
}
