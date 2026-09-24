import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "incidents.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function tableExists(name) {
  return Boolean(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name)
  );
}

function columnNames(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

let changed = false;

if (!tableExists("incidents")) {
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
    )
  `);
  changed = true;
} else {
  const cols = columnNames("incidents");
  const wanted = [
    ["status", "TEXT NOT NULL DEFAULT 'reportado'"],
    ["reviewer_id", "TEXT"],
    ["reviewed_at", "TEXT"],
    ["created_by", "TEXT"],
    ["owner_token", "TEXT"]
  ];
  for (const [col, ddl] of wanted) {
    if (!cols.includes(col)) {
      db.exec(`ALTER TABLE incidents ADD COLUMN ${col} ${ddl}`);
      changed = true;
    }
  }
}

if (!tableExists("users")) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','reviewer','user')),
      created_at    TEXT NOT NULL
    )
  `);
  changed = true;
}

console.log(changed ? "esquema actualizado" : "sin cambios");
db.close();
