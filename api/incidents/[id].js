import { getIncident, getIncidentRaw, updateIncident, deleteIncident, getUserById } from "../../lib/db.js";
import { validateIncident } from "../_validate.js";
import { makeRequireRole, canManage } from "../_auth.js";

const requireRole = makeRequireRole(getUserById);

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (req.method === "GET") {
      const incident = await getIncident(id);
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
      return res.json(incident);
    }

    const ok = await requireRole("user", "reviewer", "admin")(req, res);
    if (ok !== true) return;

    if (req.method === "PUT") {
      const existing = await getIncidentRaw(id);
      if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });

      const { errors, data } = validateIncident(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ error: errors.join(" | ") });
      if (!canManage(existing, req.user, req)) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const incident = { id: existing.id, ...existing, ...data };
      await updateIncident(incident);
      delete incident.owner_token;
      return res.json(incident);
    }

    if (req.method === "DELETE") {
      const existing = await getIncidentRaw(id);
      if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });
      if (!canManage(existing, req.user, req)) {
        return res.status(403).json({ error: "No autorizado" });
      }
      await deleteIncident(id);
      return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}