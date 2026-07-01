import { BrandText } from "./Logo.jsx";

const FOOTER_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#why", label: "Why Us" },
  { href: "#stats", label: "Results" },
  { href: "#contact", label: "Contact" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <BrandText />
          <p>Protecting what matters most, around the clock.</p>
        </div>
        <div className="footer-links">
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} Jama Go Security. All rights reserved.</span>
        <span>SIA Licensed • Fully Insured</span>
      </div>
    </footer>
  );
}
