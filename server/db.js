import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "incidents.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    day         TEXT NOT NULL,
    time        TEXT NOT NULL,
    severity    TEXT NOT NULL,
    ambulance   INTEGER NOT NULL DEFAULT 0,
    comments    TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );
`);

export function listIncidents() {
  return db
    .prepare("SELECT * FROM incidents ORDER BY date DESC, time DESC, created_at DESC")
    .all();
}

export function getIncident(id) {
  return db.prepare("SELECT * FROM incidents WHERE id = ?").get(id);
}

export function insertIncident(incident) {
  const stmt = db.prepare(`
    INSERT INTO incidents (id, date, day, time, severity, ambulance, comments, created_at)
    VALUES (@id, @date, @day, @time, @severity, @ambulance, @comments, @created_at)
  `);
  stmt.run(incident);
}

export function updateIncident(incident) {
  const stmt = db.prepare(`
    UPDATE incidents
    SET date = @date, day = @day, time = @time, severity = @severity,
        ambulance = @ambulance, comments = @comments
    WHERE id = @id
  `);
  const result = stmt.run(incident);
  return result.changes > 0;
}

export function deleteIncident(id) {
  const result = db.prepare("DELETE FROM incidents WHERE id = ?").run(id);
  return result.changes > 0;
}

export function countIncidents() {
  return db.prepare("SELECT COUNT(*) AS total FROM incidents").get().total;
}

export default db;