// morning-bites: once a day, per person, around their chosen morning time, look at today's tide, light, pressure and wind
// for their saved spots (plus friends'/public spots nearby) and send ONE alert if a spot looks good.
//  - POST with header x-hook-secret (from the cron job): handles everyone who is due now.
//    Add {"dry_run": true, "user_id": "..."} to see the plan without sending.
//  - POST {"preview": true} with a signed-in user's Authorization header: returns today's plan for that person only (nothing is sent).
//    Add "evening": true for tomorrow's plan at their favourite spots (what the evening alert would say).
//  - The same cron run also sends the ⏰ bite-window heads-up (setup/114): hourly per person, followed spots only, max 1 a day.
//  - The same cron run also sends the evening "🌅 Tomorrow looks good" alert to people whose evening time has come (setup/111).
import { createClient } from "npm:@supabase/supabase-js@2";
import { planDay, composeAlert, composeEvening, composeHeadsUp, moonPhaseName, hm } from "./score.mjs";
import { tideEventsLocal, noaaDateRange } from "./tides.mjs";

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

async function tidesFor(lat: number, lng: number, dateStr: string, tz: string) { // [{m, type}] minutes on the angler's clock, covering yesterday..tomorrow
  try {
    const d = await getJson(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/tidepredstations.json?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&radius=25`);
    const list = (d.stationList || d.stations || []).map((x: any) => ({ id: String(x.stationId || x.id), lat: +x.lat, lng: +(x.lon ?? x.lng) }))
      .filter((x: any) => x.id && isFinite(x.lat) && isFinite(x.lng) && !/^TEC/.test(x.id))
      .sort((a: any, b: any) => miles(lat, lng, a.lat, a.lng) - miles(lat, lng, b.lat, b.lng));
    for (const st of list.slice(0, 3)) {
      try {
        // Asked in UTC (time_zone=gmt) like the app, so a station in another time zone (Panhandle = Central) can't shift the times;
        // tideEventsLocal turns each moment into the angler's own clock.
        const { begin, end } = noaaDateRange(dateStr);
        const p = await getJson(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=fishingmap&begin_date=${begin}&end_date=${end}&datum=MLLW&station=${st.id}&time_zone=gmt&interval=hilo&units=english&format=json`);
        const out = tideEventsLocal(p.predictions, dateStr, tz);
        if (out.length >= 3) return out;
      } catch (_) { /* try the next station */ }
    }
  } catch (_) { /* no tide data: plan without it */ }
  return null;
}

// ahead = 0: today (morning alert, all spots in range) · ahead = 1: tomorrow (evening alert, favourite spots only:
// the ⭐ ones you follow, or your own spots when you follow none)
async function planFor(userId: string, ahead = 0, followedOnly = false) {
  const { data: inp, error } = await db.rpc("morning_inputs", { p_user: userId });
  if (error) throw error;
  let spotsAll: any[] = inp.spots || [];
  if (followedOnly) { spotsAll = spotsAll.filter(s => s.followed); if (!spotsAll.length) return { skip: "no followed spots" }; }
  const mine = spotsAll.filter(s => s.mine || s.followed);
  if (ahead) {
    spotsAll = spotsAll.some(s => s.followed) ? spotsAll.filter(s => s.followed) : spotsAll.filter(s => s.mine);
    if (!spotsAll.length) return { skip: "no favourite spots yet — tap ⭐ on a spot to follow it" };
  }
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
  const wx = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=pressure_msl,wind_speed_10m&daily=sunrise,sunset&wind_speed_unit=mph&timezone=${encodeURIComponent(tz)}&past_hours=4&forecast_days=${1 + ahead}`);
  const times: string[] = wx.hourly.time;
  const today = wx.daily.time[ahead] as string;   // the day being planned (tomorrow for the evening alert)
  const wind = Array(24).fill(null), pressure: Record<number, number> = {};
  times.forEach((t, i) => {
    const d = t.slice(0, 10), h = +t.slice(11, 13);
    const idx = d === today ? h : (d < today ? h - 24 : h + 24);
    if (idx >= -3 && idx < 24) pressure[idx] = wx.hourly.pressure_msl[i];
    if (d === today) wind[h] = wx.hourly.wind_speed_10m[i];
  });
  const tides = await tidesFor(lat, lng, today, tz);
  const day = { sunrise: mins(wx.daily.sunrise[ahead]), sunset: mins(wx.daily.sunset[ahead]), wind, pressure, tides, moon: moonPhaseName(new Date(today + "T12:00:00Z")) };
  const results = planDay(spots, inp.hist || [], day);
  return { today, tz, lat, lng, radius, spots: spots.length, hadTides: !!tides, day, results, alert: ahead ? composeEvening(results, day) : composeAlert(results) };
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
      const p = await planFor(u.user.id, body.evening ? 1 : 0);
      const text = p.skip ? "Can't plan yet: " + p.skip + "."
        : body.evening ? (p.alert ? p.alert.title + " — " + p.alert.body : "Nothing stands out tomorrow at your favourite spots, so tonight's alert would stay quiet.") : describe(p);
      return json({ ok: true, text, plan: p.skip ? null : { alert: p.alert, hadTides: p.hadTides, spots: p.spots } });
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
    // 🌅 Evening "tomorrow looks good" (setup/111): same cron run, people whose evening time has come
    const { data: eve } = await db.rpc("evening_due");
    let eSent = 0, eQuiet = 0;
    for (const d of eve || []) {
      try {
        const p = await planFor(d.user_id, 1);
        if (!p.skip && p.alert) {
          await db.rpc("enqueue_notification", { p_user: d.user_id, p_kind: "evening", p_title: p.alert.title, p_body: p.alert.body,
            p_url: "?go=spot&id=" + p.alert.spotId, p_dedupe: `eve:${d.user_id}:${d.local_date}` });
          eSent++;
        } else eQuiet++;
        await db.rpc("evening_mark", { p_user: d.user_id, p_date: d.local_date });
      } catch (e) { failed++; console.log("evening alert failed for", d.user_id, String((e as Error).message || e)); }
    }
    // ⏰ Bite-window heads-up (setup/114): checked about once an hour per person, only followed spots, one per day
    const { data: hu } = await db.rpc("headsup_due");
    let hSent = 0;
    for (const d of hu || []) {
      try {
        const p: any = await planFor(d.user_id, 0, true);
        const al = p.skip ? null : composeHeadsUp(p.results, p.day, d.now_min);
        if (al) {
          await db.rpc("enqueue_notification", { p_user: d.user_id, p_kind: "headsup", p_title: al.title, p_body: al.body,
            p_url: "?go=spot&id=" + al.spotId, p_dedupe: `hu:${d.user_id}:${d.local_date}` });
          hSent++;
        }
        await db.rpc("headsup_mark", { p_user: d.user_id, p_date: d.local_date, p_sent: !!al });
      } catch (e) { failed++; console.log("heads-up failed for", d.user_id, String((e as Error).message || e)); }
    }
    return json({ ok: true, headsup_due: (hu || []).length, headsup_sent: hSent, due: (due || []).length, sent, nothing_to_say: quiet, evening_due: (eve || []).length, evening_sent: eSent, evening_quiet: eQuiet, failed });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
