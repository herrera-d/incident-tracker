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
    created_at  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'reportado',
    reviewer_id TEXT,
    reviewed_at TEXT,
    created_by  TEXT,
    owner_token TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','reviewer','user')),
    created_at    TEXT NOT NULL
  );
`);

const INCIDENT_COLS =
  "id, date, day, time, severity, ambulance, comments, created_at, status, reviewer_id, reviewed_at, created_by";

export function listIncidents() {
  return db
    .prepare(
      `SELECT ${INCIDENT_COLS} FROM incidents ORDER BY date DESC, time DESC, created_at DESC`
    )
    .all();
}

export function getIncident(id) {
  return db.prepare(`SELECT ${INCIDENT_COLS} FROM incidents WHERE id = ?`).get(id);
}

export function getIncidentRaw(id) {
  return db.prepare("SELECT * FROM incidents WHERE id = ?").get(id);
}

export function insertIncident(incident) {
  const stmt = db.prepare(`
    INSERT INTO incidents (id, date, day, time, severity, ambulance, comments, created_at,
                           status, reviewer_id, reviewed_at, created_by, owner_token)
    VALUES (@id, @date, @day, @time, @severity, @ambulance, @comments, @created_at,
            @status, @reviewer_id, @reviewed_at, @created_by, @owner_token)
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

export function updateIncidentStatus(id, status, reviewerId, reviewedAt) {
  const stmt = db.prepare(
    "UPDATE incidents SET status = ?, reviewer_id = ?, reviewed_at = ? WHERE id = ?"
  );
  const result = stmt.run(status, reviewerId, reviewedAt, id);
  return result.changes > 0;
}

export function deleteIncident(id) {
  const result = db.prepare("DELETE FROM incidents WHERE id = ?").run(id);
  return result.changes > 0;
}

export function countIncidents() {
  return db.prepare("SELECT COUNT(*) AS total FROM incidents").get().total;
}

export function insertUser(user) {
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (@id, @name, @email, @password_hash, @role, @created_at)
  `);
  stmt.run(user);
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) ?? null;
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) ?? null;
}

export function listUsers() {
  return db
    .prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at")
    .all();
}

export function updateUserRole(id, role) {
  const result = db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  return result.changes > 0;
}

export function deleteUser(id) {
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return result.changes > 0;
}

export default db;
