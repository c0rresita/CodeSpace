export interface FileNode {
    type: 'file' | 'folder';
    content?: string;
    children?: { [key: string]: FileNode };
    passwordHash?: string;
    hasPassword?: boolean;
}

export interface WorkspaceStructure {
    [key: string]: FileNode;
}

export interface Workspace {
    structure: WorkspaceStructure;
    password?: string;
    users: number;
    created: number;
    uniqueUsers: Set<string>;
    sessionSockets: Map<string, Set<string>>;
    connectedUsers?: Map<string, string>;
    lastAccess?: number;
}

export interface WorkspaceData {
    structure: WorkspaceStructure;
    password?: string;
    lastAccess: number;
    created: number;
}

export interface SessionData {
    isAdmin?: boolean;
    adminEmail?: string;
    id: string;
}

// Extender tipos de Express Session
declare module 'express-session' {
    interface SessionData {
        isAdmin?: boolean;
        adminEmail?: string;
    }
}

declare module 'http' {
    interface IncomingMessage {
        session: import('express-session').Session & Partial<SessionData>;
    }
}
