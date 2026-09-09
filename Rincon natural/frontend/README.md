# Frontend - Rincón Natural

Aplicación React TypeScript con Vite para el sistema de gestión de la dietética Rincón Natural.

## 🚀 Instalación

### Requisitos
- Node.js 18+
- npm o yarn

### Pasos

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita `.env`:
```
VITE_API_URL=/api
```

3. **Iniciar desarrollo**
```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`

## 🎨 Paleta de Colores

- Verde: `#2D5016`
- Madera: `#8B6914`
- Blanco: `#FFFFFF`

## 📚 Páginas

- **Login** - Autenticación de usuarios
- **Dashboard** - Resumen diario del negocio
- **Caja** - Registro y reportes de ventas
- **Productos** - Gestión de catálogo
- **Empleados** - Personal y horarios
- **Proveedores** - Directorio de proveedores
- **Stock** - Monitoreo de inventario

## 🔧 Scripts

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Build para producción
- `npm run preview` - Previsualizar build

## 📁 Estructura

```
src/
  pages/        # Páginas de la aplicación
  components/   # Componentes reutilizables
  services/     # API client
  hooks/        # Custom hooks
  types/        # Tipos TypeScript
  styles/       # Estilos globales
```

## 🔐 Autenticación

El token JWT se guarda automáticamente en localStorage y se incluye en cada request.

Credenciales de prueba:
- Usuario: `rincon`
- Password: `rincon123`

## 📊 Funcionalidades

### Caja
- Registro de ventas por fecha
- Exportación a Excel con detalles
- Resumen por rango de fechas

### Productos
- CRUD completo
- Vinculación con proveedores
- Gestión de unidades (kg, g, unidad)

### Empleados
- Registro de personal
- Configuración de horarios (7 días)
- Roles (personal/empleado)

### Stock
- Alertas de stock bajo (en rojo)
- Edición de stock mínimo
- Resumen visual

## 🚀 Deployment

Para producción:
```bash
npm run build
```

Los archivos compilados estarán en la carpeta `dist/`

## 🔗 Integración con Backend

El cliente realiza requests a `VITE_API_URL` (por defecto `/api`). En desarrollo, Vite las proxyea a `http://localhost:3000`.
