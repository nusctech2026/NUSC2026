import { club, emailLink } from "@/content/site";

export function Support() {
  return (
    <section className="support" aria-label="Support NUSC">
      <div className="burst" aria-hidden="true"></div>

      <div
        className="wrap sect"
        style={{ paddingBlock: "clamp(64px,7vw,110px)" }}
      >
        <div className="support-head">
          <div
            className="eyebrow reveal"
            style={{ justifyContent: "center", color: "#fff" }}
          >
            {"Support NUSC"}
          </div>

          <h2 className="reveal">
            {"The journey has started."}
            <br />
            {"Come with us."}
          </h2>

          <p className="reveal d1">
            {
              "The club is young. The best chapters are still ahead. There are three ways to be part of it."
            }
          </p>
        </div>

        <div className="support-grid">
          <a
            className="sup-card reveal"
            href={club.instagram}
            target="_blank"
            rel="noopener"
          >
            <div className="k">{"01"}</div>

            <h3>{"Follow NUSC"}</h3>

            <p>
              {"Follow the club on social media and never miss a matchday."}
            </p>
            <span className="go">{"Follow ↗"}</span>
          </a>

          <a
            className="sup-card reveal d1"
            href={emailLink("Partnership Enquiry — NUSC", "")}
          >
            <div className="k">{"02"}</div>

            <h3>{"Partner with NUSC"}</h3>

            <p>{"Back a rising club and grow your brand with us."}</p>
            <span className="go">{"Start a conversation →"}</span>
          </a>

          <a
            className="sup-card reveal d2"
            href={emailLink("Enquiry — NUSC", "")}
          >
            <div className="k">{"03"}</div>

            <h3>{"Get in touch"}</h3>

            <p>
              {
                "Player trials, academy applications, media and community programmes."
              }
            </p>
            <span className="go">{"Email us →"}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
