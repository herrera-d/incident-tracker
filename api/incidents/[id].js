import { getIncident, updateIncident, deleteIncident } from "../../lib/db.js";
import { validateIncident } from "../_validate.js";

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (req.method === "GET") {
      const incident = await getIncident(id);
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
      return res.json(incident);
    }

    if (req.method === "PUT") {
      const existing = await getIncident(id);
      if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });

      const { errors, data } = validateIncident(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

      const incident = { id: existing.id, ...existing, ...data };
      await updateIncident(incident);
      return res.json(incident);
    }

    if (req.method === "DELETE") {
      const ok = await deleteIncident(id);
      if (!ok) return res.status(404).json({ error: "Incidente no encontrado" });
      return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}