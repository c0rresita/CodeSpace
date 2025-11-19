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

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

// Middleware
app.use(express.json());

// Configuración de sesión
const sessionMiddleware = session({
    name: 'sharecode.sid',
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
    if (req.session && req.session.isAdmin) {
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

// Configurar Socket.IO
setupSocketHandlers(io, sessionMiddleware);

// Iniciar servidor
async function startServer() {
    await ensureDataDir();
    await connectDatabase(); // Conectar a MongoDB
    await cleanupExpiredWorkspaces();
    
    // Limpieza periódica
    setInterval(cleanupExpiredWorkspaces, config.cleanupInterval);
    
    server.listen(config.port, () => {
        console.log(`Servidor ejecutándose en http://localhost:${config.port}`);
        console.log(`Directorio de datos: ${path.join(process.cwd(), config.dataDir)}`);
        console.log(`Workspaces se eliminan después de ${config.workspaceExpiryDays} días de inactividad`);
        console.log(`Modo: Usuarios anónimos únicamente`);
        console.log(`Panel de administración: /accesoadministracion`);
    });
}

startServer();

export { app, server, io };
