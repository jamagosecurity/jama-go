// Shared brand shield mark + wordmark used in the header and footer.
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z"
          fill="url(#g)"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="m8.5 12 2.3 2.3L15.8 9"
          stroke="#0b1120"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="g"
            x1="4"
            y1="2"
            x2="20"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4ade80" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

export function BrandText() {
  return (
    <span className="brand-text">
      Jama<span className="brand-accent">Go</span> <em>Security</em>
    </span>
  );
}
