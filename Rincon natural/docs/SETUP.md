# Rincón Natural - Guía Completa

## 📋 Descripción General

**Rincón Natural** es un sistema integral de gestión para dietéticas que incluye:

✅ Autenticación segura con JWT
✅ Gestión de productos con proveedores
✅ Control de empleados y horarios
✅ Directorio de proveedores
✅ Monitoreo de stock con alertas
✅ Registro de ventas (Caja)
✅ Exportación a Excel
✅ Interfaz intuitiva con colores naturales

## 🎨 Diseño Visual

### Paleta de Colores
- **Verde Inglés**: `#2D5016` - Color principal
- **Madera**: `#8B6914` - Acentos secundarios
- **Blanco**: `#FFFFFF` - Fondo y contraste

### Componentes Principales
- Sidebar con navegación
- Header con usuario
- Tablas CRUD
- Formularios reactivos
- Alertas visuales

## 🏗️ Arquitectura

```
┌─────────────────────────────────────┐
│       Frontend (React + TS)         │
│  (Vite, Tailwind, TypeScript)       │
└──────────────┬──────────────────────┘
               │
          HTTP/JSON (JWT)
               │
┌──────────────▼──────────────────────┐
│    Backend (Node.js + Express)      │
│  (Prisma ORM, PostgreSQL)           │
└──────────────┬──────────────────────┘
               │
        Database Connection
               │
┌──────────────▼──────────────────────┐
│      PostgreSQL Database            │
│  (Tables: Users, Products, etc)     │
└─────────────────────────────────────┘
```

## 🚀 Inicio Rápido

### 1. Instalar Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL
npm run migrate
npm run seed    # Cargar datos de prueba
npm run dev
```

El backend correrá en `http://localhost:3000`

### 2. Instalar Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

El frontend correrá en `http://localhost:5173`

### 3. Acceder a la Aplicación

- URL: `http://localhost:5173`
- Usuario: `rincon`
- Contraseña: `rincon123`

## 📊 Módulos Principales

### 1. **Dashboard**
- Resumen de estadísticas
- Total de empleados, productos, proveedores
- Ventas del día

### 2. **Caja (Ventas)**
- Registro de transacciones diarias
- Filtro por rango de fechas
- Detalles de productos vendidos
- **Exportación a Excel** con resumen

### 3. **Productos**
- Crear, editar, eliminar productos
- Vinculación con proveedores
- Unidades: kg, gramos, unidad
- Stock mínimo configurable

### 4. **Empleados**
- Registro de personal
- **Selección de días de trabajo** (como en foto adjunta)
- Horarios de entrada y salida
- Rol: Personal o Empleado
- Sueldo fijo

### 5. **Proveedores**
- Directorio completo
- Datos de contacto (teléfono, email)
- Dirección

### 6. **Stock**
- Tabla de productos con cantidades
- **Alertas en rojo** para stock bajo
- Edición de stock mínimo
- Resumen visual

## 📱 Características por Página

### Login
- Autenticación segura
- Guardado de sesión

### Tablas CRUD
Todas las tablas incluyen:
- ✏️ Botón Editar
- 🗑️ Botón Eliminar
- ➕ Botón Agregar Nuevo

### Caja - Exportación Excel
```
Fecha      | Cantidad | Total   | Productos
2026-06-22 | 3        | $450.50 | Proteína Whey (2kg)...
```

## 🔄 Flujo de Datos

### Crear una Venta
1. Empleado accede a **Caja**
2. Sistema resta stock de cada producto
3. Venta se registra en la BD
4. Stock se actualiza automáticamente

### Ejemplo de Validación
- Productos con stock < mínimo se muestran **en rojo**
- Stock bajo genera alertas en la pantalla de Stock

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Estilos** | Tailwind CSS |
| **Backend** | Node.js, Express |
| **ORM** | Prisma |
| **BD** | PostgreSQL |
| **Auth** | JWT |
| **Excel** | XLSX |

## 📝 Notas Importantes

1. **Base de Datos**: Asegúrate de tener PostgreSQL instalado y ejecutándose
2. **Variables de Entorno**: Copia `.env.example` a `.env` en ambas carpetas
3. **Seed Data**: Los datos de prueba se cargan con `npm run seed`
4. **CORS**: Ya configurado para desarrollo local
5. **Tokens**: Expiran en 7 días

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Validación en cliente y servidor
- CORS configurado

## 📞 Soporte

Para problemas:
1. Verifica que ambos servidores estén corriendo
2. Revisa la consola del navegador para errores
3. Verifica las variables de entorno
4. Consulta los README específicos de backend/frontend

## 📄 Licencia

Privado - Rincón Natural

---

**Última actualización**: 2026-06-22
> Nota: la implementacion actual usa MongoDB + Mongoose. Las referencias viejas a Prisma/PostgreSQL en este documento quedaron desactualizadas.
