# IPTV Catalog Admin

Panel de administración para gestionar un catálogo multimedia (películas, series, TV en vivo) y **generar listas M3U automáticamente** desde Supabase. La información se completa sola mediante la API de **TMDb**.

> Stack: **Node.js + Express** en el backend, **HTML/CSS/JS** en el frontend y **Supabase (PostgreSQL)** como base de datos. Se despliega en **Vercel** como una *serverless function* de Express (no es un proyecto Next.js, pero es 100% compatible con Vercel).

---

## Características

- Autenticación de administrador (JWT).
- Búsqueda en TMDb en tiempo real (películas y series).
- Alta de películas y series con temporadas → episodios (cada uno con su propio stream).
- Módulo independiente de TV en Vivo (tvg-id, tvg-name, logo, grupo, país, idioma).
- Verificador de streams caídos (marca `active` / `down`).
- Generador M3U: `movies.m3u`, `series.m3u`, `tv.m3u`, `todo.m3u` y el endpoint agregado `/api/m3u` (`ultrapelis.m3u`).
- Dashboard con estadísticas.

---

## Estructura

```
.
├── api/index.js              # Entry serverless Vercel (exporta la app Express)
├── backend/src/
│   ├── app.js                # Ensambla la app Express y monta las rutas
│   ├── config.js             # Configuración desde variables de entorno
│   ├── lib/                  # Servicios y utilidades reutilizables
│   │   ├── supabase.js       # Cliente único de Supabase (lazy)
│   │   ├── tmdb.js           # Servicio TMDb
│   │   ├── m3u.js            # Generador M3U
│   │   ├── streamChecker.js  # Verificador de streams caídos
│   │   └── helpers.js        # Géneros/servidores
│   ├── middleware/
│   │   └── auth.js           # Autenticación JWT
│   └── routes/               # Rutas API (auth, tmdb, movies, series, channels, dashboard, m3u, streams)
├── public/                   # Frontend HTML/CSS/JS (servido estáticamente por Vercel)
├── supabase/schema.sql       # Esquema SQL normalizado
├── scripts/build-check.js    # Valida que el proyecto compila (npm run build)
├── vercel.json               # Configuración de despliegue en Vercel
├── package.json
├── .env.example              # Plantilla de variables de entorno
└── playlist.m3u              # Ejemplo estático (la lista real se genera vía API)
```

> **Nota sobre `api/`:** el proyecto usa una app Express monolítica. Se expone como **una sola función serverless** (`api/index.js`) que monta todas las rutas desde `backend/src/routes`. Dividir en varias funciones (`api/m3u`, `api/movies`, etc.) duplicaría la app, el middleware y el cliente de Supabase en cada arranque, así que se mantiene un único entry point; la modularidad vive dentro de `backend/src/routes`.

---

---

## Instalación

```bash
git clone <tu-repo>
cd <tu-repo>
npm install
cp .env.example .env      # luego edita .env con tus credenciales
```

Crea las tablas en Supabase pegando el contenido de `supabase/schema.sql` en el **SQL Editor** de tu proyecto Supabase y ejecutándolo.

---

## Variables de entorno

Copia `.env.example` a `.env` y completa:

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL de tu proyecto Supabase. |
| `SUPABASE_SERVICE_KEY` | **Service role key** (backend). Permite escritura sin RLS. Mantenla solo en el servidor. |
| `SUPABASE_ANON_KEY` | Clave pública (respaldo). |
| `TMDB_API_KEY` | API key v3 de TMDb. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Acceso al panel. |
| `JWT_SECRET` | Frase para firmar los JWT (usa una cadena larga y aleatoria). |
| `PORT` | Puerto local (Vercel lo ignora). |

### Conectar Supabase
1. Crea un proyecto en <https://supabase.com>.
2. En **Project Settings → API** copia la `URL` y la `service_role` key.
3. Ejecuta `supabase/schema.sql` en el SQL Editor.

### Obtener API Key de TMDb
1. Regístrate en <https://www.themoviedb.org>.
2. En **Settings → API** genera una **API Key (v3 auth)**.
3. Pégala en `TMDB_API_KEY`.

---

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5050` (o el `PORT` que hayas configurado). Inicia sesión con tu `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

```bash
npm run build     # verifica que el proyecto compila sin errores
npm start         # arranque en producción local
```

---

## Desplegar en Vercel

1. Sube el repo a GitHub.
2. En Vercel, importa el repositorio (detección automática de Node.js).
3. En **Settings → Environment Variables** añade las mismas variables de `.env.example` (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TMDB_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`).
4. Despliega. `vercel.json` direcciona `/api/*` a la *serverless function* de Express (`api/index.js`); el resto (el frontend en `public/`) lo sirve Vercel como archivos estáticos.

El frontend queda en `/` (estático) y la API en `/api/*` (función). En desarrollo local, `npm run dev` sirve todo desde la propia app Express.

---

## API `/api/m3u`

Genera la lista combinada (películas → series → canales) en un único archivo M3U válido.

- **GET** `/api/m3u` → devuelve `ultrapelis.m3u` (`inline`) con `Content-Type: application/x-mpegURL`.
- También existen por categoría: `/api/m3u/movies`, `/api/m3u/series`, `/api/m3u/tv`, `/api/m3u/all`.

Reglas del generador:
- Solo incluye registros **activos**.
- Omite streams nulos, vacíos o caídos.
- Elimina **duplicados** (misma URL).
- Si Supabase falla, responde con un M3U válido (`#EXTM3U`) y registra el error en el servidor (nunca expone datos internos ni HTML).
- Formato de cada entrada:

```m3u
#EXTM3U

#EXTINF:-1 tvg-id="" tvg-name="" tvg-logo="" group-title="Categoría",Título
URL_DEL_STREAM
```

Puedes apuntar directamente tu reproductor (VLC, Kodi, TiviMate, OTT Navigator, IPTV Smarters) a:

```
https://<tu-dominio-vercel>/api/m3u
```

---

## Seguridad

- Las claves de Supabase/TMDb/JWT solo se leen desde variables de entorno.
- El `.env` está en `.gitignore`; nunca se sube al repositorio.
- El backend usa la `service_role` key solo en el servidor.
