# 📅 AGENDA DE CLIENTES - Guía de Instalación para Clientes

## ¿Qué es esto?

Este es un sistema profesional de gestión de clientes que permite:
- ➕ Agregar nuevos clientes con sus datos
- 📸 Subir 2 fotos de cada cliente
- 📞 Guardar teléfono e Instagram
- 👁️ Ver todos los clientes en una lista
- 🔍 Ver detalles ampliados de cada cliente
- 📱 Acceder desde cualquier dispositivo en la red local

## 📋 Requisitos Previos

**IMPORTANTE:** Necesitas tener **Node.js** instalado en tu computadora.

### Descargar e instalar Node.js

1. Ve a: https://nodejs.org/
2. Descarga la versión **LTS** (Recomendada)
3. Ejecuta el instalador y sigue estos pasos:
   - Haz clic en "Next" varias veces
   - En la pantalla de opciones, deja todo por defecto
   - Haz clic en "Install"
   - Espera a que termine la instalación
   - Reinicia tu computadora

Para verificar que Node.js se instaló correctamente:
- Abre cmd (Busca "cmd" en el botón de inicio)
- Escribe: `node --version`
- Si ves un número de versión, ¡está instalado correctamente!

## 🚀 Instalación de la Agenda

### Opción 1: Instalación Automática (Recomendado)

1. **Descarga** la carpeta "Agenda de turnos" del cliente
2. **Ubica** la carpeta en tu escritorio o donde quieras
3. **Haz doble clic** en el archivo `INSTALAR.bat`
4. Espera a que se complete la instalación
5. ¡El navegador se abrirá automáticamente!

### Opción 2: Instalación Manual

Si `INSTALAR.bat` no funciona:

1. **Abre** la carpeta "Agenda de turnos"
2. **Haz doble clic** en `iniciar.bat`
3. Espera a que aparezca el mensaje: "Servidor ejecutándose en http://localhost:3000"
4. **Abre tu navegador** (Chrome, Firefox, Edge, etc.)
5. **En la barra de direcciones**, escribe: `http://localhost:3000`
6. **Presiona Enter**

## 💡 Uso de la Aplicación

### Agregar un nuevo cliente:

1. En la sección izquierda "Agregar Cliente", completa:
   - **Nombre:** Nombre completo del cliente
   - **Teléfono:** Número de teléfono
   - **Instagram:** Usuario de Instagram (sin @)
   - **Foto 1:** Sube la primera foto (formato JPG o PNG)
   - **Foto 2:** Sube la segunda foto

2. Haz clic en **"Guardar Cliente"**

3. El cliente aparecer automáticamente en la lista

### Ver detalles de un cliente:

1. En la lista del medio, haz **clic sobre un cliente**
2. A la derecha aparecerán todas sus fotos y datos
3. Haz clic en cualquier foto para verla en grande

### Cambiar fotos:

1. Selecciona un cliente
2. Haz clic en **"Cambiar Foto 1"** o **"Cambiar Foto 2"**
3. Carga la nueva foto

### Eliminar fotos:

1. Selecciona un cliente
2. Pasa el mouse sobre la foto que quieres eliminar
3. Haz clic en la **X roja** que aparece

### Eliminar un cliente:

1. Selecciona un cliente
2. Haz clic en **"Eliminar Cliente"**
3. Confirma cuando te pregunte

## 🗂️ Archivos de Datos

Todos tus datos se guardan automáticamente en un archivo llamado **`agenda.db`**.

Este archivo está en la carpeta del proyecto y contiene toda la información de tus clientes.

**IMPORTANTE:** No elimines este archivo, ¡contiene todos tus datos!

## 🆘 Solución de Problemas

### El archivo `INSTALAR.bat` no se abre

**Solución:**
- Haz doble clic en `iniciar.bat` en su lugar
- O abre cmd en la carpeta y escribe: `npm start`

### Aparece "Node.js no está instalado"

**Solución:**
- Descargar e instala Node.js desde https://nodejs.org/
- Reinicia tu computadora
- Intenta instalar de nuevo

### El navegador no abre automáticamente

**Solución:**
- Abre manualmente tu navegador
- En la barra de direcciones escribe: `http://localhost:3000`
- Presiona Enter

### El servidor muestra un error

**Solución:**
1. Cierra el programa (Ctrl + C)
2. Deleta el archivo `agenda.db`
3. Abre `INSTALAR.bat` de nuevo

### No puedo acceder desde otro dispositivo

**Solución:**
1. Necesitas la IP de la computadora donde corre la aplicación
2. En cmd, escribe: `ipconfig` y busca la "Dirección IPv4"
3. En otro dispositivo en la misma red, abre: `http://[IP]:3000`
   Ejemplo: `http://192.168.1.100:3000`

## ⚙️ Información Técnica

- **Base de datos:** SQLite (local, sin servidor externo)
- **Puerto:** 3000
- **Almacenamiento:** Carpeta local
- **Internet:** NO necesario (solo en primera instalación para descargar dependencias)

## 📞 Soporte

Si tienes problemas:
1. Revisa la sección "Solución de Problemas" arriba
2. Verifica que Node.js esté correctamente instalado
3. Contacta al desarrollador con screenshot del error

¡Disfruta usando tu Agenda de Clientes! 😊
