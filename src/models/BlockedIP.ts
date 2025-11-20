import mongoose, { Schema, Document } from 'mongoose';

export interface IBlockedIP extends Document {
    ip: string;
    reason: string;
    blockedBy: string;
    blockedAt: Date;
    expiresAt?: Date;
    permanent: boolean;
    attempts: number;
}

const BlockedIPSchema = new Schema<IBlockedIP>({
    ip: { type: String, required: true, unique: true, index: true },
    reason: { type: String, required: true },
    blockedBy: { type: String, required: true },
    blockedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    permanent: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 }
}, {
    timestamps: true
});

export default mongoose.model<IBlockedIP>('BlockedIP', BlockedIPSchema);
