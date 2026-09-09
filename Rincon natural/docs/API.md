# API Endpoints - Rincón Natural

## Base URL
```
http://localhost:3000/api
```

## Headers Requeridos

Todos los endpoints (excepto Auth) requieren:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 🔐 AUTENTICACIÓN

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "rincon",
  "password": "rincon123"
}
```

**Respuesta (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "rincon",
    "name": "Administrador"
  }
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "nuevo@usuario.com",
  "password": "password123",
  "name": "Nuevo Usuario"
}
```

---

## 📦 PRODUCTOS

### Listar Todos
```http
GET /products
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "name": "Proteína Whey",
    "providerId": 1,
    "quantity": 50,
    "unit": "kg",
    "minimumStock": 10,
    "provider": {
      "id": 1,
      "name": "Proteínas Premium"
    }
  }
]
```

### Obtener Uno
```http
GET /products/:id
Authorization: Bearer <token>
```

### Crear
```http
POST /products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Avena Integral",
  "providerId": 2,
  "quantity": 75,
  "unit": "kg",
  "minimumStock": 20
}
```

### Actualizar
```http
PUT /products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 80,
  "minimumStock": 25
}
```

### Eliminar
```http
DELETE /products/:id
Authorization: Bearer <token>
```

---

## 👥 EMPLEADOS

### Listar Todos
```http
GET /employees
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "123456789",
    "role": "personal",
    "salary": 3000,
    "active": true,
    "schedules": [
      {
        "id": 1,
        "monday": true,
        "tuesday": true,
        "wednesday": true,
        "thursday": true,
        "friday": true,
        "saturday": true,
        "sunday": false,
        "startTime": "09:00",
        "endTime": "21:00"
      }
    ]
  }
]
```

### Crear
```http
POST /employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Carlos",
  "lastName": "López",
  "phone": "987654321",
  "role": "empleado",
  "salary": 2500,
  "schedule": {
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": false,
    "friday": true,
    "saturday": true,
    "sunday": false,
    "startTime": "10:00",
    "endTime": "18:00"
  }
}
```

**Valores de `role`:** `"personal"` o `"empleado"`

**Unidades de tiempo:** 
- `startTime`, `endTime`: formato HH:MM (24h)

### Actualizar
```http
PUT /employees/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "salary": 2700,
  "phone": "111111111"
}
```

### Eliminar
```http
DELETE /employees/:id
Authorization: Bearer <token>
```

---

## 🏢 PROVEEDORES

### Listar Todos
```http
GET /providers
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "name": "Proteínas Premium",
    "address": "Calle Principal 123",
    "phone": "123456789",
    "email": "info@proteinaspremium.com",
    "active": true
  }
]
```

### Obtener Uno
```http
GET /providers/:id
Authorization: Bearer <token>
```

### Crear
```http
POST /providers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nuevo Proveedor",
  "address": "Dirección Completa",
  "phone": "555666777",
  "email": "contacto@provider.com"
}
```

### Actualizar
```http
PUT /providers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "999888777",
  "email": "newemail@provider.com"
}
```

### Eliminar
```http
DELETE /providers/:id
Authorization: Bearer <token>
```

---

## 💳 VENTAS (CAJA)

### Listar Todas
```http
GET /sales
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "employeeId": 1,
    "saleDate": "2026-06-22T10:30:00Z",
    "total": 450.50,
    "employee": {
      "id": 1,
      "firstName": "Juan",
      "lastName": "Pérez"
    },
    "items": [
      {
        "id": 1,
        "saleId": 1,
        "productId": 1,
        "quantity": 2,
        "unit": "kg",
        "price": 225.25,
        "product": {
          "id": 1,
          "name": "Proteína Whey"
        }
      }
    ]
  }
]
```

### Por Rango de Fechas
```http
GET /sales/range?startDate=2026-06-01&endDate=2026-06-30
Authorization: Bearer <token>
```

**Parámetros:**
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD

### Crear Venta
```http
POST /sales
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": 1,
  "total": 450.50,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unit": "kg",
      "price": 225.25
    },
    {
      "productId": 2,
      "quantity": 1,
      "unit": "unidad",
      "price": 0
    }
  ]
}
```

**Nota:** Al crear una venta, el stock se actualiza automáticamente (se resta la cantidad vendida).

---

## ❌ Códigos de Error

| Código | Descripción |
|--------|-----------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Autenticación requerida |
| 403 | Forbidden - Token inválido |
| 404 | Not Found - Recurso no encontrado |
| 500 | Server Error - Error del servidor |

**Ejemplo de error:**
```json
{
  "error": "Email y contraseña requeridos"
}
```

---

## 🔄 Flujos Típicos

### 1. Agregar Producto
```
1. POST /products
2. Backend crea producto con quantity y minimumStock
3. Producto aparece en listado
4. Si quantity < minimumStock, se muestra alerta en Stock
```

### 2. Realizar Venta
```
1. POST /sales
2. Backend resta quantity de cada producto
3. Stock se actualiza automáticamente
4. Venta aparece en listado de Caja
```

### 3. Crear Empleado
```
1. POST /employees
2. Sistema crea empleado y su horario
3. Empleado aparece en listado
4. Horario visible en horarios de trabajo
```

---

## 📌 Notas

- Todos los timestamps están en UTC (ISO 8601)
- Las contraseñas nunca se retornan en respuestas
- El token expira en 7 días
- IDs son números enteros (int)
- Unidades de cantidad: `"kg"`, `"g"`, `"unidad"`
- Roles de empleados: `"personal"`, `"empleado"`

---

**Última actualización**: 2026-06-22
