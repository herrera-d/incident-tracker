import { useState } from "react";

export default function Login({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email y contraseña son obligatorios.");
      return;
    }
    setSubmitting(true);
    Promise.resolve(onLogin(email, password))
      .catch((err) => setError(err.message || "No se pudo iniciar sesión."))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal login-pane" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <span className="eyebrow">Acceso</span>
        <h2 className="modal__title">Iniciar sesión</h2>
        <form className="incident-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              <span className="btn__label">{submitting ? "Entrando…" : "Entrar"}</span>
              <span className="btn__arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}