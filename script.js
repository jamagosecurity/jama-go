// ===== Jama Go Security — interactions =====

// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile nav toggle
const header = document.querySelector(".site-header");
const toggle = document.querySelector(".nav-toggle");
toggle?.addEventListener("click", () => {
  const open = header.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});

// Close mobile menu when a link is clicked
document.querySelectorAll(".main-nav a").forEach((a) =>
  a.addEventListener("click", () => {
    header.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  })
);

// Scroll reveal
const revealTargets = document.querySelectorAll(
  ".feature, .stat, .section-head, .why-copy, .why-media, .cta-copy, .quote-form"
);
revealTargets.forEach((el) => el.classList.add("reveal"));

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealTargets.forEach((el) => io.observe(el));

// Simple form feedback (demo only — no backend)
const form = document.querySelector(".quote-form");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  const original = btn.textContent;
  btn.textContent = "✓ Request Sent — We'll be in touch";
  btn.disabled = true;
  form.reset();
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 3500);
});
