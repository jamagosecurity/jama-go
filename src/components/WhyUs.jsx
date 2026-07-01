import Reveal from "./Reveal.jsx";

const REASONS = [
  "Fully licensed, insured and accredited officers",
  "Real-time incident reporting to your inbox",
  "Dedicated account manager for every client",
  "Flexible contracts with no hidden fees",
];

export default function WhyUs() {
  return (
    <section className="section section-alt" id="why">
      <div className="container why-inner">
        <Reveal className="why-copy">
          <span className="kicker">Why Jama Go</span>
          <h2>Security you can measure, service you can trust</h2>
          <p>
            We combine highly trained people with smart technology and
            transparent reporting, so you always know your assets are protected.
          </p>
          <ul className="check-list">
            {REASONS.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <a href="#contact" className="btn btn-primary">
            Talk to our team
          </a>
        </Reveal>

        <Reveal className="why-media" aria-hidden="true">
          <div className="orbit">
            <div className="orbit-core">🛡️</div>
            <span className="chip chip-1">CCTV</span>
            <span className="chip chip-2">Patrols</span>
            <span className="chip chip-3">Guards</span>
            <span className="chip chip-4">Alarms</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
