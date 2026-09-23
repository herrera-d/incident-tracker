import { useMemo, useState } from "react";
import { SEV_LABELS, SEVERITIES } from "../constants";
import { formatShortDate } from "../utils";

export default function IncidentList({ incidents, onEdit, onDelete }) {
  const [filter, setFilter] = useState("todas");
  const [ambOnly, setAmbOnly] = useState(false);

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (filter !== "todas" && inc.severity !== filter) return false;
      if (ambOnly && !inc.ambulance) return false;
      return true;
    });
  }, [incidents, filter, ambOnly]);

  const counts = (id) => incidents.filter((i) => i.severity === id).length;

  return (
    <section className="incident-area">
      <div className="incident-controls">
        <div className="chip-row">
          <button
            className={`chip ${filter === "todas" ? "is-active" : ""}`}
            onClick={() => setFilter("todas")}
          >
            Todas <span className="chip__count">{incidents.length}</span>
          </button>
          {SEVERITIES.map((s) => (
            <button
              key={s.id}
              className={`chip chip--${s.id} ${filter === s.id ? "is-active" : ""}`}
              onClick={() => setFilter(s.id)}
            >
              {s.label} <span className="chip__count">{counts(s.id)}</span>
            </button>
          ))}
        </div>

        <label className="amb-check">
          <input type="checkbox" checked={ambOnly} onChange={(e) => setAmbOnly(e.target.checked)} />
          <span>Con ambulancia</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="list-empty">
          {incidents.length === 0
            ? "Aún no hay incidentes registrados."
            : "Ningún incidente coincide con el filtro."}
        </p>
      ) : (
        <ul className="incident-list">
          {filtered.map((inc) => {
            return (
              <li key={inc.id} className="incident-card">
                <div className="incident-card__meta">
                  <span className="incident-card__date">{formatShortDate(inc.date)}</span>
                  <span className="incident-card__day">{inc.day}</span>
                  <span className="incident-card__time">{inc.time}</span>
                </div>
                <div className="incident-card__body">
                  <div className="incident-card__badges">
                    <span className={`sev-chip sev-chip--${inc.severity}`}>
                      <span className={`sev-chip__dot sev-chip__dot--${inc.severity}`} />
                      {SEV_LABELS[inc.severity]}
                    </span>
                    {inc.ambulance && <span className="amb-chip">Ambulancia</span>}
                  </div>
                  <p className="incident-card__comments">
                    {inc.comments || <em className="muted">Sin comentarios.</em>}
                  </p>
                </div>
                <div className="incident-card__actions">
                  <button className="icon-btn" onClick={() => onEdit(inc)} aria-label="Editar">Editar</button>
                  <button className="icon-btn icon-btn--danger" onClick={() => onDelete(inc)} aria-label="Eliminar">Eliminar</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}