// morning-bites: once a day, per person, around their chosen morning time, look at today's tide, light, pressure and wind
// for their saved spots (plus friends'/public spots nearby) and send ONE alert if a spot looks good.
//  - POST with header x-hook-secret (from the cron job): handles everyone who is due now.
//    Add {"dry_run": true, "user_id": "..."} to see the plan without sending.
//  - POST {"preview": true} with a signed-in user's Authorization header: returns today's plan for that person only (nothing is sent).
import { createClient } from "npm:@supabase/supabase-js@2";
import { planDay, composeAlert, hm } from "./score.mjs";

const url = Deno.env.get("SUPABASE_URL")!;
const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const miles = (a: number, b: number, c: number, d: number) => {
  const R = 3958.8, r = Math.PI / 180, dl = (c - a) * r, dg = (d - b) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const getJson = async (u: string) => { const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(u.split("?")[0] + " " + r.status); return r.json(); };
const mins = (iso: string) => { const t = iso.split("T")[1] || "00:00"; return +t.slice(0, 2) * 60 + +t.slice(3, 5); };

async function tidesFor(lat: number, lng: number, dateStr: string) { // [{m, type}] local minutes, covering yesterday..tomorrow
  try {
    const d = await getJson(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/tidepredstations.json?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&radius=25`);
    const list = (d.stationList || d.stations || []).map((x: any) => ({ id: String(x.stationId || x.id), lat: +x.lat, lng: +(x.lon ?? x.lng) }))
      .filter((x: any) => x.id && isFinite(x.lat) && isFinite(x.lng) && !/^TEC/.test(x.id))
      .sort((a: any, b: any) => miles(lat, lng, a.lat, a.lng) - miles(lat, lng, b.lat, b.lng));
    for (const st of list.slice(0, 3)) {
      try {
        const base = new Date(dateStr + "T00:00:00Z"), f = (n: number) => { const x = new Date(base.getTime() + n * 86400000); return x.toISOString().slice(0, 10).replace(/-/g, ""); };
        const p = await getJson(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=fishingmap&begin_date=${f(-1)}&end_date=${f(1)}&datum=MLLW&station=${st.id}&time_zone=lst_ldt&interval=hilo&units=english&format=json`);
        const out = (p.predictions || []).map((x: any) => {
          const [dd, tt] = x.t.split(" "); const days = Math.round((Date.parse(dd + "T00:00:00Z") - base.getTime()) / 86400000);
          return { m: days * 1440 + mins("T" + tt), type: x.type };
        }).sort((a: any, b: any) => a.m - b.m);
        if (out.length >= 3) return out;
      } catch (_) { /* try the next station */ }
    }
  } catch (_) { /* no tide data: plan without it */ }
  return null;
}

async function planFor(userId: string) {
  const { data: inp, error } = await db.rpc("morning_inputs", { p_user: userId });
  if (error) throw error;
  const spotsAll: any[] = inp.spots || [];
  const mine = spotsAll.filter(s => s.mine || s.followed);
  let lat = inp.lat, lng = inp.lng;
  if (lat == null || lng == null) { // no saved location: use the middle of their own spots
    if (!mine.length) return { skip: "no location and no saved spots" };
    lat = mine.reduce((n, s) => n + s.lat, 0) / mine.length; lng = mine.reduce((n, s) => n + s.lng, 0) / mine.length;
  }
  const radius = inp.radius || 25;
  // spots you follow ⭐ count even a bit beyond your radius (but the weather is the area's, so not too far)
  const spots = spotsAll.filter(s => miles(lat, lng, s.lat, s.lng) <= (s.followed ? Math.max(radius, 50) : radius));
  if (!spots.length) return { skip: "no spots within " + radius + " miles" };
  const tz = inp.tz || "America/New_York";
  const wx = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=pressure_msl,wind_speed_10m&daily=sunrise,sunset&wind_speed_unit=mph&timezone=${encodeURIComponent(tz)}&past_hours=4&forecast_days=1`);
  const times: string[] = wx.hourly.time;
  const today = wx.daily.time[0] as string;
  const wind = Array(24).fill(null), pressure: Record<number, number> = {};
  times.forEach((t, i) => {
    const d = t.slice(0, 10), h = +t.slice(11, 13);
    const idx = d === today ? h : (d < today ? h - 24 : h + 24);
    if (idx >= -3 && idx < 24) pressure[idx] = wx.hourly.pressure_msl[i];
    if (d === today) wind[h] = wx.hourly.wind_speed_10m[i];
  });
  const tides = await tidesFor(lat, lng, today);
  const day = { sunrise: mins(wx.daily.sunrise[0]), sunset: mins(wx.daily.sunset[0]), wind, pressure, tides };
  const results = planDay(spots, inp.hist || [], day);
  return { today, tz, lat, lng, radius, spots: spots.length, hadTides: !!tides, results, alert: composeAlert(results) };
}

const describe = (p: any) => !p.alert ? "Nothing stands out today — no spot has enough going for it (light wind, moving tide, dawn/dusk, falling pressure, your own history)."
  : p.alert.body + "  [" + p.results.slice(0, 5).map((r: any) => `${r.spot.name} ${r.score}pts ${hm(r.from * 60)}–${hm(r.to * 60)}`).join("; ") + "]";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.preview) { // a signed-in person asking "what would today's alert say?"
      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: u } = await db.auth.getUser(token);
      if (!u?.user) return json({ error: "sign in first" }, 401);
      const p = await planFor(u.user.id);
      return json({ ok: true, text: p.skip ? "Can't plan yet: " + p.skip + "." : describe(p), plan: p.skip ? null : { alert: p.alert, hadTides: p.hadTides, spots: p.spots } });
    }
    const { data: cfg } = await db.from("push_config").select("hook_secret").eq("id", 1).maybeSingle();
    if (!cfg || req.headers.get("x-hook-secret") !== cfg.hook_secret) return json({ error: "no" }, 401);
    if (body.dry_run && body.user_id) { const p = await planFor(body.user_id); return json({ ok: true, plan: p, text: p.skip ? p.skip : describe(p) }); }
    const { data: due } = await db.rpc("morning_due");
    let sent = 0, quiet = 0, failed = 0;
    for (const d of due || []) {
      try {
        const p = await planFor(d.user_id);
        if (!p.skip && p.alert) {
          await db.rpc("enqueue_notification", { p_user: d.user_id, p_kind: "conditions", p_title: p.alert.title, p_body: p.alert.body,
            p_url: "?go=spot&id=" + p.alert.spotId, p_dedupe: `cb:${d.user_id}:${d.local_date}` });
          sent++;
        } else quiet++;
        await db.rpc("morning_mark", { p_user: d.user_id, p_date: d.local_date });
      } catch (e) { failed++; console.log("morning-bites failed for", d.user_id, String((e as Error).message || e)); }
    }
    return json({ ok: true, due: (due || []).length, sent, nothing_to_say: quiet, failed });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
