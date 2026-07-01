import { useState } from "react";
import Reveal from "./Reveal.jsx";

const SERVICE_OPTIONS = [
  "Manned Guarding",
  "Mobile Patrols",
  "Event Security",
  "CCTV Monitoring",
  "Residential Security",
  "Alarm Response",
];

export default function Contact() {
  const [sent, setSent] = useState(false);

  // Demo only — no backend. Mirrors the original temporary "sent" feedback.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (sent) return;
    e.currentTarget.reset();
    setSent(true);
    setTimeout(() => setSent(false), 3500);
  };

  return (
    <section className="section cta-section" id="contact">
      <div className="container cta-inner">
        <Reveal className="cta-copy">
          <span className="kicker">Get Protected</span>
          <h2>Ready for security that never sleeps?</h2>
          <p>
            Tell us about your site and we'll build a tailored security plan —
            free of charge.
          </p>
          <ul className="contact-list">
            <li>
              📞 <a href="tel:+10000000000">+1 (000) 000-0000</a>
            </li>
            <li>
              ✉️ <a href="mailto:hello@jamago.security">hello@jamago.security</a>
            </li>
            <li>📍 Available nationwide, 24 hours a day</li>
          </ul>
        </Reveal>

        <Reveal as="form" className="quote-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" placeholder="Jane Doe" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="jane@company.com" required />
          </div>
          <div className="field">
            <label htmlFor="service">Service needed</label>
            <select id="service">
              {SERVICE_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="msg">Message</label>
            <textarea id="msg" rows="3" placeholder="Tell us about your site…"></textarea>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={sent}>
            {sent ? "✓ Request Sent — We'll be in touch" : "Request Free Assessment"}
          </button>
          <p className="form-note">We'll respond within one business hour.</p>
        </Reveal>
      </div>
    </section>
  );
}
