import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { config } from '../config';

const router = Router();
const DATA_DIR = path.join(process.cwd(), config.dataDir);

// Login de admin o moderador
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        // Verificar si es el admin principal
        if (email === config.adminEmail && password === config.adminPassword) {
            req.session.isAdmin = true;
            req.session.isModerator = false;
            req.session.userEmail = email;
            return res.json({ success: true, redirect: '/admin' });
        }
        
        // Verificar si es un moderador
        try {
            const moderatorsPath = path.join(DATA_DIR, 'moderators.json');
            const data = await fs.readFile(moderatorsPath, 'utf-8');
            const moderators = JSON.parse(data);
            
            const moderator = moderators.find((mod: any) => mod.email === email);
            
            if (moderator) {
                // Verificar si está activo
                if (moderator.active === false) {
                    return res.status(401).json({ error: 'Cuenta de moderador desactivada' });
                }
                
                // Verificar contraseña
                const passwordMatch = await bcrypt.compare(password, moderator.password);
                
                if (passwordMatch) {
                    req.session.isAdmin = false;
                    req.session.isModerator = true;
                    req.session.userEmail = email;
                    
                    // Actualizar último login
                    moderator.lastLogin = new Date().toISOString();
                    await fs.writeFile(moderatorsPath, JSON.stringify(moderators, null, 2));
                    
                    console.log(`👮 Moderador autenticado: ${email}`);
                    
                    return res.json({ success: true, redirect: '/admin' });
                }
            }
        } catch (error) {
            // Si no existe el archivo de moderadores, continuar con la validación normal
            console.log('Archivo de moderadores no encontrado o error al leer:', error);
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
