@echo off
cd /d "%~dp0"
color 0A
cls
title Agenda de Clientes - Instalador

echo.
echo.
echo ================================================================================
echo                   AGENDA DE CLIENTES - INSTALADOR AUTOMÁTICO
echo ================================================================================
echo.
echo Este programa instalará y ejecutará la Agenda de Clientes en tu computadora.
echo.
echo Requisitos:
echo   - Conexión a internet (solo para la primera instalación)
echo   - Permisos de administrador
echo.
pause

REM Verificar si Node.js está instalado
echo.
echo Verificando si Node.js está instalado...
node --version >nul 2>&1

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js no está instalado en tu computadora.
    echo.
    echo Por favor, descarga e instala Node.js desde:
    echo https://nodejs.org/
    echo.
    echo Después de instalar, ejecuta este programa de nuevo.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js está instalado
echo.

REM Instalar dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias necesarias...
    echo Esto puede tomar unos minutos...
    echo.
    call npm install
    
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] No se pudieron instalar las dependencias.
        echo Por favor, intenta lo siguiente:
        echo 1. Verifica tu conexión a internet
        echo 2. Ejecuta este programa nuevamente
        echo.
        pause
        exit /b 1
    )
    
    echo [OK] Dependencias instaladas correctamente
    echo.
)

REM Iniciando servidor
cls
echo.
echo ================================================================================
echo                        INICIANDO AGENDA DE CLIENTES
echo ================================================================================
echo.
echo El servidor está iniciándose...
echo.
timeout /t 2 /nobreak

echo ✓ Servidor activo en http://localhost:3000
echo.
echo Abriendo navegador automáticamente...
echo.
timeout /t 2 /nobreak

REM Abrir navegador
start http://localhost:3000

echo.
echo ================================================================================
echo INSTRUCCIONES:
echo ================================================================================
echo.
echo 1. El navegador debe abrirse automáticamente.
echo    Si no sucede, abre manualmente: http://localhost:3000
echo.
echo 2. El servidor está ejecutándose en esta ventana.
echo    NO CIERRES ESTA VENTANA mientras usas la aplicación.
echo.
echo 3. Para detener el servidor, presiona: Ctrl + C
echo.
echo 4. Puedes cerrar y volver a abrir esta ventana sin perder tus datos.
echo.
echo ================================================================================
echo.

node server.js

pause
