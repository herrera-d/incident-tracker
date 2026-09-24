import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "incidents.db");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@tracklog.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "tracklog-admin-local";
const useNeon = process.argv.includes("--neon");

async function seed(getUserByEmail, insertUser) {
  const existing = await getUserByEmail(ADMIN_EMAIL);
  if (existing) {
    console.log(`Admin listo: ${ADMIN_EMAIL} (role=admin)`);
    return;
  }
  await insertUser({
    id: randomUUID(),
    name: "Admin",
    email: ADMIN_EMAIL,
    password_hash: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: "admin",
    created_at: new Date().toISOString()
  });
  console.log(`Admin listo: ${ADMIN_EMAIL} (role=admin)`);
}

if (useNeon) {
  const { getUserByEmail, insertUser } = await import("../lib/db.js");
  await seed(getUserByEmail, insertUser);
  process.exit(0);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

if (!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()) {
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
}

const getUserByEmail = (email) =>
  db.prepare("SELECT * FROM users WHERE email = ?").get(email) ?? null;
const insertUser = (user) =>
  db
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, role, created_at)
       VALUES (@id, @name, @email, @password_hash, @role, @created_at)`
    )
    .run(user);

await seed(getUserByEmail, insertUser);
db.close();
