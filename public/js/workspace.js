const socket = io();
const editor = document.getElementById('editor');
const editorWrapper = document.getElementById('editorWrapper');
const editorContent = document.getElementById('editorContent');
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
const previewModal = document.getElementById('previewModal');
const previewFrame = document.getElementById('previewFrame');
const previewBtn = document.getElementById('previewBtn');

// ===== SISTEMA DE MODALES PERSONALIZADOS =====

let customAlertCallback = null;
let customPromptCallback = null;

function showCustomAlert(message, title = 'Mensaje', icon = 'alert-circle') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlertModal');
        const titleText = document.getElementById('customAlertTitleText');
        const iconElement = document.getElementById('customAlertIcon');
        const messageElement = document.getElementById('customAlertMessage');
        const footer = document.getElementById('customAlertFooter');
        
        titleText.textContent = title;
        iconElement.setAttribute('data-feather', icon);
        messageElement.textContent = message;
        
        footer.innerHTML = '<button class="btn" onclick="closeCustomAlert(true)">Aceptar</button>';
        
        customAlertCallback = resolve;
        modal.style.display = 'flex';
        feather.replace();
    });
}

function showCustomConfirm(message, title = 'Confirmar', confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlertModal');
        const titleText = document.getElementById('customAlertTitleText');
        const iconElement = document.getElementById('customAlertIcon');
        const messageElement = document.getElementById('customAlertMessage');
        const footer = document.getElementById('customAlertFooter');
        
        titleText.textContent = title;
        iconElement.setAttribute('data-feather', 'help-circle');
        messageElement.textContent = message;
        
        footer.innerHTML = `
            <button class="btn" onclick="closeCustomAlert(false)">${cancelText}</button>
            <button class="btn btn-primary" onclick="closeCustomAlert(true)">${confirmText}</button>
        `;
        
        customAlertCallback = resolve;
        modal.style.display = 'flex';
        feather.replace();
    });
}

function closeCustomAlert(result = false) {
    const modal = document.getElementById('customAlertModal');
    modal.style.display = 'none';
    if (customAlertCallback) {
        customAlertCallback(result);
        customAlertCallback = null;
    }
}

function showCustomPrompt(message, title = 'Ingresa un valor', defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customPromptModal');
        const titleElement = document.getElementById('customPromptTitle');
        const messageElement = document.getElementById('customPromptMessage');
        const inputElement = document.getElementById('customPromptInput');
        
        titleElement.textContent = title;
        messageElement.textContent = message;
        inputElement.value = defaultValue;
        
        customPromptCallback = resolve;
        modal.style.display = 'flex';
        setTimeout(() => inputElement.focus(), 100);
        
        // Enter para confirmar
        inputElement.onkeydown = (e) => {
            if (e.key === 'Enter') {
                closeCustomPrompt(inputElement.value);
            } else if (e.key === 'Escape') {
                closeCustomPrompt(null);
            }
        };
    });
}

function closeCustomPrompt(result) {
    const modal = document.getElementById('customPromptModal');
    modal.style.display = 'none';
    if (customPromptCallback) {
        customPromptCallback(result);
        customPromptCallback = null;
    }
}

// ===== FUNCIONES DE LA BARRA DE TÍTULO =====

// Actualizar reloj y fecha
function updateClock() {
    const now = new Date();
    
    // Actualizar hora (HH:MM:SS)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const clockEl = document.getElementById('titlebarClock');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    
    // Actualizar fecha (DD/MM/YYYY)
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateEl = document.getElementById('titlebarDate');
    if (dateEl) {
        dateEl.textContent = `${day}/${month}/${year}`;
        console.log('Fecha actualizada:', `${day}/${month}/${year}`);
    }
}

// Iniciar reloj
setInterval(updateClock, 1000);
updateClock(); // Llamar inmediatamente

// Botón rojo: ir a home
async function goToHome() {
    if (await showCustomConfirm('¿Quieres salir del workspace y volver a la página principal?', 'Salir del workspace', 'Salir', 'Cancelar')) {
        window.location.href = '/';
    }
}

// Botón amarillo: pantalla completa
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showToast('No se pudo activar pantalla completa');
        });
    } else {
        document.exitFullscreen();
    }
}

// Botón verde: minimizar (simular)
function minimizeWindow() {
    showToast('Función de minimizar no disponible en navegador');
}

// Toggle tema claro/oscuro
function toggleTheme() {
    const body = document.body;
    const themeText = document.getElementById('themeText');
    const themeIcon = document.querySelector('.theme-toggle i');
    
    const isDark = body.classList.contains('dark-theme') || !body.classList.contains('light-theme');
    
    if (isDark) {
        // Cambiar a tema claro
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeText.textContent = 'Oscuro';
        themeIcon.setAttribute('data-feather', 'moon');
        localStorage.setItem('theme', 'light');
    } else {
        // Cambiar a tema oscuro
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeText.textContent = 'Claro';
        themeIcon.setAttribute('data-feather', 'sun');
        localStorage.setItem('theme', 'dark');
    }
    
    // Re-renderizar iconos
    feather.replace();
}

// Cargar tema guardado
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const body = document.body;
    const themeText = document.getElementById('themeText');
    const themeIcon = document.querySelector('.theme-toggle i');
    
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        body.classList.remove('dark-theme');
        if (themeText) themeText.textContent = 'Oscuro';
        if (themeIcon) themeIcon.setAttribute('data-feather', 'moon');
    } else {
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
        if (themeText) themeText.textContent = 'Claro';
        if (themeIcon) themeIcon.setAttribute('data-feather', 'sun');
    }
    
    if (typeof feather !== 'undefined') feather.replace();
}

// Actualizar icono del botón de usuario según estado de sesión
function updateUserButtonIcon(hasSession, userData = null) {
    const userButton = document.getElementById('userButton');
    const userButtonIcon = document.getElementById('userButtonIcon');
    
    if (!userButton || !userButtonIcon) return;
    
    if (hasSession) {
        // Usuario con sesión - mostrar icono de usuario
        userButtonIcon.setAttribute('data-feather', 'user');
        userButton.setAttribute('title', `Usuario: ${userData?.email || 'Admin'}`);
    } else {
        // Usuario sin sesión - mostrar icono de login
        userButtonIcon.setAttribute('data-feather', 'log-in');
        userButton.setAttribute('title', 'Iniciar sesión');
    }
    
    feather.replace();
}

// Manejar clic en botón de usuario/login
function handleUserButtonClick() {
    if (isAdminOrModerator) {
        window.open('/admin', '_blank');
    } else {
        // Verificar si el usuario tiene sesión registrada
        fetch('/api/user/me', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(userData => {
                if (userData) {
                    window.open('/dashboard', '_blank');
                } else {
                    window.open('/signin', '_blank');
                }
            })
            .catch(() => window.open('/signin', '_blank'));
    }
}

function renderTicketLoginRequired() {
    document.getElementById('ticketsList').innerHTML = `
        <div style="text-align: center; color: #858585; padding: 24px 18px; display: flex; flex-direction: column; gap: 10px; align-items: center;">
            <i data-feather="lock" style="width: 40px; height: 40px; opacity: 0.55;"></i>
            <p>Debes iniciar sesión para abrir y responder tickets.</p>
            <button class="btn" onclick="window.open('/signin', '_blank')" style="font-size:11px;padding:6px 12px;">
                <i data-feather="log-in"></i> Iniciar sesión
            </button>
        </div>
    `;
    document.getElementById('ticketsBadge').style.display = 'none';
    feather.replace();
}

let authCheckPromise = null;

function loadRegisteredUserSession() {
    if (authCheckPromise) {
        return authCheckPromise;
    }

    authCheckPromise = fetch('/api/user/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(userData => {
            currentAuthenticatedUser = userData;
            return userData;
        })
        .catch(() => {
            currentAuthenticatedUser = null;
            return null;
        })
        .finally(() => {
            authCheckPromise = null;
        });

    return authCheckPromise;
}

// Cargar tema al iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    
    // Verificar si el usuario es admin/moderador o usuario registrado
    fetch('/api/admin/user-info')
        .then(res => res.json())
        .then(data => {
            if (data.isAdmin || data.isModerator) {
                isAdminOrModerator = true;
                updateUserButtonIcon(true, data);
            } else {
                // Verificar si hay sesión de usuario registrado
                return loadRegisteredUserSession()
                    .then(userData => {
                        if (userData && userData.nickname) {
                            currentAuthenticatedUser = userData;
                            updateUserButtonIcon(true, userData);
                            // Auto-establecer nickname como nombre de chat
                            const nick = userData.nickname;
                            if (!username || username.length === 0) {
                                username = nick;
                                localStorage.setItem(`username_${workspaceId}`, username);
                                document.getElementById('usernameInput').value = username;
                                const usernameContainer = document.querySelector('.username-input');
                                if (usernameContainer) usernameContainer.style.display = 'none';
                                enableChatInput();
                                socket.emit('username-change', { oldUsername: '', newUsername: username, workspaceId });
                            }
                        } else {
                            currentAuthenticatedUser = null;
                            updateUserButtonIcon(false);
                        }
                    })
                    .catch(() => {
                        currentAuthenticatedUser = null;
                        updateUserButtonIcon(false);
                    });
            }
        })
        .catch(() => {
            isAdminOrModerator = false;
            currentAuthenticatedUser = null;
            updateUserButtonIcon(false);
        });
    
    // Cargar nombre del chat guardado
    const savedChatName = localStorage.getItem(`chatName_${workspaceId}`);
    if (savedChatName) {
        const chatTitle = document.getElementById('chatTitle');
        if (chatTitle) {
            chatTitle.textContent = savedChatName;
        }
    }
    
    // Cargar nombre de usuario en el input si existe
    const savedUsername = localStorage.getItem(`username_${workspaceId}`);
    if (savedUsername) {
        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) {
            usernameInput.value = savedUsername;
        }
    }
});

// ===== FIN FUNCIONES DE BARRA DE TÍTULO =====

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
let username = localStorage.getItem(`username_${window.location.pathname.substring(1) || 'main'}`) || '';
let currentAuthenticatedUser = null;
let unreadMessages = 0;
let onlineUsers = new Map();
let workspacePassword = null;
let expandedFolders = new Set(); // Carpetas expandidas

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

// Inicializar estado del chat según si hay nombre
if (username && username.length > 0) {
    // Si ya tiene nombre, ocultar el input de nombre
    const usernameContainer = document.querySelector('.username-input');
    if (usernameContainer) {
        usernameContainer.style.display = 'none';
    }
} else {
    // Si no tiene nombre, deshabilitar el chat
    disableChatInput();
}

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
    const sidebar = document.querySelector('.sidebar');
    const clickedItem = event.currentTarget;
    const isAlreadyActive = clickedItem.classList.contains('active');
    const isSidebarCollapsed = sidebar.classList.contains('collapsed');
    
    // Si el panel ya está activo y la sidebar está visible, colapsar
    if (isAlreadyActive && !isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        return;
    }
    
    // Si la sidebar estaba colapsada, expandirla
    if (isSidebarCollapsed) {
        sidebar.classList.remove('collapsed');
    }
    
    currentSidebar = panel;
    
    // Update activity bar
    document.querySelectorAll('.activity-bar-item').forEach(item => {
        item.classList.remove('active');
    });
    clickedItem.classList.add('active');
    
    // Update sidebar content
    document.querySelectorAll('.sidebar-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (panel === 'files') {
        document.getElementById('filesPanel').classList.add('active');
    } else if (panel === 'chat') {
        document.getElementById('chatPanel').classList.add('active');
        unreadMessages = 0;
        updateChatBadge();
        
        // Verificar si tiene nombre establecido
        if (username && username.length > 0) {
            enableChatInput();
            document.querySelector('.username-input').style.display = 'none';
        } else {
            disableChatInput();
            document.querySelector('.username-input').style.display = 'flex';
            setTimeout(() => {
                document.getElementById('usernameInput').focus();
            }, 100);
        }
    } else if (panel === 'users') {
        document.getElementById('usersPanel').classList.add('active');
        updateUserList();
    } else if (panel === 'tickets') {
        document.getElementById('ticketsPanel').classList.add('active');
        loadTickets();
    }
}

// Sidebar resize functionality
const resizeHandle = document.getElementById('resizeHandle');
const sidebar = document.querySelector('.sidebar');

resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    sidebar.classList.add('resizing');
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
        sidebar.classList.remove('resizing');
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }
});

// Chat functions
function editChatName() {
    const titleElement = document.getElementById('chatTitle');
    const currentName = titleElement.textContent;
    
    // Crear input para editar
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 50;
    
    // Reemplazar h3 con input
    titleElement.replaceWith(input);
    input.focus();
    input.select();
    
    // Función para guardar
    const saveName = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            // Crear nuevo h3
            const newTitle = document.createElement('h3');
            newTitle.id = 'chatTitle';
            newTitle.textContent = newName;
            input.replaceWith(newTitle);
            
            // Guardar en localStorage
            localStorage.setItem(`chatName_${workspaceId}`, newName);
            
            showToast('Nombre del chat actualizado', true);
            feather.replace();
        } else {
            // Restaurar h3 original
            const newTitle = document.createElement('h3');
            newTitle.id = 'chatTitle';
            newTitle.textContent = currentName;
            input.replaceWith(newTitle);
            feather.replace();
        }
    };
    
    // Guardar al presionar Enter o perder foco
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveName();
        } else if (e.key === 'Escape') {
            const newTitle = document.createElement('h3');
            newTitle.id = 'chatTitle';
            newTitle.textContent = currentName;
            input.replaceWith(newTitle);
            feather.replace();
        }
    });
    
    input.addEventListener('blur', saveName);
}

function setUsername() {
    const input = document.getElementById('usernameInput');
    const newUsername = input.value.trim();
    
    if (!newUsername || newUsername.length === 0) {
        showToast('Por favor, introduce un nombre');
        return;
    }
    
    const oldUsername = username;
    username = newUsername;
    
    // Guardar en localStorage
    localStorage.setItem(`username_${workspaceId}`, username);
    
    // Habilitar el input del chat
    enableChatInput();
    
    // Notify server
    socket.emit('username-change', { 
        oldUsername, 
        newUsername,
        workspaceId 
    });
    
    // Actualizar el título del chat con el nombre del usuario
    const chatTitle = document.getElementById('chatTitle');
    if (chatTitle) {
        chatTitle.textContent = `Chat - ${username}`;
        localStorage.setItem(`chatName_${workspaceId}`, `Chat - ${username}`);
    }
    
    showToast(`Nombre ${oldUsername ? 'actualizado' : 'establecido'}: ${username}`, true);
    
    // Mostrar el nombre actual en el input
    input.value = username;
}

// Comandos disponibles
const chatCommands = [
    {
        command: '/name',
        description: 'Cambia tu nombre de usuario (máx 10 letras)',
        usage: '/name tunombre',
        adminOnly: false
    },
    {
        command: '/ping',
        description: 'Muestra tu latencia con el servidor',
        usage: '/ping',
        adminOnly: false
    },
    {
        command: '/clear',
        description: 'Limpia tu historial de chat (solo visual)',
        usage: '/clear',
        adminOnly: false
    },
    {
        command: '/kick',
        description: 'Expulsa un usuario del workspace',
        usage: '/kick usuario [mensaje opcional]',
        adminOnly: true
    },
    {
        command: '/ban',
        description: 'Banea la IP de un usuario permanentemente',
        usage: '/ban usuario [razón opcional]',
        adminOnly: true
    },
    {
        command: '/unban',
        description: 'Desbanea una dirección IP',
        usage: '/unban dirección_ip',
        adminOnly: true
    },
    {
        command: '/vanish',
        description: 'Oculta tu presencia en la lista de usuarios',
        usage: '/vanish',
        adminOnly: true
    }
];

let isAdminOrModerator = false;

let pingStartTime = null;

let selectedCommandIndex = -1;

// Mostrar menú de comandos
function showCommandsMenu() {
    const menu = document.getElementById('chatCommandsMenu');
    const input = document.getElementById('chatInput');
    const value = input.value.toLowerCase();
    
    if (!value.startsWith('/')) {
        menu.classList.remove('visible');
        selectedCommandIndex = -1;
        return;
    }
    
    // Autocompletado de usuarios para /kick
    if (value.startsWith('/kick ')) {
        const args = value.substring(6).split(' ');
        const userQuery = args[0] || '';
        
        // Si ya hay un usuario completo y estamos escribiendo el mensaje, no mostrar menú
        if (args.length > 1 && Array.from(onlineUsers.values()).includes(args[0])) {
            menu.classList.remove('visible');
            selectedCommandIndex = -1;
            return;
        }
        
        // Filtrar usuarios conectados
        const users = Array.from(onlineUsers.values()).filter(u => 
            u.toLowerCase().includes(userQuery.toLowerCase()) && u !== username
        );
        
        if (users.length === 0) {
            menu.classList.remove('visible');
            selectedCommandIndex = -1;
            return;
        }
        
        // Mostrar usuarios disponibles
        menu.innerHTML = users.map((user, index) => `
            <div class="command-item ${index === selectedCommandIndex ? 'selected' : ''}" 
                 onclick="selectUserForKick('${user}')" 
                 data-index="${index}">
                <div class="command-name">@${user}</div>
                <div class="command-description">Expulsar usuario</div>
            </div>
        `).join('');
        
        menu.classList.add('visible');
        return;
    }
    
    // Autocompletado de usuarios para /ban
    if (value.startsWith('/ban ')) {
        const args = value.substring(5).split(' ');
        const userQuery = args[0] || '';
        
        // Si ya hay un usuario completo y estamos escribiendo la razón, no mostrar menú
        if (args.length > 1 && Array.from(onlineUsers.values()).includes(args[0])) {
            menu.classList.remove('visible');
            selectedCommandIndex = -1;
            return;
        }
        
        // Filtrar usuarios conectados
        const users = Array.from(onlineUsers.values()).filter(u => 
            u.toLowerCase().includes(userQuery.toLowerCase()) && u !== username
        );
        
        if (users.length === 0) {
            menu.classList.remove('visible');
            selectedCommandIndex = -1;
            return;
        }
        
        // Mostrar usuarios disponibles
        menu.innerHTML = users.map((user, index) => `
            <div class="command-item ${index === selectedCommandIndex ? 'selected' : ''}" 
                 onclick="selectUserForBan('${user}')" 
                 data-index="${index}">
                <div class="command-name">@${user}</div>
                <div class="command-description">Banear IP del usuario ${isAdminOrModerator ? '(Admin)' : '(Requiere permisos)'}</div>
            </div>
        `).join('');
        
        menu.classList.add('visible');
        return;
    }
    
    // Filtrar comandos según permisos y búsqueda
    const query = value.substring(1).split(' ')[0];
    const filtered = chatCommands.filter(cmd => {
        // Filtrar comandos solo de admin si el usuario no es admin
        if (cmd.adminOnly && !isAdminOrModerator) {
            return false;
        }
        return cmd.command.toLowerCase().includes(query) || 
               cmd.description.toLowerCase().includes(query);
    });
    
    if (filtered.length === 0) {
        menu.classList.remove('visible');
        selectedCommandIndex = -1;
        return;
    }
    
    // Renderizar comandos
    menu.innerHTML = filtered.map((cmd, index) => `
        <div class="command-item ${index === selectedCommandIndex ? 'selected' : ''}" 
             onclick="selectCommand('${cmd.usage}')" 
             data-index="${index}">
            <div class="command-name">${cmd.command}</div>
            <div class="command-description">${cmd.description}</div>
        </div>
    `).join('');
    
    menu.classList.add('visible');
}

// Seleccionar usuario para kick
function selectUserForKick(user) {
    const input = document.getElementById('chatInput');
    input.value = `/kick ${user} `;
    input.focus();
    document.getElementById('chatCommandsMenu').classList.remove('visible');
    selectedCommandIndex = -1;
}

// Seleccionar usuario para ban
function selectUserForBan(user) {
    const input = document.getElementById('chatInput');
    input.value = `/ban ${user} `;
    input.focus();
    document.getElementById('chatCommandsMenu').classList.remove('visible');
    selectedCommandIndex = -1;
}

// Seleccionar comando
function selectCommand(usage) {
    const input = document.getElementById('chatInput');
    input.value = usage + ' ';
    input.focus();
    document.getElementById('chatCommandsMenu').classList.remove('visible');
    selectedCommandIndex = -1;
}

// Navegar por comandos con teclado
function navigateCommands(direction) {
    const menu = document.getElementById('chatCommandsMenu');
    if (!menu.classList.contains('visible')) return false;
    
    const items = menu.querySelectorAll('.command-item');
    if (items.length === 0) return false;
    
    // Remover selección anterior
    items.forEach(item => item.classList.remove('selected'));
    
    // Actualizar índice
    if (direction === 'down') {
        selectedCommandIndex = (selectedCommandIndex + 1) % items.length;
    } else if (direction === 'up') {
        selectedCommandIndex = selectedCommandIndex <= 0 ? items.length - 1 : selectedCommandIndex - 1;
    }
    
    // Aplicar nueva selección
    items[selectedCommandIndex].classList.add('selected');
    items[selectedCommandIndex].scrollIntoView({ block: 'nearest' });
    
    return true;
}

// Confirmar selección con Enter
function confirmCommandSelection() {
    const menu = document.getElementById('chatCommandsMenu');
    if (!menu.classList.contains('visible') || selectedCommandIndex === -1) return false;
    
    const selectedItem = menu.querySelector('.command-item.selected');
    if (selectedItem) {
        selectedItem.click();
        return true;
    }
    return false;
}

function sendMessage() {
    if (!username || username.length === 0) {
        showToast('Primero debes establecer un nombre');
        return;
    }
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        // Detectar comando /clear
        if (message === '/clear') {
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.innerHTML = '';
            showToast('✨ Chat limpiado (solo para ti)', true);
            input.value = '';
            return;
        }
        
        // Detectar comando /ping
        if (message === '/ping') {
            pingStartTime = Date.now();
            socket.emit('ping', { workspaceId, timestamp: pingStartTime });
            showToast('Midiendo latencia...');
            input.value = '';
            return;
        }
        
        // Detectar comando /kick
        if (message.startsWith('/kick ')) {
            const args = message.substring(6).trim().split(' ');
            const targetUser = args[0];
            const kickMessage = args.slice(1).join(' ') || 'Has sido expulsado del workspace';
            
            if (!targetUser || targetUser.length === 0) {
                showToast('Debes especificar un usuario: /kick usuario [mensaje]');
                input.value = '';
                return;
            }
            
            // Verificar que el usuario existe
            if (!Array.from(onlineUsers.values()).includes(targetUser)) {
                showToast(`Usuario "${targetUser}" no encontrado`);
                input.value = '';
                return;
            }
            
            // Enviar comando de kick al servidor
            socket.emit('kick-user', {
                workspaceId,
                kickedBy: username,
                targetUser,
                message: kickMessage
            });
            
            showToast(`Expulsando a ${targetUser}...`);
            input.value = '';
            return;
        }
        
        // Detectar comando /ban
        if (message.startsWith('/ban ')) {
            if (!isAdminOrModerator) {
                showToast('❌ Solo administradores y moderadores pueden usar /ban');
                input.value = '';
                return;
            }
            
            const args = message.substring(5).trim().split(' ');
            const targetUser = args[0];
            const reason = args.slice(1).join(' ') || 'Comportamiento inapropiado';
            
            if (!targetUser || targetUser.length === 0) {
                showToast('Debes especificar un usuario: /ban usuario [razón]');
                input.value = '';
                return;
            }
            
            // Verificar que el usuario existe
            if (!Array.from(onlineUsers.values()).includes(targetUser)) {
                showToast(`Usuario "${targetUser}" no encontrado`);
                input.value = '';
                return;
            }
            
            // Enviar comando de ban al servidor
            socket.emit('ban-user', {
                workspaceId,
                bannedBy: username,
                targetUser,
                reason
            });
            
            showToast(`🔨 Baneando a ${targetUser}...`);
            input.value = '';
            return;
        }
        
        // Detectar comando /vanish
        if (message === '/vanish') {
            if (!isAdminOrModerator) {
                showToast('❌ Solo administradores y moderadores pueden usar /vanish');
                input.value = '';
                return;
            }
            
            // Alternar modo vanish
            socket.emit('toggle-vanish', { workspaceId, username });
            input.value = '';
            return;
        }
        
        // Detectar comando /unban
        if (message.startsWith('/unban ')) {
            if (!isAdminOrModerator) {
                showToast('❌ Solo administradores y moderadores pueden usar /unban');
                input.value = '';
                return;
            }
            
            const ipAddress = message.substring(7).trim();
            
            if (!ipAddress || ipAddress.length === 0) {
                showToast('⚠️ Debes especificar una IP: /unban dirección_ip');
                input.value = '';
                return;
            }
            
            // Validar formato de IP básico
            if (!/^[\d.:a-f]+$/i.test(ipAddress)) {
                showToast('⚠️ Formato de IP inválido');
                input.value = '';
                return;
            }
            
            // Enviar comando de unban al servidor
            socket.emit('unban-ip', {
                workspaceId,
                unbannedBy: username,
                ipAddress
            });
            
            showToast(`🔓 Desbaneando IP ${ipAddress}...`);
            input.value = '';
            return;
        }
        
        // Detectar comando /name
        if (message.startsWith('/name ')) {
            const newName = message.substring(6).trim();
            
            if (!newName || newName.length === 0) {
                showToast('Debes especificar un nombre: /name tu_nombre');
                input.value = '';
                return;
            }
            
            if (newName.length > 10) {
                showToast('El nombre debe tener máximo 10 letras');
                input.value = '';
                return;
            }
            
            // Cambiar el nombre
            const oldUsername = username;
            username = newName;
            
            // Guardar en localStorage
            localStorage.setItem(`username_${workspaceId}`, username);
            
            // Actualizar input de nombre de usuario
            const usernameInput = document.getElementById('usernameInput');
            if (usernameInput) {
                usernameInput.value = username;
            }
            
            // Actualizar título del chat
            const chatTitle = document.getElementById('chatTitle');
            if (chatTitle) {
                chatTitle.textContent = `Chat - ${username}`;
                localStorage.setItem(`chatName_${workspaceId}`, `Chat - ${username}`);
            }
            
            // Notificar al servidor
            socket.emit('username-change', { 
                oldUsername, 
                newUsername: username,
                workspaceId 
            });
            
            showToast(`Nombre cambiado a: ${username}`, true);
            input.value = '';
            return;
        }
        
        // Enviar mensaje normal
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
        
        // Mostrar notificación si el chat no está abierto y no es mensaje propio
        if (currentSidebar !== 'chat' && !isOwn && data.type !== 'system') {
            showChatNotification(data.username, data.message);
        }
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
    
    // Actualizar contador de usuarios
    const count = onlineUsers.size;
    usersCountEl.textContent = count;
    usersTextEl.textContent = count === 1 ? 'usuario' : 'usuarios';
    updateUsersBadge(count);
}

function updateUsersBadge(count) {
    document.getElementById('usersBadge').textContent = count;
}

// Mostrar notificación de chat
let chatNotificationTimeout;
function showChatNotification(username, message) {
    const notification = document.getElementById('chatNotification');
    const userEl = document.getElementById('notificationUser');
    const messageEl = document.getElementById('notificationMessage');
    
    // Truncar mensaje si es muy largo
    const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;
    
    userEl.textContent = username;
    messageEl.textContent = truncatedMessage;
    
    // Mostrar notificación
    notification.classList.add('show');
    
    // Reemplazar iconos
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 50);
    
    // Auto-ocultar después de 5 segundos
    clearTimeout(chatNotificationTimeout);
    chatNotificationTimeout = setTimeout(() => {
        closeChatNotification();
    }, 5000);
    
    // Hacer clic en la notificación para abrir el chat
    notification.onclick = () => {
        switchSidebar('chat');
        closeChatNotification();
    };
}

// Cerrar notificación de chat
function closeChatNotification() {
    const notification = document.getElementById('chatNotification');
    notification.classList.remove('show');
    notification.onclick = null;
}

// Habilitar input del chat
function enableChatInput() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = chatInput.parentElement.querySelector('button');
    
    chatInput.disabled = false;
    chatInput.placeholder = 'Escribe un mensaje...';
    sendBtn.disabled = false;

    // Emitir evento typing al escribir
    let typingTimer = null;
    let isCurrentlyTyping = false;
    chatInput.addEventListener('input', () => {
        if (!username || isVanished) return;
        if (!isCurrentlyTyping) {
            isCurrentlyTyping = true;
            socket.emit('typing', { workspaceId, username, isTyping: true });
        }
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isCurrentlyTyping = false;
            socket.emit('typing', { workspaceId, username, isTyping: false });
        }, 1500);
    });
    // Parar typing al enviar
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            clearTimeout(typingTimer);
            if (isCurrentlyTyping) {
                isCurrentlyTyping = false;
                socket.emit('typing', { workspaceId, username, isTyping: false });
            }
        }
    });
}

// Deshabilitar input del chat
function disableChatInput() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = chatInput.parentElement.querySelector('button');
    
    chatInput.disabled = true;
    chatInput.placeholder = 'Establece un nombre primero...';
    chatInput.value = '';
    sendBtn.disabled = true;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Chat input enter key
// Event listeners para chat input
const chatInputElement = document.getElementById('chatInput');

// Detectar cuando se escribe para mostrar comandos
chatInputElement.addEventListener('input', () => {
    showCommandsMenu();
});

// Navegación con teclado
chatInputElement.addEventListener('keydown', (e) => {
    const menu = document.getElementById('chatCommandsMenu');
    const input = chatInputElement.value;
    
    // Autocompletar con Tab cuando se escribe parcialmente un comando
    if (e.key === 'Tab' && input.startsWith('/') && !menu.classList.contains('visible')) {
        e.preventDefault();
        
        const query = input.toLowerCase();
        const matches = chatCommands.filter(cmd => 
            cmd.command.toLowerCase().startsWith(query)
        );
        
        if (matches.length === 1) {
            chatInputElement.value = matches[0].usage + ' ';
            return;
        }
    }
    
    if (menu.classList.contains('visible')) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateCommands('down');
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateCommands('up');
            return;
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            if (confirmCommandSelection()) return;
        }
        if (e.key === 'Escape') {
            menu.classList.remove('visible');
            selectedCommandIndex = -1;
            return;
        }
    }
});

chatInputElement.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const menu = document.getElementById('chatCommandsMenu');
        if (menu.classList.contains('visible') && selectedCommandIndex !== -1) {
            e.preventDefault();
            confirmCommandSelection();
        } else {
            sendMessage();
        }
    }
});

// Cerrar menú al hacer clic fuera
document.addEventListener('click', (e) => {
    const menu = document.getElementById('chatCommandsMenu');
    const input = document.getElementById('chatInput');
    if (!menu.contains(e.target) && e.target !== input) {
        menu.classList.remove('visible');
        selectedCommandIndex = -1;
    }
});

document.getElementById('usernameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        setUsername();
    }
});

// ===== FUNCIONES DE PERSISTENCIA DE ESTADO =====

// Guardar archivo abierto
function saveOpenFile(filePath) {
    if (filePath) {
        localStorage.setItem(`openFile_${workspaceId}`, filePath);
    }
}

// Obtener archivo abierto guardado
function getOpenFile() {
    return localStorage.getItem(`openFile_${workspaceId}`);
}

// Guardar carpeta expandida
function saveFolderExpanded(folderPath) {
    const savedFolders = JSON.parse(localStorage.getItem(`expandedFolders_${workspaceId}`) || '[]');
    if (!savedFolders.includes(folderPath)) {
        savedFolders.push(folderPath);
    }
    localStorage.setItem(`expandedFolders_${workspaceId}`, JSON.stringify(savedFolders));
    expandedFolders.add(folderPath);
}

// Guardar carpeta contraída
function saveFolderCollapsed(folderPath) {
    const savedFolders = JSON.parse(localStorage.getItem(`expandedFolders_${workspaceId}`) || '[]');
    const index = savedFolders.indexOf(folderPath);
    if (index > -1) {
        savedFolders.splice(index, 1);
    }
    localStorage.setItem(`expandedFolders_${workspaceId}`, JSON.stringify(savedFolders));
    expandedFolders.delete(folderPath);
}

// Restaurar estado de carpetas expandidas
function restoreExpandedFolders() {
    const savedFolders = JSON.parse(localStorage.getItem(`expandedFolders_${workspaceId}`) || '[]');
    expandedFolders = new Set(savedFolders);
}

// ===== INICIALIZAR CODEMISOR =====

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
        viewportMargin: 500,
        scrollbarStyle: 'native',
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

    // ResizeObserver para actualizar CodeMirror cuando cambia el tamaño del contenedor
    const resizeObserver = new ResizeObserver(() => {
        if (codeMirrorEditor) {
            codeMirrorEditor.refresh();
        }
    });
    resizeObserver.observe(editorContent);

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

    // Manejar resize de ventana para CodeMirror
    window.addEventListener('resize', () => {
        if (codeMirrorEditor) {
            codeMirrorEditor.refresh();
        }
    });
}

// ===== FUNCIONES DE LA BARRA DE HERRAMIENTAS DEL EDITOR =====

// Guardar archivo manualmente
function saveFile() {
    if (!currentFile || !codeMirrorEditor) {
        showToast('No hay archivo abierto para guardar');
        return;
    }
    
    const content = codeMirrorEditor.getValue();
    socket.emit('save-file', {
        workspaceId,
        path: currentFile,
        content
    });
    
    showToast('Archivo guardado', true);
}

// Deshacer cambios
function undoEditor() {
    if (codeMirrorEditor) {
        codeMirrorEditor.undo();
    }
}

// Rehacer cambios
function redoEditor() {
    if (codeMirrorEditor) {
        codeMirrorEditor.redo();
    }
}

// Buscar en el editor
function findInEditor() {
    if (codeMirrorEditor) {
        codeMirrorEditor.execCommand('find');
    }
}

// Reemplazar en el editor
function replaceInEditor() {
    if (codeMirrorEditor) {
        codeMirrorEditor.execCommand('replace');
    }
}

// Formatear documento
function formatDocument() {
    if (!codeMirrorEditor) {
        showToast('No hay archivo abierto');
        return;
    }
    
    const mode = codeMirrorEditor.getOption('mode');
    const content = codeMirrorEditor.getValue();
    
    // Formatear según el tipo de archivo
    if (mode === 'javascript' || mode === 'application/json') {
        try {
            const formatted = JSON.stringify(JSON.parse(content), null, 4);
            codeMirrorEditor.setValue(formatted);
            showToast('Documento formateado', true);
        } catch (e) {
            // Si no es JSON válido, intentar formatear como JavaScript básico
            const lines = content.split('\n');
            let indentLevel = 0;
            const formatted = lines.map(line => {
                const trimmed = line.trim();
                
                // Reducir indentación antes de llaves de cierre
                if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }
                
                const formattedLine = '    '.repeat(indentLevel) + trimmed;
                
                // Aumentar indentación después de llaves de apertura
                if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
                    indentLevel++;
                }
                
                return formattedLine;
            }).join('\n');
            
            codeMirrorEditor.setValue(formatted);
            showToast('Documento formateado', true);
        }
    } else {
        showToast('Formateo automático no disponible para este tipo de archivo');
    }
}

// ===== FUNCIONES DE FORMATO DE TEXTO =====

// Insertar negrita (Markdown)
function insertBold() {
    if (!codeMirrorEditor) return;
    
    const selection = codeMirrorEditor.getSelection();
    if (selection) {
        codeMirrorEditor.replaceSelection(`**${selection}**`);
    } else {
        const cursor = codeMirrorEditor.getCursor();
        codeMirrorEditor.replaceRange('****', cursor);
        codeMirrorEditor.setCursor({line: cursor.line, ch: cursor.ch + 2});
    }
    codeMirrorEditor.focus();
}

// Insertar cursiva (Markdown)
function insertItalic() {
    if (!codeMirrorEditor) return;
    
    const selection = codeMirrorEditor.getSelection();
    if (selection) {
        codeMirrorEditor.replaceSelection(`*${selection}*`);
    } else {
        const cursor = codeMirrorEditor.getCursor();
        codeMirrorEditor.replaceRange('**', cursor);
        codeMirrorEditor.setCursor({line: cursor.line, ch: cursor.ch + 1});
    }
    codeMirrorEditor.focus();
}

// Insertar subrayado (HTML para Markdown/HTML)
function insertUnderline() {
    if (!codeMirrorEditor) return;
    
    const mode = codeMirrorEditor.getOption('mode');
    const selection = codeMirrorEditor.getSelection();
    
    if (mode === 'htmlmixed' || mode === 'xml') {
        // Para HTML usar etiqueta <u>
        if (selection) {
            codeMirrorEditor.replaceSelection(`<u>${selection}</u>`);
        } else {
            const cursor = codeMirrorEditor.getCursor();
            codeMirrorEditor.replaceRange('<u></u>', cursor);
            codeMirrorEditor.setCursor({line: cursor.line, ch: cursor.ch + 3});
        }
    } else {
        // Para Markdown usar HTML
        if (selection) {
            codeMirrorEditor.replaceSelection(`<u>${selection}</u>`);
        } else {
            const cursor = codeMirrorEditor.getCursor();
            codeMirrorEditor.replaceRange('<u></u>', cursor);
            codeMirrorEditor.setCursor({line: cursor.line, ch: cursor.ch + 3});
        }
    }
    codeMirrorEditor.focus();
}

// Cambiar tamaño de fuente
function changeFontSize() {
    if (!codeMirrorEditor) return;
    
    const select = document.getElementById('fontSizeSelect');
    const fontSize = select.value + 'px';
    
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement) {
        cmElement.style.fontSize = fontSize;
        codeMirrorEditor.refresh();
        
        // Guardar preferencia
        localStorage.setItem('editor_fontSize', fontSize);
        showToast(`Tamaño de fuente: ${fontSize}`, true);
    }
}

// Cambiar tipo de fuente
function changeFontFamily() {
    if (!codeMirrorEditor) return;
    
    const select = document.getElementById('fontFamilySelect');
    const fontFamily = select.value;
    
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement) {
        cmElement.style.fontFamily = fontFamily;
        codeMirrorEditor.refresh();
        
        // Guardar preferencia
        localStorage.setItem('editor_fontFamily', fontFamily);
        showToast('Tipo de fuente actualizado', true);
    }
}

// Cargar preferencias de fuente al iniciar
function loadEditorPreferences() {
    const savedFontSize = localStorage.getItem('editor_fontSize');
    const savedFontFamily = localStorage.getItem('editor_fontFamily');
    
    if (savedFontSize) {
        const select = document.getElementById('fontSizeSelect');
        const sizeValue = parseInt(savedFontSize);
        if (select) select.value = sizeValue;
        
        const cmElement = document.querySelector('.CodeMirror');
        if (cmElement) {
            cmElement.style.fontSize = savedFontSize;
        }
    }
    
    if (savedFontFamily) {
        const select = document.getElementById('fontFamilySelect');
        if (select) select.value = savedFontFamily;
        
        const cmElement = document.querySelector('.CodeMirror');
        if (cmElement) {
            cmElement.style.fontFamily = savedFontFamily;
        }
    }
    
    if (codeMirrorEditor) {
        codeMirrorEditor.refresh();
    }
}

// ===== FIN FUNCIONES DE FORMATO DE TEXTO =====

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    // Ctrl+S para guardar
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
    
    // Ctrl+F para buscar
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        findInEditor();
    }
    
    // Ctrl+H para reemplazar
    if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        replaceInEditor();
    }
    
    // Ctrl+B para negrita
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        insertBold();
    }
    
    // Ctrl+I para cursiva
    if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        insertItalic();
    }
    
    // Ctrl+U para subrayado
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        insertUnderline();
    }
});

// ===== FIN FUNCIONES DE LA BARRA DE HERRAMIENTAS =====

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
    
    // Restaurar carpetas expandidas antes de renderizar
    restoreExpandedFolders();
    
    renderFileTree();
    
    // Restaurar archivo abierto después de renderizar el árbol
    const savedFile = getOpenFile();
    if (savedFile) {
        setTimeout(() => {
            openFile(savedFile);
            // Hacer refresh de CodeMirror basado en tiempo
            setTimeout(() => {
                if (codeMirrorEditor) {
                    codeMirrorEditor.refresh();
                }
            }, 200);
        }, 150);
    }
    
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
    
    // Guardar archivo abierto
    saveOpenFile(path);
    
    if (codeMirrorEditor) {
        codeMirrorEditor.setValue(content || '');
        
        // Establecer modo según extensión
        const mode = getModeFromFilename(path);
        codeMirrorEditor.setOption('mode', mode);
        
        lastContent = content || '';
        
        // Actualizar CodeMirror después de cargar contenido
        codeMirrorEditor.refresh();
    }
    
    isUpdating = false;
    
    // Mostrar/ocultar botón Preview según el tipo de archivo
    if (path && path.endsWith('.html')) {
        previewBtn.style.display = 'flex';
    } else {
        previewBtn.style.display = 'none';
    }
    
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

// Indicador de quién está escribiendo
const _typingUsers = new Map(); // username → timer
socket.on('typing', ({ username: typer, isTyping }) => {
    if (isTyping) {
        if (_typingUsers.has(typer)) clearTimeout(_typingUsers.get(typer));
        const timer = setTimeout(() => {
            _typingUsers.delete(typer);
            _updateTypingIndicator();
        }, 3000);
        _typingUsers.set(typer, timer);
    } else {
        if (_typingUsers.has(typer)) {
            clearTimeout(_typingUsers.get(typer));
            _typingUsers.delete(typer);
        }
    }
    _updateTypingIndicator();
});

function _updateTypingIndicator() {
    const el = document.getElementById('chatTyping');
    if (!el) return;
    const names = Array.from(_typingUsers.keys());
    if (!names.length) { el.textContent = ''; return; }
    if (names.length === 1) el.textContent = names[0] + ' está escribiendo…';
    else if (names.length === 2) el.textContent = names[0] + ' y ' + names[1] + ' están escribiendo…';
    else el.textContent = 'Varios usuarios están escribiendo…';
}

socket.on('chat-system', (data) => {
    addChatMessage({ type: 'system', message: data.message });
});

socket.on('pong', (data) => {
    if (pingStartTime) {
        const latency = Date.now() - pingStartTime;
        showToast(`🏓 Latencia: ${latency}ms`, true);
        addChatMessage({ 
            type: 'system', 
            message: `Latencia con el servidor: ${latency}ms` 
        });
        pingStartTime = null;
    }
});

socket.on('kicked', (data) => {
    showToast(`❌ ${data.message}`, false);
    addChatMessage({ 
        type: 'system', 
        message: `⚠️ ${data.message}` 
    });
    
    // Opcional: redirigir o deshabilitar funcionalidad después de 3 segundos
    setTimeout(async () => {
        if (await showCustomConfirm('Has sido expulsado del workspace. ¿Deseas recargar la página?', 'Expulsado', 'Recargar', 'Cerrar')) {
            window.location.reload();
        }
    }, 3000);
});

socket.on('user-kicked', (data) => {
    addChatMessage({ 
        type: 'system', 
        message: `👮 ${data.kickedBy} expulsó a ${data.targetUser}: ${data.message}` 
    });
});

socket.on('users-list', (users) => {
    // Guardar el usuario actual si existe antes de limpiar
    const currentUser = onlineUsers.get(socket.id);
    
    onlineUsers.clear();
    users.forEach(user => {
        onlineUsers.set(user.id, user.username);
    });
    
    // Si el usuario actual no está en la lista (está en vanish), mantenerlo
    if (currentUser && !onlineUsers.has(socket.id)) {
        onlineUsers.set(socket.id, currentUser);
    }
    
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

socket.on('vanish-toggled', (data) => {
    if (data.enabled) {
        showToast('👻 Modo invisible activado - No apareces en la lista de usuarios', 'success');
    } else {
        showToast('✨ Modo invisible desactivado - Ahora eres visible', 'success');
    }
});

socket.on('vanish-error', (data) => {
    showToast(data.message || '❌ Error al usar el comando /vanish', 'error');
});

socket.on('unban-success', (data) => {
    showToast(`✅ ${data.message}`, 'success');
    addChatMessage({ 
        type: 'system', 
        message: `🔓 ${data.unbannedBy} desbaneó la IP: ${data.ipAddress}` 
    });
});

socket.on('unban-error', (data) => {
    showToast(data.message || '❌ Error al desbanear IP', 'error');
});

// Actualización de tickets en tiempo real
socket.on('ticket-refresh', async (data) => {
    await loadTickets();
    
    // Si el ticket abierto es el actualizado, recargarlo
    if (currentTicket && currentTicket._id === data.ticketId) {
        try {
            const response = await fetch(`/api/tickets/${data.ticketId}`);
            if (response.ok) {
                currentTicket = await response.json();

                if (!isAdminOrModerator && currentAuthenticatedUser) {
                    const readResponse = await fetch(`/api/tickets/${data.ticketId}/read`, { method: 'POST' });
                    if (readResponse.ok) {
                        const readData = await readResponse.json();
                        if (readData.ticket) {
                            currentTicket = readData.ticket;
                        }
                    }
                }

                renderTicketMessages();
                
                // Scroll al final solo si estaba cerca del final
                const messagesContainer = document.getElementById('ticketChatMessages');
                const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
                if (isNearBottom) {
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 100);
                }
                
                showToast('Nuevo mensaje en el ticket', true);
            }
        } catch (error) {
            console.error('Error actualizando ticket:', error);
        }
    }
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
            
            // Verificar si esta carpeta debe estar expandida
            const isExpanded = expandedFolders.has(itemPath);
            childrenContainer.style.display = isExpanded ? 'block' : 'none';
            
            // Si estaba expandida, agregar clase 'expanded' al chevron
            if (isExpanded) {
                setTimeout(() => {
                    const chevron = itemEl.querySelector('.chevron');
                    if (chevron) chevron.classList.add('expanded');
                }, 0);
            }
            
            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const chevron = itemEl.querySelector('.chevron');
                const isCurrentlyExpanded = chevron.classList.toggle('expanded');
                childrenContainer.style.display = isCurrentlyExpanded ? 'block' : 'none';
                
                // Guardar estado
                if (isCurrentlyExpanded) {
                    saveFolderExpanded(itemPath);
                } else {
                    saveFolderCollapsed(itemPath);
                }
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
    
    // Guardar archivo abierto
    saveOpenFile(path);
    
    // Actualizar selección en el árbol
    document.querySelectorAll('.tree-item').forEach(el => {
        if (el.dataset.path === path) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
}

// Mostrar editor
function showEditor() {
    emptyState.style.display = 'none';
    editorWrapper.style.display = 'block';
    if (codeMirrorEditor) {
        // Actualizar CodeMirror cuando se muestra el editor
        codeMirrorEditor.refresh();
        codeMirrorEditor.focus();
        
        // Cargar preferencias de fuente
        loadEditorPreferences();
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
async function contextMenuAction(action) {
    if (!contextMenuTarget) return;
    
    const { path, type } = contextMenuTarget;
    
    if (action === 'delete') {
        const fileName = path.split('/').pop();
        if (await showCustomConfirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`, 'Eliminar archivo', 'Eliminar', 'Cancelar')) {
            socket.emit('delete-item', {
                workspaceId,
                path
            });
        }
    } else if (action === 'rename') {
        const currentName = path.split('/').pop();
        const newName = await showCustomPrompt('Nuevo nombre:', 'Renombrar', currentName);
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
        // Mostrar menú de opciones si tiene contraseña
        const options = [
            { text: 'Cambiar contraseña', action: 'change' },
            { text: 'Quitar contraseña', action: 'remove' }
        ];
        
        showOptionsMenu(options, (action) => {
            if (action === 'change') {
                document.getElementById('changeWorkspacePasswordModal').style.display = 'flex';
            } else if (action === 'remove') {
                document.getElementById('removeWorkspacePasswordModal').style.display = 'flex';
            }
        });
    } else {
        // Mostrar modal para establecer contraseña
        document.getElementById('setWorkspacePasswordModal').style.display = 'flex';
    }
}

// Función auxiliar para mostrar menú de opciones
function showOptionsMenu(options, callback) {
    const menu = document.createElement('div');
    menu.className = 'context-menu show';
    menu.style.position = 'absolute';
    
    // Posicionar el menú cerca del botón
    const btn = document.getElementById('workspacePasswordBtn');
    const rect = btn.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 5) + 'px';
    
    options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.textContent = option.text;
        item.onclick = () => {
            callback(option.action);
            document.body.removeChild(menu);
        };
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // Cerrar al hacer click fuera
    const closeMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
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

function closeChangeWorkspacePasswordModal() {
    document.getElementById('changeWorkspacePasswordModal').style.display = 'none';
    document.getElementById('currentPasswordChange').value = '';
    document.getElementById('newPasswordChange').value = '';
    document.getElementById('confirmPasswordChange').value = '';
}

function confirmChangeWorkspacePassword() {
    const currentPassword = document.getElementById('currentPasswordChange').value.trim();
    const newPassword = document.getElementById('newPasswordChange').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordChange').value.trim();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Por favor, completa todos los campos');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Las contraseñas nuevas no coinciden');
        return;
    }
    
    if (newPassword.length < 4) {
        showToast('La contraseña debe tener al menos 4 caracteres');
        return;
    }
    
    if (currentPassword === newPassword) {
        showToast('La nueva contraseña debe ser diferente a la actual');
        return;
    }
    
    // Cerrar modal solo cuando todo es válido
    closeChangeWorkspacePasswordModal();
    
    // Limpiar contraseña guardada
    sessionStorage.removeItem(`ws_pass_${workspaceId}`);
    
    // Enviar al servidor
    socket.emit('change-workspace-password', {
        workspaceId,
        currentPassword,
        newPassword
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

socket.on('workspace-password-changed', () => {
    workspaceHasPassword = true;
    updatePasswordButton();
    // Limpiar la contraseña en memoria
    workspacePassword = null;
    sessionStorage.removeItem(`ws_pass_${workspaceId}`);
    showToast('¡Contraseña actualizada! Al recargar la página se te pedirá la nueva contraseña.', true);
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
        btn.innerHTML = '<i data-feather="shield" style="width: 14px; height: 14px;"></i> Protegido';
        btn.title = 'Workspace protegido - Click para cambiar o quitar contraseña';
        btn.style.background = 'rgba(78,201,176,0.15)';
        btn.style.color = 'var(--green, #4ec9b0)';
        btn.style.border = '1px solid rgba(78,201,176,0.4)';
    } else {
        btn.innerHTML = '<i data-feather="lock" style="width: 14px; height: 14px;"></i> Contraseña';
        btn.title = 'Proteger workspace con contraseña';
        btn.style.background = '';
        btn.style.color = '';
        btn.style.border = '';
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

// ===== FUNCIONES DE SUBIDA DE ARCHIVOS =====

let pendingUploadFiles = [];

// Mostrar modal de subida
function showUploadModal() {
    document.getElementById('uploadModal').classList.add('show');
    resetUploadModal();
    setTimeout(() => {
        feather.replace();
    }, 50);
}

// Cerrar modal de subida
function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('show');
    resetUploadModal();
}

// Resetear el modal a su estado inicial
function resetUploadModal() {
    pendingUploadFiles = [];
    document.getElementById('uploadOptions').style.display = 'none';
    document.getElementById('uploadAreaContainer').style.display = 'block';
    document.getElementById('uploadFileList').style.display = 'none';
    document.getElementById('uploadConfirmBtn').style.display = 'none';
    document.getElementById('fileListContainer').innerHTML = '';
}

// Mostrar opciones de subida
function showUploadOptions() {
    document.getElementById('uploadOptions').style.display = 'flex';
}

// Seleccionar archivos
function selectFiles() {
    const input = document.getElementById('fileUploadInput');
    input.onchange = handleFileSelection;
    input.click();
    document.getElementById('uploadOptions').style.display = 'none';
}

// Seleccionar carpeta
function selectFolder() {
    const input = document.getElementById('folderUploadInput');
    input.onchange = handleFolderSelection;
    input.click();
    document.getElementById('uploadOptions').style.display = 'none';
}

// Manejar selección de archivos
function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    pendingUploadFiles = files.map(file => ({
        file: file,
        path: file.name
    }));
    
    showFileList();
    event.target.value = '';
}

// Manejar selección de carpeta
function handleFolderSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    pendingUploadFiles = files.map(file => ({
        file: file,
        path: file.webkitRelativePath || file.name
    }));
    
    showFileList();
    event.target.value = '';
}

// Mostrar lista de archivos
function showFileList() {
    document.getElementById('uploadAreaContainer').style.display = 'none';
    document.getElementById('uploadFileList').style.display = 'block';
    document.getElementById('uploadConfirmBtn').style.display = 'flex';
    
    const container = document.getElementById('fileListContainer');
    container.innerHTML = '';
    
    pendingUploadFiles.forEach(fileData => {
        const item = document.createElement('div');
        item.className = 'file-list-item';
        
        const size = formatFileSize(fileData.file.size);
        
        item.innerHTML = `
            <i data-feather="file"></i>
            <span class="file-path">${fileData.path}</span>
            <span class="file-size">${size}</span>
        `;
        
        container.appendChild(item);
    });
    
    document.getElementById('fileCount').textContent = pendingUploadFiles.length;
    
    setTimeout(() => {
        feather.replace();
    }, 50);
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Confirmar subida
async function confirmUpload() {
    const uploadPath = currentFolder || '';
    
    try {
        document.getElementById('uploadConfirmBtn').disabled = true;
        document.getElementById('uploadConfirmBtn').innerHTML = '<i data-feather="loader" style="width: 14px; height: 14px; animation: spin 1s linear infinite;"></i> Subiendo...';
        
        let successCount = 0;
        
        // Crear estructura de carpetas primero si es necesario
        const folders = new Set();
        for (let fileData of pendingUploadFiles) {
            const parts = fileData.path.split('/');
            let currentPath = uploadPath;
            
            for (let i = 0; i < parts.length - 1; i++) {
                currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
                folders.add(currentPath);
            }
        }
        
        // Crear carpetas en orden
        for (let folderPath of Array.from(folders).sort()) {
            await createFolderPath(folderPath);
        }
        
        // Subir archivos
        for (let fileData of pendingUploadFiles) {
            const fullPath = uploadPath ? `${uploadPath}/${fileData.path}` : fileData.path;
            const success = await uploadFileContent(fileData.file, fullPath);
            if (success) successCount++;
        }
        
        if (successCount > 0) {
            showToast(`${successCount} archivo(s) subido(s) correctamente`, 'success');
            closeUploadModal();
        } else {
            showToast('No se pudo subir ningún archivo', 'error');
        }
        
    } catch (error) {
        console.error('Error subiendo archivos:', error);
        showToast('Error al subir archivos: ' + error.message, 'error');
    } finally {
        document.getElementById('uploadConfirmBtn').disabled = false;
        document.getElementById('uploadConfirmBtn').innerHTML = '<i data-feather="upload" style="width: 14px; height: 14px;"></i> Subir';
        feather.replace();
    }
}

// Manejar drag over
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.add('dragover');
}

// Manejar drag leave
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
}

// Manejar drop
async function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
    
    const items = event.dataTransfer.items;
    const files = event.dataTransfer.files;
    
    pendingUploadFiles = [];
    
    if (items && items.length > 0) {
        // Verificar si es una carpeta
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.webkitGetAsEntry) {
                const entry = item.webkitGetAsEntry();
                await processEntry(entry, '');
            }
        }
    } else if (files && files.length > 0) {
        pendingUploadFiles = Array.from(files).map(file => ({
            file: file,
            path: file.name
        }));
    }
    
    if (pendingUploadFiles.length > 0) {
        showFileList();
    }
}

// Procesar entrada de archivo/carpeta
async function processEntry(entry, path) {
    if (entry.isFile) {
        return new Promise((resolve) => {
            entry.file((file) => {
                const filePath = path ? `${path}/${file.name}` : file.name;
                pendingUploadFiles.push({ file, path: filePath });
                resolve();
            });
        });
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        return new Promise((resolve) => {
            dirReader.readEntries(async (entries) => {
                const dirPath = path ? `${path}/${entry.name}` : entry.name;
                for (let childEntry of entries) {
                    await processEntry(childEntry, dirPath);
                }
                resolve();
            });
        });
    }
}

// Crear una ruta de carpeta completa
function createFolderPath(folderPath) {
    return new Promise((resolve) => {
        // Verificar si la carpeta ya existe
        const pathParts = folderPath.split('/');
        let currentStructure = fileStructure;
        let folderExists = true;
        
        for (let part of pathParts) {
            if (currentStructure[part] && currentStructure[part].type === 'folder') {
                currentStructure = currentStructure[part].children;
            } else {
                folderExists = false;
                break;
            }
        }
        
        if (folderExists) {
            resolve();
            return;
        }
        
        // Crear la carpeta
        const fpParts = folderPath.split('/');
        const fpName = fpParts.pop();
        const fpParent = fpParts.join('/');
        socket.emit('create-folder', { 
            workspaceId, 
            name: fpName,
            parentPath: fpParent || undefined
        });
        
        // Esperar confirmación
        setTimeout(resolve, 100);
    });
}

// Subir contenido de archivo
async function uploadFileContent(file, fullPath) {
    try {
        const content = await readFileAsText(file);
        
        return new Promise((resolve) => {
            // Separar nombre de archivo de su carpeta padre
            const pathParts = fullPath.split('/');
            const fileName = pathParts.pop();
            const parentPath = pathParts.join('/') || undefined;

            // Crear el archivo usando socket
            socket.emit('create-file', { 
                workspaceId, 
                name: fileName,
                parentPath
            });
            
            // Esperar un momento para que se cree el archivo
            setTimeout(() => {
                // Actualizar el contenido del archivo
                socket.emit('send-changes', {
                    workspaceId,
                    path: fullPath,
                    content: content
                });
                
                resolve(true);
            }, 200);
        });
        
    } catch (error) {
        console.error(`Error al subir ${file.name}:`, error);
        return false;
    }
}

// Leer archivo como texto
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        
        reader.onerror = (e) => {
            reject(new Error(`Error leyendo ${file.name}`));
        };
        
        // Intentar leer como texto
        reader.readAsText(file);
    });
}
// ===== SISTEMA DE TICKETS =====

let tickets = [];

// Toggle sidebar (ocultar/mostrar)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
}

// Añadir evento de teclado para Ctrl+B
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
    }
});

// Cargar tickets
async function loadTickets() {
    try {
        if (!isAdminOrModerator && !currentAuthenticatedUser) {
            const userData = await loadRegisteredUserSession();
            if (!userData) {
                renderTicketLoginRequired();
                return;
            }
        }

        const response = await fetch(`/api/tickets/workspace/${workspaceId}`);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                renderTicketLoginRequired();
                return;
            }
            throw new Error('Error al cargar tickets');
        }
        
        tickets = await response.json();
        renderTickets();
        updateTicketsBadge();
    } catch (error) {
        console.error('Error cargando tickets:', error);
        document.getElementById('ticketsList').innerHTML = `
            <div style="text-align: center; color: #858585; padding: 20px;">
                Error al cargar tickets
            </div>
        `;
    }
}

// Renderizar tickets
function renderTickets() {
    const ticketsList = document.getElementById('ticketsList');
    
    if (tickets.length === 0) {
        ticketsList.innerHTML = `
            <div style="text-align: center; color: #858585; padding: 20px;">
                <i data-feather="inbox" style="width: 48px; height: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No hay tickets creados</p>
                <p style="font-size: 0.85em; margin-top: 5px;">Crea un ticket si necesitas ayuda o quieres reportar un problema</p>
            </div>
        `;
        feather.replace();
        return;
    }
    
    const ticketsHTML = tickets.map(ticket => {
        const createdDate = new Date(ticket.createdAt).toLocaleDateString('es-ES');
        const statusClass = ticket.status.replace('-', '');
        const statusText = {
            'open': 'Abierto',
            'in-progress': 'En Progreso',
            'resolved': 'Resuelto',
            'closed': 'Cerrado'
        }[ticket.status] || ticket.status;
        
        const categoryIcon = {
            'bug': '<i data-feather="alert-circle" style="width: 12px; height: 12px;"></i>',
            'feature': '<i data-feather="star" style="width: 12px; height: 12px;"></i>',
            'help': '<i data-feather="help-circle" style="width: 12px; height: 12px;"></i>',
            'other': '<i data-feather="message-square" style="width: 12px; height: 12px;"></i>'
        }[ticket.category] || '<i data-feather="message-square" style="width: 12px; height: 12px;"></i>';
        
        return `
            <div class="ticket-card" onclick="viewTicketDetail('${ticket._id}')">
                <div class="ticket-card-header">
                    <div class="ticket-title">${ticket.title}</div>
                    <span class="ticket-status ${statusClass}">${statusText}</span>
                </div>
                <div class="ticket-meta">
                    <div class="ticket-meta-item">
                        <span class="ticket-category">${categoryIcon} ${ticket.category}</span>
                    </div>
                    <div class="ticket-meta-item">
                        <span class="ticket-priority ${ticket.priority}">
                            ${ticket.priority}
                        </span>
                    </div>
                    <div class="ticket-meta-item">
                        <i data-feather="calendar" style="width: 12px; height: 12px;"></i>
                        ${createdDate}
                    </div>
                </div>
                <div class="ticket-description">${ticket.description}</div>
                ${ticket.responses && ticket.responses.length > 0 ? `
                    <div class="ticket-responses-count">
                        <i data-feather="message-circle" style="width: 14px; height: 14px;"></i>
                        ${ticket.responses.length} respuesta${ticket.responses.length !== 1 ? 's' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    ticketsList.innerHTML = ticketsHTML;
    feather.replace();
}

// Actualizar badge de tickets
function updateTicketsBadge() {
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length;
    const badge = document.getElementById('ticketsBadge');
    
    if (openTickets > 0) {
        badge.textContent = openTickets;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Mostrar modal para nuevo ticket
function showNewTicketModal() {
    if (!currentAuthenticatedUser) {
        showToast('Debes iniciar sesión para crear tickets');
        window.open('/signin', '_blank');
        return;
    }

    document.getElementById('ticketModal').classList.add('show');
    document.getElementById('ticketTitle').value = '';
    document.getElementById('ticketDescription').value = '';
    document.getElementById('ticketCategory').value = 'bug';
    document.getElementById('ticketPriority').value = 'medium';
    setTimeout(() => {
        document.getElementById('ticketTitle').focus();
    }, 100);
}

// Cerrar modal de ticket
function closeTicketModal() {
    document.getElementById('ticketModal').classList.remove('show');
}

// Cerrar modal al hacer clic fuera de él
document.addEventListener('DOMContentLoaded', function() {
    const ticketModal = document.getElementById('ticketModal');
    if (ticketModal) {
        ticketModal.addEventListener('click', function(e) {
            if (e.target === ticketModal) {
                closeTicketModal();
            }
        });
    }
});

// Enviar ticket
async function submitTicket() {
    const title = document.getElementById('ticketTitle').value.trim();
    const description = document.getElementById('ticketDescription').value.trim();
    const category = document.getElementById('ticketCategory').value;
    const priority = document.getElementById('ticketPriority').value;
    
    if (!title || !description) {
        showToast('Por favor completa todos los campos');
        return;
    }
    
    if (title.length < 5) {
        showToast('El título debe tener al menos 5 caracteres');
        return;
    }
    
    if (description.length < 10) {
        showToast('La descripción debe tener al menos 10 caracteres');
        return;
    }
    
    try {
        const response = await fetch('/api/tickets/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workspaceId,
                title,
                description,
                category,
                priority
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Error del servidor:', data);
            throw new Error(data.error || 'Error al crear ticket');
        }
        
        showToast('Ticket creado exitosamente');
        closeTicketModal();
        loadTickets();
    } catch (error) {
        console.error('Error creando ticket:', error);
        showToast('Error al crear ticket: ' + error.message);
    }
}

// Ver detalle de ticket
let currentTicket = null;

async function viewTicketDetail(ticketId) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar ticket');
        }
        
        currentTicket = await response.json();
        
        // Mostrar modal de chat
        document.getElementById('ticketChatModal').classList.add('show');
        document.getElementById('ticketChatTitle').textContent = currentTicket.title;
        
        const statusText = {
            'open': 'Abierto',
            'in-progress': 'En Progreso',
            'resolved': 'Resuelto',
            'closed': 'Cerrado'
        }[currentTicket.status] || currentTicket.status;
        
        document.getElementById('ticketChatStatus').textContent = statusText;
        document.getElementById('ticketChatCategory').textContent = currentTicket.category;
        document.getElementById('ticketChatPriority').textContent = currentTicket.priority;
        document.getElementById('ticketChatDescription').textContent = currentTicket.description;

        if (!isAdminOrModerator && currentAuthenticatedUser) {
            const readResponse = await fetch(`/api/tickets/${ticketId}/read`, { method: 'POST' });
            if (readResponse.ok) {
                const readData = await readResponse.json();
                if (readData.ticket) {
                    currentTicket = readData.ticket;
                }
            }
        }
        
        // Renderizar mensajes
        renderTicketMessages();
        
        // Scroll al final
        setTimeout(() => {
            const messagesContainer = document.getElementById('ticketChatMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
        
        feather.replace();
    } catch (error) {
        console.error('Error cargando detalle del ticket:', error);
        showToast('Error al cargar detalle del ticket');
    }
}

// Renderizar mensajes del ticket
function renderTicketMessages() {
    const messagesContainer = document.getElementById('ticketChatMessages');
    
    if (!currentTicket || !currentTicket.responses || currentTicket.responses.length === 0) {
        messagesContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">No hay mensajes aún. Inicia la conversación.</div>';
        return;
    }
    
    const messagesHTML = currentTicket.responses.map(response => {
        const time = new Date(response.timestamp).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        const authorName = response.authorName || (response.isAdmin ? 'Administrador' : 'Tú');
        
        return `
            <div class="ticket-message ${response.isAdmin ? 'admin' : ''}">
                <div class="ticket-message-header">
                    <span class="ticket-message-user">${authorName}</span>
                    <span class="ticket-message-time">${time}</span>
                </div>
                <div class="ticket-message-text">${response.message}</div>
            </div>
        `;
    }).join('');
    
    messagesContainer.innerHTML = messagesHTML;
}

// Enviar mensaje al ticket
async function sendTicketMessage() {
    const input = document.getElementById('ticketChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!currentTicket) {
        showToast('Error: No hay ticket seleccionado');
        return;
    }
    
    try {
        const response = await fetch(`/api/tickets/${currentTicket._id}/response`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al enviar mensaje');
        }
        
        // Actualizar ticket actual
        currentTicket = data.ticket;
        
        // Limpiar input
        input.value = '';
        
        // Renderizar mensajes
        renderTicketMessages();
        
        // Scroll al final
        setTimeout(() => {
            const messagesContainer = document.getElementById('ticketChatMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
        
        // Recargar lista de tickets
        loadTickets();
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        showToast('Error al enviar mensaje: ' + error.message);
    }
}

// Cerrar chat de ticket
function closeTicketChat() {
    document.getElementById('ticketChatModal').classList.remove('show');
    currentTicket = null;
    document.getElementById('ticketChatInput').value = '';
}

// ===== FUNCIONES DE PREVIEW DE HTML =====

function showHtmlPreview() {
    if (!currentFile) {
        showCustomAlert('Por favor selecciona un archivo', 'Aviso');
        return;
    }
    
    // Verificar si es un archivo HTML
    if (!currentFile.endsWith('.html')) {
        showCustomAlert('Solo se pueden previsualizar archivos HTML', 'Tipo de archivo no soportado');
        return;
    }
    
    const htmlContent = codeMirrorEditor.getValue();
    const fileName = currentFile.split('/').pop();
    
    // Actualizar título del preview
    document.getElementById('previewTitle').textContent = `Vista Previa - ${fileName}`;
    
    // Mostrar el modal
    previewModal.style.display = 'flex';
    
    // Cargar el contenido en el iframe
    loadPreviewContent(htmlContent, fileName);
}

function closeHtmlPreview() {
    previewModal.style.display = 'none';
    previewFrame.srcdoc = '';
}

function loadPreviewContent(htmlContent, fileName) {
    const baseName = fileName.replace('.html', '');
    
    // Crear HTML que vamos a usar
    let previewHtml = htmlContent;
    
    // Intentar buscar e inyectar CSS/JS que puede estar en el archivo structure
    // Si la referencia local a .css o .js no funciona, inyectamos el contenido directamente
    
    // Buscar referencias de CSS en el HTML
    const cssRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let cssMatches;
    
    while ((cssMatches = cssRegex.exec(htmlContent)) !== null) {
        const href = cssMatches[1];
        // Si es una referencia local (no externa como http o //)
        if (!href.startsWith('http') && !href.startsWith('//')) {
            // Añadir estilos inline como fallback si falla la referencia
            const styleComment = `<!-- CSS: ${href} -->`;
            previewHtml = previewHtml.replace(cssMatches[0], styleComment);
        }
    }
    
    // Buscar referencias de JS en el HTML
    const jsRegex = /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi;
    let jsMatches;
    
    while ((jsMatches = jsRegex.exec(htmlContent)) !== null) {
        const src = jsMatches[1];
        // Si es una referencia local
        if (!src.startsWith('http') && !src.startsWith('//')) {
            // Mantener la referencia pero será relativa al HTML
            // El navegador intentará cargarla
        }
    }
    
    // Agregar meta tag para viewport
    if (!previewHtml.includes('viewport')) {
        previewHtml = previewHtml.replace('<head>', '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }
    
    // Cargar en el iframe
    previewFrame.srcdoc = previewHtml;
}