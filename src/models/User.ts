import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password: string;
    username: string;
    nickname: string;
    nicknameLower?: string;
    lastLogin?: Date;
    ownedWorkspaces: string[];
    participatedWorkspaces: string[];
    active?: boolean;
    blocked?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { type: String, required: true },
    username: { type: String, required: true, trim: true },
    nickname: { type: String, required: true, trim: true },
    nicknameLower: { type: String, trim: true },
    lastLogin: { type: Date },
    ownedWorkspaces: [{ type: String }],
    participatedWorkspaces: [{ type: String }],
    active: { type: Boolean, default: true },
    blocked: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
