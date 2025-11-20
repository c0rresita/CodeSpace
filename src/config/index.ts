import dotenv from 'dotenv';

// Silenciar mensajes de dotenv
const originalStdoutWrite = process.stdout.write;
process.stdout.write = function(chunk: any, ...args: any[]): boolean {
    if (typeof chunk === 'string' && chunk.includes('[dotenv@')) {
        return true;
    }
    return originalStdoutWrite.apply(process.stdout, [chunk, ...args] as any);
};

dotenv.config();

// Restaurar stdout
process.stdout.write = originalStdoutWrite;

export const config = {
    // Servidor
    port: parseInt(process.env.PORT || '3000', 10),
    
    // Seguridad
    sessionSecret: process.env.SESSION_SECRET || 'codespace-secret-key-change-in-production',
    
    // Admin
    adminEmail: process.env.ADMIN_EMAIL || 'admin@admin.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    
    // Base de datos
    mongoUri: process.env.MONGO_URI || '',
    
    // Limpieza
    cleanupIntervalDays: parseInt(process.env.CLEANUP_INTERVAL_DAYS || '1', 10),
    workspaceExpiryDays: parseInt(process.env.WORKSPACE_EXPIRY_DAYS || '30', 10),
    
    // Rutas
    dataDir: 'workspaces-data',
    publicDir: 'public',
    
    // Constantes calculadas
    get cleanupInterval() {
        return this.cleanupIntervalDays * 24 * 60 * 60 * 1000;
    },
    get workspaceExpiry() {
        return this.workspaceExpiryDays * 24 * 60 * 60 * 1000;
    }
};
