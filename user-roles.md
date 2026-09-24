# Plan de implementación — Roles (admin / reviewer / user) + flujo de estados de incidente + alta de usuarios

> **Estado:** PLAN (documento guía). Ningún cambio de código todavía.
> Complementa a `refactor-app.md` (despliegue Vercel+Neon) — **esta feature se hace
> primero en local**, y después se despliega junto con el refactor.
> Cada fase termina con la app **compilando y funcionando** y su verificación asociada.

---

## Diseño funcional (resumen)

### 1. Roles
| Rol | Qué puede hacer |
|---|---|
| **user** (anonimo / logueado sin privilegios) | Registrar incidentes (queda en `reportado`). Ver/editar/borrar **solo los suyos**. Ver métricas generales. |
| **reviewer** | Todo lo de user + **empezar revisión** (`reportado → en revision`) y **decidir** (`en revision → aprobado` o `en revision → rechazado`). Puede ver el historial completo. |
| **admin** | Todo lo del reviewer + **dar de alta usuarios** y **asignar/cambiar roles** (página "Usuarios"). |

> Regla de negocio central (se valida SIEMPRE en el servidor, no solo en la UI):
> **cualquier persona no autenticada es `user`**. El estado de un incidente solo puede
> avanzar por la máquina de estados; nadie puede saltarse un paso.

### 2. Máquina de estados del incidente
```
cargado (default)
   └── reviewer presiona "Revisar" ──► en revision
             └── reviewer decide: ──► aprobado   |   rechazado
```
- `reportado`: al crearse. Solo `reviewer`/`admin` pueden moverlo.
- `en revision`: el reviewer lo está analizando.
- `aprobado` / `rechazado`: estados terminales (se pueden abrir de nuevo con "Reabrir" → vuelve a `en revision`).
- Un `user` **no puede** mover el estado; solo `reviewer`/`admin` (transiciones validadas en backend).

### 3. Datos nuevos
- **Tabla `users`**: `id TEXT PK`, `name TEXT`, `email TEXT UNIQUE`, `password_hash TEXT`,
  `role TEXT CHECK(role IN ('admin','reviewer','user'))`, `created_at TEXT`.
- **Tabla `incidents`**: se agrega `status TEXT NOT NULL DEFAULT 'reportado'`,
  `reviewer_id TEXT NULL`, `reviewed_at TEXT NULL`.
- **Token de sesión**: JWT firmado (sin estado, serverless-friendly). Se guarda en
  `localStorage` en el cliente (app domestica) y se manda como header `Authorization: Bearer <token>`.

---

## Etapa 0 — Preparación y contrato (sin código aún)

**Objetivo:** fijar el contrato que luego usarán todas las fases.

1. **Firebase referencia real (nombres que YA existen en el proyecto):**
   - `src/api.js` expone `fetchIncidents`, `createIncident`, `updateIncident`, `deleteIncident`
     (todos contra `/api/incidents...`, POST/PUT/DELETE). La feature **añade** funciones, no
     las reescribe — la UI de hoy no cambia de forma.
   - Forma del incidente ya en disco:
     `{ id, date, day, time, severity, ambulance(0/1), comments, created_at }`
     → se añade `status` (y opcionalmente `reviewer_id`/`reviewed_at`).
   - `src/constants.js`: `SEVERITIES`, `SEV_LABELS`, `WEEKDAYS` + nombres de campo.
   - `server/db.js` (`better-sqlite3`): `listIncidents, getIncident, insertIncident,
     updateIncident, deleteIncident`, `countIncidents`. La feature **extiende** esta capa,
     no cambia su interfaz.
   - `server/index.js` (Express): CRUD `/api/incidents`, validación `validateIncident`,
     CORS. Se le añaden rutas de auth + usuarios + middleware de rol.

2. **Decisiones a confirmar (no bloqueantes, tomo el default salvo que digas lo contrario):**
   - Sesión: **JWT en `localStorage`** (simple, sin cookies → perfecto para Vercel).
   - Hash de contraseña: **bcryptjs** (JS puro — mismo enfoque que `better-sqlite3`: funciona
     en local y en serverless sin binarios nativos).
   - La primera cuenta de la BD será un **admin** sembrado por un script (`scripts/seed-admin.mjs`)
     con email/contraseña que tú definas en `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
   - UI: nueva pestaña **"Usuarios"** visible **solo para admin** (se agrega a las TABS del
     `Header`, condicionada a `rol === 'admin'`).

### Verificación
- `npm run build` sigue en verde (sin cambios todavía).
- `node --version`, `npm ls bcryptjs jsonwebtoken` (aún vacío, se instalan en Etapa 2).

---

## Etapa 1 — Migraciones de esquema (SQLite local + Neon)

**Objetivo:** dejar el esquema listo para power las nuevas columnas/tablas. Se hace
antes que el código para que nada más dependa de él.

### Archivo nuevo: `scripts/migrate-roles.mjs`
Ejecuta, de forma idempotente (chequea `PRAGMA table_info` / `PRAGMA user_version` antes
de aplicar):

```sql
-- usuarios
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','reviewer','user')),
  created_at    TEXT NOT NULL
);

-- columnas de estado en incidents
ALTER TABLE incidents ADD COLUMN status       TEXT NOT NULL DEFAULT 'reportado';
ALTER TABLE incidents ADD COLUMN reviewer_id  TEXT REFERENCES users(id);
ALTER TABLE incidents ADD COLUMN reviewed_at  TEXT;
```

> En servidor de producción (Neon) se aplica el equivalente SQL en `lib/` (ver
> `refactor-app.md`), pero **el mismo script de migración se puede ejecutar contra Neon**
> al desplegar, manteniendo ambos entornos iguales.

### Nota
- Los incidentes existentes quedan con `status='reportado'` (default) — no se pierde nada.
- Si `ALTER TABLE ... ADD COLUMN` con DEFAULT da problemas en algunos motores, hacerlo por
  pasos: crear columna sin default → `UPDATE` → forzar NOT NULL.

### Verificación
- `node scripts/migrate-roles.mjs` → imprime "esquema actualizado" sin errores.
- Repetir la ejecución → "sin cambios" (idempotencia comprobada).

---

## Etapa 2 — Dependencias nuevas (auth)

```powershell
cd y:\code\incident-tracker
npm install bcryptjs jsonwebtoken
```
> `bcryptjs` cifra con sal (no nativo). `jsonwebtoken` firma y valida el token.
> No hace falta nada más (Express ya está).

### Verificación
- `npm ls bcryptjs jsonwebtoken` muestra ambos instalados.
- `npm run build` sigue verde tras el install.

---

## Etapa 3 — Capa de datos: usuarios + estado de incidente

**Objetivo:** ampliar `server/db.js` con las operaciones de usuarios y el campo `status`,
manteniendo la interfaz existente intacta para no tocar `IncidentList`/`App`.

### Añadir a `server/db.js` (o a `lib/db.js` tras el refactor Neon — misma firma)
```js
// usuarios
export function insertUser(u) { /* INSERT INTO users (id,name,email,password_hash,role,created_at) */ }
export function getUserByEmail(email) { /* SELECT * FROM users WHERE email = ? */ }
export function getUserById(id) { /* SELECT * FROM users WHERE id = ? */ }
export function listUsers() { /* SELECT id,name,email,role,created_at FROM users (sin hash) */ }
export function updateUserRole(id, role) { /* UPDATE users SET role = ? WHERE id = ? */ }

// estado de incidentes (se añade status a las queries existentes)
// listIncidents/getIncident ahora devuelven también status, reviewer_id, reviewed_at;
// updateIncident acepta status en la SET ... WHERE id = ?;
```

### Reglas que aplican en esta capa
- Nunca devolver `password_hash` en respuestas (usar proyección en `listUsers`/`getUserById`).
- `role` se valida contra el conjunto permitido (misma lógica que `SEVERITIES` en el server).

### Verificación
- Script de humo: `node -e "..."` que inserte un user con rol `reviewer` y lo lea por email.
- `npm run build` verde.

---

## Etapa 4 — Backend: auth + middleware de rol + transiciones de estado

**Objetivo:** rutas nuevas y control de acceso en `server/index.js`.

### Rutas nuevas
```
POST /api/auth/register   → crear cuenta (rol por defecto 'user'; SOLO admin puede fijar
                            admin/reviewer). Sin token se crea user; con token admin → rol elegido.
POST /api/auth/login      → body {email,password} → { token, user:{id,name,email,role} }
GET  /api/auth/me         → devuelve user actual desde token (o {role:'user'} si no hay token)
POST /api/auth/logout     → (opcional, el cliente solo borra el token)

GET    /api/users                   → SOLO admin → lista sin password_hash
POST   /api/users                   → SOLO admin → body {name,email,password,role}
PUT    /api/users/:id               → SOLO admin → cambia role
DELETE /api/users/:id               → SOLO admin (no puede borrarse a sí mismo)
```

### Middleware `requireRole(...roles)`
1. Leer header `Authorization: Bearer <token>`.
2. `jwt.verify` contra `JWT_SECRET`.
3. Cargar user; si no existe → 401.
4. Comparar `user.role` con los roles permitidos → 403 si no coincide.
> Sin token = `role:'user'` (para que la app siga siendo usable anónimamente, como hoy).

### Transiciones de estado (en `PUT /api/incidents/:id` y nuevo `PATCH /api/incidents/:id/status`)
Máquina mínima:
```
'current' → 'next'           permitido para
reportado → en revision      reviewer, admin
en revision → aprobado       reviewer, admin
en revision → rechazado      reviewer, admin
en revision → reportado      reviewer, admin (reabrir)
(rechazado|aprobado) → en revision   reviewer, admin (reabrir)
cualquier otra transición    → 400 "Transición de estado no válida"
```
- Al hacer `reportado → en revision` se setea `reviewer_id = user.id` y `reviewed_at = now`.
- Un `user` que intente mover estados recibe 403.

### Verificación (curl con token)
- Logeo como admin → creo un reviewer → logeo como ese reviewer → creo un incidente
  como user → el reviewer lo pasa a `en revision` y luego a `aprobado`.
- Los intentos inválidos devuelven 400/401/403 según corresponda.
- `npm run build` verde (no toca el front).

---

## Etapa 5 — Frontend: sesión + página de login + indicador de rol

**Objetivo:** que la UI sepa quién es el usuario y muestre acciones por rol.

### Cambios
1. **`src/api.js`** — añadir:
   ```js
   export const login = (email, password) => request("/auth/login", { method:"POST", body: JSON.stringify({email,password}) });
   export const getMe = () => request("/auth/me");
   export const listUsers = () => request("/users", { headers: { Authorization: `Bearer ${token}` }});
   export const createUser = (u) => ...
   export const updateUserRole = (id, role) => ...
   ```
   (con un helper central que añade el header `Authorization` si hay token guardado).
2. **`src/App.jsx`** — estado `user` (o `session`): al montar, `getMe()`; si token y válido,
   se setea. Se pasa `user`, `login()`, `logout()` a Header.
3. **Nuevo componente: `src/components/Login.jsx`** — pequeño formulario email+contraseña,
   reutiliza los estilos de `incident-field` y `btn`. Tras login exitoso → `toast()` y
   `getMe()` actualiza el estado.
4. **`src/components/Header.jsx`** — muestra nombre/rol del usuario (o botón "Iniciar sesión").
   Si `user.role === 'admin'` → muestra la pestaña **Usuarios**.
5. **`src/components/IncidentList.jsx`** — en cada tarjeta: si el incidente es del user o
   el user es reviewer/admin, según `status`:
   - muestra chip de estado (`sev-chip sev-chip--estado-<status>`),
   - botones contextuales: `reviewer/admin` → "Revisar", "Aprobar", "Rechazar" según estado.
6. **`src/styles.css`** — clases nuevas: `.chip--estado-*`, `.login-pane`, `.user-meta`.

### Verificación
- Sin login: la app se ve igual que hoy (anonimo = user), puede registrar incidentes.
- Con login admin se ve la pestaña Usuarios; con reviewer no; con user no.
- `npm run build` verde.

---

## Etapa 6 — Frontend: página de administración de usuarios (solo admin)

**Objetivo:** dar de alta usuarios y gestionar roles desde la UI.

### Nuevo componente: `src/components/UserAdmin.jsx`
- Lista usuarios (nombre, email, rol) con `select` para cambiar el rol inline.
- Formulario "Nueva cuenta": nombre, email, contraseña, rol → llama `createUser`.
- Refresca la lista tras cada operación; notifica con `toast()`.
- **Solo se monta si `user.role === 'admin'`** (además la API lo valida en el backend).

### Integración
- En `App.jsx`: cuando `tab === 'usuarios'` y `user.role === 'admin'` → `<UserAdmin />`.
- Las TABS del Header se pasan como prop condicionada (admin ve 4, resto 3).

### Verificación
- El admin crea un usuario `reviewer`; aparece en la lista. Cambia su rol a `user` y vuelve.
- Un usuario sin admin no ve la pestaña (ni puede llamar a `/api/users` → 403).
- `npm run build` verde.

---

## Etapa 7 — Integración de estados en Historial, Métricas y formulario de guardado

**Objetivo:** coherente en toda la app.

- **`src/App.jsx` / handlers:** al crear → `status:'reportado'`; al editar → conserva status
  salvo que venga de una transición del reviewer. El modal de edición no permite cambiar status
  a un user.
- **`IncidentList`**: el filtro de estado se añade a los filtros de gravedad (chip de
  estados, similar al de severidades).
- **`Metrics`**: nueva fuente `buildStats` → agregar contadores por `status`
  (aprobados/rechazados/en_revision/reportados) y % de aprobados. Sin romper las series
  existentes (solo se suma un bloque).
- **Cards**: el `status` se muestra con color (reportado=azul, en_revision=ámbar,
  aprobado=verde, rechazado=rojo).

### Verificación
- Cambiar un status en la UI → Historial y Métricas reflejan el cambio tras recargar.
- `npm run build` verde.

---

## Etapa 8 — Sembrado del admin inicial + limpieza

**Objetivo:** arrancar el sistema con una cuenta admin.

### Archivo nuevo: `scripts/seed-admin.mjs`
1. Leer `ADMIN_EMAIL`/`ADMIN_PASSWORD` de `.env` (o un prompt).
2. Hash con bcryptjs.
3. `INSERT ... ON CONFLICT(email) DO NOTHING` (o `getUserByEmail` + skip si existe).
4. Imprimir `"Admin listo: <email> (role=admin)"`.

### Limpieza
- Revisar `.gitignore` (incluye `.env`).
- README: sección "Cuentas: admin inicial, reviewer, user".

### Verificación
- `node scripts/seed-admin.mjs` → aparece admin en `/api/auth/login`.
- Ese admin loguea desde la UI y ve la pestaña Usuarios.
- **Prueba end-to-end manual** (registrar → revisar → aprobar) con 3 cuentas distintas.

---

## Riesgos y decisiones a vigilar

1. **ES NULL editar como user:** `backeditor` (editar/borrar) de incidentes del usuario:
   definimos que el `user` puede editar/borrar SOLO **sus propios** incidentes
   (`created_by`). Para eso conviene añadir `created_by TEXT` (id del user anónimo es null
   → el incidente sin creador lo gestiona reviewer/admin).
   > **Decisión pendiente:** cuando el usuario no ha hecho login (anonimo), ¿puede
   > editar/borrar? Propuesta: **sí para los que creó en esa misma sesión** (guardar un
   > `owner_token` en el incidente al crearlo), para no romper la UX actual.
2. **El `user` anónimo ve TODO el historial hoy.** Con roles, propuesta: el historial
   sigue siendo visible (sin datos sensibles), pero el botón editar/borrar se condiciona
   a `owner`/`reviewer`/`admin`. Confirmar.
3. **Tokens en localStorage** (XSS risk). Alternativa más segura: cookie `HttpOnly`.
   Para una app gratuita/demo dejamos localStorage (default), se documenta el riesgo y la
   alternativa en el README.
4. **Orden con el refactor Neon:** migrar la feature de estados a `lib/db.js` **y** Neon
   en el mismo PR que se despliega, para no duplicar trabajo (las funciones son las mismas,
   solo cambia el driver).

---

## Orden sugerido de ejecución

0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

Cada fase es reversible y deja la app funcionando. Puedo ejecutarla etapa por etapa y
verificar con `npm run build` + llamadas reales a la API tras cada una, parando a que
confirme antes de tocar cualquier archivo.
