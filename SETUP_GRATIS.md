# 🚀 Despliegue GRATUITO - Vercel + MongoDB Atlas

## Paso 1: MongoDB Atlas (Base de Datos Gratis)

1. Ve a https://www.mongodb.com/cloud/atlas/register
2. Crea una cuenta gratis
3. Click en "Build a Database" → Selecciona **M0 FREE**
4. Elige región: **AWS / EU-WEST-1 (Ireland)** o **US-EAST-1** (la más cercana)
5. Click "Create Cluster"

### Configurar Acceso:

1. **Security → Database Access**:
   - Click "Add New Database User"
   - Username: `codespace`
   - Password: Genera una contraseña segura (guárdala)
   - Database User Privileges: **Atlas admin**
   - Click "Add User"

2. **Security → Network Access**:
   - Click "Add IP Address"
   - Click "Allow Access From Anywhere" (0.0.0.0/0)
   - Click "Confirm"

3. **Obtener Connection String**:
   - Click en "Connect" en tu cluster
   - Selecciona "Connect your application"
   - Copia el string: `mongodb+srv://codespace:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Reemplaza `<password>` con tu contraseña
   - **GUARDA ESTE STRING** - lo necesitarás en Vercel

---

## Paso 2: Desplegar en Vercel (GRATIS)

1. Ve a https://vercel.com/signup
2. Registrate con tu cuenta de GitHub
3. Click en "Add New" → "Project"
4. Importa el repositorio **CodeSpace**
5. En "Configure Project":
   - Framework Preset: **Other**
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. **Variables de Entorno** - Click en "Environment Variables" y agrega:

```
PORT=3000
SESSION_SECRET=tu-secreto-super-seguro-cambialo
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=admin123
MONGO_URI=mongodb+srv://codespace:TU_PASSWORD@cluster0.xxxxx.mongodb.net/codespace?retryWrites=true&w=majority
NODE_ENV=production
DATA_DIR=/tmp/workspaces-data
```

⚠️ **IMPORTANTE**: Cambia `TU_PASSWORD` por la contraseña que creaste en MongoDB Atlas

7. Click en **"Deploy"**

---

## Paso 3: ¡Listo!

Vercel te dará una URL tipo: `https://codespace-xxxxx.vercel.app`

### Problemas comunes:

1. **Error de build**: Asegúrate que subiste los cambios a GitHub
2. **MongoDB no conecta**: Verifica el connection string en variables de entorno
3. **Archivos no se guardan**: Normal, Vercel usa filesystem temporal. Los workspaces se guardan en memoria

---

## Siguiente: Subir cambios a GitHub

Ejecuta estos comandos:

```bash
git add .
git commit -m "Configuración para Vercel deployment"
git push origin main
```

Vercel desplegará automáticamente cada vez que hagas push a main.

