#!/bin/bash
set -e

echo "==> CodeSpace — iniciando..."

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "==> Instalando dependencias..."
    npm install
fi

# Compilar TypeScript usando el binario local
echo "==> Compilando TypeScript..."
./node_modules/.bin/tsc

# Arrancar el servidor
echo "==> Servidor listo. Arrancando..."
node dist/server.js
