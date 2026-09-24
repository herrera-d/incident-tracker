import { randomUUID } from "node:crypto";
import { listIncidents, insertIncident, getUserById } from "../lib/db.js";
import { validateIncident } from "./_validate.js";
import { makeRequireRole } from "./_auth.js";

const requireRole = makeRequireRole(getUserById);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.json(await listIncidents());
    }

    if (req.method === "POST") {
      const ok = await requireRole("user", "reviewer", "admin")(req, res);
      if (ok !== true) return;

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
      await insertIncident(incident);
      return res.status(201).json(incident);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}