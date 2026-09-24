import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "incident-tracker-dev-secret";

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export function ownerHeader(req) {
  return req.headers["x-owner-token"] || null;
}

export function decodeToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function resolveUser(req, getUserById) {
  const token = bearerToken(req);
  if (!token) return { user: { id: null, name: null, email: null, role: "user" } };
  const payload = decodeToken(token);
  if (!payload) return { error: { status: 401, message: "Token inválido o expirado" } };
  const user = await getUserById(payload.id);
  if (!user) return { error: { status: 401, message: "Usuario no encontrado" } };
  return { user };
}

export function canManage(incident, user, req) {
  if (user.role === "reviewer" || user.role === "admin") return true;
  if (user.id && incident.created_by === user.id) return true;
  const token = ownerHeader(req);
  return Boolean(token && incident.owner_token && token === incident.owner_token);
}

export function makeRequireRole(getUserById) {
  return (...roles) =>
    async (req, res, next) => {
      const { user, error } = await resolveUser(req, getUserById);
      if (error) return res.status(error.status).json({ error: error.message });
      if (!roles.includes(user.role)) return res.status(403).json({ error: "No autorizado" });
      req.user = user;
      if (next) return next();
      return true;
    };
}