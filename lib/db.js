import { neon } from "@neondatabase/serverless";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta la variable de entorno DATABASE_URL (ver .env.example)");
}

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
  return await sql`DELETE FROM incidents WHERE id = ${id} RETURNING id`.then((r) => r.length > 0);
}

export async function countIncidents() {
  const r = await sql`SELECT COUNT(*)::int AS total FROM incidents`;
  return r[0].total;
}