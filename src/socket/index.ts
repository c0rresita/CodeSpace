import { Server as SocketIOServer, Socket } from 'socket.io';
import bcrypt from 'bcrypt';
import { workspaces, saveWorkspace, getFileByPath, initWorkspace } from '../services/workspace.service';
import { chatService } from '../services/chat.service';
import * as logService from '../services/log.service';

export function setupSocketHandlers(io: SocketIOServer, sessionMiddleware: any): void {
    // Usar sesión en WebSocket
    io.use((socket: any, next) => {
        sessionMiddleware(socket.request, {}, next);
    });

    io.on('connection', (socket: Socket) => {
        let currentWorkspace: string | null = null;
        
        // Obtener ID de sesión único del usuario
        const sessionId = (socket.request as any).session.id;
        const userIP = socket.handshake.headers['x-forwarded-for'] as string || socket.handshake.address;
        const userAgent = socket.handshake.headers['user-agent'];

        // Unirse a un workspace
        socket.on('join-workspace', async ({ workspaceId, password }) => {
            currentWorkspace = workspaceId;
            
            // Verificar si la IP está bloqueada
            const isBlocked = await logService.isIPBlocked(userIP);
            if (isBlocked) {
                socket.emit('workspace-error', { error: 'blocked' });
                await logService.logAccess({
                    ip: userIP,
                    workspaceId,
                    userId: socket.id,
                    sessionId,
                    action: 'join',
                    userAgent
                });
                return;
            }
            
            const workspace = await initWorkspace(workspaceId, password);
            
            // Verificar si hay error de contraseña
            if ('error' in workspace) {
                // Registrar intento fallido de contraseña
                if (workspace.error === 'invalid_password') {
                    await logService.logAccess({
                        ip: userIP,
                        workspaceId,
                        userId: socket.id,
                        sessionId,
                        action: 'password_attempt',
                        userAgent
                    });
                }
                socket.emit('workspace-error', { error: workspace.error });
                return;
            }
            
            // Registrar acceso exitoso
            await logService.logAccess({
                ip: userIP,
                workspaceId,
                userId: socket.id,
                sessionId,
                action: 'join',
                userAgent
            });
            
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
            
            // Enviar información sobre si el workspace tiene contraseña
            socket.emit('workspace-info', { hasPassword: !!workspace.password });
        });

        // Establecer nombre de usuario
        socket.on('set-username', ({ workspaceId, username }) => {
            if (!workspaces.has(workspaceId)) return;
            
            const workspace = workspaces.get(workspaceId)!;
            if (!workspace.connectedUsers) {
                workspace.connectedUsers = new Map();
            }
            
            workspace.connectedUsers.set(socket.id, username);
            
            // Filtrar usuarios en modo vanish
            const usersList = Array.from(workspace.connectedUsers.entries())
                .filter(([id]) => !workspace.vanishedUsers || !workspace.vanishedUsers.has(id))
                .map(([id, name]) => ({
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
            
            // Actualizar lista de usuarios solo (sin notificar el cambio de nombre) y filtrar vanished
            const usersList = Array.from(workspace.connectedUsers.entries())
                .filter(([id]) => !workspace.vanishedUsers || !workspace.vanishedUsers.has(id))
                .map(([id, name]) => ({
                    id,
                    username: name
                }));
            
            io.to(workspaceId).emit('users-list', usersList);
        });

        // Ping-pong para medir latencia
        socket.on('ping', ({ workspaceId, timestamp }) => {
            socket.emit('pong', { timestamp });
        });

        // Kick user
        socket.on('kick-user', ({ workspaceId, kickedBy, targetUser, message }) => {
            if (!workspaces.has(workspaceId)) return;
            
            const workspace = workspaces.get(workspaceId)!;
            if (!workspace.connectedUsers) return;
            
            // Buscar el socketId del usuario a expulsar
            let targetSocketId: string | null = null;
            for (const [socketId, username] of workspace.connectedUsers.entries()) {
                if (username === targetUser) {
                    targetSocketId = socketId;
                    break;
                }
            }
            
            if (!targetSocketId) return;
            
            // Notificar al usuario expulsado
            io.to(targetSocketId).emit('kicked', {
                message: `${message}`
            });
            
            // Notificar a todos los demás usuarios
            socket.to(workspaceId).emit('user-kicked', {
                kickedBy,
                targetUser,
                message
            });
            
            // Desconectar al usuario después de 2 segundos
            setTimeout(() => {
                const targetSocket = io.sockets.sockets.get(targetSocketId!);
                if (targetSocket) {
                    targetSocket.disconnect(true);
                }
            }, 2000);
        });

        // Ban user (solo admin/moderador)
        socket.on('ban-user', async ({ workspaceId, bannedBy, targetUser, reason }) => {
            if (!workspaces.has(workspaceId)) return;
            
            const workspace = workspaces.get(workspaceId)!;
            if (!workspace.connectedUsers) return;
            
            // Buscar el socketId del usuario a banear
            let targetSocketId: string | null = null;
            for (const [socketId, username] of workspace.connectedUsers.entries()) {
                if (username === targetUser) {
                    targetSocketId = socketId;
                    break;
                }
            }
            
            if (!targetSocketId) return;
            
            // Obtener la IP del usuario
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (!targetSocket) return;
            
            const targetIP = targetSocket.handshake.headers['x-forwarded-for'] as string || targetSocket.handshake.address;
            
            // Bloquear la IP
            await logService.blockIP(targetIP, reason, bannedBy);
            
            // Notificar al usuario baneado
            io.to(targetSocketId).emit('kicked', {
                message: `Has sido baneado. Razón: ${reason}`
            });
            
            // Notificar a todos los demás usuarios
            io.to(workspaceId).emit('chat-system', {
                message: `🔨 ${bannedBy} baneó a ${targetUser}. Razón: ${reason}`
            });
            
            // Desconectar al usuario después de 2 segundos
            setTimeout(() => {
                if (targetSocket) {
                    targetSocket.disconnect(true);
                }
            }, 2000);
        });

        // Toggle modo vanish (solo admin/moderador)
        socket.on('toggle-vanish', ({ workspaceId, username }) => {
            if (!workspaces.has(workspaceId)) return;
            
            // Verificar permisos de admin/moderador
            const session = (socket.request as any).session;
            if (!session?.isAdmin && !session?.isModerator) {
                socket.emit('vanish-error', { message: 'Solo administradores y moderadores pueden usar este comando' });
                return;
            }
            
            const workspace = workspaces.get(workspaceId)!;
            
            // Inicializar el Set de usuarios en vanish si no existe
            if (!workspace.vanishedUsers) {
                workspace.vanishedUsers = new Set<string>();
            }
            
            const isVanished = workspace.vanishedUsers.has(socket.id);
            
            if (isVanished) {
                // Desactivar vanish
                workspace.vanishedUsers.delete(socket.id);
                socket.emit('vanish-toggled', { enabled: false });
            } else {
                // Activar vanish
                workspace.vanishedUsers.add(socket.id);
                socket.emit('vanish-toggled', { enabled: true });
            }
            
            // Emitir lista actualizada de usuarios a todos (excluyendo vanished)
            const usersList = Array.from(workspace.connectedUsers?.entries() || [])
                .filter(([id]) => !workspace.vanishedUsers || !workspace.vanishedUsers.has(id))
                .map(([id, name]) => ({
                    id,
                    username: name
                }));
            
            io.to(workspaceId).emit('users-list', usersList);
        });

        // Desbanear IP (solo admin/moderador)
        socket.on('unban-ip', async ({ workspaceId, unbannedBy, ipAddress }) => {
            if (!workspaces.has(workspaceId)) return;
            
            // Verificar permisos de admin/moderador
            const session = (socket.request as any).session;
            if (!session?.isAdmin && !session?.isModerator) {
                socket.emit('unban-error', { message: 'Solo administradores y moderadores pueden desbanear IPs' });
                return;
            }
            
            try {
                // Desbloquear la IP
                await logService.unblockIP(ipAddress);
                
                // Notificar éxito al usuario que ejecutó el comando
                socket.emit('unban-success', { 
                    message: `IP ${ipAddress} desbaneada correctamente`,
                    ipAddress,
                    unbannedBy
                });
                
                // Notificar a todos en el workspace
                io.to(workspaceId).emit('chat-system', {
                    message: `🔓 ${unbannedBy} desbaneó la IP: ${ipAddress}`
                });
                
                console.log(`🔓 IP desbaneada: ${ipAddress} por ${unbannedBy}`);
            } catch (error) {
                console.error('Error al desbanear IP:', error);
                socket.emit('unban-error', { message: 'Error al desbanear la IP' });
            }
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

        // Establecer contraseña del workspace
        socket.on('set-workspace-password', async ({ workspaceId, password }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) {
                socket.emit('workspace-password-error', { message: 'Workspace no encontrado' });
                return;
            }

            if (workspace.password) {
                socket.emit('workspace-password-error', { message: 'El workspace ya tiene contraseña. Quítala primero.' });
                return;
            }

            if (!password || password.length < 4) {
                socket.emit('workspace-password-error', { message: 'La contraseña debe tener al menos 4 caracteres' });
                return;
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                workspace.password = hashedPassword;
                await saveWorkspace(workspaceId, workspace);
                
                socket.emit('workspace-password-set');
                io.to(workspaceId).emit('workspace-info', { hasPassword: true });
                
                console.log(`🔒 Contraseña establecida: ${workspaceId}`);
            } catch (error) {
                socket.emit('workspace-password-error', { message: 'Error al establecer contraseña' });
            }
        });

        // Quitar contraseña del workspace
        socket.on('remove-workspace-password', async ({ workspaceId, password }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) {
                socket.emit('workspace-password-error', { message: 'Workspace no encontrado' });
                return;
            }

            if (!workspace.password) {
                socket.emit('workspace-password-error', { message: 'El workspace no tiene contraseña' });
                return;
            }

            try {
                const match = await bcrypt.compare(password, workspace.password);
                if (!match) {
                    socket.emit('workspace-password-error', { message: 'Contraseña incorrecta' });
                    return;
                }

                delete workspace.password;
                await saveWorkspace(workspaceId, workspace);
                
                socket.emit('workspace-password-removed');
                io.to(workspaceId).emit('workspace-info', { hasPassword: false });
                
                console.log(`🔓 Contraseña eliminada: ${workspaceId}`);
            } catch (error) {
                socket.emit('workspace-password-error', { message: 'Error al quitar contraseña' });
            }
        });

        // Cambiar contraseña del workspace
        socket.on('change-workspace-password', async ({ workspaceId, currentPassword, newPassword }) => {
            const workspace = workspaces.get(workspaceId);
            if (!workspace) {
                socket.emit('workspace-password-error', { message: 'Workspace no encontrado' });
                return;
            }

            if (!workspace.password) {
                socket.emit('workspace-password-error', { message: 'El workspace no tiene contraseña establecida' });
                return;
            }

            if (!currentPassword || !newPassword) {
                socket.emit('workspace-password-error', { message: 'Debes proporcionar la contraseña actual y la nueva' });
                return;
            }

            if (newPassword.length < 4) {
                socket.emit('workspace-password-error', { message: 'La nueva contraseña debe tener al menos 4 caracteres' });
                return;
            }

            try {
                // Verificar contraseña actual
                const match = await bcrypt.compare(currentPassword, workspace.password);
                if (!match) {
                    socket.emit('workspace-password-error', { message: 'La contraseña actual es incorrecta' });
                    return;
                }

                // Establecer nueva contraseña
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                workspace.password = hashedPassword;
                await saveWorkspace(workspaceId, workspace);
                
                socket.emit('workspace-password-changed');
                io.to(workspaceId).emit('workspace-info', { hasPassword: true });
                
                console.log(`🔑 Contraseña cambiada: ${workspaceId}`);
            } catch (error) {
                console.error('Error al cambiar contraseña:', error);
                socket.emit('workspace-password-error', { message: 'Error al cambiar contraseña' });
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
                
                // Log de creación de archivo
                await logService.logAccess({
                    ip: userIP,
                    workspaceId,
                    userId: socket.id,
                    sessionId,
                    action: 'create_file',
                    userAgent
                });
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
            
            // Log de eliminación
            await logService.logAccess({
                ip: userIP,
                workspaceId,
                userId: socket.id,
                sessionId,
                action: 'delete_file',
                userAgent
            });
            
            if (parent && parent[itemName]) {
                delete parent[itemName];
                io.to(workspaceId).emit('structure-updated', workspace.structure);
                io.to(workspaceId).emit('item-deleted', { path });
                await saveWorkspace(workspaceId, workspace);
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
            // Registrar desconexión
            if (currentWorkspace) {
                await logService.logAccess({
                    ip: userIP,
                    workspaceId: currentWorkspace,
                    userId: socket.id,
                    sessionId,
                    action: 'disconnect',
                    userAgent
                });
            }
            
            if (currentWorkspace && workspaces.has(currentWorkspace)) {
                const workspace = workspaces.get(currentWorkspace)!;
                
                if (workspace.sessionSockets && workspace.sessionSockets.has(sessionId)) {
                    workspace.sessionSockets.get(sessionId)!.delete(socket.id);
                    
                    if (workspace.sessionSockets.get(sessionId)!.size === 0) {
                        workspace.sessionSockets.delete(sessionId);
                        workspace.uniqueUsers.delete(sessionId);
                        workspace.users = workspace.uniqueUsers.size;
                        
                        io.to(currentWorkspace).emit('users-count', workspace.users);
                    }
                }
                
                if (workspace.connectedUsers) {
                    const username = workspace.connectedUsers.get(socket.id);
                    workspace.connectedUsers.delete(socket.id);
                    
                    // Limpiar de vanished users si estaba ahí
                    if (workspace.vanishedUsers) {
                        workspace.vanishedUsers.delete(socket.id);
                    }
                    
                    socket.to(currentWorkspace).emit('user-left', {
                        id: socket.id,
                        username
                    });
                    
                    const usersList = Array.from(workspace.connectedUsers.entries())
                        .filter(([id]) => !workspace.vanishedUsers || !workspace.vanishedUsers.has(id))
                        .map(([id, name]) => ({
                            id,
                            username: name
                        }));
                    
                    io.to(currentWorkspace).emit('users-list', usersList);
                }
            }
        });

        // Tickets en tiempo real
        socket.on('ticket-updated', ({ workspaceId, ticketId }) => {
            socket.to(workspaceId).emit('ticket-refresh', { ticketId });
        });
    });
}
