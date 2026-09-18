import React from 'react';

export function Players() {
  return (
    <>
      <section className="sect players">

    <div className="wrap">
      <div className="shead">
        <div className="reveal">
          <div className="eyebrow red">Players Making Their Mark</div>
          <h2 className="h2">Beyond the badge.</h2>
        </div>
        <p className="lede reveal d1">NUSC develops players who go beyond the club — into professional clubs, state
          selection and football-linked careers. Every name here is documented in the club record.</p>
      </div>
      <div className="pl-grid" id="plgrid">
        <article className="pcard reveal">
          <div className="mono"><span>YL</span></div>
          <div className="info">
            <h3>Yhoto Lohe</h3>
            <p>Signed for <b>Calicut FC</b> · Kerala Premier League</p>
          </div>
        </article>
        <article className="pcard reveal d1">
          <div className="mono"><span>AK</span></div>
          <div className="info">
            <h3>Arap Konyak</h3>
            <p>Signed for <b>Calicut FC</b> · Kerala Premier League</p>
          </div>
        </article>
        <article className="pcard reveal d2">
          <div className="mono"><span>MC</span></div>
          <div className="info">
            <h3>Mengulhoukho Chalieu</h3>
            <p>Progressed to <b>Mawlai SC</b> · I-League 3</p>
          </div>
        </article>
        <article className="pcard reveal">
          <div className="mono"><span>GC</span></div>
          <div className="info">
            <h3>Ghuqhe Chishi</h3>
            <p>Selected for <b>Nagaland</b> · Santosh Trophy</p>
          </div>
        </article>
        <article className="pcard reveal d1">
          <div className="mono"><span>BP</span></div>
          <div className="info">
            <h3>Bapenyimjong</h3>
            <p>Selected for <b>Nagaland</b> · Santosh Trophy</p>
          </div>
        </article>
        <article className="pcard reveal d2">
          <div className="mono"><span>AA</span></div>
          <div className="info">
            <h3>Atou Awomi</h3>
            <p>Selected for <b>Nagaland</b> · Santosh Trophy</p>
          </div>
        </article>
        <article className="pcard reveal">
          <div className="mono"><span>TZ</span></div>
          <div className="info">
            <h3>Thejangulie Zatsu</h3>
            <p><b>Nagaland</b>, Santosh Trophy · Best Defender, Dr T. Ao Trophy</p>
          </div>
        </article>
        <article className="pcard reveal d1">
          <div className="mono"><span>PS</span></div>
          <div className="info">
            <h3>Paotinsat Sitlhou</h3>
            <p>Recruited into the <b>Territorial Army</b> through football</p>
          </div>
        </article>
        <article className="pcard reveal d2">
          <div className="mono"><span>MK</span></div>
          <div className="info">
            <h3>Manton Konyak</h3>
            <p>Recruited into the <b>Territorial Army</b> through football</p>
          </div>
        </article>
      </div>
    </div>
  
</section>
<section className="sect iis">

    <div className="burst" aria-hidden="true"></div>
    <div className="iis-word" aria-hidden="true">NEXT LEVEL</div>
    <div className="wrap">
      <div className="shead">
        <div className="reveal">
          <div className="eyebrow" style={{color: '#ffd9db'}}>Inspire Institute of Sport</div>
          <h2 className="h2" style={{color: '#fff'}}>The next level<br />starts here.</h2>
        </div>
        <p className="lede reveal d1">Four NUSC-linked players earned NSL U-20 scholarships to the Inspire Institute of
          Sport in Bellary, Karnataka, on a programme run with Bengaluru FC. Fully sponsored — elite training, sports
          science, video analysis and a professional football environment.</p>
      </div>
      <div className="scholars">
        <div className="scholar reveal">
          <div className="n">Thejangulie</div>
          <div className="r">Forward / Winger</div>
        </div>
        <div className="scholar reveal d1">
          <div className="n">Hesaka</div>
          <div className="r">Midfielder</div>
        </div>
        <div className="scholar reveal d2">
          <div className="n">Paotinsat</div>
          <div className="r">Defender</div>
        </div>
        <div className="scholar reveal d3">
          <div className="n">Mengulhoukho</div>
          <div className="r">Forward</div>
        </div>
      </div>
      <p className="iis-foot reveal">Every player who returns raises the level for the whole squad.</p>
    </div>
  
</section>
<section className="sect repnag">

    <div className="wrap">
      <div className="shead">
        <div className="reveal">
          <div className="eyebrow red">Representing Nagaland</div>
          <h2 className="h2">The badge travels.</h2>
        </div>
        <p className="lede reveal d1">Dr T. Ao Trophy · 24th Inter-District Championship 2025. When the state's best players
          gather, NUSC players get the call — several first-teamers represented their home districts in 2025.</p>
      </div>
      <div className="rep-grid">
        <article className="repcard reveal">
          <span className="slot" aria-hidden="true">Player graphic slot</span>
          <div className="burst" aria-hidden="true"></div>
          <div className="rc-in">
            <div className="role">Captain · Mon District</div>
            <h3>Sanyem Konyak</h3>
            <p>Captained Mon District to the Dr T. Ao Trophy title.</p>
          </div>
        </article>
        <article className="repcard reveal d1">
          <span className="slot" aria-hidden="true">Player graphic slot</span>
          <div className="burst" aria-hidden="true"></div>
          <div className="rc-in">
            <div className="role">Best Defender · Tournament</div>
            <h3>Thejangulie Zatsu</h3>
            <p>Named Best Defender of the tournament.</p>
          </div>
        </article>
      </div>
      <div className="rep-strip reveal"><b>Multiple NUSC squad members</b> selected for district duty. <span>Club form
          turning into state-level recognition.</span></div>
    </div>
  
</section>
    </>
  );
}
