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
        src="/images/sponsors/stepout-matchday-background.webp"
        alt=""
        fill
        sizes="100vw"
      />
      <div className="sponsor-partnership__shade" aria-hidden="true" />

      <div className="wrap sponsor-partnership__content">
        <h2 className="sponsor-partnership__eyebrow" id="sponsor-partnership-title">
          <span aria-hidden="true" />
          Our Partners
          <span aria-hidden="true" />
        </h2>

        <div className="sponsor-partnership__partners">
          <article className="sponsor-partnership__partner">
            <a
              className="sponsor-partnership__logo-link"
              href="https://www.stepout.ai/en/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit StepOut website"
            >
              <Image
                src="/images/sponsors/stepout-logo.svg"
                alt="StepOut Live The Game logo"
                width={370}
                height={120}
              />
            </a>
          </article>

          <article className="sponsor-partnership__partner">
            <a
              className="sponsor-partnership__logo-link"
              href="https://tourism.nagaland.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Nagaland Tourism website"
            >
              <Image
                src="/images/sponsors/nagaland-tourism.webp"
                alt="Nagaland Tourism logo"
                width={370}
                height={120}
              />
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
