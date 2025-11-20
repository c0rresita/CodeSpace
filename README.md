# 🚀 CodeSpace - Editor Colaborativo en Tiempo Real

<div align="center">

![CodeSpace](https://img.shields.io/badge/CodeSpace-Collaborative%20Editor-4ec9b0?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=for-the-badge&logo=socket.io)
![MongoDB](https://img.shields.io/badge/MongoDB-Optional-47A248?style=for-the-badge&logo=mongodb)

**Editor colaborativo en tiempo real con explorador de archivos, chat persistente y sistema de workspaces**

[Características](#-características) • [Instalación](#-instalación-rápida) • [Uso](#-uso) • [Tecnologías](#️-tecnologías)

</div>

---

## ✨ Características

### 🎯 Funcionalidades Principales

- **📁 Explorador de Archivos**: Organiza tu código en carpetas y archivos jerárquicos
- **👥 Edición Colaborativa**: Múltiples usuarios editando en tiempo real con Socket.IO
- **💬 Chat Persistente**: Chat en vivo con historial guardado (MongoDB o archivos JSON)
- **🔒 Protección de Archivos**: Protege archivos individuales con contraseña
- **🎨 Resaltado de Sintaxis**: Soporte para múltiples lenguajes con CodeMirror
- **📦 Exportación ZIP**: Descarga tus proyectos completos
- **🐙 Integración GitHub**: Exporta directamente a repositorios GitHub
- **👀 Usuarios en Línea**: Ve quién está conectado en tiempo real
- **🔐 Panel de Administración**: Gestiona workspaces y visualiza estadísticas
- **⚡ Sesiones Únicas**: Sistema de sesiones para identificar usuarios únicos
- **🧹 Limpieza Automática**: Workspaces inactivos se eliminan automáticamente (configurable)

---

## 🚀 Instalación Rápida

### Requisitos Previos

- **Node.js** 18 o superior
- **npm** o **yarn**
- **MongoDB** (opcional, para persistencia de chat)

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/c0rresita/CodeSpace
cd CodeSpace
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` en la raíz del proyecto:

```env
# Puerto del servidor
PORT=3000

# Seguridad
SESSION_SECRET=codespace-secret-key-production-2025

# Credenciales de administrador
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=admin123

# Base de datos MongoDB (opcional)
# Si no se configura, el chat se guardará en archivos JSON
# MONGO_URI=mongodb://localhost:27017/codespace

# Limpieza automática
CLEANUP_INTERVAL_DAYS=1
WORKSPACE_EXPIRY_DAYS=30
```

4. **Compilar TypeScript**
```bash
npm run build
```

5. **Iniciar el servidor**
```bash
npm start
```

6. **Acceder a la aplicación**
```
http://localhost:3000
```

### 🐳 Instalación con MongoDB (Opcional)

**Opción 1: MongoDB Local**
```bash
# Windows (con Chocolatey)
choco install mongodb

# Mac (con Homebrew)
brew install mongodb-community

# Linux (Ubuntu/Debian)
sudo apt install mongodb
```

**Opción 2: MongoDB con Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

**Opción 3: MongoDB Atlas (Cloud Gratis)**
1. Crea cuenta en https://www.mongodb.com/cloud/atlas
2. Crea un cluster gratuito (M0)
3. Obtén tu URI de conexión
4. Configura en `.env`:
```env
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/codespace
```

---

## 📖 Uso

### 1️⃣ Crear un Workspace

1. Ve a `http://localhost:3000`
2. Escribe un nombre para tu workspace (ej: `mi-proyecto`)
3. Haz clic en "Abrir Workspace"
4. O accede directamente desde la URL: `http://localhost:3000/mi-proyecto`

### 2️⃣ Gestión de Archivos

- **Crear carpeta**: Click derecho en el explorador → Nueva carpeta
- **Crear archivo**: Click derecho → Nuevo archivo
- **Proteger archivo**: Click derecho en archivo → Establecer contraseña
- **Renombrar**: Click derecho → Renombrar
- **Eliminar**: Click derecho → Eliminar
- **Abrir archivo**: Click en el nombre del archivo

### 3️⃣ Colaboración en Tiempo Real

- **Compartir**: Copia la URL y compártela (ej: `localhost:3000/mi-proyecto`)
- **Chat**: Click en el icono de chat para comunicarte
- **Historial**: Los mensajes se guardan automáticamente
- **Usuarios online**: Ve quiénes están conectados en tiempo real
- **Cambiar nombre**: Edita tu nombre de usuario en el panel de chat

### 4️⃣ Exportación

**Descargar como ZIP:**
- Click en el botón de descarga
- Se descargará un archivo `workspace-[nombre].zip`

**Exportar a GitHub:**
1. Click en el icono de GitHub
2. Introduce:
   - URL del repositorio (ej: `c0rresita/mi-repo`)
   - Token de acceso personal ([crear token](https://github.com/settings/tokens))
   - Mensaje del commit
3. Click en "Exportar"

### 5️⃣ Panel de Administración

Accede a `http://localhost:3000/accesoadministracion` con:
- **Email**: `admin@admin.com`
- **Contraseña**: `admin123`

**Funcionalidades:**
- Ver todos los workspaces activos
- Estadísticas de uso (archivos, tamaño, usuarios)
- Eliminar workspaces (sin alerta de confirmación)
- Limpiar workspaces expirados
- Visualizar información detallada

---

## 🛠️ Tecnologías

### Backend
- **TypeScript** - Tipado estático
- **Node.js** (v18+) - Entorno de ejecución
- **Express** - Framework web
- **Socket.io** - WebSockets en tiempo real
- **Mongoose** - ODM para MongoDB (opcional)
- **bcrypt** - Cifrado de contraseñas
- **express-session** - Manejo de sesiones
- **dotenv** - Variables de entorno

### Frontend
- **Vanilla JavaScript** - Sin frameworks pesados
- **CodeMirror 5** - Editor de código profesional
- **Feather Icons** - Iconografía moderna
- **CSS3** - Diseño responsive

### Persistencia
- **Archivos JSON** - Sistema de archivos para workspaces
- **MongoDB** (opcional) - Base de datos para chat persistente
- **Dual Storage** - Chat en archivos JSON si no hay MongoDB
- **Limpieza automática** - TTL de 30 días en MongoDB

### Arquitectura
- **Modular TypeScript** - Código organizado en módulos
- **Socket.IO Rooms** - Salas por workspace
- **Sesiones únicas** - Un usuario = múltiples pestañas/sockets
- **Compilación** - TypeScript → JavaScript (dist/)

---

## 📁 Estructura del Proyecto

```
share-code/
├── src/                      # Código fuente TypeScript
│   ├── config/              # Configuración
│   ├── database/            # Conexión MongoDB
│   ├── middleware/          # Middlewares Express
│   ├── models/              # Modelos Mongoose
│   ├── routes/              # Rutas de la API
│   ├── services/            # Lógica de negocio
│   ├── socket/              # Manejadores Socket.IO
│   ├── types/               # Tipos TypeScript
│   └── server.ts            # Punto de entrada
├── dist/                     # Código compilado (JavaScript)
├── public/                   # Frontend estáticos
│   ├── index.html           # Página de inicio
│   ├── workspace.html       # Editor principal
│   ├── admin.html           # Panel de administración
│   ├── accesoadministracion.html  # Login admin
│   └── js/
│       └── workspace.js     # Lógica del editor
├── workspaces-data/         # Datos persistentes
│   └── [workspace-id]/      # Un directorio por workspace
│       ├── files.json       # Estructura de archivos
│       ├── metadata.json    # Metadatos del workspace
│       └── chat.json        # Historial de chat (si no hay MongoDB)
├── .env                     # Variables de entorno
├── .env.example             # Ejemplo de configuración
├── package.json             # Dependencias
├── tsconfig.json            # Configuración TypeScript
├── .gitignore               # Archivos ignorados por Git
└── README.md                # Esta documentación
```

---

## 🔐 Seguridad

- **Contraseñas cifradas** con bcrypt (salt rounds: 10)
- **Sesiones únicas** con express-session
- **Protección de archivos** con contraseña individual
- **Validación de entrada** en todos los endpoints
- **Sin autenticación requerida** para usuarios (modo anónimo)
- **Panel admin protegido** con credenciales

---

## 💾 Sistema de Chat

### Persistencia Dual

El chat funciona con dos modos de almacenamiento:

**Con MongoDB:**
- Mensajes guardados en base de datos
- TTL automático de 30 días
- Consultas optimizadas con índices
- Estadísticas en tiempo real

**Sin MongoDB (Fallback):**
- Mensajes guardados en `workspaces-data/[id]/chat.json`
- Límite de 500 mensajes por workspace
- Historial completo recuperable
- Sin dependencias externas

### Características del Chat

- ✅ Mensajes en tiempo real con Socket.IO
- ✅ Historial persistente automático
- ✅ Límite de 500 mensajes (archivos) o 30 días (MongoDB)
- ✅ Recuperación al recargar página
- ✅ Estadísticas de mensajes y usuarios únicos

---

## 🧹 Limpieza Automática

Los workspaces inactivos se eliminan automáticamente:

- **Intervalo**: Configurable en `.env` (default: 1 día)
- **Expiración**: 30 días sin actividad (configurable)
- **Limpieza manual**: Disponible en panel de administración
- **Logs**: Información en consola sobre workspaces eliminados

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Modo desarrollo con ts-node-dev

# Producción
npm run build        # Compilar TypeScript a JavaScript
npm start            # Iniciar servidor desde dist/

# Utilidades
npm run watch        # Compilar en modo observación
npm run clean        # Limpiar directorio dist/
```

---

## 🌐 Despliegue en Producción

### Variables de Entorno Recomendadas

```env
PORT=3000
SESSION_SECRET=genera-un-secreto-muy-seguro-aqui
ADMIN_EMAIL=tu-email@ejemplo.com
ADMIN_PASSWORD=contraseña-segura
MONGO_URI=mongodb+srv://usuario:pass@cluster.mongodb.net/codespace
CLEANUP_INTERVAL_DAYS=1
WORKSPACE_EXPIRY_DAYS=30
```

### Plataformas Compatibles

- **Heroku** - Con MongoDB Atlas
- **Railway** - Configuración automática
- **Render** - Free tier disponible
- **DigitalOcean** - VPS con Node.js
- **AWS EC2** - Servidor dedicado
- **Vercel** - Con configuración adicional (serverless)

### Pasos Generales

1. Configurar variables de entorno en la plataforma
2. Conectar repositorio de GitHub
3. Configurar comando de build: `npm run build`
4. Configurar comando de start: `npm start`
5. Establecer MongoDB Atlas URI (recomendado)

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 👨‍💻 Autor

**c0rresita**

- GitHub: [@c0rresita](https://github.com/c0rresita)
- Repositorio: [AutoInjeccion-Tool](https://github.com/c0rresita/AutoInjeccion-Tool)

---

## 🙏 Agradecimientos

- **CodeMirror** - Excelente editor de código
- **Socket.io** - Comunicación en tiempo real
- **MongoDB** - Base de datos flexible
- **TypeScript** - Tipado estático para JavaScript
- **Express** - Framework web minimalista

---

<div align="center">

**⭐ Si te gusta este proyecto, dale una estrella en GitHub ⭐**

**🐛 Reporta bugs en [Issues](https://github.com/c0rresita/AutoInjeccion-Tool/issues)**

Made with ❤️ by c0rresita

</div>
