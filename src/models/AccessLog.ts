import mongoose, { Schema, Document } from 'mongoose';

export interface IAccessLog extends Document {
    ip: string;
    workspaceId: string;
    userId: string;
    sessionId: string;
    action: string;
    timestamp: Date;
    userAgent?: string;
    blocked: boolean;
    duration?: number;
}

const AccessLogSchema = new Schema<IAccessLog>({
    ip: { type: String, required: true, index: true },
    workspaceId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    sessionId: { type: String, required: true },
    action: { 
        type: String, 
        required: true,
        enum: ['join', 'disconnect', 'create_file', 'edit_file', 'delete_file', 'password_attempt']
    },
    timestamp: { type: Date, default: Date.now, index: true },
    userAgent: { type: String },
    blocked: { type: Boolean, default: false },
    duration: { type: Number }
}, {
    timestamps: true
});

// Índices compuestos para consultas rápidas
AccessLogSchema.index({ ip: 1, timestamp: -1 });
AccessLogSchema.index({ workspaceId: 1, timestamp: -1 });
AccessLogSchema.index({ blocked: 1 });

export default mongoose.model<IAccessLog>('AccessLog', AccessLogSchema);
