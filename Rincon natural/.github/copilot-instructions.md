# Instrucciones Copilot - Rincón Natural

## Descripción del Proyecto

Sistema de gestión completo para dietética **Rincón Natural** con autenticación, control de inventario, empleados, proveedores, caja y reportes.

### Stack Tecnológico
- **Backend**: Node.js, Express, Prisma, PostgreSQL, JWT
- **Frontend**: React, TypeScript, Tailwind CSS, Vite, XLSX (Excel)
- **Colores**: Verde Inglés (#2D5016), Madera (#8B6914), Blanco (#FFFFFF)

### Funcionalidades Principales
1. **Autenticación**: Sistema login/logout
2. **Productos**: Gestión con proveedores y cantidades (kg, g, unidad)
3. **Empleados**: Registro con horarios y rol (personal/empleado)
4. **Proveedores**: Directorio con contacto
5. **Stock**: Monitoreo con alertas de mínimo
6. **Caja**: Ventas por rango de fechas con exportación Excel
7. **Reportes**: Detalles de ventas diarias

### Estructura del Proyecto
```
backend/
  src/
    controllers/
    routes/
    models/
    middleware/
    utils/
  prisma/
  .env
  package.json

frontend/
  src/
    pages/
    components/
    hooks/
    services/
    styles/
  public/
  .env
  vite.config.ts
  package.json
```

### Reglas de Desarrollo
- Usar TypeScript en frontend y backend
- Colores según paleta definida en tailwind.config.ts
- Componentes React reutilizables
- API RESTful bien documentada
- Variables de entorno en .env.local
- Validación de datos en cliente y servidor

### Comandos Principales
- `npm run dev` - Desarrollo local
- `npm run build` - Producción
- `npm test` - Tests
- `npx prisma migrate dev` - Migraciones BD

---
**Última actualización**: 2026-06-22
