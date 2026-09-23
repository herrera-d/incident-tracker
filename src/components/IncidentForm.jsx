import { useState } from "react";
import { SEVERITIES, AMBULANCE, DAY, DATE, TIME, SEVERITY, COMMENTS } from "../constants";
import { dayName } from "../utils";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const INITIAL = {
  [DATE]: todayISO(),
  [DAY]: dayName(new Date()),
  [TIME]: nowTime(),
  [SEVERITY]: "media",
  [AMBULANCE]: false,
  [COMMENTS]: ""
};

export default function IncidentForm({
  onSubmit,
  onCancel,
  submitLabel = "Registrar incidente",
  initial
}) {
  const [values, setValues] = useState(initial ? { ...INITIAL, ...initial } : INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    const d = date ? new Date(`${date}T00:00:00`) : null;
    setValues((v) => ({ ...v, [DATE]: date, [DAY]: d ? dayName(d) : "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!values[DATE] || !values[TIME]) {
      setError("La fecha y la hora son obligatorias.");
      return;
    }
    setSubmitting(true);
    Promise.resolve(onSubmit({ ...values, [COMMENTS]: values[COMMENTS].trim() }))
      .then(() => setValues(INITIAL))
      .catch((err) => setError(err.message || "No se pudo guardar el incidente."))
      .finally(() => setSubmitting(false));
  };

  return (
    <form className="incident-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid form-grid--top">
        <label className="field">
          <span className="field__label">Fecha <i className="req">*</i></span>
          <input type="date" value={values[DATE] || ""} onChange={handleDateChange} required />
        </label>
        <div className="field">
          <span className="field__label">Día</span>
          <input type="text" value={values[DAY] || "—"} readOnly className="is-readonly" />
        </div>
        <label className="field">
          <span className="field__label">Hora <i className="req">*</i></span>
          <input type="time" value={values[TIME] || ""} onChange={set(TIME)} required />
        </label>
      </div>

      <fieldset className="field field--severity">
        <legend className="field__label">Gravedad <i className="req">*</i></legend>
        <div className="severity-picker">
          {SEVERITIES.map((sev) => (
            <label
              key={sev.id}
              className={`sev-opt sev-opt--${sev.id} ${values[SEVERITY] === sev.id ? "is-selected" : ""}`}
            >
              <input
                type="radio"
                name="severity"
                value={sev.id}
                checked={values[SEVERITY] === sev.id}
                onChange={set(SEVERITY)}
              />
              <span className="sev-opt__dot" />
              <span className="sev-opt__label">{sev.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field field--ambulance">
        <span className={`amb-toggle ${values[AMBULANCE] ? "is-on" : ""}`}>
          <input type="checkbox" checked={values[AMBULANCE]} onChange={set(AMBULANCE)} />
          <span className="amb-toggle__track"><span className="amb-toggle__thumb" /></span>
          <span className="amb-toggle__text">
            Requirió ambulancia
            <small>Asistencia sanitaria movilizada</small>
          </span>
        </span>
      </label>

      <label className="field">
        <span className="field__label">Comentarios</span>
        <textarea
          rows={4}
          placeholder="Describa el contexto del incidente, estado de los implicados, medidas tomadas…"
          value={values[COMMENTS]}
          onChange={set(COMMENTS)}
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          <span className="btn__label">{submitting ? "Guardando…" : submitLabel}</span>
          <span className="btn__arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}