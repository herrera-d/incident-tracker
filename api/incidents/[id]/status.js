import { getIncidentRaw, updateIncidentStatus, getUserById } from "../../../lib/db.js";
import { STATUSES, TRANSITIONS } from "../../_validate.js";
import { makeRequireRole } from "../../_auth.js";

const requireRole = makeRequireRole(getUserById);

export default async function handler(req, res) {
  try {
    if (req.method !== "PATCH") {
      res.setHeader("Allow", "PATCH");
      return res.status(405).json({ error: "Método no permitido" });
    }

    const ok = await requireRole("reviewer", "admin")(req, res);
    if (ok !== true) return;

    const { id } = req.query;
    const existing = await getIncidentRaw(id);
    if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });

    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "Falta el campo \"status\"" });
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `El campo "status" debe ser uno de: ${STATUSES.join(", ")}` });
    }
    if (!(TRANSITIONS[existing.status] || []).includes(status)) {
      return res.status(400).json({ error: "Transición de estado no válida" });
    }

    let reviewer_id = existing.reviewer_id;
    let reviewed_at = existing.reviewed_at;
    if (existing.status === "reportado" && status === "en_revision") {
      reviewer_id = req.user.id;
      reviewed_at = new Date().toISOString();
    }
    await updateIncidentStatus(existing.id, status, reviewer_id, reviewed_at);

    const incident = { ...existing, status, reviewer_id, reviewed_at };
    delete incident.owner_token;
    return res.json(incident);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}