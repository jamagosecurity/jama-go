import { useState } from "react";
import Logo from "./Logo.jsx";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#why", label: "Why Us" },
  { href: "#stats", label: "Results" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className={`site-header${open ? " open" : ""}`} id="top">
      <div className="container header-inner">
        <a href="#top" className="brand" aria-label="Jama Go Security home">
          <Logo variant="header" />
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#contact" className="btn btn-primary btn-sm nav-cta">
          Get a Quote
        </a>

        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}
