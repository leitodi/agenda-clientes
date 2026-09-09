# 🚀 Quick Start Guide - Rincón Natural

## Instalación Rápida (5 minutos)

### Paso 1: Backend
```bash
cd backend
npm install
cp .env.example .env
# Edita .env y cambia MONGODB_URI si vas a usar otra base
npm run seed
npm run dev
```
✅ Backend corriendo en `http://localhost:3000`

### Paso 2: Frontend (Nueva terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
✅ Frontend corriendo en `http://localhost:5173`

### Paso 3: Acceso
- **URL**: http://localhost:5173
- **Usuario**: rincon
- **Contraseña**: rincon123

---

## 📋 Menú Principal

```
┌─────────────────────────────────────┐
│        RINCÓN NATURAL               │
│     Panel de Gestión                │
├─────────────────────────────────────┤
│ 📊 Dashboard                        │
│ 💰 Caja                             │
│ 📦 Productos                        │
│ 👥 Empleados                        │
│ 🚚 Proveedores                      │
│ 📈 Stock                            │
│ 🚪 Cerrar Sesión                    │
└─────────────────────────────────────┘
```

---

## 🎯 Tareas Comunes

### 📦 Crear Producto
1. Clic en **Productos**
2. Clic en **+ Nuevo Producto**
3. Llenar formulario:
   - Nombre: "Proteína Whey"
   - Proveedor: Selecciona de la lista
   - Cantidad: 50
   - Unidad: kg
   - Stock Mínimo: 10
4. Clic en **Guardar**

### 👥 Crear Empleado
1. Clic en **Empleados**
2. Clic en **+ Nuevo Empleado**
3. Datos personales:
   - Nombre: Juan
   - Apellido: Pérez
   - Teléfono: 123456789
   - Rol: Personal o Empleado
   - Sueldo: 3000
4. **Seleccionar días de trabajo**:
   - ☑️ Lunes, Martes, Miércoles... (til domingo)
5. Horarios:
   - Hora inicio: 09:00
   - Hora fin: 18:00
6. Clic en **Guardar**

### 💳 Registrar Venta
1. Clic en **Caja**
2. Sistema muestra ventas por fecha
3. Para ver detalles: Clic en **Detalles**
4. Para exportar: Clic en **📊 Exportar Excel**

### 📈 Monitorear Stock
1. Clic en **Stock**
2. Ver tabla de productos
3. **Rojo** = Stock bajo (necesita reorden)
4. **Verde** = Stock normal
5. Editar stock mínimo: Clic en **Editar Mínimo**

### 🏢 Agregar Proveedor
1. Clic en **Proveedores**
2. Clic en **+ Nuevo Proveedor**
3. Completar:
   - Nombre
   - Teléfono
   - Email
   - Dirección
4. Clic en **Guardar**

---

## 💡 Tips Útiles

- ✏️ **Editar**: Clic en botón Editar de cualquier fila
- 🗑️ **Eliminar**: Clic en botón Eliminar (confirma acción)
- 📊 **Excel**: Exporta ventas en formato profesional
- 🔍 **Filtros**: En Caja puedes filtrar por rango de fechas
- ⚠️ **Alertas**: Stock bajo se muestra en rojo automáticamente

---

## 🔗 URLs Importantes

| Recurso | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Documentación | `/docs/API.md` |

---

## 🛠️ Troubleshooting

### Error: "Could not connect to database"
- Verifica que MongoDB esté corriendo
- Revisa credenciales en `.env`

### Error: "Cannot find token"
- Asegúrate de estar logueado
- Revisa que el backend esté corriendo
- Limpia localStorage si es necesario

### Frontend se ve en blanco
- Verifica que el backend está en `http://localhost:3000`
- Recarga la página (F5)
- Abre console (F12) para ver errores

### Datos no se guardan
- Verifica la consola del backend para errores
- Revisa que la URI de MongoDB sea correcta

---

## 📞 Documentación Completa

Para más detalles:
- **Instalación**: Ver `docs/SETUP.md`
- **API Endpoints**: Ver `docs/API.md`
- **Resumen del Proyecto**: Ver `docs/PROJECT_SUMMARY.md`

---

## 🎉 ¡Listo!

Tu sistema de gestión para Rincón Natural está completamente funcional.

**Próximos pasos:**
1. Personalizar logo en `frontend/public/logo.svg`
2. Ajustar colores si es necesario en `frontend/tailwind.config.js`
3. Crear más usuarios en Empleados
4. Comenzar a registrar ventas

---

**¡A gestionar! 💪**

Última actualización: 2026-06-22
