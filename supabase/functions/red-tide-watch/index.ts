// red-tide-watch: once a day (cron red-tide-watch, 7 PM Eastern — FWC refreshes its red tide samples about 4:45 PM Eastern),
// read FWC-FWRI's "Karenia brevis cells per liter" samples from the last 8 days and send a phone alert to anyone who has a
// MEDIUM or HIGH sample within 15 miles of where they fish (live check-in position, else "where I fish" for morning alerts,
// else their home waters, else the middle of their saved spots).
//  - kind red_tide (respects quiet hours and the "🔴 Red tide" switch in Settings -> Phone alerts)
//  - POST with header x-hook-secret (from the cron job). Add {"dry_run": true} to see what would be sent plus a look at the FWC data.
//  - One alert per person per level every 3 days (dedupe key), so a long bloom reminds you now and then but doesn't nag.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rtLevel, rtDate, rtSummary, RT_LEVELS, RT_ALERT_LEVEL, RT_NEAR_MI, RT_MAX_AGE_DAYS } from "./core.mjs";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const FWC = "https://gis.myfwc.com/mapping/rest/services/Projects_FWC/HAB_forDEP_Dashboard/MapServer/0/query";

async function fwcSamples() {
  const out: any[] = [], raw: any[] = [];
  for (let page = 0; page < 6; page++) {
    const u = `${FWC}?where=1%3D1&outFields=HAB_ID,SampleDate_t,LOCATION,LATITUDE,LONGITUDE,Abundance&returnGeometry=false&resultOffset=${page * 2000}&resultRecordCount=2000&f=json`;
    const r = await fetch(u, { headers: { "User-Agent": "fishing-map (rich9267@gmail.com)" }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error("FWC answered " + r.status);
    const d = await r.json();
    if (d.error || !Array.isArray(d.features)) throw new Error("FWC sent something unexpected");
    for (const f of d.features) {
      const a = f.attributes || {};
      if (raw.length < 3) raw.push({ Abundance: a.Abundance, SampleDate_t: a.SampleDate_t, LOCATION: a.LOCATION });
      out.push({ lat: +a.LATITUDE, lng: +a.LONGITUDE, level: rtLevel(a.Abundance), ms: rtDate(a.SampleDate_t), place: String(a.LOCATION || "").trim(), rawDate: a.SampleDate_t });
    }
    if (!d.exceededTransferLimit) break;
  }
  return { samples: out, raw };
}

// where each person is / fishes (same idea as the weather alerts, with home waters added)
async function targets() {
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const ids = [...new Set((subs || []).map((s: any) => s.user_id))];
  if (!ids.length) return [];
  const [pr, hw, fp] = await Promise.all([
    db.from("notif_prefs").select("user_id,red_tide,cond_lat,cond_lng").in("user_id", ids),
    db.from("home_waters").select("user_id,lat,lng").in("user_id", ids),
    db.from("float_plans").select("user_id,last_lat,last_lng,last_at").in("status", ["active", "alerted"]).in("user_id", ids),
  ]);
  const spotRows: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await db.from("spots").select("created_by,lat,lng").in("created_by", ids).is("deleted_at", null).not("lat", "is", null).not("lng", "is", null).range(from, from + 999);
    spotRows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const by = (rows: any[] | null, k = "user_id") => { const m = new Map<string, any>(); (rows || []).forEach((r) => { if (!m.has(r[k]) || (r.last_at && r.last_at > (m.get(r[k]).last_at || ""))) m.set(r[k], r); }); return m; };
  const P = by(pr.data), H = by(hw.data), F = by(fp.data);
  const C = new Map<string, { lat: number; lng: number; n: number }>();
  spotRows.forEach((s) => { const c = C.get(s.created_by) || { lat: 0, lng: 0, n: 0 }; c.lat += +s.lat; c.lng += +s.lng; c.n++; C.set(s.created_by, c); });
  const out: { user_id: string; lat: number; lng: number; from: string }[] = [];
  for (const id of ids as string[]) {
    const p = P.get(id);
    if (p && p.red_tide === false) continue;
    const f = F.get(id), h = H.get(id), c = C.get(id);
    if (f && f.last_lat != null) out.push({ user_id: id, lat: +f.last_lat, lng: +f.last_lng, from: "check-in" });
    else if (p && p.cond_lat != null) out.push({ user_id: id, lat: +p.cond_lat, lng: +p.cond_lng, from: "where I fish" });
    else if (h) out.push({ user_id: id, lat: +h.lat, lng: +h.lng, from: "home waters" });
    else if (c && c.n) out.push({ user_id: id, lat: c.lat / c.n, lng: c.lng / c.n, from: "spots" });
  }
  return out;
}

const whenText = (ms: number | null, now: number) => {
  if (ms == null) return "recently";
  const d = Math.round((now - ms) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago";
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const { data: cfg } = await db.from("push_config").select("hook_secret").eq("id", 1).maybeSingle();
  if (!cfg || req.headers.get("x-hook-secret") !== cfg.hook_secret) return json({ error: "no" }, 401);
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty body is fine */ }

  let fwc;
  try { fwc = await fwcSamples(); } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 502); }
  const now = Date.now();
  const stats = {
    samples: fwc.samples.length,
    byLevel: RT_LEVELS.map((n, i) => ({ level: n, n: fwc.samples.filter((s) => s.level === i).length })),
    unknownLevel: fwc.samples.filter((s) => s.level < 0).length,
    unreadableDates: fwc.samples.filter((s) => s.ms == null).length,
    sampleRecords: fwc.raw,
  };
  const people = await targets();
  const sent: any[] = [];
  for (const t of people) {
    const s = rtSummary(fwc.samples, t.lat, t.lng, now);
    if (!s || s.level < RT_ALERT_LEVEL) continue;
    const name = RT_LEVELS[s.level], mi = Math.max(1, Math.round(s.mi));
    const title = (s.level >= 4 ? "🔴 High" : "🟠 Medium") + " red tide near you";
    const msg = `${name} red tide counts were reported about ${mi} mi from where you fish (${whenText(s.ms, now)}). It can irritate eyes and throats and push fish away. Check FWC's map first.`.slice(0, 160);
    const row = { user_id: t.user_id, from: t.from, level: name, mi, n: s.n };
    if (!body.dry_run) {
      await db.rpc("enqueue_notification", {
        p_user: t.user_id, p_kind: "red_tide", p_title: title, p_body: msg, p_url: "?go=redtide",
        p_dedupe: `rt:${t.user_id}:${s.level}:${Math.floor(now / (3 * 86400000))}`,
      });
    }
    sent.push(row);
  }
  return json({ ok: true, settings: { nearMi: RT_NEAR_MI, maxAgeDays: RT_MAX_AGE_DAYS, alertFrom: RT_LEVELS[RT_ALERT_LEVEL] }, people: people.length, alerts: sent.length, stats: body.dry_run ? stats : undefined, sent: body.dry_run ? sent : undefined });
});
