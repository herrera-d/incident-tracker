import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { insertUser, getUserByEmail, getUserById, listUsers } from "../lib/db.js";
import { validateUser } from "./_validate.js";
import { makeRequireRole } from "./_auth.js";

const requireRole = makeRequireRole(getUserById);

export default async function handler(req, res) {
  try {
    const ok = await requireRole("admin")(req, res);
    if (ok !== true) return;

    if (req.method === "GET") {
      return res.json(await listUsers());
    }

    if (req.method === "POST") {
      const { errors, data } = validateUser(req.body);
      if (errors.length) return res.status(400).json({ error: errors.join(" | ") });

      const role = data.role || "user";
      if (await getUserByEmail(data.email)) {
        return res.status(409).json({ error: "El email ya está registrado" });
      }

      const user = {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        password_hash: await bcrypt.hash(data.password, 10),
        role,
        created_at: new Date().toISOString()
      };
      await insertUser(user);
      return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}