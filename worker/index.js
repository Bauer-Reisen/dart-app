// Cloudflare Worker „Liga-Vermittler": holt öffentliche Liga-Daten von nuLiga (BDV)
// für die Dart-App. Er speichert nichts und braucht keinen Schlüssel.

import {
  BASIS, REGIONEN, championship, eigeneSpiele, parseBericht, parseMannschaften, parseRangliste,
  parseSpielplan, parseStaffeln, saisonVon, staerken,
} from './nuliga.js';

const CACHE_S = 1800; // nuLiga-Seiten 30 Minuten zwischenspeichern (schont nuLiga)

async function seite(pfad) {
  const res = await fetch(BASIS + pfad, {
    headers: { 'User-Agent': 'Dart-Training-App (Liga-Vorbereitung)', 'Accept-Language': 'de' },
    cf: { cacheTtl: CACHE_S, cacheEverything: true },
  });
  if (!res.ok) throw new Error('nuLiga antwortet nicht (' + res.status + ')');
  return res.text();
}

const nurZiffern = (x) => (x && /^\d{1,10}$/.test(x) ? x : null);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' }
      : {};
    const antwort = (status, body, cache = 0) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache ? `max-age=${cache}` : 'no-store', ...cors },
      });

    if (!cors['Access-Control-Allow-Origin']) return antwort(403, { fehler: 'Herkunft nicht erlaubt' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET') return antwort(405, { fehler: 'Nur Lesen erlaubt' });

    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unbekannt';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return antwort(429, { fehler: 'Zu viele Anfragen, bitte kurz warten' });
    }

    const url = new URL(request.url);
    const q = (k) => url.searchParams.get(k);
    const saison = /^\d{4}\/\d{2}$/.test(q('saison') || '') ? q('saison') : saisonVon();
    const region = REGIONEN.some(([k]) => k === q('region')) ? q('region') : null;
    const ch = region ? championship(region, saison) : null;
    const staffel = nurZiffern(q('staffel'));
    const team = nurZiffern(q('team'));
    const person = nurZiffern(q('person'));
    const rangPfad = () => `groupPortrait?site=GroupPortraitPage&displayTyp=gesamt&type=rankingPointsSingle&championship=${ch}&group=${staffel}`;

    try {
      switch (url.pathname) {
        case '/regionen':
          return antwort(200, { saison, regionen: REGIONEN.map(([id, name]) => ({ id, name })) }, 86400);

        case '/staffeln': {
          if (!ch) return antwort(400, { fehler: 'Bezirk fehlt' });
          return antwort(200, { staffeln: parseStaffeln(await seite(`leaguePage?championship=${ch}`)) }, 3600);
        }

        case '/mannschaften': {
          if (!ch || !staffel) return antwort(400, { fehler: 'Liga fehlt' });
          return antwort(200, { mannschaften: parseMannschaften(await seite(`groupPage?championship=${ch}&group=${staffel}`)) }, 3600);
        }

        case '/spieler': {
          if (!ch || !staffel || !team) return antwort(400, { fehler: 'Mannschaft fehlt' });
          const rang = parseRangliste(await seite(rangPfad()));
          const spieler = rang.filter((r) => r.team === team).map((r) => ({ person: r.person, name: r.name }));
          spieler.sort((a, b) => a.name.localeCompare(b.name));
          return antwort(200, { spieler }, 600);
        }

        case '/daten': {
          if (!ch || !staffel || !team || !person) return antwort(400, { fehler: 'Angaben fehlen' });
          const [gruppe, plan, rangHtml] = await Promise.all([
            seite(`groupPage?championship=${ch}&group=${staffel}`),
            seite(`groupPage?displayTyp=gesamt&displayDetail=meetings&championship=${ch}&group=${staffel}`),
            seite(rangPfad()),
          ]);
          const name = parseMannschaften(gruppe).find((m) => m.id === team)?.name;
          if (!name) return antwort(404, { fehler: 'Mannschaft nicht gefunden' });
          const rang = parseRangliste(rangHtml);
          const ich = rang.find((r) => r.person === person);

          const spielplan = parseSpielplan(plan)
            .filter((b) => b.heim === name || b.gast === name)
            .map((b) => {
              const heim = b.heim === name;
              const e = b.ergebnis ? b.ergebnis.split(':') : null;
              return {
                datum: b.datum, zeit: b.zeit, heim, gegner: heim ? b.gast : b.heim, bericht: b.bericht,
                ergebnis: e ? (heim ? `${e[0]}:${e[1]}` : `${e[1]}:${e[0]}`) : null,
              };
            });

          // Eigene Abende: nur Berichte gespielter Begegnungen (höchstens 20)
          const gespielt = spielplan.filter((s) => s.bericht && s.ergebnis).slice(-20);
          const berichte = await Promise.all(
            gespielt.map((s) => seite(`groupMeetingReport?meeting=${s.bericht}&championship=${ch}&group=${staffel}`).catch(() => null)),
          );
          const abende = gespielt
            .map((s, i) => (berichte[i] ? { bericht: s.bericht, datum: s.datum, ...eigeneSpiele(parseBericht(berichte[i]), person) } : null))
            .filter((a) => a && (a.spiele.length || a.average !== null));

          const st = staerken(rang);
          delete st[name];
          return antwort(200, {
            saison, mannschaft: name,
            ich: ich ? { name: ich.name, average: ich.average, bilanz: ich.bilanz, abende: ich.abende } : null,
            spielplan, staerken: st, abende,
          }, 600);
        }

        default:
          return antwort(404, { fehler: 'Unbekannt' });
      }
    } catch (e) {
      return antwort(502, { fehler: String((e && e.message) || e) });
    }
  },
};
