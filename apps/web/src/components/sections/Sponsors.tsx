import Image from "next/image";

export function Sponsors() {
  return (
    <section
      className="sect sponsor-partnership"
      id="sponsors"
      aria-labelledby="sponsor-partnership-title"
    >
      <Image
        className="sponsor-partnership__backdrop"
        src="/images/sponsors/stepout-matchday-background.png"
        alt=""
        fill
        sizes="100vw"
      />
      <div className="sponsor-partnership__shade" aria-hidden="true" />

      <div className="wrap sponsor-partnership__content">
        <p className="sponsor-partnership__club-name">Nagaland United Sports Club</p>
        <p className="sponsor-partnership__eyebrow">
          <span aria-hidden="true" />
          Our Sponsor
          <span aria-hidden="true" />
        </p>

        <div className="sponsor-partnership__feature">
          <div className="sponsor-partnership__identity">
            <a
              className="sponsor-partnership__logo-link"
              href="https://www.stepout.ai/en/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit StepOut website"
            >
              <Image
                src="/images/sponsors/stepout-logo.svg"
                alt="StepOut — Live The Game"
                width={370}
                height={120}
              />
            </a>
            <p className="sponsor-partnership__role">Football Analytics Partner</p>
          </div>

          <div className="sponsor-partnership__divider" aria-hidden="true" />

          <div className="sponsor-partnership__copy">
            <h2 id="sponsor-partnership-title">
              StepOut joins NUSC as the club&apos;s Performance Analytics Partner.
            </h2>
            <span className="sponsor-partnership__accent" aria-hidden="true" />
            <p>
              StepOut supports NUSC with advanced analytics to enhance player
              development, match analysis and overall club performance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
