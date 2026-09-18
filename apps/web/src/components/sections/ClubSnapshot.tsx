import { snapshot } from "@/content/collections";

export function ClubSnapshot() {
  return (
    <section className="snapshot" aria-label="Club snapshot">
      <div className="burst" aria-hidden="true"></div>

      <div className="wrap snap-grid">
        {snapshot.map((item) => (
          <div className="snap" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
