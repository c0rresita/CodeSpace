const socket = io();
const editor = document.getElementById('editor');
const editorWrapper = document.getElementById('editorWrapper');
const emptyState = document.getElementById('emptyState');
const fileTree = document.getElementById('fileTree');
const editorTabs = document.getElementById('editorTabs');
const currentFileName = document.getElementById('currentFileName');
const usersCountEl = document.getElementById('usersCount');
const usersTextEl = document.getElementById('usersText');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const toast = document.getElementById('toast');
const contextMenu = document.getElementById('contextMenu');
const githubModal = document.getElementById('githubModal');

// Obtener workspace ID de la URL
const workspaceId = window.location.pathname.substring(1) || 'main';
let currentFile = null;
let currentFolder = null;
let fileStructure = {};
let modalType = null;
let isUpdating = false;
let lastContent = '';
let openTabs = [];
let contextMenuTarget = null;
let codeMirrorEditor = null;
let userPlan = 'FREE';
let userFeatures = {};
let currentSidebar = 'files';
let username = 'Usuario' + Math.floor(Math.random() * 1000);
let unreadMessages = 0;
let onlineUsers = new Map();
let workspacePassword = null;

// Sistema de intentos de contraseña
let passwordAttempts = 0;
let maxAttempts = 3;
let lockoutEndTime = null;
let lockoutDuration = 30; // Empieza con 30 segundos
let lockoutTimer = null;

// Restaurar estado de lockout desde localStorage
const savedLockout = localStorage.getItem(`lockout_${workspaceId}`);
if (savedLockout) {
    const lockoutData = JSON.parse(savedLockout);
    const now = Date.now();
    
    if (lockoutData.endTime > now) {
        // Aún está bloqueado
        lockoutEndTime = lockoutData.endTime;
        lockoutDuration = lockoutData.duration;
        passwordAttempts = maxAttempts; // Forzar que muestre el lockout
    } else {
        // El lockout expiró, limpiar
        localStorage.removeItem(`lockout_${workspaceId}`);
        lockoutDuration = lockoutData.duration || 30; // Mantener la duración acumulada
    }
}

// Sidebar resize
let isResizing = false;
let sidebarWidth = 250;

// Mostrar nombre del workspace
document.getElementById('workspaceName').textContent = workspaceId;
document.getElementById('usernameInput').value = username;

// Verificar si hay contraseña guardada en sessionStorage
const savedPassword = sessionStorage.getItem(`ws_pass_${workspaceId}`);
if (savedPassword) {
    workspacePassword = savedPassword;
}
// Siempre intentar unirse (con o sin contraseña)
joinWorkspace();

function joinWorkspace() {
    socket.emit('join-workspace', { workspaceId, password: workspacePassword });
}

// Manejar error de workspace (contraseña requerida/incorrecta)
socket.on('workspace-error', (data) => {
    if (data.error === 'blocked') {
        showToast('Tu IP ha sido bloqueada. Contacta al administrador.');
        // Deshabilitar todo
        const mainContent = document.querySelector('.main-container');
        const header = document.querySelector('.header');
        if (mainContent) mainContent.style.display = 'none';
        if (header) header.style.display = 'none';
        return;
    }
    
    if (data.error === 'password_required') {
        showPasswordModal();
    } else if (data.error === 'invalid_password') {
        handleFailedPasswordAttempt();
    }
});

function handleFailedPasswordAttempt() {
    passwordAttempts++;
    workspacePassword = null;
    sessionStorage.removeItem(`ws_pass_${workspaceId}`);
    
    // Limpiar el input de contraseña
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) passwordInput.value = '';
    
    const remainingAttempts = maxAttempts - passwordAttempts;
    
    if (remainingAttempts > 0) {
        showToast(`Contraseña incorrecta. ${remainingAttempts} intentos restantes.`);
        updateAttemptsDisplay();
    } else {
        // Bloquear temporalmente
        startLockout();
    }
}

function startLockout() {
    const now = Date.now();
    lockoutEndTime = now + (lockoutDuration * 1000);
    
    // Guardar estado de lockout en localStorage
    localStorage.setItem(`lockout_${workspaceId}`, JSON.stringify({
        endTime: lockoutEndTime,
        duration: lockoutDuration
    }));
    
    // Deshabilitar input y botón
    const passwordInput = document.getElementById('passwordInput');
    const submitBtn = document.getElementById('submitPasswordBtn');
    const lockoutMessage = document.getElementById('lockoutMessage');
    const attemptsDisplay = document.getElementById('attemptsRemaining');
    
    passwordInput.disabled = true;
    submitBtn.disabled = true;
    lockoutMessage.style.display = 'block';
    attemptsDisplay.style.display = 'none';
    
    // Iniciar contador regresivo
    updateLockoutTimer();
    lockoutTimer = setInterval(updateLockoutTimer, 1000);
    
    showToast('Demasiados intentos fallidos. Espera antes de intentar nuevamente.');
}

function updateLockoutTimer() {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((lockoutEndTime - now) / 1000));
    
    if (remaining === 0) {
        endLockout();
        return;
    }
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timerDisplay = document.getElementById('lockoutTimer');
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function endLockout() {
    if (lockoutTimer) {
        clearInterval(lockoutTimer);
        lockoutTimer = null;
    }
    
    // Limpiar localStorage
    localStorage.removeItem(`lockout_${workspaceId}`);
    
    // Habilitar input y botón
    const passwordInput = document.getElementById('passwordInput');
    const submitBtn = document.getElementById('submitPasswordBtn');
    const lockoutMessage = document.getElementById('lockoutMessage');
    const attemptsDisplay = document.getElementById('attemptsRemaining');
    
    passwordInput.disabled = false;
    submitBtn.disabled = false;
    lockoutMessage.style.display = 'none';
    attemptsDisplay.style.display = 'block';
    
    // Duplicar el tiempo de bloqueo para el próximo fallo
    lockoutDuration *= 2;
    
    // Resetear intentos
    passwordAttempts = 0;
    updateAttemptsDisplay();
    
    showToast('Puedes intentar nuevamente.', true);
}

function updateAttemptsDisplay() {
    const attemptsDisplay = document.getElementById('attemptsRemaining');
    const remainingAttempts = maxAttempts - passwordAttempts;
    
    if (attemptsDisplay) {
        attemptsDisplay.textContent = `Intentos restantes: ${remainingAttempts}`;
        
        // Cambiar color según intentos restantes
        if (remainingAttempts === 1) {
            attemptsDisplay.style.color = '#ff5252';
        } else if (remainingAttempts === 2) {
            attemptsDisplay.style.color = '#ffab00';
        } else {
            attemptsDisplay.style.color = '#4ec9b0';
        }
    }
}

function showPasswordModal() {
    const passwordModal = document.getElementById('accessPasswordModal');
    const passwordInput = document.getElementById('passwordInput');
    
    // Difuminar el fondo
    const mainContent = document.querySelector('.main-container');
    const header = document.querySelector('.header');
    if (mainContent) mainContent.classList.add('blurred-background');
    if (header) header.classList.add('blurred-background');
    
    passwordModal.style.display = 'flex';
    updateAttemptsDisplay();
    
    // Verificar si hay lockout activo al abrir el modal
    if (lockoutEndTime && lockoutEndTime > Date.now()) {
        startLockout(); // Reactivar el lockout visual
    }
    
    setTimeout(() => {
        if (!passwordInput.disabled) {
            passwordInput.focus();
        }
    }, 100);
}

function submitPassword() {
    const passwordInput = document.getElementById('passwordInput');
    workspacePassword = passwordInput.value.trim();
    
    if (!workspacePassword) {
        showToast('Por favor, introduce una contraseña');
        return;
    }
    
    // Guardar en sessionStorage
    sessionStorage.setItem(`ws_pass_${workspaceId}`, workspacePassword);
    
    // NO cerrar el modal aún, esperar respuesta del servidor
    // joinWorkspace();
    socket.emit('join-workspace', { workspaceId, password: workspacePassword });
}

// Enter para enviar contraseña
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitPassword();
            }
        });
    }
});

// Obtener plan del usuario
socket.emit('get-plan');

socket.on('user-plan', (data) => {
    userPlan = data.plan;
    userFeatures = data.features;
    
    // Actualizar UI según plan
    updatePlanUI();
});

function updatePlanUI() {
    const planBadge = document.getElementById('planBadge');
    const planName = document.getElementById('planName');
    const terminalBtn = document.getElementById('terminalBtn');
    
    planName.textContent = `Plan ${userPlan}`;
    
    if (userPlan === 'PRO' || userPlan === 'ENTERPRISE') {
        planBadge.classList.add('pro');
        if (userFeatures.terminal) {
            terminalBtn.style.display = 'flex';
        }
    }
}

function showTerminal() {
    if (!userFeatures.terminal) {
        showToast('Terminal disponible solo en planes Pro y Enterprise');
        window.open('/plans', '_blank');
        return;
    }
    
    // Crear terminal
    socket.emit('create-terminal', { workspaceId });
}

socket.on('terminal-ready', (data) => {
    showToast('Terminal iniciada', true);
    // Aquí podrías abrir un modal con la terminal
});

socket.on('terminal-error', (data) => {
    showToast(data.error);
});

socket.on('terminal-output', (data) => {
    // Mostrar output de la terminal
    console.log('Terminal output:', data);
});

// Switch sidebar panel
function switchSidebar(panel) {
    currentSidebar = panel;
    
    // Update activity bar
    document.querySelectorAll('.activity-bar-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Update sidebar content
    document.querySelectorAll('.sidebar-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const sidebar = document.querySelector('.sidebar');
    
    if (panel === 'files') {
        document.getElementById('filesPanel').classList.add('active');
        sidebar.classList.remove('collapsed');
    } else if (panel === 'chat') {
        document.getElementById('chatPanel').classList.add('active');
        sidebar.classList.remove('collapsed');
        unreadMessages = 0;
        updateChatBadge();
    } else if (panel === 'users') {
        document.getElementById('usersPanel').classList.add('active');
        sidebar.classList.remove('collapsed');
        updateUserList();
    }
    
    // Toggle sidebar if clicking same panel
    if (sidebar.style.width === '0px') {
        sidebar.style.width = sidebarWidth + 'px';
    }
}

// Sidebar resize functionality
const resizeHandle = document.getElementById('resizeHandle');
const sidebar = document.querySelector('.sidebar');

resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX - 48; // 48px es el ancho de la activity bar
    
    if (newWidth >= 150 && newWidth <= 600) {
        sidebar.style.width = newWidth + 'px';
        sidebarWidth = newWidth;
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }
});

// Chat functions
function setUsername() {
    const input = document.getElementById('usernameInput');
    const newUsername = input.value.trim();
    
    if (newUsername && newUsername.length > 0) {
        const oldUsername = username;
        username = newUsername;
        
        // Notify server
        socket.emit('username-change', { 
            oldUsername, 
            newUsername,
            workspaceId 
        });
        
        showToast(`Nombre cambiado a: ${username}`, true);
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        socket.emit('chat-message', {
            workspaceId,
            username,
            message,
            timestamp: Date.now()
        });
        
        input.value = '';
    }
}

function addChatMessage(data, isOwn = false) {
    const messagesContainer = document.getElementById('chatMessages');
    
    if (data.type === 'system') {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-system';
        messageEl.textContent = data.message;
        messagesContainer.appendChild(messageEl);
    } else {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message' + (isOwn ? ' own' : '');
        
        const time = new Date(data.timestamp).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageEl.innerHTML = `
            <div class="chat-message-header">
                <span class="chat-username">${escapeHtml(data.username)}</span>
                <span class="chat-time">${time}</span>
            </div>
            <div class="chat-text">${escapeHtml(data.message)}</div>
        `;
        
        messagesContainer.appendChild(messageEl);
    }
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Update badge if chat is not active
    if (currentSidebar !== 'chat' && !isOwn) {
        unreadMessages++;
        updateChatBadge();
    }
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    if (unreadMessages > 0) {
        badge.textContent = unreadMessages;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function updateUserList() {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    
    onlineUsers.forEach((userName, userId) => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item' + (userId === socket.id ? ' own' : '');
        userItem.innerHTML = `
            <div class="user-status"></div>
            <div class="user-name">${escapeHtml(userName)}</div>
        `;
        userList.appendChild(userItem);
    });
}

function updateUsersBadge(count) {
    document.getElementById('usersBadge').textContent = count;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Chat input enter key
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

document.getElementById('usernameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        setUsername();
    }
});

// Inicializar CodeMirror
function initCodeMirror() {
    codeMirrorEditor = CodeMirror.fromTextArea(editor, {
        lineNumbers: true,
        theme: 'material-darker',
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        extraKeys: {
            "Tab": function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("    ", "end");
                }
            }
        }
    });

    // Detectar cambios en CodeMirror
    codeMirrorEditor.on('change', (cm, change) => {
        if (!isUpdating && currentFile && change.origin !== 'setValue') {
            const currentContent = cm.getValue();
            const cursor = cm.getCursor();
            
            const changeData = {
                type: change.origin === '+delete' ? 'delete' : 'insert',
                position: cm.indexFromPos(change.from),
                text: change.text.join('\n'),
                removed: change.removed.join('\n')
            };
            
            socket.emit('send-changes', {
                workspaceId,
                path: currentFile,
                content: currentContent,
                change: changeData,
                cursor: { line: cursor.line, ch: cursor.ch }
            });
            
            lastContent = currentContent;
        }
    });
}

// Detectar modo de CodeMirror según extensión
function getModeFromFilename(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const modeMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'javascript',
        'tsx': 'javascript',
        'json': 'javascript',
        'py': 'python',
        'html': 'htmlmixed',
        'htm': 'htmlmixed',
        'css': 'css',
        'scss': 'css',
        'sass': 'css',
        'xml': 'xml',
        'svg': 'xml',
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        'c': 'text/x-csrc',
        'h': 'text/x-csrc',
        'cpp': 'text/x-c++src',
        'java': 'text/x-java',
        'cs': 'text/x-csharp',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'md': 'markdown',
        'sql': 'sql',
        'yml': 'yaml',
        'yaml': 'yaml',
        'dockerfile': 'dockerfile',
        'txt': 'text/plain'
    };
    
    return modeMap[ext] || 'text/plain';
}

// Obtener icono según extensión
function getIconForFile(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const name = filename.toLowerCase();
    
    // Archivos especiales por nombre
    const specialFiles = {
        'dockerfile': '<i class="devicon-docker-plain colored"></i>',
        'docker-compose.yml': '<i class="devicon-docker-plain colored"></i>',
        'docker-compose.yaml': '<i class="devicon-docker-plain colored"></i>',
        'package.json': '<i class="devicon-nodejs-plain colored"></i>',
        'package-lock.json': '<i class="devicon-nodejs-plain colored"></i>',
        'tsconfig.json': '<i class="devicon-typescript-plain colored"></i>',
        '.gitignore': '<i class="devicon-git-plain colored"></i>',
        '.env': '<i class="devicon-dotnetcore-plain colored"></i>',
        'readme.md': '<i data-feather="book-open" style="color: #4ec9b0;"></i>',
        'license': '<i data-feather="file-text" style="color: #969696;"></i>',
        'makefile': '<i data-feather="tool" style="color: #ce9178;"></i>',
        '.prettierrc': '<i data-feather="code" style="color: #c586c0;"></i>',
        '.eslintrc': '<i data-feather="shield" style="color: #4ec9b0;"></i>'
    };
    
    if (specialFiles[name]) {
        return specialFiles[name];
    }
    
    // Iconos por extensión con devicon
    const iconMap = {
        // JavaScript/TypeScript
        'js': '<i class="devicon-javascript-plain colored"></i>',
        'jsx': '<i class="devicon-react-original colored"></i>',
        'ts': '<i class="devicon-typescript-plain colored"></i>',
        'tsx': '<i class="devicon-react-original colored"></i>',
        'mjs': '<i class="devicon-javascript-plain colored"></i>',
        
        // Python
        'py': '<i class="devicon-python-plain colored"></i>',
        'pyc': '<i class="devicon-python-plain colored"></i>',
        'pyw': '<i class="devicon-python-plain colored"></i>',
        
        // Web
        'html': '<i class="devicon-html5-plain colored"></i>',
        'htm': '<i class="devicon-html5-plain colored"></i>',
        'css': '<i class="devicon-css3-plain colored"></i>',
        'scss': '<i class="devicon-sass-original colored"></i>',
        'sass': '<i class="devicon-sass-original colored"></i>',
        'less': '<i class="devicon-less-plain-wordmark colored"></i>',
        
        // Frameworks
        'vue': '<i class="devicon-vuejs-plain colored"></i>',
        'svelte': '<i class="devicon-svelte-plain colored"></i>',
        
        // Backend
        'php': '<i class="devicon-php-plain colored"></i>',
        'rb': '<i class="devicon-ruby-plain colored"></i>',
        'java': '<i class="devicon-java-plain colored"></i>',
        'go': '<i class="devicon-go-original-wordmark colored"></i>',
        'rs': '<i class="devicon-rust-plain colored"></i>',
        'c': '<i class="devicon-c-plain colored"></i>',
        'cpp': '<i class="devicon-cplusplus-plain colored"></i>',
        'cs': '<i class="devicon-csharp-plain colored"></i>',
        'swift': '<i class="devicon-swift-plain colored"></i>',
        'kt': '<i class="devicon-kotlin-plain colored"></i>',
        
        // Shell/Scripts
        'sh': '<i data-feather="terminal" style="color: #4ec9b0;"></i>',
        'bash': '<i data-feather="terminal" style="color: #4ec9b0;"></i>',
        'zsh': '<i data-feather="terminal" style="color: #4ec9b0;"></i>',
        'ps1': '<i data-feather="terminal" style="color: #569cd6;"></i>',
        
        // Data/Config
        'json': '<i data-feather="code" style="color: #ce9178;"></i>',
        'xml': '<i data-feather="code" style="color: #ce9178;"></i>',
        'yml': '<i data-feather="settings" style="color: #c586c0;"></i>',
        'yaml': '<i data-feather="settings" style="color: #c586c0;"></i>',
        'toml': '<i data-feather="settings" style="color: #c586c0;"></i>',
        'ini': '<i data-feather="settings" style="color: #969696;"></i>',
        'conf': '<i data-feather="settings" style="color: #969696;"></i>',
        
        // Database
        'sql': '<i class="devicon-mysql-plain colored"></i>',
        'db': '<i data-feather="database" style="color: #4ec9b0;"></i>',
        'sqlite': '<i data-feather="database" style="color: #4ec9b0;"></i>',
        
        // Documentation
        'md': '<i class="devicon-markdown-original colored"></i>',
        'mdx': '<i class="devicon-markdown-original colored"></i>',
        'txt': '<i data-feather="file-text" style="color: #969696;"></i>',
        'pdf': '<i data-feather="file" style="color: #d16969;"></i>',
        
        // Images
        'png': '<i data-feather="image" style="color: #c586c0;"></i>',
        'jpg': '<i data-feather="image" style="color: #c586c0;"></i>',
        'jpeg': '<i data-feather="image" style="color: #c586c0;"></i>',
        'gif': '<i data-feather="image" style="color: #c586c0;"></i>',
        'svg': '<i data-feather="image" style="color: #4ec9b0;"></i>',
        'ico': '<i data-feather="image" style="color: #969696;"></i>',
        
        // Archives
        'zip': '<i data-feather="archive" style="color: #ce9178;"></i>',
        'tar': '<i data-feather="archive" style="color: #ce9178;"></i>',
        'gz': '<i data-feather="archive" style="color: #ce9178;"></i>',
        'rar': '<i data-feather="archive" style="color: #ce9178;"></i>',
        '7z': '<i data-feather="archive" style="color: #ce9178;"></i>',
        
        // Git
        'git': '<i class="devicon-git-plain colored"></i>',
        'gitignore': '<i class="devicon-git-plain colored"></i>',
        'gitattributes': '<i class="devicon-git-plain colored"></i>',
        
        // Others
        'log': '<i data-feather="file-text" style="color: #969696;"></i>',
        'lock': '<i data-feather="lock" style="color: #ce9178;"></i>',
        'env': '<i data-feather="key" style="color: #4ec9b0;"></i>'
    };
    
    return iconMap[ext] || '<i data-feather="file" style="color: #969696;"></i>';
}

// La conexión inicial se maneja más arriba (línea ~55) con verificación de contraseña
// socket.emit('join-workspace', { workspaceId, password: workspacePassword });

// Cargar estructura de archivos
socket.on('load-structure', (structure) => {
    fileStructure = structure;
    renderFileTree();
    
    // Cerrar modal de contraseña si está abierto
    const passwordModal = document.getElementById('accessPasswordModal');
    if (passwordModal && passwordModal.style.display === 'flex') {
        passwordModal.style.display = 'none';
        
        // Limpiar input
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) passwordInput.value = '';
    }
    
    // Resetear intentos de contraseña al cargar exitosamente
    passwordAttempts = 0;
    lockoutDuration = 30; // Resetear a 30 segundos
    updateAttemptsDisplay();
    
    // Quitar difuminado si está activo
    const mainContent = document.querySelector('.main-container');
    const header = document.querySelector('.header');
    if (mainContent) mainContent.classList.remove('blurred-background');
    if (header) header.classList.remove('blurred-background');
    
    // Inicializar CodeMirror si aún no está inicializado
    if (!codeMirrorEditor) {
        initCodeMirror();
    }
    
    // Una vez cargada la estructura, establecer el username
    socket.emit('set-username', { workspaceId, username });
});

// Cargar contenido de archivo
socket.on('load-file', ({ path, content }) => {
    currentFile = path;
    isUpdating = true;
    
    if (codeMirrorEditor) {
        codeMirrorEditor.setValue(content || '');
        
        // Establecer modo según extensión
        const mode = getModeFromFilename(path);
        codeMirrorEditor.setOption('mode', mode);
        
        lastContent = content || '';
    }
    
    isUpdating = false;
    
    showEditor();
    updateCurrentFileName();
    addTab(path);
});

// Recibir cambios de otros usuarios
socket.on('receive-changes', (data) => {
    if (!isUpdating && currentFile === data.path && codeMirrorEditor) {
        const { content, change, cursor } = data;
        
        isUpdating = true;
        
        // Guardar cursor actual
        const currentCursor = codeMirrorEditor.getCursor();
        const scrollInfo = codeMirrorEditor.getScrollInfo();
        
        if (change && change.type === 'insert') {
            const from = codeMirrorEditor.posFromIndex(change.position);
            codeMirrorEditor.replaceRange(change.text, from);
        } else if (change && change.type === 'delete') {
            const from = codeMirrorEditor.posFromIndex(change.position);
            const to = codeMirrorEditor.posFromIndex(change.position + change.removed.length);
            codeMirrorEditor.replaceRange('', from, to);
        } else {
            // Fallback: reemplazar todo el contenido
            codeMirrorEditor.setValue(content);
        }
        
        // Restaurar scroll
        codeMirrorEditor.scrollTo(scrollInfo.left, scrollInfo.top);
        
        lastContent = codeMirrorEditor.getValue();
        isUpdating = false;
    }
});

// Actualizar estructura cuando cambia
socket.on('structure-updated', (structure) => {
    fileStructure = structure;
    renderFileTree();
});

// Archivo/carpeta eliminado
socket.on('item-deleted', ({ path }) => {
    // Si el archivo eliminado está abierto, cerrarlo
    if (currentFile === path) {
        closeTab(path, { stopPropagation: () => {} });
    }
    showToast('Elemento eliminado');
});

// Actualizar contador de usuarios
socket.on('users-count', (count) => {
    usersCountEl.textContent = count;
    usersTextEl.textContent = count === 1 ? 'usuario' : 'usuarios';
    updateUsersBadge(count);
});

// Notificación de nuevo usuario
socket.on('user-connected', () => {
    showToast('Un nuevo usuario se ha conectado');
});

// Eventos del chat
socket.on('chat-message', (data) => {
    addChatMessage(data, false);
});

socket.on('chat-message-own', (data) => {
    addChatMessage(data, true);
});

socket.on('chat-system', (data) => {
    addChatMessage({ type: 'system', message: data.message });
});

socket.on('users-list', (users) => {
    onlineUsers.clear();
    users.forEach(user => {
        onlineUsers.set(user.id, user.username);
    });
    updateUserList();
});

socket.on('user-joined', (data) => {
    onlineUsers.set(data.id, data.username);
    updateUserList();
    addChatMessage({ 
        type: 'system', 
        message: `${data.username} se ha unido al workspace` 
    });
});

socket.on('user-left', (data) => {
    const userName = onlineUsers.get(data.id) || 'Usuario';
    onlineUsers.delete(data.id);
    updateUserList();
    addChatMessage({ 
        type: 'system', 
        message: `${userName} ha salido del workspace` 
    });
});

socket.on('username-changed', (data) => {
    onlineUsers.set(data.id, data.newUsername);
    updateUserList();
    addChatMessage({ 
        type: 'system', 
        message: `${data.oldUsername} ahora es ${data.newUsername}` 
    });
});

// Respuesta al establecer contraseña en archivo
socket.on('file-password-set', ({ path, success, error }) => {
    if (success) {
        showToast('Contraseña establecida correctamente', true);
        // Actualizar estructura para reflejar que el archivo tiene contraseña
        socket.emit('get-structure', { workspaceId });
    } else {
        showToast(error || 'Error al establecer contraseña');
    }
});

// Respuesta al quitar contraseña de archivo
socket.on('file-password-removed', ({ path, success, error }) => {
    if (success) {
        showToast('Contraseña eliminada correctamente', true);
        // Actualizar estructura para reflejar que el archivo ya no tiene contraseña
        socket.emit('get-structure', { workspaceId });
    } else {
        showToast(error || 'Contraseña incorrecta');
    }
});

// Respuesta al desbloquear archivo
socket.on('file-unlocked', ({ path, content, success, error }) => {
    closeUnlockModal();
    if (success) {
        // Cargar el archivo como si se hubiera abierto normalmente
        currentFile = path;
        isUpdating = true;
        
        if (codeMirrorEditor) {
            codeMirrorEditor.setValue(content || '');
            const mode = getModeFromFilename(path);
            codeMirrorEditor.setOption('mode', mode);
            lastContent = content || '';
        }
        
        isUpdating = false;
        showEditor();
        updateCurrentFileName();
        addTab(path);
    } else {
        showToast(error || 'Contraseña incorrecta');
    }
});

// Solicitud de contraseña para archivo protegido
socket.on('file-password-required', ({ path }) => {
    const modal = document.getElementById('unlockFileModal');
    modal.dataset.filePath = path;
    modal.style.display = 'flex';
});

// Renderizar árbol de archivos
function renderFileTree() {
    fileTree.innerHTML = '';
    renderTreeNode(fileStructure, fileTree, '');
    
    // Inicializar iconos de Feather después de renderizar
    feather.replace();
}

function renderTreeNode(node, container, path) {
    const sortedKeys = Object.keys(node).sort((a, b) => {
        const aIsFolder = node[a].type === 'folder';
        const bIsFolder = node[b].type === 'folder';
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
        const item = node[key];
        const itemPath = path ? `${path}/${key}` : key;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'tree-item';
        itemEl.draggable = true;
        itemEl.dataset.path = itemPath;
        itemEl.dataset.type = item.type;
        
        if (item.type === 'folder') {
            itemEl.classList.add('folder');
            itemEl.innerHTML = `
                <span class="chevron">▸</span>
                <span class="icon"><i data-feather="folder"></i></span>
                <span>${key}</span>
            `;
            
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';
            childrenContainer.style.display = 'none';
            
            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const chevron = itemEl.querySelector('.chevron');
                const isExpanded = chevron.classList.toggle('expanded');
                childrenContainer.style.display = isExpanded ? 'block' : 'none';
            });
            
            // Drag & Drop para carpetas
            setupDragAndDrop(itemEl, itemPath, true);
            
            // Click derecho
            setupContextMenu(itemEl, itemPath, item.type);
            
            container.appendChild(itemEl);
            
            container.appendChild(childrenContainer);
            
            if (item.children) {
                renderTreeNode(item.children, childrenContainer, itemPath);
            }
        } else {
            const fileIcon = getIconForFile(key);
            const lockIcon = item.hasPassword ? ' <i data-feather="lock" style="width:12px;height:12px;vertical-align:middle;opacity:0.6;"></i>' : '';
            itemEl.innerHTML = `
                <span class="icon">${fileIcon}</span>
                <span>${key}${lockIcon}</span>
            `;
            
            if (currentFile === itemPath) {
                itemEl.classList.add('selected');
            }
            
            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openFile(itemPath);
            });
            
            // Drag & Drop para archivos
            setupDragAndDrop(itemEl, itemPath, false);
            
            // Click derecho
            setupContextMenu(itemEl, itemPath, item.type);
            
            container.appendChild(itemEl);
            
            // Inicializar icono
            feather.replace();
        }
    });
}

// Abrir archivo
function openFile(path) {
    socket.emit('open-file', { workspaceId, path });
    
    // Actualizar selección en el árbol
    document.querySelectorAll('.tree-item').forEach(el => {
        el.classList.remove('selected');
    });
    event.target.closest('.tree-item').classList.add('selected');
}

// Mostrar editor
function showEditor() {
    emptyState.style.display = 'none';
    editorWrapper.style.display = 'block';
    if (codeMirrorEditor) {
        codeMirrorEditor.refresh();
        codeMirrorEditor.focus();
    }
}

// Actualizar nombre de archivo actual
function updateCurrentFileName() {
    currentFileName.textContent = currentFile || 'Sin archivo abierto';
}

// Agregar pestaña
function addTab(path) {
    if (!openTabs.includes(path)) {
        openTabs.push(path);
    }
    renderTabs();
}

// Renderizar pestañas
function renderTabs() {
    editorTabs.innerHTML = '';
    openTabs.forEach(tabPath => {
        const tab = document.createElement('div');
        tab.className = 'editor-tab';
        if (tabPath === currentFile) {
            tab.classList.add('active');
        }
        
        const fileName = tabPath.split('/').pop();
        const fileIcon = getIconForFile(fileName);
        tab.innerHTML = `
            ${fileIcon}
            <span>${fileName}</span>
            <span class="close-tab" onclick="closeTab('${tabPath}', event)">×</span>
        `;
        
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('close-tab')) {
                openFile(tabPath);
            }
        });
        
        editorTabs.appendChild(tab);
    });
    
    // Inicializar iconos de Feather después de renderizar todas las tabs
    feather.replace();
}

// Cerrar pestaña
function closeTab(path, event) {
    event.stopPropagation();
    const index = openTabs.indexOf(path);
    if (index > -1) {
        openTabs.splice(index, 1);
    }
    
    if (currentFile === path) {
        if (openTabs.length > 0) {
            openFile(openTabs[openTabs.length - 1]);
        } else {
            currentFile = null;
            editorWrapper.style.display = 'none';
            emptyState.style.display = 'flex';
            updateCurrentFileName();
        }
    }
    
    renderTabs();
}

// Modales
function showNewFileModal() {
    modalType = 'file';
    modalTitle.textContent = 'Nuevo archivo';
    modalInput.placeholder = 'nombre.txt';
    modalInput.value = '';
    modal.classList.add('show');
    modalInput.focus();
}

function showNewFolderModal() {
    modalType = 'folder';
    modalTitle.textContent = 'Nueva carpeta';
    modalInput.placeholder = 'nombre-carpeta';
    modalInput.value = '';
    modal.classList.add('show');
    modalInput.focus();
}

function closeModal() {
    modal.classList.remove('show');
    modalInput.value = '';
}

function confirmModal() {
    const name = modalInput.value.trim();
    if (!name) {
        showToast('Por favor, ingresa un nombre');
        return;
    }
    
    if (modalType === 'file') {
        socket.emit('create-file', { workspaceId, name });
    } else if (modalType === 'folder') {
        socket.emit('create-folder', { workspaceId, name });
    }
    
    closeModal();
}

// Enter en modal
modalInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        confirmModal();
    }
});

// Detectar cambios
function detectChange(oldText, newText, cursorPosition) {
    if (newText.length > oldText.length) {
        const diffLength = newText.length - oldText.length;
        const position = cursorPosition - diffLength;
        const insertedText = newText.substring(position, cursorPosition);
        
        return {
            type: 'insert',
            position: position,
            text: insertedText,
            length: diffLength
        };
    } else if (newText.length < oldText.length) {
        const diffLength = oldText.length - newText.length;
        
        return {
            type: 'delete',
            position: cursorPosition,
            length: diffLength
        };
    }
    
    return {
        type: 'replace',
        position: 0,
        text: newText
    };
}

// Copiar enlace
function shareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('¡Enlace copiado al portapapeles!', true);
    }).catch(() => {
        showToast('No se pudo copiar el enlace');
    });
}

// Exportar workspace como ZIP
function exportWorkspace() {
    showToast('Preparando descarga...', true);
    
    fetch(`/api/workspace/export/${workspaceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al exportar');
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${workspaceId}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('¡Workspace descargado!', true);
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error al descargar el workspace');
        });
}

// Mostrar modal de GitHub
function showGitHubModal() {
    githubModal.classList.add('show');
    document.getElementById('githubRepo').focus();
}

// Cerrar modal de GitHub
function closeGitHubModal() {
    githubModal.classList.remove('show');
    document.getElementById('githubRepo').value = '';
    document.getElementById('githubToken').value = '';
}

// Exportar a GitHub
async function exportToGitHub() {
    const repo = document.getElementById('githubRepo').value.trim();
    const token = document.getElementById('githubToken').value.trim();
    
    if (!repo) {
        showToast('Por favor, ingresa un repositorio');
        return;
    }
    
    try {
        showToast('Preparando exportación a GitHub...', true);
        
        // Obtener estructura del workspace
        const response = await fetch(`/api/structure/${workspaceId}`);
        const data = await response.json();
        
        if (!data.structure) {
            showToast('Error al obtener estructura del workspace');
            return;
        }
        
        // Crear archivos en GitHub usando la API
        const [owner, repoName] = repo.split('/');
        
        if (!owner || !repoName) {
            showToast('Formato de repositorio inválido. Usa: usuario/repositorio');
            return;
        }
        
        // Generar instrucciones para el usuario
        const instructions = generateGitHubInstructions(data.structure, owner, repoName);
        
        // Abrir en nueva ventana
        const instructionsWindow = window.open('', '_blank');
        instructionsWindow.document.write(instructions);
        
        closeGitHubModal();
        showToast('Instrucciones generadas. Revisa la nueva ventana.', true);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al exportar a GitHub');
    }
}

// Generar instrucciones para GitHub
function generateGitHubInstructions(structure, owner, repo) {
    let commands = [];
    
    // Función recursiva para generar comandos
    function generateCommands(node, basePath = '') {
        for (const [name, item] of Object.entries(node)) {
            const itemPath = basePath ? `${basePath}/${name}` : name;
            
            if (item.type === 'folder' && item.children) {
                commands.push(`mkdir -p "${itemPath}"`);
                generateCommands(item.children, itemPath);
            } else if (item.type === 'file') {
                const content = (item.content || '').replace(/"/g, '\\"').replace(/\n/g, '\\n');
                commands.push(`echo "${content}" > "${itemPath}"`);
            }
        }
    }
    
    generateCommands(structure);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Instrucciones GitHub - ${workspaceId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        h1 { color: #4ec9b0; }
        h2 { color: #569cd6; margin-top: 30px; }
        pre {
            background: #2d2d30;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #3e3e42;
        }
        code {
            color: #ce9178;
            font-family: 'Consolas', monospace;
        }
        .step {
            background: #2d2d30;
            padding: 15px;
            margin: 15px 0;
            border-radius: 8px;
            border-left: 3px solid #0e639c;
        }
        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px 5px 5px 0;
        }
        button:hover { background: #1177bb; }
    </style>
</head>
<body>
    <h1>📦 Exportar "${workspaceId}" a GitHub</h1>
    
    <h2>Opción 1: Comandos Manual</h2>
    <div class="step">
        <p><strong>Paso 1:</strong> Clona o crea el repositorio</p>
        <pre><code>git clone https://github.com/${owner}/${repo}.git
cd ${repo}</code></pre>
        <button onclick="navigator.clipboard.writeText('git clone https://github.com/${owner}/${repo}.git\\ncd ${repo}')">Copiar</button>
    </div>
    
    <div class="step">
        <p><strong>Paso 2:</strong> Crea los archivos</p>
        <pre><code>${commands.join('\n')}</code></pre>
        <button onclick="navigator.clipboard.writeText(\`${commands.join('\n')}\`)">Copiar comandos</button>
    </div>
    
    <div class="step">
        <p><strong>Paso 3:</strong> Haz commit y push</p>
        <pre><code>git add .
git commit -m "Export from CodeSpace workspace: ${workspaceId}"
git push origin main</code></pre>
        <button onclick="navigator.clipboard.writeText('git add .\\ngit commit -m \\"Export from CodeSpace workspace: ${workspaceId}\\"\\ngit push origin main')">Copiar</button>
    </div>
    
    <h2>Opción 2: Descargar ZIP y subir manualmente</h2>
    <div class="step">
        <p>1. Descarga el workspace como ZIP desde CodeSpace</p>
        <p>2. Extrae los archivos</p>
        <p>3. Sube los archivos a tu repositorio de GitHub manualmente</p>
    </div>
    
    <h2>Repositorio de destino</h2>
    <p>
        <a href="https://github.com/${owner}/${repo}" target="_blank" style="color: #0e639c;">
            https://github.com/${owner}/${repo}
        </a>
    </p>
</body>
</html>
    `;
}

// Toast
function showToast(message, success = false) {
    toast.textContent = message;
    if (success) {
        toast.classList.add('success');
    } else {
        toast.classList.remove('success');
    }
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Prevenir pérdida de datos
window.addEventListener('beforeunload', (e) => {
    if (editor.value.trim().length > 0 && currentFile) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Drag & Drop
function setupDragAndDrop(element, itemPath, isFolder) {
    element.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemPath);
    });

    element.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
    });

    if (isFolder) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            e.stopPropagation();
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            
            const sourcePath = e.dataTransfer.getData('text/plain');
            const targetPath = itemPath;
            
            if (sourcePath !== targetPath && !targetPath.startsWith(sourcePath + '/')) {
                socket.emit('move-item', {
                    workspaceId,
                    sourcePath,
                    targetPath
                });
            }
        });
    }
}

// Context Menu
function setupContextMenu(element, itemPath, itemType) {
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        contextMenuTarget = { path: itemPath, type: itemType };
        
        // Mostrar/ocultar opciones de contraseña según si el archivo tiene contraseña
        const setPasswordOption = document.getElementById('setPasswordOption');
        const removePasswordOption = document.getElementById('removePasswordOption');
        
        if (itemType === 'file') {
            // Obtener el archivo de la estructura para verificar si tiene contraseña
            const hasPassword = getFileHasPassword(itemPath);
            
            if (setPasswordOption && removePasswordOption) {
                if (hasPassword) {
                    setPasswordOption.style.display = 'none';
                    removePasswordOption.style.display = 'block';
                } else {
                    setPasswordOption.style.display = 'block';
                    removePasswordOption.style.display = 'none';
                }
            }
        } else {
            // Para carpetas, ocultar ambas opciones
            if (setPasswordOption) setPasswordOption.style.display = 'none';
            if (removePasswordOption) removePasswordOption.style.display = 'none';
        }
        
        // Posicionar el menú
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.classList.add('show');
    });
}

// Función auxiliar para verificar si un archivo tiene contraseña
function getFileHasPassword(path) {
    const parts = path.split('/');
    let current = fileStructure;
    
    for (let i = 0; i < parts.length; i++) {
        if (!current[parts[i]]) return false;
        if (i === parts.length - 1) {
            return current[parts[i]].hasPassword === true;
        }
        if (current[parts[i]].children) {
            current = current[parts[i]].children;
        } else {
            return false;
        }
    }
    
    return false;
}

// Cerrar context menu al hacer click fuera
document.addEventListener('click', () => {
    contextMenu.classList.remove('show');
});

// Acciones del context menu
function contextMenuAction(action) {
    if (!contextMenuTarget) return;
    
    const { path, type } = contextMenuTarget;
    
    if (action === 'delete') {
        const fileName = path.split('/').pop();
        if (confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) {
            socket.emit('delete-item', {
                workspaceId,
                path
            });
        }
    } else if (action === 'rename') {
        const currentName = path.split('/').pop();
        const newName = prompt('Nuevo nombre:', currentName);
        if (newName && newName !== currentName) {
            socket.emit('rename-item', {
                workspaceId,
                path,
                newName
            });
        }
    } else if (action === 'setPassword') {
        // Mostrar modal para establecer contraseña
        document.getElementById('passwordModal').style.display = 'flex';
    } else if (action === 'removePassword') {
        // Mostrar modal para quitar contraseña
        document.getElementById('removePasswordModal').style.display = 'flex';
    }
    
    contextMenu.classList.remove('show');
}

// Funciones para modal de establecer contraseña
function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('filePassword').value = '';
    document.getElementById('filePasswordConfirm').value = '';
    contextMenuTarget = null;
}

function confirmSetPassword() {
    const password = document.getElementById('filePassword').value;
    const confirm = document.getElementById('filePasswordConfirm').value;
    
    if (!password || !confirm) {
        showToast('Por favor, completa ambos campos');
        return;
    }
    
    if (password !== confirm) {
        showToast('Las contraseñas no coinciden');
        return;
    }
    
    if (password.length < 4) {
        showToast('La contraseña debe tener al menos 4 caracteres');
        return;
    }
    
    // Enviar al servidor
    socket.emit('set-file-password', {
        workspaceId,
        path: contextMenuTarget.path,
        password
    });
    
    closePasswordModal();
}

// Funciones para modal de quitar contraseña
function closeRemovePasswordModal() {
    document.getElementById('removePasswordModal').style.display = 'none';
    document.getElementById('currentPassword').value = '';
    contextMenuTarget = null;
}

function confirmRemovePassword() {
    const password = document.getElementById('currentPassword').value;
    
    if (!password) {
        showToast('Por favor, ingresa la contraseña actual');
        return;
    }
    
    // Enviar al servidor
    socket.emit('remove-file-password', {
        workspaceId,
        path: contextMenuTarget.path,
        password
    });
    
    closeRemovePasswordModal();
}

// Funciones para modal de desbloquear archivo
function closeUnlockModal() {
    document.getElementById('unlockFileModal').style.display = 'none';
    document.getElementById('unlockPassword').value = '';
}

function confirmUnlock() {
    const password = document.getElementById('unlockPassword').value;
    
    if (!password) {
        showToast('Por favor, ingresa la contraseña');
        return;
    }
    
    const filePath = document.getElementById('unlockFileModal').dataset.filePath;
    
    // Enviar al servidor para verificar y abrir
    socket.emit('unlock-file', {
        workspaceId,
        path: filePath,
        password
    });
    
    closeUnlockModal();
}

// Variable para rastrear si el workspace tiene contraseña
let workspaceHasPassword = false;

// Funciones para proteger el workspace
function toggleWorkspacePassword() {
    if (workspaceHasPassword) {
        // Mostrar modal para quitar contraseña
        document.getElementById('removeWorkspacePasswordModal').style.display = 'flex';
    } else {
        // Mostrar modal para establecer contraseña
        document.getElementById('setWorkspacePasswordModal').style.display = 'flex';
    }
}

function closeSetWorkspacePasswordModal() {
    document.getElementById('setWorkspacePasswordModal').style.display = 'none';
    document.getElementById('newWorkspacePassword').value = '';
    document.getElementById('confirmWorkspacePassword').value = '';
}

function confirmSetWorkspacePassword() {
    const newPassword = document.getElementById('newWorkspacePassword').value.trim();
    const confirmPassword = document.getElementById('confirmWorkspacePassword').value.trim();
    
    if (!newPassword || !confirmPassword) {
        showToast('Por favor, completa ambos campos');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Las contraseñas no coinciden');
        return;
    }
    
    if (newPassword.length < 4) {
        showToast('La contraseña debe tener al menos 4 caracteres');
        return;
    }
    
    // Cerrar modal solo cuando todo es válido
    closeSetWorkspacePasswordModal();
    
    // Limpiar contraseña guardada para forzar que la pida en la próxima recarga
    sessionStorage.removeItem(`ws_pass_${workspaceId}`);
    
    // Enviar al servidor
    socket.emit('set-workspace-password', {
        workspaceId,
        password: newPassword
    });
}

function closeRemoveWorkspacePasswordModal() {
    document.getElementById('removeWorkspacePasswordModal').style.display = 'none';
    document.getElementById('currentWorkspacePassword').value = '';
}

function confirmRemoveWorkspacePassword() {
    const currentPassword = document.getElementById('currentWorkspacePassword').value.trim();
    
    if (!currentPassword) {
        showToast('Por favor, introduce la contraseña actual');
        return;
    }
    
    // Enviar al servidor
    socket.emit('remove-workspace-password', {
        workspaceId,
        password: currentPassword
    });
    
    closeRemoveWorkspacePasswordModal();
}

// Escuchar respuestas del servidor sobre la contraseña del workspace
socket.on('workspace-password-set', () => {
    workspaceHasPassword = true;
    updatePasswordButton();
    // Limpiar la contraseña en memoria para forzar re-autenticación
    workspacePassword = null;
    // Borrar del sessionStorage
    sessionStorage.removeItem(`ws_pass_${workspaceId}`);
    showToast('¡Contraseña establecida! Al recargar la página se te pedirá la contraseña.', true);
});

socket.on('workspace-password-removed', () => {
    workspaceHasPassword = false;
    updatePasswordButton();
    sessionStorage.removeItem(`ws_pass_${workspaceId}`);
    showToast('Contraseña eliminada. El workspace ya no está protegido.', true);
});

socket.on('workspace-password-error', (data) => {
    showToast(data.message || 'Error al gestionar la contraseña');
});

// Actualizar el botón de contraseña según el estado
function updatePasswordButton() {
    const btn = document.getElementById('workspacePasswordBtn');
    if (!btn) return;
    
    if (workspaceHasPassword) {
        btn.innerHTML = '<i data-feather="unlock" style="width: 14px; height: 14px;"></i> Quitar Contraseña';
        btn.title = 'Quitar protección del workspace';
    } else {
        btn.innerHTML = '<i data-feather="lock" style="width: 14px; height: 14px;"></i> Contraseña';
        btn.title = 'Proteger workspace';
    }
    
    // Re-inicializar los iconos de Feather
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Verificar si el workspace tiene contraseña al cargar
socket.on('workspace-info', (data) => {
    workspaceHasPassword = data.hasPassword || false;
    updatePasswordButton();
});
