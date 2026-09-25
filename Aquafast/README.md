# NEW DENT

Agenda de turnos para clinica dental con login, calendario, clientes, caja y exportacion a Excel.

## Estructura

- `backend/` - API con Node.js, Express y MongoDB
- `frontend/` - UI con React + Vite

## Configuracion local

1. Copia `backend/.env.example` a `backend/.env`.
2. Copia `frontend/.env.example` a `frontend/.env`.
3. Ajusta las variables necesarias.

### Backend

```env
MONGO_URI=mongodb+srv://NewDent:<tu_password>@cluster0.03nxwzv.mongodb.net/new-dent?retryWrites=true&w=majority
JWT_SECRET=un_secreto_seguro
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
```

### Frontend

```env
VITE_API_URL=http://localhost:4000/api
```

## Ejecutar

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Despliegue en Render

El proyecto ya incluye un `render.yaml` listo para usar con Blueprint.

### Servicios configurados

- `new-dent-backend`: Web Service Node.js
- `new-dent-frontend`: Static Site

### Variables importantes

- `MONGO_URI`: se carga manualmente en el alta inicial del Blueprint porque esta definida con `sync: false`
- `JWT_SECRET`: Render la genera automaticamente en el alta inicial
- `CLIENT_ORIGIN`: apunta al frontend publicado en Render
- `VITE_API_URL`: apunta al backend publicado en Render

### Pasos

1. Sube este proyecto a GitHub.
2. En Render, entra a `New > Blueprint`.
3. Conecta el repositorio y selecciona este proyecto.
4. Durante la creacion, carga el valor de `MONGO_URI`.
5. Espera a que Render cree y despliegue ambos servicios.

### Importante

- Si cambias los nombres de los servicios en Render, tambien tienes que actualizar las URLs en `render.yaml`.
- El backend expone `GET /api/health`, que Render puede usar como health check.

## Notas

- El login utiliza JWT.
- El calendario muestra turnos por dia.
- La tabla de Agenda permite enviar recordatorios por WhatsApp.
- La caja permite filtrar pagos por rango de fechas y exportar un archivo Excel.
