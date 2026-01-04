import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (req.session && (req.session.isAdmin || req.session.isModerator)) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
}

// Middleware solo para admin principal (no moderadores)
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado - Solo administrador principal' });
    }
}
