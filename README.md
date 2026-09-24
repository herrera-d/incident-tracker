# Incident Tracker

Registro de incidentes en pista de ciclismo: alta, historial y métricas.

## Local

```powershell
npm install
npm run dev
```

- Web: http://localhost:5173 (Vite)
- API: http://localhost:4000 (Express + SQLite en `data/incidents.db`)

La API local no requiere variables de entorno. `npm run build` emite el front estático a `dist/`.

## Despliegue (Vercel + Neon)

- **Front:** Vite + React estático en Vercel.
- **API:** Serverless Functions en `/api/*` (carpeta `api/`), que usan `lib/db.js`.
- **Datos:** Postgres serverless de Neon vía variable de entorno `DATABASE_URL`.

Pasos:

1. Crear proyecto Neon, copiar `DATABASE_URL` a `.env` (local) y a las
   Environment Variables del proyecto Vercel. Never se comitea `.env`.
2. Aplicar el esquema (una vez): `psql "$env:DATABASE_URL" -f lib/schema.sql`
   (o pegarlo en el editor SQL de Neon).
3. Importar el repo en Vercel y hacer deploy; cada push redeploya.
4. Opcional, migrar datos locales a Neon:
   `node scripts/migrate-sqlite2pg.mjs` (no borra el SQLite original).

## Verificación

- Local: `npm run build` verde; probar registro/edición/borrado en http://localhost:5173.
- Producción: `https://<proyecto>.vercel.app/api/incidents` debe responder JSON.