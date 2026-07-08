# IPTV Catalog Admin

Panel de administración para gestionar un catálogo multimedia (películas, series, TV en vivo) y **generar listas M3U automáticamente** desde Supabase. La información se completa sola mediante la API de **TMDb**.

Arquitectura desplegada por separado:

- **Frontend** → [Vite](https://vitejs.dev/) + HTML/CSS/JS, desplegado en **Vercel** (sitio estático).
- **Backend** → **Express** + Supabase + TMDb, desplegado en **Render** (API).
- **Base de datos** → **Supabase** (PostgreSQL).
- El frontend consume el backend a través de `VITE_API_URL` + CORS (no usa `localhost` en producción).

---

## Estructura

```
.
├── backend/                      # API Express (Render)
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js                # Ensambla Express + CORS y monta rutas
│   │   ├── config.js             # Config desde variables de entorno
│   │   ├── index.js              # Arranque (listen) para producción/local
│   │   ├── lib/                  # servicios: supabase, tmdb, m3u, streamChecker, helpers
│   │   ├── middleware/auth.js    # Autenticación JWT
│   │   └── routes/               # auth, tmdb, movies, series, channels, dashboard, m3u, streams
│   └── scripts/build-check.js    # Valida compilación (npm run build)
├── frontend/                     # SPA estática (Vercel)
│   ├── package.json
│   ├── vite.config.js            # Proxy /api -> backend en dev
│   ├── .env.example              # VITE_API_URL
│   ├── index.html
│   └── src/
│       ├── main.js               # Entrada Vite
│       ├── api.js                # Cliente API (usa VITE_API_URL)
│       ├── app.js                # Lógica del panel
│       └── styles.css
├── supabase/
│   └── schema.sql                # Esquema SQL normalizado
├── package.json                  # Monorepo con npm workspaces
├── .gitignore
├── README.md
└── playlist.m3u                  # Ejemplo estático (la lista real se genera vía API)
```

### Variables de entorno

Cada servicio tiene su propio `.env.example`. No hay un archivo central; se copia el que corresponde:

| Archivo | Destino | Para qué |
|---------|---------|----------|
| `backend/.env.example` | `backend/.env` (Render) | Variables del backend: `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `TMDB_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN` |
| `frontend/.env.example` | `frontend/.env` (Vercel) | Variables del frontend: `VITE_API_URL` (URL del backend en Render) |

> El `.env` real de cada servicio se carga con `dotenv` desde el directorio del servicio; nunca se sube al repositorio.

---

## Backend (Render)

### Ejecutar en local

```bash
npm install                 # instala backend + frontend (workspaces)
cp backend/.env.example backend/.env   # completa tus credenciales
npm run dev:backend         # node --watch backend/src/index.js
```

### Desplegar en Render

1. En Render crea un **Web Service** apuntando a este repo.
2. **Root Directory:** `backend`.
3. **Build Command:** `npm install` (o `npm ci`).
4. **Start Command:** `npm start` (equivale a `node src/index.js`).
5. **Environment:** añade las variables de `backend/.env.example`:
   - `PORT` (Render lo inyecta solo), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `TMDB_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN` (la URL de tu frontend en Vercel).
6. Despliega. La API quedará en `https://<tu-backend>.onrender.com`.

El backend escucha en `process.env.PORT` y habilita CORS para el origen del frontend.

---

## Frontend (Vercel)

### Ejecutar en local

```bash
npm install
cp frontend/.env.example frontend/.env   # VITE_API_URL= (vacío usa el proxy de Vite)
npm run dev:frontend        # Vite en http://localhost:5173, proxima /api a localhost:5050
```

> En desarrollo, `vite.config.js` hace proxy de `/api` al backend (`BACKEND_URL`, por defecto `http://localhost:5050`), así no necesitas `VITE_API_URL`.

### Desplegar en Vercel

1. Importa el repo en Vercel.
2. **Root Directory:** `frontend`.
3. **Build Command:** `npm run build` · **Output Directory:** `dist` (Vite lo detecta solo).
4. **Environment:** `VITE_API_URL=https://<tu-backend>.onrender.com` (sin barra final).
5. Despliega. El panel quedará en tu dominio de Vercel.

> `vercel.json` ya no es necesario: Vercel detecta Vite automáticamente y sirve `dist/`.

---

## Conectar Supabase

1. Crea un proyecto en <https://supabase.com>.
2. En **Project Settings → API** copia `URL` y la `service_role` key.
3. Ejecuta `supabase/schema.sql` en el SQL Editor.
4. Pon esas claves en las variables del backend (Render).

## Obtener API Key de TMDb

1. Regístrate en <https://www.themoviedb.org>.
2. En **Settings → API** genera una **API Key (v3 auth)**.
3. Pégala en `TMDB_API_KEY` del backend.

---

## API `/api/m3u`

Genera la lista combinada (películas → series → canales) en un único archivo M3U válido.

- **GET** `/api/m3u` → `ultrapelis.m3u` (`inline`, `application/x-mpegurl`).
- Por categoría: `/api/m3u/movies`, `/api/m3u/series`, `/api/m3u/tv`, `/api/m3u/all`.

Reglas: solo activos, omite streams nulos/vacíos/caídos, elimina duplicados, y si Supabase falla responde con un M3U válido (`#EXTM3U`) sin exponer errores internos.

Puedes apuntar tu reproductor (VLC, Kodi, TiviMate, OTT Navigator, IPTV Smarters) a:

```
https://<tu-backend>.onrender.com/api/m3u
```

---

## Scripts (monorepo)

```bash
npm run dev:backend      # backend en modo desarrollo
npm run dev:frontend     # frontend (Vite) en modo desarrollo
npm run build:backend    # valida que el backend compila
npm run build:frontend   # build de producción del frontend (dist/)
```

## Seguridad

- Las claves solo se leen de variables de entorno; `.env` está en `.gitignore`.
- El backend usa la `service_role` key solo en el servidor.
- CORS restringe el origen del frontend en producción (`CORS_ORIGIN`).
