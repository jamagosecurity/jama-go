const SECTORS = ["Retail", "Corporate", "Construction", "Events", "Residential"];

export default function TrustBar() {
  return (
    <div className="trust-bar">
      <div className="container trust-inner">
        <span>Trusted by teams across</span>
        <div className="logos">
          {SECTORS.map((sector) => (
            <span key={sector}>{sector}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
