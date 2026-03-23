# Agenda de Clientes (MongoDB + Render)

Aplicacion web para gestionar clientes con 2 fotos por cliente.
El backend usa Express y MongoDB para persistencia en la nube.

## Requisitos

- Node.js 18+
- Una base MongoDB (recomendado: MongoDB Atlas gratis)

## Configuracion local

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` a partir de `.env.example`.

3. Completa `MONGODB_URI` con tu conexion a MongoDB.

4. Inicia el servidor:

```bash
npm start
```

5. Abre:

- `http://localhost:3000`

## Variables de entorno

- `MONGODB_URI` (obligatoria en produccion)
- `PORT` (opcional en local, Render la define automaticamente)

## Deploy en Render

### 1) Preparar MongoDB Atlas

1. Crea una cuenta en https://www.mongodb.com/atlas/database
2. Crea un cluster gratuito (M0)
3. Crea un usuario de base de datos
4. En "Network Access", permite la IP de Render (o `0.0.0.0/0` para pruebas)
5. Copia tu connection string, por ejemplo:

```text
mongodb+srv://USUARIO:CLAVE@cluster0.xxxxx.mongodb.net/agenda_clientes?retryWrites=true&w=majority&appName=Cluster0
```

### 2) Publicar en Render

1. Sube este proyecto a GitHub.
2. En Render: `New +` -> `Web Service`.
3. Conecta tu repo.
4. Configura:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: `Free`
5. En `Environment` agrega:
   - `MONGODB_URI` = tu cadena de MongoDB Atlas
6. Crea el servicio.

Render desplegara automaticamente y te dara una URL publica.

## API

- `GET /api/clientes`
- `GET /api/clientes/:id`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`

## Notas

- Se cargan datos de ejemplo solo si la coleccion esta vacia.
- Las fotos se almacenan en base64 dentro de MongoDB.
- Para produccion real con alto volumen de fotos, conviene migrar imagenes a un storage externo (Cloudinary, S3, etc).
