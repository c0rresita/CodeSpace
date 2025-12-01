-- Tabla de logs de acceso
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    blocked INTEGER DEFAULT 0
);

CREATE INDEX idx_access_logs_ip ON access_logs(ip);
CREATE INDEX idx_access_logs_workspace ON access_logs(workspace_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);

-- Tabla de IPs bloqueadas
CREATE TABLE IF NOT EXISTS blocked_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    blocked_by TEXT,
    blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    permanent INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 1
);

CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip);
CREATE INDEX idx_blocked_ips_expires ON blocked_ips(expires_at);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_workspace ON chat_messages(workspace_id);
CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp);
