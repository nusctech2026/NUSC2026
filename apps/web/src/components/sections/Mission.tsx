export function Mission() {
  return (
    <section className="sect mission">
      <div className="burst faint" aria-hidden="true"></div>

      <div className="wrap">
        <div
          className="eyebrow red reveal"
          style={{ justifyContent: "center" }}
        >
          {"Vision"}
        </div>

        <p className="vision reveal">
          {
            "A community-owned football club from Nagaland that competes at the top of the domestic game, develops players for national opportunity, and uses football to build "
          }
          <b>{"peace and inclusion."}</b>
        </p>

        <div className="mgrid">
          <div className="mitem reveal">
            <strong>{"Unite"}</strong>

            <p>{"Unite the Naga community through football."}</p>
          </div>

          <div className="mitem reveal d1">
            <strong>{"Pathway"}</strong>

            <p>{"Build a clear, honest pathway for young players."}</p>
          </div>

          <div className="mitem reveal d2">
            <strong>{"Win"}</strong>

            <p>{"Win, and win in a way that reflects Nagaland's talent."}</p>
          </div>

          <div className="mitem reveal d3">
            <strong>{"Purpose"}</strong>

            <p>{"Use football for outreach, charity and peace."}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
