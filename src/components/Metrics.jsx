import { useMemo } from "react";
import { SEVERITIES } from "../constants";
import { monthLabel } from "../utils";

const WD = ["D", "L", "M", "X", "J", "V", "S"];
const WDNAME = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function useStats(incidents) {
  return useMemo(() => {
    const s = { total: incidents.length, ambulanceYes: 0, sev: {}, hour: {}, wd: {}, month: {} };
    for (const i of incidents) {
      if (i.ambulance) s.ambulanceYes++;
      s.sev[i.severity] = (s.sev[i.severity] || 0) + 1;
      const h = Number(i.time.split(":")[0]);
      s.hour[h] = (s.hour[h] || 0) + 1;
      const d = new Date(`${i.date}T00:00:00`).getDay();
      const nm = WDNAME[d];
      s.wd[nm] = (s.wd[nm] || 0) + 1;
      const mk = i.date.slice(0, 7);
      s.month[mk] = (s.month[mk] || 0) + 1;
    }
    const maxSev = Math.max(1, ...Object.values(s.sev));
    const maxHour = Math.max(1, ...Object.values(s.hour));
    const maxWd = Math.max(1, ...Object.values(s.wd));
    const sevPerc = {};
    for (const k of Object.keys(s.sev)) {
      sevPerc[k] = s.total ? Math.round((s.sev[k] / s.total) * 100) : 0;
    }
    return { ...s, maxSev, maxHour, maxWd, sevPerc, ambPerc: s.total ? Math.round((s.ambulanceYes / s.total) * 100) : 0 };
  }, [incidents]);
}

export default function Metrics({ incidents, loading }) {
  const s = useStats(incidents);

  if (loading) return <p className="metrics-empty">Calculando métricas…</p>;
  if (s.total === 0) return <p className="metrics-empty">Registra incidentes para ver métricas.</p>;

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const monthKeys = Object.keys(s.month).sort();
  const maxMonth = Math.max(1, ...monthKeys.map((k) => s.month[k]));

  return (
    <div className="metrics">
      <div className="metric-kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">Totales</span>
          <span className="kpi-card__value">{s.total}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Con ambulancia</span>
          <span className="kpi-card__value">{s.ambulanceYes}<small className="kpi-card__suffix">{s.ambPerc}%</small></span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Críticos</span>
          <span className="kpi-card__value">{s.sev.critica || 0}</span>
        </div>
      </div>

      <div className="metric-block">
        <h2 className="metric-block__title">Por gravedad</h2>
        <ul className="sev-chart">
          {SEVERITIES.map((x) => {
            const n = s.sev[x.id] || 0;
            return (
              <li key={x.id} className="sev-row">
                <span className="sev-row__label">{x.label}</span>
                <div className="sev-row__track">
                  <span className={`sev-row__fill sev-row__fill--${x.id}`} style={{ width: `${Math.round((n / s.maxSev) * 100)}%` }} />
                </div>
                <span className="sev-row__value">{n}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="metric-block">
        <h2 className="metric-block__title">Por día de la semana</h2>
        <div className="wd-chart">
          {WDNAME.map((nm, i) => {
            const n = s.wd[nm] || 0;
            return (
              <div key={nm} className="wd-col">
                <span className="wd-col__value">{n}</span>
                <div className="wd-col__track">
                  <span className="wd-col__fill" style={{ height: `${Math.round((n / s.maxWd) * 100)}%` }} />
                </div>
                <span className="wd-col__label">{WD[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="metric-block metric-block--full">
        <h2 className="metric-block__title">Por hora</h2>
        <div className="hour-chart">
          {hours.map((h) => (
            <div key={h} className="hour-col">
              <span className="hour-col__value">{s.hour[h] || ""}</span>
              <div className="hour-col__track">
                <span className="hour-col__fill" style={{ height: `${Math.round(((s.hour[h] || 0) / s.maxHour) * 100)}%` }} />
              </div>
              <span className="hour-col__label">{String(h).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="metric-block metric-block--full">
        <h2 className="metric-block__title">Evolución mensual</h2>
        <ul className="month-chart">
          {monthKeys.map((k) => (
            <li key={k} className="month-col">
              <span className="month-col__value">{s.month[k]}</span>
              <div className="month-col__track">
                <span className="month-col__fill" style={{ width: `${Math.round((s.month[k] / maxMonth) * 100)}%` }} />
              </div>
              <span className="month-col__label">{monthLabel(k)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
