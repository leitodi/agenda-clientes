# HCA Sublimados — Landing page

Sitio estatico (HTML/CSS/JS puro, sin build ni dependencias) para el
emprendimiento de sublimados HCA Sublimados. Objetivo: generar consultas
y pedidos por WhatsApp.

## Estructura

```text
.
|- index.html
|- css/style.css
|- js/script.js
```

## Configuracion

Todo lo editable esta centralizado al principio de `js/script.js`:

- `WHATSAPP_NUMBER`: numero de WhatsApp usado en todos los botones
  "Consultar" / "Pedir presupuesto" y en el boton flotante.

Instagram, direccion y horarios estan escritos directo en el `<footer>`
de `index.html`.

## Fotos reales

Las secciones "Productos" y "Galeria" usan placeholders (ilustraciones
o tarjetas con icono). Para reemplazarlos por fotos reales:

- Productos: cambiar el contenido de `.product-media` por una imagen.
- Galeria: cada `.gallery-item` tiene un comentario en el HTML con la
  instruccion para reemplazar el `div.gallery-ph` por un `<img>`.

## Ejecutar local

Es un sitio estatico: alcanza con abrir `index.html` en el navegador,
o servirlo con cualquier servidor estatico, por ejemplo:

```bash
npx serve .
```

## Deploy

Alojado en el mismo VPS de Hostinger que "Agenda de turnos" (Salon
Milano), como sitio estatico servido por Nginx.

- **URL**: https://hcasublimados.nexarcode.net
- **Servidor**: VPS Hostinger `srv1899925.hstgr.cloud` (Ubuntu 24.04,
  IP `2.25.104.220`)
- **Path en el servidor**: `/var/www/hcasublimados`
- **Config Nginx**: `/etc/nginx/sites-available/hcasublimados`
- **SSL**: Let's Encrypt via Certbot, renovacion automatica
- **DNS**: registro `A` en Cloudflare (`hcasublimados` -> `2.25.104.220`,
  modo "Solo DNS", sin proxy)

### Actualizar el sitio ya desplegado

Subir los archivos actualizados al servidor (reemplaza los existentes):

```bash
scp -r index.html css js root@2.25.104.220:/var/www/hcasublimados/
```

No hace falta reiniciar Nginx ni nada mas: al ser archivos estaticos,
el cambio se ve al instante.
