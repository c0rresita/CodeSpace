import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

// Login de admin
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        if (email === config.adminEmail && password === config.adminPassword) {
            req.session.isAdmin = true;
            return res.json({ success: true, redirect: '/admin' });
        }
        
        return res.status(401).json({ error: 'Credenciales inválidas' });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.clearCookie('codespace.sid');
        res.json({ success: true });
    });
});

export default router;
