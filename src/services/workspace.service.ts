import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { Workspace, WorkspaceData, WorkspaceStructure } from '../types';
import { config } from '../config';

// Almacenamiento en memoria
export const workspaces = new Map<string, Workspace>();

const DATA_DIR = path.join(process.cwd(), config.dataDir);

// Asegurar que existe el directorio de datos
export async function ensureDataDir(): Promise<void> {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log('Directorio de datos creado:', DATA_DIR);
    }
}

// Guardar workspace en disco
export async function saveWorkspace(workspaceId: string, workspace: Workspace): Promise<void> {
    try {
        const filePath = path.join(DATA_DIR, `${workspaceId}.json`);
        const data: WorkspaceData = {
            structure: workspace.structure,
            password: workspace.password,
            lastAccess: Date.now(),
            created: workspace.created || Date.now()
        };
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error guardando workspace ${workspaceId}:`, error);
    }
}

// Cargar workspace desde disco
export async function loadWorkspace(workspaceId: string): Promise<Workspace | null> {
    try {
        const filePath = path.join(DATA_DIR, `${workspaceId}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed: WorkspaceData = JSON.parse(data);
        
        // Actualizar último acceso
        parsed.lastAccess = Date.now();
        await fs.writeFile(filePath, JSON.stringify(parsed, null, 2));
        
        return {
            structure: parsed.structure,
            password: parsed.password,
            users: 0,
            created: parsed.created,
            uniqueUsers: new Set<string>(),
            sessionSockets: new Map<string, Set<string>>()
        };
    } catch (error) {
        return null;
    }
}

// Limpiar workspaces expirados
export async function cleanupExpiredWorkspaces(): Promise<void> {
    try {
        const files = await fs.readdir(DATA_DIR);
        const now = Date.now();
        let cleaned = 0;

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const filePath = path.join(DATA_DIR, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed: WorkspaceData = JSON.parse(data);

            if (now - parsed.lastAccess > config.workspaceExpiry) {
                await fs.unlink(filePath);
                const workspaceId = file.replace('.json', '');
                workspaces.delete(workspaceId);
                cleaned++;
                console.log(`Workspace expirado eliminado: ${workspaceId}`);
            }
        }

        if (cleaned > 0) {
            console.log(`Limpieza completada: ${cleaned} workspace(s) eliminado(s)`);
        }
    } catch (error) {
        console.error('Error en limpieza de workspaces:', error);
    }
}

// Inicializar workspace
export async function initWorkspace(workspaceId: string, password: string | null = null): Promise<Workspace | { error: string }> {
    if (workspaces.has(workspaceId)) {
        const workspace = workspaces.get(workspaceId)!;
        
        // Verificar contraseña si el workspace está protegido
        if (workspace.password) {
            if (!password) {
                return { error: 'password_required' };
            }
            const match = await bcrypt.compare(password, workspace.password);
            if (!match) {
                return { error: 'invalid_password' };
            }
        }
        
        return workspace;
    }

    // Intentar cargar desde disco
    let workspace = await loadWorkspace(workspaceId);

    // Si no existe, crear uno nuevo
    if (!workspace) {
        workspace = {
            structure: {
                'README.md': { 
                    type: 'file', 
                    content: '# Bienvenido a ShareCode\n\nEste es tu workspace colaborativo.\n\nPuedes crear archivos y carpetas desde la barra lateral.' 
                }
            },
            users: 0,
            created: Date.now(),
            uniqueUsers: new Set<string>(),
            sessionSockets: new Map<string, Set<string>>()
        };
        
        // NO establecer contraseña al crear workspace
        // Las contraseñas solo se establecen desde el menú contextual
        
        await saveWorkspace(workspaceId, workspace);
    } else if (workspace.password) {
        // Workspace existente con contraseña
        if (!password) {
            return { error: 'password_required' };
        }
        const match = await bcrypt.compare(password, workspace.password);
        if (!match) {
            return { error: 'invalid_password' };
        }
    }

    workspaces.set(workspaceId, workspace);
    return workspace;
}

// Obtener archivo por ruta
export function getFileByPath(structure: WorkspaceStructure, filePath: string): any {
    const parts = filePath.split('/');
    let current: any = structure;

    for (const part of parts) {
        if (!current[part]) return null;
        current = current[part];
        if (current.type === 'folder' && current.children) {
            current = current.children;
        }
    }

    return current;
}

// Calcular tamaño del workspace
export function calculateWorkspaceSize(structure: WorkspaceStructure): number {
    let size = 0;
    
    function traverse(node: any) {
        if (node.type === 'file') {
            size += (node.content || '').length;
        } else if (node.type === 'folder' && node.children) {
            for (const child of Object.values(node.children)) {
                traverse(child);
            }
        }
    }
    
    for (const item of Object.values(structure)) {
        traverse(item);
    }
    
    return size;
}

// Contar archivos
export function countFiles(structure: WorkspaceStructure): number {
    let count = 0;
    
    function traverse(node: any) {
        if (node.type === 'file') {
            count++;
        } else if (node.type === 'folder' && node.children) {
            for (const child of Object.values(node.children)) {
                traverse(child);
            }
        }
    }
    
    for (const item of Object.values(structure)) {
        traverse(item);
    }
    
    return count;
}
