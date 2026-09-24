import { useEffect, useState } from "react";
import { listUsers, createUser, updateUserRole, deleteUser } from "../api";
import toast from "./toast";

const ROLES = [
  { id: "admin", label: "admin" },
  { id: "reviewer", label: "reviewer" },
  { id: "user", label: "user" }
];

export default function UserAdmin({ selfId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });

  const refresh = () =>
    listUsers()
      .then(setUsers)
      .catch((err) => setError(err.message || "No se pudo cargar la lista de usuarios."))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setError("");
    createUser(form)
      .then(() => {
        toast("Usuario creado correctamente.");
        setForm({ name: "", email: "", password: "", role: "user" });
        refresh();
      })
      .catch((err) => setError(err.message || "No se pudo crear el usuario."));
  };

  const handleRole = (id, role) => {
    updateUserRole(id, role)
      .then(() => {
        toast("Rol actualizado.");
        refresh();
      })
      .catch((err) => toast(err.message || "No se pudo cambiar el rol.", "error"));
  };

  const handleDelete = (id) => {
    deleteUser(id)
      .then(() => {
        toast("Usuario eliminado.");
        refresh();
      })
      .catch((err) => toast(err.message || "No se pudo eliminar el usuario.", "error"));
  };

  return (
    <div className="user-admin">
      <div className="user-admin__grid">
        <form className="incident-form user-admin__form" onSubmit={handleCreate} noValidate>
          <span className="eyebrow">Cuentas</span>
          <h3 className="user-admin__title">Nueva cuenta</h3>
          <label className="field">
            <span className="field__label">Nombre</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Contraseña</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Rol</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">
              Crear usuario
            </button>
          </div>
        </form>

        <div className="user-admin__list">
          {loading ? (
            <p className="metrics-empty">Cargando usuarios…</p>
          ) : users.length === 0 ? (
            <p className="metrics-empty">Aún no hay usuarios registrados.</p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="muted">{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRole(u.id, e.target.value)}
                        disabled={u.id === selfId}
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="icon-btn icon-btn--danger"
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === selfId}
                        aria-label="Eliminar usuario"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}