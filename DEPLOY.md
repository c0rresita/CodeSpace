# 🚀 Guía de Despliegue en Vercel con Cloudflare D1

## Paso 1: Configurar Cloudflare D1

1. **Instalar Wrangler CLI**:
```bash
npm install -g wrangler
```

2. **Login en Cloudflare**:
```bash
wrangler login
```

3. **Crear la base de datos D1**:
```bash
wrangler d1 create codespace-db
```

4. **Copiar el `database_id`** que te devuelve y actualízalo en `wrangler.toml`

5. **Ejecutar el schema**:
```bash
wrangler d1 execute codespace-db --file=./schema.sql
```

## Paso 2: Desplegar en Vercel

1. **Instalar Vercel CLI** (opcional):
```bash
npm install -g vercel
```

2. **Conectar con GitHub**:
   - Ve a https://vercel.com
   - Click en "Import Project"
   - Conecta tu repositorio de GitHub

3. **Configurar Variables de Entorno en Vercel**:
   
   En el dashboard de Vercel, añade estas variables:
   
   ```
   PORT=3000
   SESSION_SECRET=tu-secreto-muy-seguro-aqui
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=tu-password-seguro
   NODE_ENV=production
   ```

4. **Deploy**:
   - Vercel desplegará automáticamente cada push a main
   - O ejecuta: `vercel --prod`

## Paso 3: Configuración Post-Deploy

### Nota Importante sobre Cloudflare D1

Por ahora, Cloudflare D1 funciona mejor con **Cloudflare Workers**, no directamente con Vercel. 

### Opciones recomendadas:

#### Opción A: Usar Cloudflare Workers + D1 (Recomendado)
- Desplegar todo en Cloudflare Workers
- Usar D1 como base de datos
- Mejor integración y rendimiento

#### Opción B: Vercel + MongoDB Atlas (Más simple)
- Desplegar en Vercel
- Usar MongoDB Atlas (gratis hasta 512MB)
- Agregar variable de entorno: `MONGO_URI=mongodb+srv://...`

#### Opción C: Vercel + Turso (SQLite en la nube)
- Desplegar en Vercel  
- Usar Turso (SQLite distribuido, gratis hasta 9GB)
- Compatible con el código actual

## ¿Qué prefieres?

1. **Cloudflare Workers + D1** - Más complejo pero mejor rendimiento
2. **Vercel + MongoDB Atlas** - Funciona ya, solo agregar MONGO_URI
3. **Vercel + Turso** - Medio término, SQLite distribuido

Dime cuál opción prefieres y te ayudo a configurarla.
