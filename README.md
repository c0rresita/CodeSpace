# 🚀 ShareCode - Plataforma Colaborativa de Código

<div align="center">

![ShareCode](https://img.shields.io/badge/ShareCode-Collaborative%20IDE-4ec9b0?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=for-the-badge&logo=socket.io)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

**Editor colaborativo en tiempo real con explorador de archivos, terminal integrada, chat y contenedores Docker**

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Planes](#-planes) • [Tecnologías](#️-tecnologías)

</div>

---

## ✨ Características

### 🎯 Funcionalidades Principales

- **📁 Explorador de Archivos**: Organiza tu código en carpetas y archivos
- **👥 Edición Colaborativa**: Múltiples usuarios editando en tiempo real
- **💬 Chat en Vivo**: Comunícate con tu equipo mientras codeas
- **🔒 Workspaces Protegidos**: Protege tus proyectos con contraseña
- **🎨 Resaltado de Sintaxis**: Soporte para 15+ lenguajes de programación
- **📦 Exportación**: Descarga tus proyectos como ZIP
- **🐙 Integración GitHub**: Exporta directamente a repositorios
- **👀 Lista de Usuarios**: Ve quién está conectado en tiempo real

### 🐳 Planes Premium (Docker)

#### 💼 Plan Pro ($9.99/mes)
- Terminal integrada
- Contenedores Docker
- Ejecución de código (Python, JavaScript, etc.)
- Hasta 500 archivos
- 100 MB de almacenamiento
- Hasta 10 colaboradores

#### 🏢 Plan Enterprise ($49.99/mes)
- Todo lo de Pro +
- Archivos ilimitados
- Almacenamiento ilimitado
- Colaboradores ilimitados
- Servidor privado
- Soporte 24/7

### 🎟️ Sistema de Descuentos

Los administradores pueden crear códigos de descuento desde el panel de administración:
- Descuentos porcentuales o de cantidad fija
- Límite de usos configurables
- Activación/desactivación en tiempo real

---

## 🚀 Instalación

### Requisitos Previos

- Node.js 18+
- npm o yarn
- Docker (opcional, para planes premium)

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/c0rresita/AutoInjeccion-Tool.git
cd AutoInjeccion-Tool
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno (opcional)**
```bash
# Crear archivo .env
PORT=3000
DOCKER_ENABLED=true
```

4. **Iniciar el servidor**
```bash
npm start
```

5. **Acceder a la aplicación**
```
http://localhost:3000
```

---

## 📖 Uso

### 1️⃣ Crear un Workspace

1. Ve a `http://localhost:3000`
2. Escribe un nombre para tu workspace (ej: `mi-proyecto`)
3. **(Opcional)** Marca "Proteger con contraseña" y establece una
4. Haz clic en "Abrir Workspace"

### 2️⃣ Gestión de Archivos

- **Crear archivo/carpeta**: Click derecho en el explorador → Nueva carpeta/archivo
- **Renombrar**: Click derecho → Renombrar
- **Eliminar**: Click derecho → Eliminar
- **Abrir archivo**: Click en el nombre del archivo

### 3️⃣ Colaboración

- **Compartir**: Copia la URL y compártela con tu equipo
- **Chat**: Click en el icono de chat para comunicarte
- **Usuarios online**: Ve la lista de colaboradores activos
- **Cambiar nombre**: Edita tu nombre de usuario en el panel de chat

### 4️⃣ Exportación

- **ZIP**: Click en el botón de descarga para exportar como ZIP
- **GitHub**: Click en el icono de GitHub, introduce tu repo y token

### 5️⃣ Panel de Administración

Accede a `http://localhost:3000/admin` con:
- **Email**: `admin@sharecode.com`
- **Contraseña**: `admin123`

Desde aquí puedes:
- Ver todos los workspaces
- Gestionar usuarios registrados
- Crear/gestionar códigos de descuento
- Filtrar por plan, tamaño, fecha
- Eliminar workspaces

### 6️⃣ Dashboard de Usuario

Los usuarios registrados acceden a `http://localhost:3000/dashboard` donde pueden:
- Ver todos sus workspaces
- Estadísticas de uso
- Acceso rápido a proyectos recientes

---

## 💳 Planes

### 🆓 Plan Free
- Hasta 50 archivos
- 10 MB de almacenamiento
- Hasta 3 colaboradores
- Edición en tiempo real
- Exportar a ZIP

### 💎 Plan Pro
- Hasta 500 archivos
- 100 MB de almacenamiento
- Hasta 10 colaboradores
- **Terminal integrada**
- **Contenedores Docker**
- **Ejecución de código**
- Dominio personalizado

### 🏆 Plan Enterprise
- Archivos ilimitados
- Almacenamiento ilimitado
- Colaboradores ilimitados
- **Servidor privado**
- **Soporte 24/7**
- SLA garantizado

---

## 🛠️ Tecnologías

### Backend
- **Node.js** (v18+) - Entorno de ejecución
- **Express** (v4.18) - Framework web
- **Socket.io** (v4.6) - WebSockets en tiempo real
- **Dockerode** (v4.0) - API de Docker
- **bcrypt** (v5.1) - Cifrado de contraseñas

### Frontend
- **Vanilla JavaScript** - Sin frameworks pesados
- **CodeMirror** (v5.65) - Editor de código
- **Feather Icons** - Iconografía
- **Devicon** - Iconos de lenguajes

### Almacenamiento
- Sistema de archivos JSON
- Limpieza automática (30 días)
- Persistencia en disco

### Docker
- Contenedores aislados por usuario
- Imágenes: Node.js, Python, etc.
- Límites de recursos (CPU/RAM)

---

## 📁 Estructura del Proyecto

```
share-code/
├── server.js              # Servidor principal
├── package.json           # Dependencias
├── public/                # Frontend
│   ├── index.html        # Página de inicio
│   ├── workspace.html    # Editor principal
│   ├── workspace.js      # Lógica del editor
│   ├── plans.html        # Página de planes
│   ├── login.html        # Autenticación
│   ├── admin.html        # Panel de admin
│   └── user-dashboard.html # Dashboard de usuario
├── workspaces-data/      # Datos persistentes
├── Dockerfile            # Imagen Docker
├── docker-compose.yml    # Configuración Docker
└── README.md            # Este archivo
```

---

## 🔐 Seguridad

- **Contraseñas cifradas** con bcrypt
- **Sesiones** con express-session
- **Protección de workspaces** con contraseña opcional
- **Aislamiento Docker** para ejecución de código
- **Validación** de entrada en todos los endpoints

---

## 🚢 Despliegue

### Docker Compose

```bash
docker-compose up -d
```

### Variables de Entorno

```env
PORT=3000
DOCKER_ENABLED=true
SESSION_SECRET=tu-secreto-seguro
```

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

---

## 🙏 Agradecimientos

- CodeMirror por el excelente editor
- Socket.io por la comunicación en tiempo real
- La comunidad de Docker

---

<div align="center">

**⭐ Si te gusta este proyecto, dale una estrella en GitHub ⭐**

Made with ❤️ by c0rresita

</div>
- **Frontend**: HTML5, CSS3, JavaScript vanilla

## 📝 Desarrollo

Para desarrollo con auto-reload:
```bash
npm run dev
```

## 🌐 Despliegue

Puedes desplegar esta aplicación en cualquier plataforma que soporte Node.js:
- Heroku
- Railway
- Render
- DigitalOcean
- AWS
- Vercel (con configuración adicional)

## 📄 Licencia

MIT
