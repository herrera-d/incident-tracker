import { useEffect, useMemo, useState } from "react";
import {
  fetchIncidents,
  createIncident,
  updateIncident,
  deleteIncident
} from "./api.js";
import Header from "./components/Header.jsx";
import IncidentForm from "./components/IncidentForm.jsx";
import IncidentList from "./components/IncidentList.jsx";
import Metrics from "./components/Metrics.jsx";
import toast from "./components/toast.js";

const TABS = [
  { id: "registro", label: "Registro" },
  { id: "historial", label: "Historial" },
  { id: "metricas", label: "Métricas" }
];

export default function App() {
  const [tab, setTab] = useState("registro");
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    fetchIncidents()
      .then(setIncidents)
      .catch(() => toast("No se pudo cargar el historial desde la base de datos."))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (data) => {
    return createIncident(data)
      .then((created) => {
        setIncidents((prev) => [created, ...prev]);
        toast("Incidente registrado correctamente.");
      });
  };

  const handleUpdate = (id, data) => {
    return updateIncident(id, data).then((updated) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...updated } : i))
      );
      setEditTarget(null);
      toast("Incidente actualizado.");
    });
  };

  const handleDelete = (id) => {
    return deleteIncident(id).then(() => {
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      toast("Incidente eliminado.");
    });
  };

  const stats = useMemo(() => buildStats(incidents), [incidents]);

  return (
    <div className="app">
      <Header
        tab={tab}
        setTab={setTab}
        tabs={TABS}
        total={incidents.length}
      />

      <main className="shell">
        {tab === "registro" && (
          <section className="page registro-page">
            <div className="page-heading">
              <span className="eyebrow" data-step="01">Nueva entrada</span>
              <h1 className="page-title">Registro de incidente</h1>
              <p className="page-lede">
                Documente el suceso en la pista. Los campos marcados con{" "}
                <span className="req">*</span> son obligatorios.
              </p>
            </div>
            <div className="page-grid">
              <IncidentForm onSubmit={handleCreate} />
              {!loading && <TodayCard incidents={incidents} />}
            </div>
          </section>
        )}

        {tab === "historial" && (
          <section className="page historial-page">
            <div className="page-heading">
              <span className="eyebrow" data-step="02">Archivo</span>
              <h1 className="page-title">Historial de incidentes</h1>
              <p className="page-lede">
                {incidents.length} registro{incidents.length === 1 ? "" : "s"} en la base de datos.
              </p>
            </div>
            <IncidentList
              incidents={incidents}
              loading={loading}
              onEdit={setEditTarget}
              onDelete={handleDelete}
            />
          </section>
        )}

        {tab === "metricas" && (
          <section className="page metricas-page">
            <div className="page-heading">
              <span className="eyebrow" data-step="03">Análisis</span>
              <h1 className="page-title">Métricas de la pista</h1>
              <p className="page-lede">
                Panorama estadístico de los incidentes registrados.
              </p>
            </div>
            <Metrics incidents={incidents} stats={stats} loading={loading} />
          </section>
        )}
      </main>

      {editTarget && (
        <EditModal
          incident={editTarget}
          onSave={(id, data) => handleUpdate(id, data)}
          onClose={() => setEditTarget(null)}
        />
      )}

      <div className="toast-root" id="toast-root" />
    </div>
  );
}

function buildStats(incidents) {
  const total = incidents.length;
  const severityCount = { baja: 0, media: 0, alta: 0, critica: 0 };
  const byMonth = {};
  const byDay = {};
  const byHour = {};
  const byWeekday = {};
  const ambulance = { yes: 0, no: 0 };
  const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  for (const inc of incidents) {
    severityCount[inc.severity] = (severityCount[inc.severity] || 0) + 1;
    inc.ambulance ? ambulance.yes++ : ambulance.no++;

    const monthKey = inc.date.slice(0, 7);
    byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;

    const dayKey = inc.date.slice(8, 10);
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;

    const hour = Number(inc.time.split(":")[0]);
    const hb = Math.floor(hour / 3) * 3;
    byHour[hb] = (byHour[hb] || 0) + 1;

    const wd = new Date(`${inc.date}T00:00:00`).getDay();
    byWeekday[DAY_NAMES[wd]] = (byWeekday[DAY_NAMES[wd]] || 0) + 1;
  }

  const last30 = incidents.filter((i) => {
    const d = new Date(i.date);
    return Date.now() - d.getTime() < 30 * 24 * 3600 * 1000;
  }).length;

  const severityPerc = {};
  for (const k of Object.keys(severityCount)) {
    severityPerc[k] = total ? Math.round((severityCount[k] / total) * 100) : 0;
  }

  return {
    total,
    last30,
    ambulance,
    ambulancePerc: total ? Math.round((ambulance.yes / total) * 100) : 0,
    severityCount,
    severityPerc,
    byMonth,
    byDay,
    byHour,
    byWeekday
  };
}

function TodayCard({ incidents }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayCount = incidents.filter((i) => i.date === todayStr).length;

  const recent = incidents.slice(0, 3);
  const criticalRecent = incidents.filter((i) => i.severity === "critica").length;

  return (
    <aside className="today-card">
      <div className="today-card__head">
        <span className="eyebrow">Resumen</span>
        <span className="today-card__date">
          {today.toLocaleDateString("es-ES", { day: "numeric", month: "long", weekday: "long" })}
        </span>
      </div>
      <dl className="today-card__kpis">
        <div className="kpi">
          <dt>Hoy</dt>
          <dd>{todayCount}</dd>
        </div>
        <div className="kpi">
          <dt>Últimos 3</dt>
          <dd>{recent.length}</dd>
        </div>
        <div className="kpi">
          <dt>Críticos</dt>
          <dd>{criticalRecent}</dd>
        </div>
      </dl>
      {recent.length > 0 && (
        <ul className="today-card__recent">
          {recent.map((inc) => (
            <li key={inc.id}>
              <span className={`sev-dot sev-dot--${inc.severity}`} />
              <span className="today-recent__time">{inc.time}</span>
              <span className="today-recent__severity">{inc.severity}</span>
              {inc.ambulance && <span className="amb-badge">amb</span>}
            </li>
          ))}
        </ul>
      )}
      {recent.length === 0 && <p className="today-card__empty">Sin incidentes registrados.</p>}
    </aside>
  );
}

function EditModal({ incident, onSave, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <span className="eyebrow">Edición</span>
        <h2 className="modal__title">Modificar incidente</h2>
        <IncidentForm initial={incident} submitLabel="Guardar cambios" onCancel={onClose} onSubmit={(d) => onSave(incident.id, d)} />
      </div>
    </div>
  );
}