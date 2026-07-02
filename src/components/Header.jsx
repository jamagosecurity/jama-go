import { useEffect, useState } from "react";
import useMegaMenu from "../hooks/useMegaMenu.js";
import Logo from "./Logo.jsx";

const NAV_ITEMS = [
  { href: "#top", label: "Home" },
  {
    label: "About",
    children: [
      { href: "#why", label: "Why Us" },
      { href: "#contact", label: "About Us" },
      { href: "#stats", label: "Our Results" },
    ],
  },
  {
    label: "Services",
    dropdownClass: "nav-dropdown--services",
    children: [
      { href: "#services", label: "All Services" },
      { href: "#services", label: "Manned Guarding" },
      { href: "#services", label: "Mobile Patrols" },
      { href: "#services", label: "Event Security" },
      { href: "#services", label: "CCTV Monitoring" },
      { href: "#services", label: "Alarm Response" },
    ],
  },
  {
    label: "Solutions",
    children: [
      { href: "#services", label: "Commercial" },
      { href: "#services", label: "Residential" },
      { href: "#services", label: "Industrial" },
    ],
  },
  { href: "#contact", label: "Contact" },
];

function isActive(href, activeHash) {
  if (!href) return false;
  if (href === "#top") return activeHash === "#top" || activeHash === "";
  return activeHash === href;
}

function childIsActive(children, activeHash) {
  return children?.some((c) => isActive(c.href, activeHash));
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("#top");
  const {
    openDropdown,
    setOpenDropdown,
    isDesktopNav,
    closeDropdown,
    getDropdownHandlers,
  } = useMegaMenu();

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash || "#top");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const closeMobile = () => {
    setOpen(false);
    closeDropdown();
  };

  const toggleMobileDropdown = (label) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  };

  return (
    <header className={`site-header${open ? " open" : ""}`} id="top">
      <div className="container header-inner">
        <a href="#top" className="brand" aria-label="Jama Go Security home">
          <Logo variant="header" />
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <div
                key={item.label}
                {...getDropdownHandlers(item.label)}
                className={`nav-dropdown${
                  item.dropdownClass ? ` ${item.dropdownClass}` : ""
                }${openDropdown === item.label ? " open" : ""}${
                  childIsActive(item.children, activeHash) ? " active" : ""
                }`}
              >
                <button
                  type="button"
                  className="nav-link nav-link--dropdown"
                  aria-expanded={openDropdown === item.label}
                  aria-haspopup="true"
                  onClick={() => {
                    if (!isDesktopNav) toggleMobileDropdown(item.label);
                  }}
                >
                  {item.label}
                  <span className="nav-caret" aria-hidden="true" />
                </button>

                <div className="nav-mega">
                  <div className="nav-mega-grid">
                    {item.children.map((child) => (
                      <a
                        key={child.label}
                        href={child.href}
                        className={`nav-mega-link${
                          isActive(child.href, activeHash) ? " active" : ""
                        }`}
                        onClick={closeMobile}
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className={`nav-link${
                  isActive(item.href, activeHash) ? " active" : ""
                }`}
                onClick={closeMobile}
              >
                {item.label}
              </a>
            )
          )}
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
