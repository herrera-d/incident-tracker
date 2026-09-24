import { neon } from "@neondatabase/serverless";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta la variable de entorno DATABASE_URL (ver .env.example)");
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','reviewer','user')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`;
await sql`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'reportado'`;
await sql`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reviewer_id TEXT`;
await sql`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
await sql`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS created_by TEXT`;
await sql`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS owner_token TEXT`;
await sql`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status)`;

const incidentCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'incidents'
  ORDER BY ordinal_position
`;
const userCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position
`;

const okIncidents = ["status", "reviewer_id", "reviewed_at", "created_by", "owner_token"].every(
  (c) => incidentCols.some((r) => r.column_name === c)
);
const okUsers = userCols.length > 0;

console.log("Verificación (solo lectura, information_schema):");
console.log(`  incidents: ${incidentCols.length} columnas — ${okIncidents ? "OK" : "FALTAN COLUMNAS"}`);
console.log(`  ${incidentCols.map((r) => `${r.column_name} (${r.data_type})`).join(", ")}`);
console.log(`  users: ${userCols.length} columnas — ${okUsers ? "OK" : "FALTA TABLA"}`);
console.log(`  ${userCols.map((r) => `${r.column_name} (${r.data_type})`).join(", ")}`);
console.log(okIncidents && okUsers ? "esquema Neon actualizado" : "ERROR: esquema incompleto");
process.exit(okIncidents && okUsers ? 0 : 1);
