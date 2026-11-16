import { useRef, useState } from 'react';
import { gruppenLegs, nachBereich, type Bereich } from './gruppe';
import { points, zielLabel, type Ziel } from './board';
import { RUNDEN, rundenName } from './halveit';
import { TrainerHinweis } from './TippFenster';
import { allgemeineTipps, zielTipps } from './coach';
import { aussage, klasse, nachbarn, type Klasse } from './klassen';
import { dartfolge, MIN_N, quoteText } from './dartfolge';
import { treffpunkt, treffpunktText } from './treffpunkt';
import { TrefferBild } from './TrefferBild';
import { alsDateiSichern, ausDateiLaden, ICH, type Aufnahme } from './speicher';
import { ligaAlle, ligaAlleSetzen, type LigaDaten } from './liga';
import { SpielerLeiste } from './SpielerWahl';
import { auswerten, average } from './x01';
import { doppelWerte } from './doppel';

interface Props {
  aufnahmen: Aufnahme[];
  onErsetzen: (a: Aufnahme[]) => void;
  /** Aktiver Spieler: wird zuerst gezeigt. */
  ich?: string;
  onSpieler?: () => void;
}

type Zaehler = Record<Klasse, number> & { wuerfe: number; ziel: Ziel };

const wer = (a: Aufnahme) => a.spieler ?? ICH;

function x01Werte(liste: Aufnahme[]) {
  let punkte = 0, darts = 0, hoch = 0, c100 = 0, c140 = 0, c180 = 0, dVers = 0, dTreff = 0;
  const legs = new Map<string, { darts: number; gewonnen: boolean }>();
  for (const a of liste) {
    const dOut = a.doubleOut ?? true;
    const rest = a.restVorher ?? 0;
    const e = auswerten(rest, a.darts.map((d) => d.hit), dOut);
    punkte += e.punkte;
    darts += a.darts.length;
    hoch = Math.max(hoch, e.punkte);
    if (e.punkte === 180) c180++;
    else if (e.punkte >= 140) c140++;
    else if (e.punkte >= 100) c100++;
    // Darts aufs Doppel: Angabe nach der Aufnahme, sonst geschätzt aus dem Rest
    const dw = doppelWerte(a);
    dVers += dw.vers; dTreff += dw.treff;
    const l = legs.get(a.legId ?? '') ?? { darts: 0, gewonnen: false };
    l.darts += a.darts.length;
    if (a.check) l.gewonnen = true;
    legs.set(a.legId ?? '', l);
  }
  const gewonnen = [...legs.values()].filter((l) => l.gewonnen);
  return {
    av: average(punkte, darts),
    hoch, c100, c140, c180, dVers, dTreff,
    legs: legs.size,
    siege: gewonnen.length,
    dartsProSieg: gewonnen.length ? gewonnen.reduce((s, l) => s + l.darts, 0) / gewonnen.length : null,
  };
}

/** Halve-It: nur fertige Spiele (9 Runden) zählen fürs Ergebnis. */
function halveWerte(liste: Aufnahme[]) {
  const spiele = new Map<string, Aufnahme[]>();
  for (const a of liste) {
    const l = spiele.get(a.legId ?? '') ?? [];
    l.push(a);
    spiele.set(a.legId ?? '', l);
  }
  const ergebnisse: number[] = [];
  const halbJeSpiel: number[] = [];
  const halbJeRunde = RUNDEN.map(() => 0);
  let siege = 0;
  for (const l of spiele.values()) {
    if (l.length < RUNDEN.length) continue;
    let p = 0, h = 0;
    l.slice(0, RUNDEN.length).forEach((a, i) => {
      const w = a.wert ?? 0;
      if (w > 0) p += w;
      else { p = Math.floor(p / 2); h++; halbJeRunde[a.runde ?? i]++; }
    });
    ergebnisse.push(p);
    halbJeSpiel.push(h);
    if (l.some((a) => a.check)) siege++;
  }
  const max = Math.max(0, ...halbJeRunde);
  const schwach = max > 0 ? rundenName(RUNDEN[halbJeRunde.indexOf(max)]) : null;
  const n = ergebnisse.length;
  return {
    spiele: n,
    siege,
    beste: Math.max(0, ...ergebnisse),
    schnitt: n ? ergebnisse.reduce((s, x) => s + x, 0) / n : null,
    halbSchnitt: n ? halbJeSpiel.reduce((s, x) => s + x, 0) / n : null,
    schwach,
  };
}

const proz = (t: number, d: number) => (d ? `${Math.round((t / d) * 100)} %` : '–');

function nachLeg(liste: Aufnahme[]) {
  const m = new Map<string, Aufnahme[]>();
  for (const a of liste) {
    const l = m.get(a.legId ?? '') ?? [];
    l.push(a);
    m.set(a.legId ?? '', l);
  }
  return [...m.values()];
}

/** Doppeltraining, Around the Clock, Bob's 27. */
function uebungsWerte(meine: Aufnahme[]) {
  const darts = (l: Aufnahme[]) => l.reduce((s, a) => s + a.darts.length, 0);
  const wert = (l: Aufnahme[]) => l.reduce((s, a) => s + (a.wert ?? 0), 0);

  // Doppeltraining
  const doppel: { name: string; text: string }[] = [];
  const dp = meine.filter((a) => a.modus === 'doppel');
  const fin = dp.filter((a) => a.option === 'finish');
  if (fin.length) {
    const ok = fin.filter((a) => a.check);
    doppel.push({ name: 'Finish 2–40 ausgemacht', text: `${ok.length} von ${fin.length} (${proz(ok.length, fin.length)})` });
    if (ok.length) doppel.push({ name: 'Ø Darts pro Finish', text: (darts(ok) / ok.length).toFixed(1) });
  }
  for (const o of [...new Set(dp.map((a) => a.option ?? ''))].filter((o) => o && o !== 'finish').sort()) {
    const l = dp.filter((a) => a.option === o);
    doppel.push({ name: `${o} getroffen`, text: `${wert(l)} von ${darts(l)} (${proz(wert(l), darts(l))})` });
  }

  // Around the Clock
  const atc: { name: string; text: string }[] = [];
  const NAMEN: Record<string, string> = { jedes: 'Jedes Feld', doppel: 'Nur Doppel', triple: 'Nur Triple' };
  for (const v of ['jedes', 'doppel', 'triple']) {
    const l = meine.filter((a) => a.modus === 'atc' && (a.option ?? 'jedes') === v);
    if (!l.length) continue;
    const durch = nachLeg(l).filter((g) => g.some((a) => a.check)).map(darts);
    atc.push({
      name: NAMEN[v],
      text: durch.length
        ? `Bestwert ${Math.min(...durch)} Darts · Ø ${Math.round(durch.reduce((s, x) => s + x, 0) / durch.length)} · Quote ${proz(wert(l), darts(l))}`
        : `noch nicht durch · Quote ${proz(wert(l), darts(l))}`,
    });
  }

  // Bob's 27
  const bl = meine.filter((a) => a.modus === 'bobs');
  let bobs = null;
  if (bl.length) {
    let spiele = 0;
    const ergebnisse: number[] = [];
    for (const g of nachLeg(bl)) {
      let p = 27;
      let fertig = false;
      for (const a of g) {
        const nr = (a.runde ?? 0) === 20 ? 25 : (a.runde ?? 0) + 1;
        const w = nr === 25 ? 50 : nr * 2;
        p += a.wert ? a.wert * w : -w;
        if (p <= 0) { fertig = true; break; }
      }
      if (p > 0 && g.length >= 21) { ergebnisse.push(p); fertig = true; }
      if (fertig) spiele++;
    }
    bobs = {
      spiele,
      durch: ergebnisse.length,
      beste: ergebnisse.length ? Math.max(...ergebnisse) : null,
      schnitt: ergebnisse.length ? ergebnisse.reduce((s, x) => s + x, 0) / ergebnisse.length : null,
      quote: `${wert(bl)} von ${darts(bl)} (${proz(wert(bl), darts(bl))})`,
    };
  }
  return { doppel, atc, bobs };
}

export function Statistik({ aufnahmen: alle, onErsetzen, ich = ICH, onSpieler }: Props) {
  const aufnahmen = alle.filter((a) => !a.bot); // Würfe des Computer-Gegners zählen nicht
  const datei = useRef<HTMLInputElement>(null);
  const spieler = ich;
  const alleMeine = aufnahmen.filter((a) => wer(a) === spieler);
  // Allein / in der Gruppe: Auswahl nur zeigen, wenn es beides gibt
  const legs = gruppenLegs(aufnahmen);
  const [bereich, setBereich] = useState<Bereich>('alle');
  const nGruppe = nachBereich(alleMeine, 'gruppe', legs).length;
  const beides = nGruppe > 0 && nGruppe < alleMeine.length;
  const meine = beides ? nachBereich(alleMeine, bereich, legs) : alleMeine;

  const proZiel = new Map<string, Zaehler>();
  for (const a of meine) {
    for (const d of a.darts) {
      if (d.frei) continue; // Halve-It: Ziel war nicht bekannt
      const key = zielLabel(d.ziel);
      let z = proZiel.get(key);
      if (!z) {
        z = { ziel: d.ziel, wuerfe: 0, treffer: 0, innen: 0, aussen: 0, nachbarUhr: 0, nachbarGegen: 0, weit: 0, abpraller: 0 };
        proZiel.set(key, z);
      }
      z.wuerfe++;
      z[klasse(d.ziel, d.hit)]++;
    }
  }
  const zeilen = [...proZiel.values()].sort((a, b) => b.wuerfe - a.wuerfe);
  const meineDarts = meine.flatMap((a) => a.darts);

  const x01 = meine.filter((a) => a.modus === 'x01');
  const xw = x01.length ? x01Werte(x01) : null;

  const cr = meine.filter((a) => a.modus === 'cricket');
  const crSpiele = new Set(cr.map((a) => a.legId)).size;
  const crSiege = cr.filter((a) => a.check).length;
  const crDarts = cr.reduce((s, a) => s + a.darts.length, 0);
  const crNutz = cr.reduce((s, a) => s + (a.wert ?? 0), 0);
  const crMpr = crDarts ? (crNutz / crDarts) * 3 : null;
  const crBeste = Math.max(0, ...cr.map((a) => a.wert ?? 0));

  const hi = meine.filter((a) => a.modus === 'halveit');
  const hw = hi.length ? halveWerte(hi) : null;
  const uw = uebungsWerte(meine);

  // Eingabezeit: vom 1. bis zum 3. Tipp im Training; über 30 s zählt nicht
  const zeiten = meine
    .filter((a) => (a.modus ?? 'training') === 'training' && a.darts.length === 3)
    .map((a) => (a.ende - a.start) / 1000)
    .filter((s) => s < 30);
  const schnitt = zeiten.length ? zeiten.reduce((s, x) => s + x, 0) / zeiten.length : null;

  async function laden(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const { aufnahmen: a, liga } = await ausDateiLaden(f);
      if (confirm(`${a.length} Aufnahmen laden? Die jetzigen Daten werden ersetzt.`)) {
        onErsetzen(a);
        // alte Sicherungen: ein Liga-Stand (gehört dem aktiven Spieler); neue: je Spieler
        if (liga && typeof liga === 'object') {
          ligaAlleSetzen(Array.isArray((liga as LigaDaten).spieltage) ? { [ich]: liga as LigaDaten } : (liga as Record<string, LigaDaten>));
        }
      }
    } catch {
      alert('Diese Datei kann ich nicht lesen.');
    }
  }

  return (
    <div className="seite stats">
      <h1>Statistik</h1>

      {onSpieler && <SpielerLeiste aktiv={ich} onOeffnen={onSpieler} />}

      {beides && (
        <div className="ringwahl bereich-wahl">
          {([['alle', 'Alle'], ['allein', 'Allein'], ['gruppe', 'In der Gruppe']] as const).map(([k, t]) => (
            <button key={k} className={'btn' + (bereich === k ? ' an' : '')} onClick={() => setBereich(k)}>{t}</button>
          ))}
        </div>
      )}
      {beides && bereich !== 'alle' && (
        <p className="info klein">{bereich === 'allein' ? 'Training und Spiele allein oder gegen den Computer.' : 'Spiele mit mindestens einem anderen Spieler.'}</p>
      )}

      <p className="info">
        {meine.length} Aufnahmen
        {schnitt !== null && <> · Ø Eingabezeit {schnitt.toFixed(1)} s pro Aufnahme</>}
      </p>

      {xw && (
        <div className="karte">
          <div className="karte-kopf"><strong>501 / 301</strong><span>{xw.siege} von {xw.legs} Legs gewonnen</span></div>
          <table>
            <tbody>
              <tr><td>Average (3 Darts)</td><td>{xw.av?.toFixed(1) ?? '–'}</td></tr>
              <tr><td>Ø Darts pro gewonnenem Leg</td><td>{xw.dartsProSieg?.toFixed(1) ?? '–'}</td></tr>
              <tr>
                <td>Doppelquote</td>
                <td>{xw.dVers ? `${Math.round((xw.dTreff / xw.dVers) * 100)} % (${xw.dTreff}/${xw.dVers})` : '–'}</td>
              </tr>
              <tr><td>Höchste Aufnahme</td><td>{xw.hoch}</td></tr>
              <tr><td>100+ · 140+ · 180</td><td>{xw.c100} · {xw.c140} · {xw.c180}</td></tr>
            </tbody>
          </table>
          {xw.dVers > 0 && xw.dVers < 20 && <p className="info klein">Doppelquote: erst ab etwa 20 Darts aufs Doppel aussagekräftig.</p>}
        </div>
      )}

      {cr.length > 0 && (
        <div className="karte">
          <div className="karte-kopf"><strong>Cricket</strong><span>{crSiege} von {crSpiele} Spielen gewonnen</span></div>
          <table>
            <tbody>
              <tr><td>Striche pro Runde</td><td>{crMpr?.toFixed(2) ?? '–'}</td></tr>
              <tr><td>Beste Runde</td><td>{crBeste} Striche</td></tr>
              <tr><td>Darts gesamt</td><td>{crDarts}</td></tr>
            </tbody>
          </table>
          <p className="info klein">Striche pro Runde = Striche, die etwas gebracht haben (Schließen oder Punkten), je 3 Darts.</p>
        </div>
      )}

      {hw && (
        <div className="karte">
          <div className="karte-kopf">
            <strong>Halve-It</strong>
            <span>{hw.spiele} {hw.spiele === 1 ? 'Spiel' : 'Spiele'} fertig{hw.siege ? ` · ${hw.siege} gewonnen` : ''}</span>
          </div>
          <table>
            <tbody>
              <tr><td>Bestes Ergebnis</td><td>{hw.spiele ? hw.beste : '–'}</td></tr>
              <tr><td>Ø Ergebnis</td><td>{hw.schnitt !== null ? Math.round(hw.schnitt) : '–'}</td></tr>
              <tr><td>Halbiert (Ø pro Spiel)</td><td>{hw.halbSchnitt !== null ? hw.halbSchnitt.toFixed(1) : '–'}</td></tr>
              {hw.schwach && <tr><td>Am häufigsten halbiert</td><td>{hw.schwach}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {uw.doppel.length > 0 && (
        <div className="karte">
          <div className="karte-kopf"><strong>Doppeltraining</strong></div>
          <table>
            <tbody>
              {uw.doppel.map((z) => (
                <tr key={z.name}><td>{z.name}</td><td>{z.text}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uw.atc.length > 0 && (
        <div className="karte">
          <div className="karte-kopf"><strong>Around the Clock</strong></div>
          <table>
            <tbody>
              {uw.atc.map((z) => (
                <tr key={z.name}><td>{z.name}</td><td>{z.text}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="info klein">Bestwert = wenigste Darts für einmal ganz herum.</p>
        </div>
      )}

      {uw.bobs && (
        <div className="karte">
          <div className="karte-kopf"><strong>Bob's 27</strong><span>{uw.bobs.spiele ? `${uw.bobs.durch} von ${uw.bobs.spiele} durchgekommen` : 'noch kein Spiel fertig'}</span></div>
          <table>
            <tbody>
              <tr><td>Bestes Ergebnis</td><td>{uw.bobs.beste ?? '–'}</td></tr>
              <tr><td>Ø Ergebnis (durchgekommen)</td><td>{uw.bobs.schnitt !== null ? Math.round(uw.bobs.schnitt) : '–'}</td></tr>
              <tr><td>Doppelquote</td><td>{uw.bobs.quote}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {zeilen.length === 0 &&<p className="info">Noch keine Würfe. Starte ein Training oder ein Spiel.</p>}
      {allgemeineTipps(meine).length > 0 && (
        <div className="karte">
          <div className="karte-kopf"><strong>Was dem Trainer auffällt</strong></div>
          {allgemeineTipps(meine).map((t) => <TrainerHinweis key={t.id} t={t} />)}
        </div>
      )}
      {zeilen.length > 0 && <h3>Trefferbild je Ziel</h3>}
      {zeilen.length > 0 && <p className="info klein">Hier zählen nur Würfe, bei denen die App weiß, wohin du zielst: Training, Übungen, feste Halve-It-Runden und bei 501 der Dart aufs Doppel zum Ausmachen. Cricket und Punkte-Darts bei 501 zählen nicht – da weiß man nie, worauf jemand gerade geht.</p>}

      {zeilen.map((z) => {
        const n = z.ziel.seg === 25 ? null : nachbarn(z.ziel.seg);
        const quote = Math.round((z.treffer / z.wuerfe) * 100);
        return (
          <div className="karte" key={zielLabel(z.ziel)}>
            <div className="karte-kopf">
              <strong>Ziel {zielLabel(z.ziel)}</strong>
              <span>{z.treffer} / {z.wuerfe} getroffen · {quote} %</span>
            </div>
            {n && (
              <table>
                <tbody>
                  <tr><td>zu weit innen</td><td>{z.innen}</td><td>zu weit außen</td><td>{z.aussen}</td></tr>
                  <tr><td>in die {n.gegen}</td><td>{z.nachbarGegen}</td><td>in die {n.uhr}</td><td>{z.nachbarUhr}</td></tr>
                  <tr><td>weiter weg</td><td>{z.weit}</td><td>Abpraller</td><td>{z.abpraller}</td></tr>
                </tbody>
              </table>
            )}
            {n && (
              <ul className="aussagen">
                <li><b>Innen/außen:</b> {aussage(z.innen, z.aussen, 'innen', 'außen')}</li>
                <li><b>Seitlich:</b> {aussage(z.nachbarGegen, z.nachbarUhr, `zur ${n.gegen}`, `zur ${n.uhr}`)}</li>
              </ul>
            )}
            <DartfolgeZeilen f={dartfolge(meine, z.ziel)} />
            <TreffpunktZeile darts={meineDarts} ziel={z.ziel} />
            {zielTipps(meineDarts, z.ziel).map((t) => <TrainerHinweis key={t.id} t={t} />)}
          </div>
        );
      })}

      <div className="stats-knoepfe">
        <button className="btn" onClick={() => alsDateiSichern(alle, ligaAlle())} disabled={!alle.length}>Als Datei sichern</button>
        <button className="btn" onClick={() => datei.current?.click()}>Datei laden</button>
        <button
          className="btn warn"
          disabled={!alle.length}
          onClick={() => { if (confirm('Wirklich alle Würfe aller Spieler löschen? Das lässt sich nicht rückgängig machen.')) onErsetzen([]); }}
        >
          Alles löschen
        </button>
        <input ref={datei} type="file" accept="application/json,.json" hidden onChange={laden} />
      </div>
      <p className="info klein">Daten liegen nur auf diesem Gerät.</p>
    </div>
  );
}

/** Trefferquote je Dart (1./2./3.) und ob ein Treffer beim nächsten Dart hilft. */
function DartfolgeZeilen({ f }: { f: ReturnType<typeof dartfolge> }) {
  if (f.position[0].n + f.position[1].n + f.position[2].n < MIN_N) return null;
  const nt = f.nachTreffer; const nf = f.nachFehlwurf;
  let satz: string | null = null;
  if (nt.n >= MIN_N && nf.n >= MIN_N) {
    const d = Math.round((nt.treffer / nt.n - nf.treffer / nf.n) * 100);
    satz = d >= 10 ? `Nach einem Treffer triffst du deutlich öfter (+${d} Prozentpunkte) – du kommst gut in den Rhythmus.`
      : d <= -10 ? `Nach einem Treffer triffst du seltener (${d} Prozentpunkte) – bleib nach einem Treffer im gleichen Ablauf, nicht nachkorrigieren.`
      : 'Ob der Dart davor sitzt oder nicht, macht bei dir kaum einen Unterschied.';
  }
  return (
    <div className="dartfolge">
      <table>
        <tbody>
          <tr><td>1. Dart</td><td>{quoteText(f.position[0])}</td><td>nach Treffer</td><td>{quoteText(nt)}</td></tr>
          <tr><td>2. Dart</td><td>{quoteText(f.position[1])}</td><td>nach Fehlwurf</td><td>{quoteText(nf)}</td></tr>
          <tr><td>3. Dart</td><td>{quoteText(f.position[2])}</td><td></td><td></td></tr>
        </tbody>
      </table>
      {satz && <p className="info klein">{satz}</p>}
    </div>
  );
}


/** Wo genau landen die Darts? Nur mit getippter Stelle (ab Version 0.6) und bei Triple, Doppel, Bull. */
function TreffpunktZeile({ darts, ziel }: { darts: Parameters<typeof treffpunkt>[0]; ziel: Ziel }) {
  const t = treffpunkt(darts, ziel);
  if (!t) return null;
  return (
    <div className="trefferbild-box">
      <TrefferBild darts={darts} ziel={ziel} t={t} />
      <div>
        <p className="info klein">{treffpunktText(t)}</p>
        <p className="legende"><span className="g">●</span> Treffer · <span className="r">●</span> daneben · ✚ mittlerer Treffpunkt · ◌ halbe Darts</p>
        <p className="legende">Ungefähr – so genau, wie du tippst.</p>
      </div>
    </div>
  );
}
