import { Router, Request, Response } from 'express';
import * as userService from '../services/user.service';

const router = Router();

// ── Registro ──────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, username, nickname } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Email, contraseña y nombre de usuario son obligatorios' });
        }
        if (!nickname || nickname.trim().length < 2) {
            return res.status(400).json({ error: 'El NickName debe tener al menos 2 caracteres' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        if (username.trim().length < 2) {
            return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 2 caracteres' });
        }

        const result = await userService.registerUser(email, password, username, nickname);
        if ('error' in result) {
            return res.status(409).json({ error: result.error });
        }

        req.session.userEmail    = result.user.email;
        req.session.userId       = result.user.id;
        req.session.userUsername = result.user.username;
        req.session.userNickname = result.user.nickname;
        req.session.isLoggedIn   = true;

        res.json({ success: true, user: result.user });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// ── Login ─────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }

        const result = await userService.loginUser(email, password);
        if ('error' in result) {
            return res.status(401).json({ error: result.error });
        }

        req.session.userEmail    = result.user.email;
        req.session.userId       = result.user.id;
        req.session.userUsername = result.user.username;
        req.session.userNickname = result.user.nickname;
        req.session.isLoggedIn   = true;

        res.json({ success: true, user: result.user });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// ── Logout ────────────────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Error al cerrar sesión' });
        res.clearCookie('codespace.sid');
        res.json({ success: true });
    });
});

// ── Perfil actual ─────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const user = await userService.getUserById(req.session.userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json({
            id:       user._id || user.id,
            email:    user.email,
            username: user.username,
            nickname: user.nickname || user.username,
            createdAt: user.createdAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// ── Workspaces del usuario ────────────────────────
router.get('/workspaces', async (req: Request, res: Response) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const data = await userService.getUserWorkspacesInfo(req.session.userId);
        res.json(data);
    } catch (error) {
        console.error('Error obteniendo workspaces:', error);
        res.status(500).json({ error: 'Error al obtener workspaces' });
    }
});

// ── Buzón de notificaciones ──────────────────────
router.get('/notifications', async (req: Request, res: Response) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const ticketService = await import('../services/ticket.service');
        const inbox = await ticketService.getUserNotificationInbox(req.session.userId);
        res.json(inbox);
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

export default router;
