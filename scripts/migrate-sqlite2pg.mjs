import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listIncidents, insertIncident } from "../lib/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "incidents.db");

const db = new Database(dbPath, { readonly: true });
const rows = db.prepare("SELECT * FROM incidents").all();
db.close();

console.log(`Leyendo ${rows.length} fila(s) desde ${dbPath}`);

for (const row of rows) {
  await insertIncident(row);
  console.log(`Migrada: ${row.id}`);
}

console.log("Migración completada (origen SQLite intacto).");