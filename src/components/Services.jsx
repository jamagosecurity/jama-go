import Reveal from "./Reveal.jsx";

const SERVICES = [
  {
    icon: "🛡️",
    title: "Manned Guarding",
    text: "Vetted, SIA-licensed security officers providing a professional on-site presence day and night.",
  },
  {
    icon: "🚓",
    title: "Mobile Patrols",
    text: "Randomised patrol routes and rapid keyholding response that keep intruders guessing.",
  },
  {
    icon: "🎟️",
    title: "Event Security",
    text: "Crowd management, access control and door supervision for events of any size.",
  },
  {
    icon: "📹",
    title: "CCTV Monitoring",
    text: "24/7 remote monitoring with live verification and instant escalation to authorities.",
  },
  {
    icon: "🏠",
    title: "Residential Security",
    text: "Discreet protection for private homes, estates and high-net-worth individuals.",
  },
  {
    icon: "🚨",
    title: "Alarm Response",
    text: "Trained responders dispatched the moment your alarm is triggered — no delays.",
  },
];

export default function Services() {
  return (
    <section className="section" id="services">
      <div className="container">
        <Reveal className="section-head">
          <span className="kicker">What We Do</span>
          <h2>Complete security solutions, one dependable partner</h2>
          <p>
            From a single guard to a fully monitored estate, we scale protection
            to fit your risk.
          </p>
        </Reveal>

        <div className="cards">
          {SERVICES.map((service) => (
            <Reveal as="article" className="feature" key={service.title}>
              <div className="feature-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
