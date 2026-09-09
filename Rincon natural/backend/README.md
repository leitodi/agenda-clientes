# Backend - Rincón Natural

API RESTful para el sistema de gestión de la dietética Rincón Natural.

## 🚀 Instalación

### Requisitos
- Node.js 18+
- MongoDB 6+
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

Edita `.env` con tus datos de base de datos:
```
MONGODB_URI="mongodb://127.0.0.1:27017/rincon_natural"
MONGODB_DB_NAME="rincon_natural"
JWT_SECRET="tu_secreto_muy_seguro"
PORT=3000
NODE_ENV="development"
```

3. **Cargar datos de prueba (seed)**
```bash
npm run seed
```

4. **Iniciar en desarrollo**
```bash
npm run dev
```

El servidor se ejecutará en `http://localhost:3000`

## 📚 Endpoints API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Empleados
- `GET /api/employees` - Listar empleados
- `GET /api/employees/:id` - Obtener empleado
- `POST /api/employees` - Crear empleado
- `PUT /api/employees/:id` - Actualizar empleado
- `DELETE /api/employees/:id` - Eliminar empleado

### Proveedores
- `GET /api/providers` - Listar proveedores
- `GET /api/providers/:id` - Obtener proveedor
- `POST /api/providers` - Crear proveedor
- `PUT /api/providers/:id` - Actualizar proveedor
- `DELETE /api/providers/:id` - Eliminar proveedor

### Ventas (Caja)
- `GET /api/sales` - Listar ventas
- `GET /api/sales/range?startDate=X&endDate=Y` - Ventas por rango
- `POST /api/sales` - Crear venta

## 🔧 Scripts Disponibles

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Compilar a JavaScript
- `npm start` - Ejecutar versión compilada
- `npm run seed` - Crear usuario `rincon` y datos base

## 📝 Estructura

```
src/
  controllers/    # Lógica de negocios
  routes/        # Definición de endpoints
  middleware/    # Autenticación, validación
  utils/         # Funciones auxiliares
  types/         # Tipos TypeScript
```

## 🔐 Autenticación

Todos los endpoints (excepto auth) requieren un token JWT en el header:
```
Authorization: Bearer <token>
```

## 📖 Más Información

Para más detalles, consulta la documentación principal en `README.md`
