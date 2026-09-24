import { getUserById } from "../../lib/db.js";
import { resolveUser } from "../_auth.js";

export default async function handler(req, res) {
  try {
    const { user, error } = await resolveUser(req, getUserById);
    if (error) return res.status(401).json({ error: error.message });
    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}