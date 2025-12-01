// Vercel serverless function entry point
const path = require('path');

// Cargar el servidor compilado
const { app } = require('../dist/server.js');

// Exportar para Vercel
module.exports = app;
