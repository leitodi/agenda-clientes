@echo off
REM Instalar dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo Error al instalar dependencias. Asegúrate de tener Node.js instalado.
        pause
        exit /b 1
    )
)

REM Iniciar el servidor
echo.
echo ========================================
echo Iniciando Agenda de Clientes...
echo ========================================
echo.
echo El servidor está disponible en:
echo http://localhost:3000
echo.
echo Abre esta URL en tu navegador.
echo Presiona Ctrl+C para detener el servidor.
echo.

node server.js

pause
