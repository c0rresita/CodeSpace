import ChatMessage, { IChatMessage } from '../models/ChatMessage';
import { isDatabaseConnected } from '../database/connection';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

export class ChatService {
    // Ruta del archivo de chat para un workspace
    private getChatFilePath(workspaceId: string): string {
        return path.join(process.cwd(), config.dataDir, workspaceId, 'chat.json');
    }

    // Guardar mensaje (MongoDB o archivo)
    async saveMessage(
        workspaceId: string,
        username: string,
        message: string,
        socketId: string
    ): Promise<IChatMessage | null> {
        const messageData = {
            workspaceId,
            username,
            message,
            socketId,
            timestamp: new Date()
        };

        // Intentar guardar en MongoDB
        if (isDatabaseConnected()) {
            try {
                const chatMessage = new ChatMessage(messageData);
                await chatMessage.save();
                return chatMessage;
            } catch (error) {
                console.error('Error guardando mensaje en MongoDB:', error);
            }
        }

        // Guardar en archivo si no hay DB o falló
        try {
            const filePath = this.getChatFilePath(workspaceId);
            const dir = path.dirname(filePath);
            
            // Crear directorio si no existe
            await fs.mkdir(dir, { recursive: true });

            // Leer mensajes existentes
            let messages: any[] = [];
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                messages = JSON.parse(content);
            } catch {
                // Archivo no existe o está vacío
            }

            // Agregar nuevo mensaje
            messages.push(messageData);

            // Limitar a últimos 500 mensajes
            if (messages.length > 500) {
                messages = messages.slice(-500);
            }

            // Guardar
            await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
            return messageData as any;
        } catch (error) {
            console.error('Error guardando mensaje en archivo:', error);
            return null;
        }
    }

    // Obtener historial de mensajes (MongoDB o archivo)
    async getWorkspaceMessages(
        workspaceId: string,
        limit: number = 50
    ): Promise<any[]> {
        // Intentar desde MongoDB
        if (isDatabaseConnected()) {
            try {
                const messages = await ChatMessage
                    .find({ workspaceId })
                    .sort({ timestamp: -1 })
                    .limit(limit)
                    .lean()
                    .exec();

                return messages.reverse();
            } catch (error) {
                console.error('Error obteniendo mensajes de MongoDB:', error);
            }
        }

        // Leer desde archivo
        try {
            const filePath = this.getChatFilePath(workspaceId);
            const content = await fs.readFile(filePath, 'utf-8');
            const messages = JSON.parse(content);
            
            // Retornar últimos N mensajes
            return messages.slice(-limit);
        } catch {
            // Archivo no existe o está vacío
            return [];
        }
    }

    // Obtener mensajes recientes (últimas 24 horas)
    async getRecentMessages(
        workspaceId: string,
        hours: number = 24
    ): Promise<any[]> {
        const since = new Date();
        since.setHours(since.getHours() - hours);

        // Intentar desde MongoDB
        if (isDatabaseConnected()) {
            try {
                const messages = await ChatMessage
                    .find({
                        workspaceId,
                        timestamp: { $gte: since }
                    })
                    .sort({ timestamp: 1 })
                    .lean()
                    .exec();

                return messages;
            } catch (error) {
                console.error('Error obteniendo mensajes recientes de MongoDB:', error);
            }
        }

        // Leer desde archivo
        try {
            const filePath = this.getChatFilePath(workspaceId);
            const content = await fs.readFile(filePath, 'utf-8');
            const messages = JSON.parse(content);
            
            // Filtrar por fecha
            return messages.filter((msg: any) => new Date(msg.timestamp) >= since);
        } catch {
            return [];
        }
    }

    // Eliminar mensajes de un workspace
    async deleteWorkspaceMessages(workspaceId: string): Promise<boolean> {
        // Intentar eliminar de MongoDB
        if (isDatabaseConnected()) {
            try {
                await ChatMessage.deleteMany({ workspaceId });
            } catch (error) {
                console.error('Error eliminando mensajes de MongoDB:', error);
            }
        }

        // Eliminar archivo
        try {
            const filePath = this.getChatFilePath(workspaceId);
            await fs.unlink(filePath);
            return true;
        } catch {
            // Archivo no existe
            return false;
        }
    }

    // Obtener estadísticas de chat
    async getChatStats(workspaceId: string): Promise<{
        totalMessages: number;
        uniqueUsers: number;
        lastMessageAt: Date | null;
    }> {
        // Intentar desde MongoDB
        if (isDatabaseConnected()) {
            try {
                const totalMessages = await ChatMessage.countDocuments({ workspaceId });
                const uniqueUsers = await ChatMessage.distinct('username', { workspaceId });
                const lastMessage = await ChatMessage
                    .findOne({ workspaceId })
                    .sort({ timestamp: -1 })
                    .select('timestamp')
                    .lean()
                    .exec();

                return {
                    totalMessages,
                    uniqueUsers: uniqueUsers.length,
                    lastMessageAt: lastMessage?.timestamp || null
                };
            } catch (error) {
                console.error('Error obteniendo estadísticas de MongoDB:', error);
            }
        }

        // Leer desde archivo
        try {
            const filePath = this.getChatFilePath(workspaceId);
            const content = await fs.readFile(filePath, 'utf-8');
            const messages = JSON.parse(content);
            
            const uniqueUsers = new Set(messages.map((msg: any) => msg.username));
            const lastMessage = messages[messages.length - 1];

            return {
                totalMessages: messages.length,
                uniqueUsers: uniqueUsers.size,
                lastMessageAt: lastMessage ? new Date(lastMessage.timestamp) : null
            };
        } catch {
            return {
                totalMessages: 0,
                uniqueUsers: 0,
                lastMessageAt: null
            };
        }
    }
}

export const chatService = new ChatService();
