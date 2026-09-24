import { useMemo, useState } from "react";
import { SEV_LABELS, SEVERITIES, STATUSES, STATUS_LABELS } from "../constants";
import { formatShortDate } from "../utils";
import { ownsIncident } from "../api";

export default function IncidentList({
  incidents,
  onEdit,
  onDelete,
  onTransition,
  user
}) {
  const [filter, setFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [ambOnly, setAmbOnly] = useState(false);

  const canReview = user.role === "reviewer" || user.role === "admin";

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (filter !== "todas" && inc.severity !== filter) return false;
      if (statusFilter !== "todas" && inc.status !== statusFilter) return false;
      if (ambOnly && !inc.ambulance) return false;
      return true;
    });
  }, [incidents, filter, statusFilter, ambOnly]);

  const counts = (id) => incidents.filter((i) => i.severity === id).length;
  const statusCounts = (id) => incidents.filter((i) => i.status === id).length;

  const transitionAction = (inc) => {
    if (inc.status === "reportado") return { to: "en_revision", label: "Revisar", className: "btn--sm btn--ghost" };
    if (inc.status === "en_revision") return null;
    return { to: "en_revision", label: "Reabrir", className: "btn--sm btn--ghost" };
  };

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

        <div className="chip-row">
          <button
            className={`chip ${statusFilter === "todas" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("todas")}
          >
            Todos <span className="chip__count">{incidents.length}</span>
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.id}
              className={`chip chip--estado-${s.id} ${statusFilter === s.id ? "is-active" : ""}`}
              onClick={() => setStatusFilter(s.id)}
            >
              {s.label} <span className="chip__count">{statusCounts(s.id)}</span>
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
            const action = transitionAction(inc);
            const owner =
              (user.id && inc.created_by === user.id) || ownsIncident(inc.id);
            const canEdit = canReview || owner;

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
                    <span className={`chip chip--estado-${inc.status}`}>
                      {STATUS_LABELS[inc.status] || inc.status}
                    </span>
                    {inc.ambulance && <span className="amb-chip">Ambulancia</span>}
                  </div>
                  <p className="incident-card__comments">
                    {inc.comments || <em className="muted">Sin comentarios.</em>}
                  </p>
                </div>
                <div className="incident-card__actions">
                  {canReview && inc.status === "en_revision" && (
                    <>
                      <button className="btn btn--sm btn--ok" onClick={() => onTransition(inc, "aprobado")}>
                        Aprobar
                      </button>
                      <button className="btn btn--sm btn--danger" onClick={() => onTransition(inc, "rechazado")}>
                        Rechazar
                      </button>
                    </>
                  )}
                  {canReview && action && (
                    <button className={`btn ${action.className}`} onClick={() => onTransition(inc, action.to)}>
                      {action.label}
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button className="btn btn--sm btn--ghost" onClick={() => onEdit(inc)}>
                        Editar
                      </button>
                      <button
                        className="btn btn--sm btn--danger"
                        onClick={() => onDelete(inc.id)}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}