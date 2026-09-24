import { getUserById, updateUserRole, deleteUser } from "../../lib/db.js";
import { ROLES } from "../_validate.js";
import { makeRequireRole } from "../_auth.js";

const requireRole = makeRequireRole(getUserById);

export default async function handler(req, res) {
  try {
    const ok = await requireRole("admin")(req, res);
    if (ok !== true) return;

    const { id } = req.query;
    const user = await getUserById(id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (req.method === "PUT") {
      const { role } = req.body || {};
      if (!role) return res.status(400).json({ error: "Falta el campo \"role\"" });
      if (!ROLES.includes(role)) {
        return res.status(400).json({ error: `El campo "role" debe ser uno de: ${ROLES.join(", ")}` });
      }
      await updateUserRole(id, role);
      return res.json({ id: user.id, name: user.name, email: user.email, role });
    }

    if (req.method === "DELETE") {
      if (req.user.id === user.id) {
        return res.status(403).json({ error: "No puedes eliminar tu propia cuenta" });
      }
      await deleteUser(id);
      return res.status(204).end();
    }

    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}