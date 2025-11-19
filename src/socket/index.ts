import { Server as SocketIOServer, Socket } from 'socket.io';
import bcrypt from 'bcrypt';
import { workspaces, saveWorkspace, getFileByPath, initWorkspace } from '../services/workspace.service';
import { chatService } from '../services/chat.service';

export function setupSocketHandlers(io: SocketIOServer, sessionMiddleware: any): void {
    // Usar sesión en WebSocket
    io.use((socket: any, next) => {
        sessionMiddleware(socket.request, {}, next);
    });

    io.on('connection', (socket: Socket) => {
        console.log('Usuario conectado:', socket.id);
        let currentWorkspace: string | null = null;
        
        // Obtener ID de sesión único del usuario
        const sessionId = (socket.request as any).session.id;

        // Unirse a un workspace
        socket.on('join-workspace', async ({ workspaceId, password }) => {
            currentWorkspace = workspaceId;
            
            const workspace = await initWorkspace(workspaceId, password);
            
            // Verificar si hay error de contraseña
            if ('error' in workspace) {
                socket.emit('workspace-error', { error: workspace.error });
                return;
            }
            
            socket.join(workspaceId);
            
            // Rastrear usuarios únicos por sesión
            if (!workspace.uniqueUsers) {
                workspace.uniqueUsers = new Set();
            }
            
            if (!workspace.sessionSockets) {
                workspace.sessionSockets = new Map();
            }
            
            if (!workspace.sessionSockets.has(sessionId)) {
                workspace.sessionSockets.set(sessionId, new Set());
            }
            workspace.sessionSockets.get(sessionId)!.add(socket.id);
            
            const isNewUser = !workspace.uniqueUsers.has(sessionId);
            if (isNewUser) {
                workspace.uniqueUsers.add(sessionId);
            }
            workspace.users = workspace.uniqueUsers.size;
            
            if (!workspace.connectedUsers) {
                workspace.connectedUsers = new Map();
            }

            socket.emit('load-structure', workspace.structure);

            if (isNewUser) {
                socket.to(workspaceId).emit('user-connected', { userId: socket.id });
            }
            io.to(workspaceId).emit('users-count', workspace.users);

            console.log(`Usuario ${socket.id} (sesión: ${sessionId}) unido a workspace: ${workspaceId}`);
            console.log(`Usuarios únicos en ${workspaceId}: ${workspace.users}`);
        });

        // Establecer nombre de usuario
        socket.on('set-username', ({ workspaceId, username }) => {
            if (!workspaces.has(workspaceId)) return;
            
            const workspace = workspaces.get(workspaceId)!;
            if (!workspace.connectedUsers) {
                workspace.connectedUsers = new Map();
            }
            
            workspace.connectedUsers.set(socket.id, username);
            
            const usersList = Array.from(workspace.connectedUsers.entries()).map(([id, name]) => ({
                id,
                username: name
            }));
            
            io.to(workspaceId).emit('users-list', usersList);
            
            socket.to(workspaceId).emit('user-joined', {
                id: socket.id,
                username
            });
        });

        // Cambiar nombre de usuario
        socket.on('username-change', ({ workspaceId, oldUsername, newUsername }) => {
            if (!workspaces.has(workspaceId)) return;
            
            const workspace = workspaces.get(workspaceId)!;
            if (!workspace.connectedUsers) return;
            
            workspace.connectedUsers.set(socket.id, newUsername);
            
            io.to(workspaceId).emit('username-changed', {
                id: socket.id,
                oldUsername,
                newUsername
            });
            
            const usersList = Array.from(workspace.connectedUsers.entries()).map(([id, name]) => ({
                id,
                username: name
            }));
            
            io.to(workspaceId).emit('users-list', usersList);
        });

        // Mensaje de chat
        socket.on('chat-message', async ({ workspaceId, username, message, timestamp }) => {
            const data = { username, message, timestamp };
            
            // Guardar en base de datos si está disponible
            await chatService.saveMessage(workspaceId, username, message, socket.id);
            
            // Enviar a todos los demás usuarios
            socket.to(workspaceId).emit('chat-message', data);
            
            // Confirmar al emisor
            socket.emit('chat-message-own', data);
        });

        // Obtener historial de chat al unirse
        socket.on('get-chat-history', async ({ workspaceId }) => {
            const messages = await chatService.getWorkspaceMessages(workspaceId);
            socket.emit('chat-history', messages);
        });

        // Abrir archivo
        socket.on('open-file', ({ workspaceId, path }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const file = getFileByPath(workspace.structure, path);
            if (file && file.type === 'file') {
                if (file.passwordHash) {
                    socket.emit('file-password-required', { path });
                } else {
                    socket.emit('load-file', {
                        path: path,
                        content: file.content || ''
                    });
                }
            }
        });

        // Establecer contraseña en archivo
        socket.on('set-file-password', async ({ workspaceId, path, password }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const file = getFileByPath(workspace.structure, path);
            if (file && file.type === 'file') {
                if (file.passwordHash) {
                    socket.emit('file-password-set', { 
                        path, 
                        success: false, 
                        error: 'Este archivo ya tiene una contraseña establecida' 
                    });
                    return;
                }

                const hash = await bcrypt.hash(password, 10);
                file.passwordHash = hash;
                file.hasPassword = true;

                await saveWorkspace(workspaceId, workspace);
                io.to(workspaceId).emit('structure-updated', workspace.structure);
                
                socket.emit('file-password-set', { path, success: true });
                console.log(`Contraseña establecida en archivo: ${path}`);
            }
        });

        // Quitar contraseña de archivo
        socket.on('remove-file-password', async ({ workspaceId, path, password }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const file = getFileByPath(workspace.structure, path);
            if (file && file.type === 'file') {
                if (!file.passwordHash) {
                    socket.emit('file-password-removed', { 
                        path, 
                        success: false, 
                        error: 'Este archivo no tiene contraseña' 
                    });
                    return;
                }

                const match = await bcrypt.compare(password, file.passwordHash);
                if (!match) {
                    socket.emit('file-password-removed', { 
                        path, 
                        success: false, 
                        error: 'Contraseña incorrecta' 
                    });
                    return;
                }

                delete file.passwordHash;
                delete file.hasPassword;

                await saveWorkspace(workspaceId, workspace);
                io.to(workspaceId).emit('structure-updated', workspace.structure);
                
                socket.emit('file-password-removed', { path, success: true });
                console.log(`Contraseña eliminada del archivo: ${path}`);
            }
        });

        // Desbloquear archivo con contraseña
        socket.on('unlock-file', async ({ workspaceId, path, password }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const file = getFileByPath(workspace.structure, path);
            if (file && file.type === 'file') {
                if (!file.passwordHash) {
                    socket.emit('file-unlocked', { 
                        path, 
                        content: file.content || '',
                        success: true 
                    });
                    return;
                }

                const match = await bcrypt.compare(password, file.passwordHash);
                if (!match) {
                    socket.emit('file-unlocked', { 
                        path, 
                        success: false, 
                        error: 'Contraseña incorrecta' 
                    });
                    return;
                }

                socket.emit('file-unlocked', {
                    path,
                    content: file.content || '',
                    success: true
                });
            }
        });

        // Crear archivo
        socket.on('create-file', async ({ workspaceId, name, parentPath }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const parent = parentPath ? getFileByPath(workspace.structure, parentPath) : workspace.structure;
            
            if (parent && !parent[name]) {
                parent[name] = { type: 'file', content: '' };
                io.to(workspaceId).emit('structure-updated', workspace.structure);
                await saveWorkspace(workspaceId, workspace);
                console.log(`Archivo creado: ${name} en workspace ${workspaceId}`);
            }
        });

        // Crear carpeta
        socket.on('create-folder', async ({ workspaceId, name, parentPath }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const parent = parentPath ? getFileByPath(workspace.structure, parentPath) : workspace.structure;
            
            if (parent && !parent[name]) {
                parent[name] = { type: 'folder', children: {} };
                io.to(workspaceId).emit('structure-updated', workspace.structure);
                await saveWorkspace(workspaceId, workspace);
                console.log(`Carpeta creada: ${name} en workspace ${workspaceId}`);
            }
        });

        // Eliminar archivo o carpeta
        socket.on('delete-item', async ({ workspaceId, path }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const parts = path.split('/');
            const itemName = parts.pop()!;
            const parentPath = parts.join('/');
            
            const parent = parentPath ? getFileByPath(workspace.structure, parentPath) : workspace.structure;
            
            if (parent && parent[itemName]) {
                delete parent[itemName];
                io.to(workspaceId).emit('structure-updated', workspace.structure);
                io.to(workspaceId).emit('item-deleted', { path });
                await saveWorkspace(workspaceId, workspace);
                console.log(`Elemento eliminado: ${path} en workspace ${workspaceId}`);
            }
        });

        // Renombrar archivo o carpeta
        socket.on('rename-item', async ({ workspaceId, path, newName }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const parts = path.split('/');
            const oldName = parts.pop()!;
            const parentPath = parts.join('/');
            const parent = parentPath ? getFileByPath(workspace.structure, parentPath) : workspace.structure;
            
            if (parent && parent[oldName] && !parent[newName]) {
                parent[newName] = parent[oldName];
                delete parent[oldName];
                io.to(workspaceId).emit('structure-updated', workspace.structure);
                await saveWorkspace(workspaceId, workspace);
                console.log(`Item renombrado: ${oldName} -> ${newName} en workspace ${workspaceId}`);
            }
        });

        // Recibir cambios de texto
        socket.on('send-changes', async ({ workspaceId, path, content, change }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) return;

            const file = getFileByPath(workspace.structure, path);
            if (file && file.type === 'file') {
                file.content = content;
                socket.to(workspaceId).emit('receive-changes', {
                    path: path,
                    content: content,
                    change: change
                });
                await saveWorkspace(workspaceId, workspace);
            }
        });

        // Desconexión
        socket.on('disconnect', async () => {
            console.log('Usuario desconectado:', socket.id);
            
            if (currentWorkspace && workspaces.has(currentWorkspace)) {
                const workspace = workspaces.get(currentWorkspace)!;
                
                if (workspace.sessionSockets && workspace.sessionSockets.has(sessionId)) {
                    workspace.sessionSockets.get(sessionId)!.delete(socket.id);
                    
                    if (workspace.sessionSockets.get(sessionId)!.size === 0) {
                        workspace.sessionSockets.delete(sessionId);
                        workspace.uniqueUsers.delete(sessionId);
                        workspace.users = workspace.uniqueUsers.size;
                        
                        io.to(currentWorkspace).emit('users-count', workspace.users);
                        
                        console.log(`Usuario con sesión ${sessionId} completamente desconectado de ${currentWorkspace}`);
                        console.log(`Usuarios únicos restantes: ${workspace.users}`);
                    }
                }
                
                if (workspace.connectedUsers) {
                    const username = workspace.connectedUsers.get(socket.id);
                    workspace.connectedUsers.delete(socket.id);
                    
                    socket.to(currentWorkspace).emit('user-left', {
                        id: socket.id,
                        username
                    });
                    
                    const usersList = Array.from(workspace.connectedUsers.entries()).map(([id, name]) => ({
                        id,
                        username: name
                    }));
                    
                    io.to(currentWorkspace).emit('users-list', usersList);
                }
            }
        });
    });
}
