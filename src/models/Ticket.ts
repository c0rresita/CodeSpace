import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
    workspaceId: string;
    userId: string;
    sessionId: string;
    title: string;
    description: string;
    category: 'bug' | 'feature' | 'help' | 'other';
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in-progress' | 'resolved' | 'closed';
    attachments?: string[];
    responses: Array<{
        userId: string;
        message: string;
        isAdmin: boolean;
        timestamp: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
}

const TicketSchema = new Schema<ITicket>({
    workspaceId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    sessionId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['bug', 'feature', 'help', 'other'], 
        default: 'other' 
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
    },
    status: { 
        type: String, 
        enum: ['open', 'in-progress', 'resolved', 'closed'], 
        default: 'open',
        index: true
    },
    attachments: [{ type: String }],
    responses: [{
        userId: String,
        message: String,
        isAdmin: Boolean,
        timestamp: { type: Date, default: Date.now }
    }],
    resolvedAt: { type: Date },
    resolvedBy: { type: String }
}, {
    timestamps: true
});

// Índices compuestos
TicketSchema.index({ workspaceId: 1, status: 1 });
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
