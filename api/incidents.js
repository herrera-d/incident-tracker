import { randomUUID } from "node:crypto";
import { listIncidents, insertIncident } from "../lib/db.js";
import { validateIncident } from "./_validate.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.json(await listIncidents());
    }

    if (req.method === "POST") {
      const { errors, data } = validateIncident(req.body);
      if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

      const incident = {
        id: randomUUID(),
        ...data,
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