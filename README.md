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

## Cuentas y roles

| Rol | Qué puede hacer |
|---|---|
| `user` | Registrar incidentes (quedan en `reportado`). Ver/editar/borrar solo los suyos. |
| `reviewer` | Lo de `user` + revisar/decidir estados (`reportado → en_revision → aprobado/rechazado`). |
| `admin` | Lo de `reviewer` + alta de usuarios y cambio de roles (pestaña "Usuarios"). |

- Sin login la app funciona como `user` anónimo; puede editar/borrar los incidentes que
  creó en la misma sesión (token de propietario en `localStorage`).
- Sesión con JWT en `localStorage` (`keys` `it_token` / `it_owner_token`). Riesgo XSS
  documentado; alternativa más segura: cookie `HttpOnly`.
- Cuenta admin inicial sembrada con `node scripts/seed-admin.mjs`
  (lee `ADMIN_EMAIL`/`ADMIN_PASSWORD` de `.env`; con `--neon` siembra la BD Neon).
- Migraciones de esquema idempotentes:
  - SQLite: `npm run db:migrate:roles`
  - Neon: `node scripts/apply-neon-roles-schema.mjs`
- Variables nuevas: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (ver `.env.example`).