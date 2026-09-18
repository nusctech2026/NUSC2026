import { scholars } from "@/content/collections";

export function Scholarships() {
  return (
    <section className="sect iis">
      <div className="burst" aria-hidden="true"></div>

      <div className="iis-word" aria-hidden="true">
        {"NEXT LEVEL"}
      </div>

      <div className="wrap">
        <div className="shead">
          <div className="reveal">
            <div className="eyebrow" style={{ color: "#ffd9db" }}>
              {"Inspire Institute of Sport"}
            </div>

            <h2 className="h2" style={{ color: "#fff" }}>
              {"The next level"}
              <br />
              {"starts here."}
            </h2>
          </div>

          <p className="lede reveal d1">
            {
              "Four NUSC-linked players earned NSL U-20 scholarships to the Inspire Institute of Sport in Bellary, Karnataka, on a programme run with Bengaluru FC. Fully sponsored — elite training, sports science, video analysis and a professional football environment."
            }
          </p>
        </div>

        <div className="scholars">
          {scholars.map((scholar) => (
            <div className="scholar reveal" key={scholar.name}>
              <div className="n">{scholar.name}</div>
              <div className="r">{scholar.role}</div>
            </div>
          ))}
        </div>

        <p className="iis-foot reveal">
          {"Every player who returns raises the level for the whole squad."}
        </p>
      </div>
    </section>
  );
}
