import { achievements } from "@/content/collections";

export function AchievementTicker() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div className="marquee-group" key={copy}>
            {achievements.map((item) => (
              <span className="item" key={item}>
                <span className="dot" />
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
