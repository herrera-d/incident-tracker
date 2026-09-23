import express from "express";
import { randomUUID } from "node:crypto";

import {
  listIncidents,
  getIncident,
  insertIncident,
  updateIncident,
  deleteIncident,
  countIncidents
} from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const SEVERITIES = ["baja", "media", "alta", "critica"];

function validateIncident(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const req = partial ? (v, field) => v !== undefined || errors.push(`Falta el campo "${field}"`) : (v, field) => !v && errors.push(`Falta el campo "${field}"`);

  if (!partial || body.date !== undefined) {
    req(body.date, "date");
    if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) errors.push("El campo \"date\" debe tener formato YYYY-MM-DD");
    else data.date = body.date;
  }

  if (!partial || body.day !== undefined) {
    req(body.day, "day");
    data.day = body.day;
  }

  if (!partial || body.time !== undefined) {
    req(body.time, "time");
    if (body.time && !/^\d{2}:\d{2}$/.test(body.time)) errors.push("El campo \"time\" debe tener formato HH:MM");
    else data.time = body.time;
  }

  if (!partial || body.severity !== undefined) {
    req(body.severity, "severity");
    if (body.severity && !SEVERITIES.includes(body.severity)) {
      errors.push(`El campo "severity" debe ser uno de: ${SEVERITIES.join(", ")}`);
    } else data.severity = body.severity;
  }

  if (!partial || body.ambulance !== undefined) {
    if (body.ambulance !== undefined && typeof body.ambulance !== "boolean") {
      errors.push("El campo \"ambulance\" debe ser booleano");
    } else data.ambulance = body.ambulance ? 1 : 0;
  }

  if (body.comments !== undefined) {
    data.comments = String(body.comments ?? "");
  }

  return { errors, data };
}

// Tests smoke endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, total: countIncidents() });
});

app.get("/api/incidents", (_req, res) => {
  res.json(listIncidents());
});

app.get("/api/incidents/:id", (req, res) => {
  const incident = getIncident(req.params.id);
  if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
  res.json(incident);
});

app.post("/api/incidents", (req, res) => {
  const { errors, data } = validateIncident(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

  const incident = {
    id: randomUUID(),
    ...data,
    created_at: new Date().toISOString()
  };
  insertIncident(incident);
  res.status(201).json(incident);
});

app.put("/api/incidents/:id", (req, res) => {
  const existing = getIncident(req.params.id);
  if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });

  const { errors, data } = validateIncident(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

  const incident = { id: existing.id, ...existing, ...data };
  updateIncident(incident);
  res.json(incident);
});

app.delete("/api/incidents/:id", (req, res) => {
  const ok = deleteIncident(req.params.id);
  if (!ok) return res.status(404).json({ error: "Incidente no encontrado" });
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`API de incidentes escuchando en http://localhost:${PORT}`);
});