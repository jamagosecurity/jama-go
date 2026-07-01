const MONITOR_ROWS = [
  { label: "Perimeter — North Gate", value: "Clear", tone: "ok" },
  { label: "Patrol Unit 04", value: "On Route", tone: "ok" },
  { label: "CCTV Grid", value: "32 / 32", tone: "ok" },
  { label: "Alarm Response", value: "Armed", tone: "warn" },
];

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true"></div>
      <div className="hero-grid" aria-hidden="true"></div>
      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="pulse-dot"></span>
            Trusted 24/7 Security Partner
          </span>
          <h1>
            Protecting what
            <br />
            <span className="grad-text">matters most</span> to you.
          </h1>
          <p className="hero-sub">
            Jama Go Security provides professional manned guarding, rapid mobile
            patrols, event protection and round-the-clock monitoring — so your
            people, property and peace of mind are always secure.
          </p>

          <div className="hero-actions">
            <a href="#contact" className="btn btn-primary">
              Request Free Assessment
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M5 12h14m-6-6 6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a href="#services" className="btn btn-ghost">
              Explore Services
            </a>
          </div>

          <ul className="hero-badges">
            <li>
              <strong>SIA</strong> Licensed Officers
            </li>
            <li>
              <strong>&lt;15 min</strong> Response Time
            </li>
            <li>
              <strong>500+</strong> Sites Protected
            </li>
          </ul>
        </div>

        <div className="hero-card" aria-hidden="true">
          <div className="glass-card">
            <div className="card-head">
              <span className="live">
                <span className="pulse-dot"></span> LIVE MONITORING
              </span>
              <span className="card-time">Secure • Online</span>
            </div>
            <div className="card-rows">
              {MONITOR_ROWS.map((row) => (
                <div className="card-row" key={row.label}>
                  <span>{row.label}</span>
                  <b className={row.tone}>{row.value}</b>
                </div>
              ))}
            </div>
            <div className="card-foot">
              <div className="mini-bar">
                <i style={{ "--w": "92%" }}></i>
              </div>
              <span>System integrity 92%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
