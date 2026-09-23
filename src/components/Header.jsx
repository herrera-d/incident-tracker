const TABS = [
  { id: "registro", label: "Registro" },
  { id: "historial", label: "Historial" },
  { id: "metricas", label: "Métricas" }
];

export default function Header({ tab, setTab, total }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="44" height="44">
              <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="24" cy="24" r="13" fill="none" stroke="currentColor" strokeWidth="12" opacity="0.12" />
              <circle cx="24" cy="24" r="2.5" fill="currentColor" />
              <line x1="24" y1="3" x2="24" y2="16" stroke="currentColor" strokeWidth="2" />
              <line x1="24" y1="32" x2="24" y2="45" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <div className="brand__text">
            <h1 className="brand__name">TrackLog</h1>
            <p className="brand__sub">Registro de incidentes · Pista de ciclismo</p>
          </div>
        </div>

        <nav className="tab-nav" aria-label="Secciones">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="header-total">
          <span className="header-total__label">Registrados</span>
          <span className="header-total__value">{total}</span>
        </div>
      </div>
    </header>
  );
}