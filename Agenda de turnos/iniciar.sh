#!/bin/bash

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error al instalar dependencias. Asegúrate de tener Node.js instalado."
        exit 1
    fi
fi

# Iniciar el servidor
echo ""
echo "========================================"
echo "Iniciando Agenda de Clientes..."
echo "========================================"
echo ""
echo "El servidor está disponible en:"
echo "http://localhost:3000"
echo ""
echo "Abre esta URL en tu navegador."
echo "Presiona Ctrl+C para detener el servidor."
echo ""

node server.js
