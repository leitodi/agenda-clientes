# Sistema de Gestion para Peluqueria

Aplicacion fullstack (Node + Express + MongoDB) con:

- Login y manejo de sesion con roles (`admin`, `user`)
- Alta/listado de usuarios (solo admin)
- ABM de peluqueros con comision y agenda por dias/horarios
- Agenda de turnos con validacion de:
  - duracion por servicio
  - superposicion por peluquero
  - horarios segun agenda del peluquero
- Registro de atenciones (caja) con calculo automatico de comision
- Reportes por peluquero con total cobrado y total comision

## Servicios y reglas

- `corte`: 30 minutos
- `corte_barba`: 45 minutos
- No permite turnos fuera del horario del peluquero
- No permite superposiciones de turnos para el mismo peluquero

## Requisitos

- Node.js 18+
- MongoDB Atlas o local

## Variables de entorno

Usa `.env.example` como base:

- `MONGODB_URI`
- `PORT`
- `JWT_SECRET`
- `ADMIN_USER`
- `ADMIN_PASSWORD`

Al primer inicio se crean:

- Usuario admin inicial
- Peluqueros iniciales:
  - Mauri (10 a 22, lunes a sabado)
  - Kevin (10 a 22, lunes a sabado)
  - Agus (10 a 22, lunes a sabado)
  - Juani (10 a 22, lunes a sabado)
  - Day (17 a 22, martes a sabado)

## Ejecutar local

```bash
npm install
npm start
```

Abrir: `http://localhost:3000`

## Deploy en Render

- Build command: `npm install`
- Start command: `npm start`
- Variables en Render:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `ADMIN_USER`
  - `ADMIN_PASSWORD`

## Estructura del proyecto

```text
.
|- server.js
|- src/
|  |- middleware/auth.js
|  |- models/
|  |  |- User.js
|  |  |- Barber.js
|  |  |- Appointment.js
|  |  |- Attendance.js
|  |- routes/
|  |  |- auth.js
|  |  |- users.js
|  |  |- barbers.js
|  |  |- appointments.js
|  |  |- attendances.js
|  |  |- reports.js
|  |  |- dashboard.js
|  |- utils/
|     |- services.js
|     |- time.js
|     |- seed.js
|- public/
   |- index.html
   |- style.css
   |- script.js
```
