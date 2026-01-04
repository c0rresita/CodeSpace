import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import session from 'express-session';
import path from 'path';
import { config } from './config';
import { connectDatabase } from './database/connection';
import { ensureDataDir, cleanupExpiredWorkspaces } from './services/workspace.service';
import { setupSocketHandlers } from './socket';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import workspaceRoutes from './routes/workspace.routes';
import chatRoutes from './routes/chat.routes';
import ticketRoutes from './routes/ticket.routes';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

// Middleware
app.use(express.json());

// Configuración de sesión
const sessionMiddleware = session({
    name: 'codespace.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: { 
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    }
});

app.use(sessionMiddleware);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/accesoadministracion', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'accesoadministracion.html'));
});

app.get('/admin', (req, res) => {
    if (req.session && (req.session.isAdmin || req.session.isModerator)) {
        res.sendFile(path.join(__dirname, '../public', 'admin.html'));
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
});

app.get('/:workspaceId', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'workspace.html'));
});

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/chat', chatRoutes);

// Rutas de tickets con acceso a io
app.use('/api/tickets', (req, res, next) => {
    (req as any).io = io;
    next();
}, ticketRoutes);

// Configurar Socket.IO
setupSocketHandlers(io, sessionMiddleware);

// Iniciar servidor
async function startServer() {
    await ensureDataDir();
    await connectDatabase(); // Conectar a MongoDB
    await cleanupExpiredWorkspaces();
    
    // Limpieza periódica
    setInterval(cleanupExpiredWorkspaces, config.cleanupInterval);
    
    // Solo iniciar el servidor si no estamos en Vercel
    if (process.env.VERCEL !== '1') {
        server.listen(config.port, () => {
            console.log(`\n🚀 CodeSpace Server`);
            console.log(`📍 http://localhost:${config.port}`);
            console.log(`🔐 Admin: /accesoadministracion usr: admin@admin.com pass:admin123`);
            console.log(`⏳ Expiración: ${config.workspaceExpiryDays} días\n`);
        });
    }
}

startServer();

export { app, server, io };
