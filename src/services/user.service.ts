import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { isDatabaseConnected } from '../database/connection';
import UserModel, { IUser } from '../models/User';
import { config } from '../config';

const DATA_DIR = path.join(process.cwd(), config.dataDir);
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// ── Fichero fallback ──────────────────────────────

async function readUsersFile(): Promise<any[]> {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeUsersFile(users: any[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// ── Registro ─────────────────────────────────────

export async function registerUser(
    email: string,
    password: string,
    username: string,
    nickname: string
): Promise<{ user: { id: string; email: string; username: string; nickname: string } } | { error: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    if (isDatabaseConnected()) {
        const exists = await UserModel.findOne({ email: normalizedEmail });
        if (exists) return { error: 'El email ya está registrado' };

        const hash = await bcrypt.hash(password, 10);
        const user = await UserModel.create({
            email: normalizedEmail,
            password: hash,
            username: username.trim(),
            nickname: nickname.trim(),
            nicknameLower: nickname.trim().toLowerCase(),
            ownedWorkspaces: [],
            participatedWorkspaces: []
        });
        return { user: { id: (user._id as unknown) as string, email: user.email, username: user.username, nickname: user.nickname } };
    }

    // fallback fichero
    const users = await readUsersFile();
    if (users.find((u: any) => u.email === normalizedEmail)) return { error: 'El email ya está registrado' };

    const hash = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        email: normalizedEmail,
        password: hash,
        username: username.trim(),
        nickname: nickname.trim(),
        ownedWorkspaces: [] as string[],
        participatedWorkspaces: [] as string[],
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await writeUsersFile(users);
    return { user: { id: newUser.id, email: newUser.email, username: newUser.username, nickname: newUser.nickname } };
}

// ── Login ─────────────────────────────────────────

export async function loginUser(
    email: string,
    password: string
): Promise<{ user: { id: string; email: string; username: string; nickname: string } } | { error: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    if (isDatabaseConnected()) {
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) return { error: 'Credenciales inválidas' };

        const match = await bcrypt.compare(password, user.password);
        if (!match) return { error: 'Credenciales inválidas' };

        user.lastLogin = new Date();
        await user.save();
        return { user: { id: (user._id as unknown) as string, email: user.email, username: user.username, nickname: user.nickname || user.username } };
    }

    // fallback fichero
    const users = await readUsersFile();
    const user = users.find((u: any) => u.email === normalizedEmail);
    if (!user) return { error: 'Credenciales inválidas' };

    const match = await bcrypt.compare(password, user.password);
    if (!match) return { error: 'Credenciales inválidas' };

    user.lastLogin = new Date().toISOString();
    await writeUsersFile(users);
    return { user: { id: user.id, email: user.email, username: user.username, nickname: user.nickname || user.username } };
}

// ── Obtener usuario por ID ────────────────────────

export async function getUserById(userId: string): Promise<any | null> {
    if (isDatabaseConnected()) {
        const user = await UserModel.findById(userId).lean();
        return user || null;
    }

    const users = await readUsersFile();
    return users.find((u: any) => u.id === userId) || null;
}

// ── Añadir workspace en propiedad ─────────────────

export async function addOwnedWorkspace(userId: string, workspaceId: string): Promise<void> {
    if (isDatabaseConnected()) {
        await UserModel.updateOne(
            { _id: userId },
            { $addToSet: { ownedWorkspaces: workspaceId } }
        );
        return;
    }

    const users = await readUsersFile();
    const user = users.find((u: any) => u.id === userId);
    if (user && !user.ownedWorkspaces.includes(workspaceId)) {
        user.ownedWorkspaces.push(workspaceId);
        await writeUsersFile(users);
    }
}

// ── Añadir workspace participado ──────────────────

export async function addParticipatedWorkspace(userId: string, workspaceId: string): Promise<void> {
    if (isDatabaseConnected()) {
        await UserModel.updateOne(
            { _id: userId },
            { $addToSet: { participatedWorkspaces: workspaceId } }
        );
        return;
    }

    const users = await readUsersFile();
    const user = users.find((u: any) => u.id === userId);
    if (user && !user.participatedWorkspaces.includes(workspaceId) && !user.ownedWorkspaces.includes(workspaceId)) {
        user.participatedWorkspaces.push(workspaceId);
        await writeUsersFile(users);
    }
}

// ── Obtener workspaces del usuario con metadatos ──

export async function getUserWorkspacesInfo(userId: string): Promise<{
    owned: any[];
    participated: any[];
}> {
    const user = await getUserById(userId);
    if (!user) return { owned: [], participated: [] };

    const ownedIds: string[]        = user.ownedWorkspaces        || [];
    const participatedIds: string[] = user.participatedWorkspaces || [];

    async function loadMeta(wsId: string) {
        try {
            const filePath = path.join(DATA_DIR, `${wsId}.json`);
            const raw = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(raw);

            // Contar archivos
            let fileCount = 0;
            function countFiles(node: any) {
                if (!node) return;
                for (const v of Object.values(node)) {
                    const n = v as any;
                    if (n.type === 'file') fileCount++;
                    else if (n.type === 'folder' && n.children) countFiles(n.children);
                }
            }
            countFiles(data.structure);

            // Calcular tamaño
            let size = 0;
            function calcSize(node: any) {
                for (const v of Object.values(node)) {
                    const n = v as any;
                    if (n.type === 'file') size += (n.content || '').length;
                    else if (n.type === 'folder' && n.children) calcSize(n.children);
                }
            }
            calcSize(data.structure);

            return {
                id: wsId,
                created: data.created,
                lastAccess: data.lastAccess,
                hasPassword: !!data.password,
                fileCount,
                size
            };
        } catch {
            return null;
        }
    }

    const ownedMeta        = (await Promise.all(ownedIds.map(loadMeta))).filter(Boolean);
    const participatedMeta = (await Promise.all(participatedIds.map(loadMeta))).filter(Boolean);

    return { owned: ownedMeta, participated: participatedMeta };
}
