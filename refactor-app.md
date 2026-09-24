# Refactor a despliegue en la nube (Opción C) — Plan de implementación

> **Estado:** PLAN (documento guía). Ningún cambio de código se hace todavía.
> Cada etapa termina con la app **funcionando localmente** y una verificación concreta,
> así que puedes parar en cualquier punto sin romper nada.

---

## 0. Decisión tomada (contexto)

- **Frontend:** Vite + React estático → **Vercel** (git + `dist/`, gratis).
- **API:** Express (hoy) → **Vercel Serverless Functions** en `/api/*`.
- **Datos:** `better-sqlite3` (archivo local) → **Neon Postgres** (serverless, gratis,
  acceso al pool vía variable de entorno `DATABASE_URL`).
- **Resultado:** sin servidor que mantener, sin IP/puerto fijo, despliegue por push a git.

**Por qué ya no sirve el stack actual tal cual:**
`better-sqlite3` escribe en un archivo del disco; en serverless (Vercel/Netlify) el
filesystem y el proceso son perecederos y efímeros. La base de datos se refactoriza a
Postgres en la nube y las rutas Express pasan a ser funciones HTTP sin estado.

---

## Etapa 1 — Preparación del repo y credenciales (sin código)

**Objetivo:** dejar el entorno y las variables listas, y verificar que se alcanza Neon.

### Cambios

1. **Repositorio Git del proyecto** (es el punto de partida del despliegue por push):
   ```powershell
   cd y:\code\incident-tracker
   git init
   git add .
   git commit -m "App registro de incidentes: AR
Init"
   ```
   Luego crear repo privado en GitHub y hacer push.

2. **Crear cuenta Neon** → nuevo proyecto `incident-tracker` → copiar la cadena
   `DATABASE_URL` (formato `postgres://user:pass@ep-...neon.tech/dbname`).
   Guardarla en el panel de Vercel (Project → Settings → Environment Variables), nunca
   en el repo.

3. **Cargar variables en Vercel** (al crear el proyecto) o localmente en `.env`:
   ```
   DATABASE_URL=postgres://user:pass@ep-xxxx.neon.tech/incident-tracker?sslmode=require
   ```
   > Añadir `.env` a `.gitignore` si aún no está.

### Verificación
- `Invoke-RestMethod https://api.github.com/repos/<tu>/<repo>` responde 200.
- (Neon) desde el panel, la base aparece "Ready".
- La resta del plan (código) **no cambia**: `npm run build` sigue verde.

---

## Etapa 2 — Dependencias nuevas

**Objetivo:** instalar el cliente Postgres serverless.

```powershell
cd y:\code\incident-tracker
npm install @neondatabase/serverless dotenv
```

- `@neondatabase/serverless`: driver Postgres pensado para serverless (usa HTTP/WebSockets,
  aguanta entornos efímeros, no necesita conexiones persistentes).
- `dotenv`: solo para desarrollo local (`server/db.js` leerá `.env`). En Vercel las
  variables entran como entorno del sistema, `dotenv` no interviene ahí.

**Nota:** `better-sqlite3` puede dejarse instalado y usado por `server/db.js` hoy, pero
en la Etapa 4 se sustituye. El objetivo final es removerlo si no se usa más.

### Verificación
- `"@neondatabase/serverless"` aparece en `package.json` y `npm run build` sigue verde.

---

## Etapa 3 — Capa de datos compartida (Neon), manteniendo la app local intacta

**Objetivo:** crear `lib/db.js` (raíz) que replique exactamente la interfaz que hoy
expone `server/db.js` (`listIncidents`, `getIncident`, `insertIncident`,
`updateIncident`, `deleteIncident`, `countIncidents`) pero contra Postgres.

> Clave del plan: **misma firma**, distinto backend. Así `server/index.js` (Express
> local) y las futuras serverless functions (Etapa 4) usan el MISMO módulo y nada más
> cambia en la lógica de rutas/validación.

### Archivo nuevo: `lib/db.js`
```js
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

export async function listIncidents() {
  return await sql`SELECT * FROM incidents ORDER BY date DESC, time DESC, created_at DESC`;
}
export async function getIncident(id) {
  const rows = await sql`SELECT * FROM incidents WHERE id = ${id}`;
  return rows[0] ?? null;
}
export async function insertIncident(i) {
  await sql`
    INSERT INTO incidents (id, date, day, time, severity, ambulance, comments, created_at)
    VALUES (${i.id}, ${i.date}, ${i.day}, ${i.time}, ${i.severity},
            ${i.ambulance ? 1 : 0}, ${i.comments}, ${i.created_at})
  `;
}
export async function updateIncident(i) {
  await sql`
    UPDATE incidents SET
      date = ${i.date}, day = ${i.day}, time = ${i.time},
      severity = ${i.severity}, ambulance = ${i.ambulance ? 1 : 0}, comments = ${i.comments}
    WHERE id = ${i.id}
  `;
}
export async function deleteIncident(id) {
  return await sql`DELETE FROM incidents WHERE id = ${id} RETURNING id`.then(r => r.length > 0);
}
export async function countIncidents() {
  const r = await sql`SELECT COUNT(*)::int AS total FROM incidents`;
  return r[0].total;
}
```

### Notas de migración de tipos
- En SQLite la columna `ambulance` era entero 0/1; en Postgres sácala como `BOOLEAN`
  (ver Etapa 4 schema) y traduce en el código (`i.ambulance ? 1 : 0` / lectura con `Boolean`).
- `id` (UUID string), fechas y horas se conservan como `TEXT`/`DATE`/`TIME` — igual que
  los nombres de campos usados por el front (`src/api.js`, `src/utils.js`).

### Verificación
- Un script de humo `node -e "import('./lib/db.js').then(async m => console.log(await m.listIncidents()))"`
  devuelve `[]` (riesgo nulo) y confirma que la cadena Neon conecta.

---

## Etapa 4 — Esquema en Neon + volcado de la info existente

**Objetivo:** crear la tabla `incidents` en Neon y (opcional) migrar lo que haya en el
SQLite local actual.

### Archivo nuevo: `lib/schema.sql`
```sql
CREATE TABLE IF NOT EXISTS incidents (
  id         UUID PRIMARY KEY,
  date       DATE        NOT NULL,
  day        VARCHAR(16) NOT NULL,
  time       TIME        NOT NULL,
  severity   VARCHAR(16) NOT NULL,
  ambulance  BOOLEAN     NOT NULL DEFAULT FALSE,
  comments   TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents (date);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
```

### Ejecución
```powershell
# con psql instalado, o desde el editor SQL del panel Neon
psql "$env:DATABASE_URL" -f lib/schema.sql
```

### (Opcional) Migración de datos SQLite → Neon
- Script puntual `scripts/migrate-sqlite2pg.mjs` que lea con `better-sqlite3` la tabla
  actual (`server/../data/incidents.db`) e inserte fila a fila mediante el pool de Neon.
  No destructivo: lee del SQLite, escribe en Postgres, nunca borra el origen.

### Verificación
- SELECT en Neon devuelve la/tabla vacía o con las filas migradas.
- La app local sigue igual (sigue usando SQLite hasta la próxima etapa).

---

## Etapa 5 — Serverless Functions en Vercel (rutas `/api/*`)

**Objetivo:** replicar el comportamiento de `server/index.js` como funciones sin estado.

### Archivos nuevos (raíz `/api`)
`api/incidents.js` — GET / POST
```js
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URLPressEscapeIndexNONE);

export default async function handler(req, res) {
  ...
}
```
> El esqueleto completo (validación de severidad/ambulancia/fechas, CORS no necesario
> en first-party, respuestas 400/404/201) se transcribe desde `server/index.js` en la
> Etapa 5 de ejecución; aquí solo se marca la estructura.

`api/incidents/[id].js` — GET / PUT / DELETE (mismo patrón, con `req.query.id`).

### Reglas de ruta en Vercel
- La carpeta `/api` en la raíz del repo se detecta automáticamente como Serverless
  Functions; cada archivo JS/TS mapea a `/api/<nombre>` y las carpetas `[param]` a
  param dinámicos.
- La URL base del front puede seguir siendo `/api/incidents` (relative) porque Vercel
  sirve funciones bajo el MISMO dominio que el estático → **no hacen falta CORS ni
  URL absoluta** en producción.
- `server/index.js` **se conserva** para desarrollo local (`npm run dev` usa proxy
  `/api → localhost:4000` configurado en `vite.config.js`); solo se desactiva/ignora
  en producción serverless.

### Verificación
- `npm run dev` sigue igual en local.
- Tras desplegar (Etapa 6): `curl https://tu-app.vercel.app/api/incidents` responde.

---

## Etapa 6 — Configuración de Vercel + despliegue

**Objetivo:** que Vercel construya y sirva `dist/` + funciones.

### Archivo nuevo: `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```
> Vite se auto-detecta; el archivo solo fija explícitamente el build para evitar
> ambigüedad. Las funciones `/api` se detectan solas.

### Despliegue por push (recomendado, gratis)
1. `git push origin main`.
2. En el panel de Vercel: New Project → importar el repo → añadir env var
   `DATABASE_URL` → Deploy.
3. Cada push posterior redeploya automáticamente.

### Despliegue por CLI (alternativa)
```powershell
npm i -g vercel
vercel login
vercel --prod   # primera vez pregunta config; luego te pregunta env DATABASE_URL
```

### Verificación final end-to-end
- Abrir la URL del proyecto, registrar un incidente (POST), verlo en Historial,
  editar (PUT), borrar (DELETE) y confirmar que las métricas cambian.
- Recargar: los datos persisten porque viven en Neon (no en el filesystem efímero).

---

## Etapa 7 — Limpieza y cierre

- **Remover** `better-sqlite3` y `server/db.js` si el backend SQLite ya no se usa
  (mantener solo si se quiere seguir con dev-local con archivo).
  `npm uninstall better-sqlite3`.
- **Revisar `.gitignore`**: incluir `.env`, `data/`, `node_modules/`, `dist/`.
- **README** breve: cómo correr en local, cómo está desplegado, dónde ver la BD.
- Opcional: dominio custom en Vercel (gratis con sus subdominios).

---

## Resumen de archivos tocados/creados por el refactor

| Archivo | Acción | Etapa |
|---|---|---|
| (repo nuevo) `.git/` | crear | 1 |
| `.env` | crear (no comitear) | 1 |
| `package.json` | + `@neondatabase/serverless`, `dotenv` | 2 |
| `lib/db.js` | **nuevo** (pool Neon, misma interfaz) | 3 |
| `lib/schema.sql` | **nuevo** (DDL) | 4 |
| `scripts/migrate-sqlite2pg.mjs` | **nuevo** (opcional) | 4 |
| `api/incidents.js` | **nuevo** (serverless GET/POST) | 5 |
| `api/incidents/[id].js` | **nuevo** (serverless GET/PUT/DELETE) | 5 |
| `vercel.json` | **nuevo** | 6 |
| `server/index.js` | sin cambios (dev local) | — |
| `src/api.js`, `src/utils.js` | sin cambios (misma interfaz) | — |
| `db.js` (SQLite) | se retira si se uninstala `better-sqlite3` | 7 |

---

## Riesgos y decisiones a vigilar

1. **Boolean vs 0/1 en `ambulance`:** el front compara `inc.ambulance` como truthy;
   Postgres devuelve `true/false`. Responsabilidad de traducción en `lib/db.js` para no
   tocar componentes.
2. **Los métricas de hora/día usan `time`/`date` en string;** en Neon sáca fecha/hora ya
   tipadas — no cambies los nombres de campo o el `Metrics.jsx`/`IncidentForm` se rompe.
3. **No dejar la API Express en producción y en serverless a la vez** en la primera
   prueba; usa una sola (serverless) para evitar doble escritura en Neon.
4. **Cors:** en first-party Vercel no hace falta; si algún día abres la API a otros
   orígenes, añádelo en la función.

---

## Orden sugerido de ejecución (si decides avanzar)

1 → 2 → 3 → 4 → 5 → 6 → 7

Puedo ejecutarte etapa a etapa, **verificando con `npm run build` y con las llamadas
HTTP** después de cada una, y parando antes de tocar `server/index.js`/`api.js` hasta
que tú lo confirmes.
