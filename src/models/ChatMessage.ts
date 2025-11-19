import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
    workspaceId: string;
    username: string;
    message: string;
    timestamp: Date;
    socketId: string;
}

const ChatMessageSchema: Schema = new Schema({
    workspaceId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    socketId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Índice compuesto para búsquedas eficientes
ChatMessageSchema.index({ workspaceId: 1, timestamp: -1 });

// TTL index - Los mensajes se eliminan automáticamente después de 30 días
ChatMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
