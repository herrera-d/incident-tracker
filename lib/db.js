import { neon } from "@neondatabase/serverless";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta la variable de entorno DATABASE_URL (ver .env.example)");
}

const sql = neon(process.env.DATABASE_URL);

const INCIDENT_COLS =
  "id, date, day, time, severity, ambulance, comments, created_at, status, reviewer_id, reviewed_at, created_by";

export async function listIncidents() {
  return await sql`SELECT ${sql.unsafe(INCIDENT_COLS)} FROM incidents ORDER BY date DESC, time DESC, created_at DESC`;
}

export async function getIncident(id) {
  const rows = await sql`SELECT ${sql.unsafe(INCIDENT_COLS)} FROM incidents WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function getIncidentRaw(id) {
  const rows = await sql`SELECT * FROM incidents WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function insertIncident(i) {
  await sql`
    INSERT INTO incidents (id, date, day, time, severity, ambulance, comments, created_at,
                           status, reviewer_id, reviewed_at, created_by, owner_token)
    VALUES (${i.id}, ${i.date}, ${i.day}, ${i.time}, ${i.severity},
            ${i.ambulance ? 1 : 0}, ${i.comments}, ${i.created_at},
            ${i.status ?? "reportado"}, ${i.reviewer_id ?? null}, ${i.reviewed_at ?? null},
            ${i.created_by ?? null}, ${i.owner_token ?? null})
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

export async function updateIncidentStatus(id, status, reviewerId, reviewedAt) {
  await sql`
    UPDATE incidents
    SET status = ${status}, reviewer_id = ${reviewerId}, reviewed_at = ${reviewedAt}
    WHERE id = ${id}
  `;
}

export async function deleteIncident(id) {
  return await sql`DELETE FROM incidents WHERE id = ${id} RETURNING id`.then((r) => r.length > 0);
}

export async function countIncidents() {
  const r = await sql`SELECT COUNT(*)::int AS total FROM incidents`;
  return r[0].total;
}

export async function insertUser(u) {
  await sql`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (${u.id}, ${u.name}, ${u.email}, ${u.password_hash}, ${u.role}, ${u.created_at})
  `;
}

export async function getUserByEmail(email) {
  const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
  return rows[0] ?? null;
}

export async function getUserById(id) {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function listUsers() {
  return await sql`SELECT id, name, email, role, created_at FROM users ORDER BY created_at`;
}

export async function updateUserRole(id, role) {
  const rows = await sql`UPDATE users SET role = ${role} WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function deleteUser(id) {
  const rows = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}