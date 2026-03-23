@echo off
REM Script para limpiar el proyecto antes de distribuir

echo.
echo ================================================================================
echo              PREPARAR PROYECTO PARA DISTRIBUCION/VENTA
echo ================================================================================
echo.
echo Este script eliminará archivos innecesarios para reducir tamaño.
echo.
echo Se eliminarán:
echo   - Carpeta node_modules (se descargará automáticamente en el cliente)
echo   - Archivo agenda.db (se creará con datos nuevos)
echo   - Archivos temporales
echo.
echo El cliente solo necesita hacer clic en INSTALAR.bat
echo.

pause

REM Crear backup de la BD si existe
if exist "agenda.db" (
    echo Creando backup de la base de datos...
    copy agenda.db agenda.db.backup
    echo Backup guardado como: agenda.db.backup
    echo.
)

REM Eliminar node_modules
if exist "node_modules" (
    echo Eliminando carpeta node_modules...
    rmdir /s /q node_modules
    echo [OK] node_modules eliminada
    echo.
)

REM Eliminar BD original
if exist "agenda.db" (
    echo Eliminando base de datos anterior...
    del agenda.db
    echo [OK] agenda.db eliminada (se recreará con datos nuevos)
    echo.
)

REM Limpiar archivos temporales
del /q *.log 2>nul
del /q *.tmp 2>nul

echo.
echo ================================================================================
echo                    PROYECTO LISTO PARA DISTRIBUCIÓN
echo ================================================================================
echo.
echo Archivos a entregar al cliente:
echo.
echo ✓ INSTALAR.bat
echo ✓ iniciar.bat
echo ✓ GUIA_INSTALACION_CLIENTE.md
echo ✓ README.md
echo ✓ package.json
echo ✓ server.js
echo ✓ public/ (carpeta con HTML, CSS, JS)
echo ✓ agenda.db.backup (opcional, para referencia)
echo.
echo Tamaño aproximado: 2-3 MB (después descargará ~100MB de dependencias la primera vez)
echo.
echo Próximos pasos:
echo 1. Comprime la carpeta en un .ZIP
echo 2. Envía al cliente o copia a USB
echo 3. El cliente ejecuta INSTALAR.bat
echo.
pause
