import "dotenv/config";
import express from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import {
  listIncidents,
  getIncident,
  getIncidentRaw,
  insertIncident,
  updateIncident,
  updateIncidentStatus,
  deleteIncident,
  countIncidents,
  insertUser,
  getUserByEmail,
  getUserById,
  listUsers,
  updateUserRole,
  deleteUser
} from "./db.js";
import { validateIncident, validateUser, ROLES, STATUSES, TRANSITIONS } from "../api/_validate.js";
import {
  signToken,
  resolveUser,
  canManage,
  makeRequireRole
} from "../api/_auth.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Owner-Token");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const requireRole = makeRequireRole(getUserById);

// Tests smoke endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, total: countIncidents() });
});

// ---------- Auth ----------
app.post("/api/auth/register", async (req, res) => {
  const { errors, data } = validateUser(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

  const role = data.role || "user";
  if (role !== "user") {
    const ok = await requireRole("admin")(req, res);
    if (ok !== true) return;
  }

  if (getUserByEmail(data.email)) {
    return res.status(409).json({ error: "El email ya está registrado" });
  }

  const user = {
    id: randomUUID(),
    name: data.name,
    email: data.email,
    password_hash: bcrypt.hashSync(data.password, 10),
    role,
    created_at: new Date().toISOString()
  };
  insertUser(user);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son obligatorios" });
  }
  const user = getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.get("/api/auth/me", async (req, res) => {
  const { user, error } = await resolveUser(req, getUserById);
  if (error) return res.status(401).json({ error: error.message });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// ---------- Users (admin) ----------
app.get("/api/users", requireRole("admin"), (_req, res) => {
  res.json(listUsers());
});

app.post("/api/users", requireRole("admin"), (req, res) => {
  const { errors, data } = validateUser(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

  const role = data.role || "user";
  if (getUserByEmail(data.email)) {
    return res.status(409).json({ error: "El email ya está registrado" });
  }

  const user = {
    id: randomUUID(),
    name: data.name,
    email: data.email,
    password_hash: bcrypt.hashSync(data.password, 10),
    role,
    created_at: new Date().toISOString()
  };
  insertUser(user);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.put("/api/users/:id", requireRole("admin"), (req, res) => {
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ error: "Falta el campo \"role\"" });
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `El campo "role" debe ser uno de: ${ROLES.join(", ")}` });
  }
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  updateUserRole(user.id, role);
  res.json({ id: user.id, name: user.name, email: user.email, role });
});

app.delete("/api/users/:id", requireRole("admin"), (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  if (req.user.id === user.id) {
    return res.status(403).json({ error: "No puedes eliminar tu propia cuenta" });
  }
  deleteUser(user.id);
  res.status(204).end();
});

// ---------- Incidents ----------
app.get("/api/incidents", (_req, res) => {
  res.json(listIncidents());
});

app.get("/api/incidents/:id", (req, res) => {
  const incident = getIncident(req.params.id);
  if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
  res.json(incident);
});

app.post("/api/incidents", requireRole("user", "reviewer", "admin"), (req, res) => {
  const { errors, data } = validateIncident(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

  const incident = {
    id: randomUUID(),
    ...data,
    status: "reportado",
    reviewer_id: null,
    reviewed_at: null,
    created_by: req.user && req.user.id ? req.user.id : null,
    owner_token: randomUUID(),
    created_at: new Date().toISOString()
  };
  insertIncident(incident);
  res.status(201).json(incident);
});

app.put("/api/incidents/:id", requireRole("user", "reviewer", "admin"), (req, res) => {
  const existing = getIncidentRaw(req.params.id);
  if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });

  const { errors, data } = validateIncident(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(" | ") });
  if (!canManage(existing, req.user, req)) {
    return res.status(403).json({ error: "No autorizado" });
  }

  const incident = { id: existing.id, ...existing, ...data };
  updateIncident(incident);
  delete incident.owner_token;
  res.json(incident);
});

app.patch("/api/incidents/:id/status", requireRole("reviewer", "admin"), (req, res) => {
  const existing = getIncidentRaw(req.params.id);
  if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });

  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "Falta el campo \"status\"" });
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `El campo "status" debe ser uno de: ${STATUSES.join(", ")}` });
  }
  if (!TRANSITIONS[existing.status].includes(status)) {
    return res.status(400).json({ error: "Transición de estado no válida" });
  }

  let reviewerId = existing.reviewer_id;
  let reviewedAt = existing.reviewed_at;
  if (existing.status === "reportado" && status === "en_revision") {
    reviewerId = req.user.id;
    reviewedAt = new Date().toISOString();
  }
  updateIncidentStatus(existing.id, status, reviewerId, reviewedAt);

  const incident = { ...existing, status, reviewer_id: reviewerId, reviewed_at: reviewedAt };
  delete incident.owner_token;
  res.json(incident);
});

app.delete("/api/incidents/:id", requireRole("user", "reviewer", "admin"), (req, res) => {
  const existing = getIncidentRaw(req.params.id);
  if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });
  if (!canManage(existing, req.user, req)) {
    return res.status(403).json({ error: "No autorizado" });
  }
  deleteIncident(existing.id);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`API de incidentes escuchando en http://localhost:${PORT}`);
});