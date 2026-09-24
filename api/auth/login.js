import bcrypt from "bcryptjs";
import { getUserByEmail } from "../../lib/db.js";
import { signToken } from "../_auth.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }
    const user = await getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    return res.json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}