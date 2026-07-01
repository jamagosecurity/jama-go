import Reveal from "./Reveal.jsx";

const STATS = [
  { num: "500+", label: "Sites protected" },
  { num: "<15m", label: "Avg. response" },
  { num: "99.9%", label: "Uptime coverage" },
  { num: "24/7", label: "Always on guard" },
];

export default function Stats() {
  return (
    <section className="section" id="stats">
      <div className="container">
        <div className="stats">
          {STATS.map((stat) => (
            <Reveal className="stat" key={stat.label}>
              <span className="stat-num">{stat.num}</span>
              <span className="stat-label">{stat.label}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
