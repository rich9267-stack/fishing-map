// weather-watch: every ~10 minutes, look up National Weather Service alerts at each person's spot
// (their live check-in position if they are out, else their alert location, else the middle of their saved spots)
// and send a phone alert for anything that matters on the water.
//  - Warnings (tornado, severe thunderstorm, special marine, flash flood, hurricane, gale...) -> kind weather_urgent (ignores quiet hours)
//  - Watches and advisories (small craft, rip current, high surf, tropical storm watch...)   -> kind weather (respects quiet hours)
//  - POST with header x-hook-secret (from the cron job). Add {"dry_run": true} to see what would be sent.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

// event name -> urgent? (anything not listed is ignored)
const URGENT = /^(Tornado Warning|Severe Thunderstorm Warning|Special Marine Warning|Flash Flood Warning|Hurricane Warning|Tropical Storm Warning|Storm Surge Warning|Extreme Wind Warning|Gale Warning|Storm Warning|Hurricane Force Wind Warning|Tsunami Warning|Waterspout Warning)$/;
const NORMAL = /^(Tornado Watch|Severe Thunderstorm Watch|Flash Flood Watch|Hurricane Watch|Tropical Storm Watch|Storm Surge Watch|Gale Watch|Small Craft Advisory|Small Craft Advisory for Hazardous Seas|Small Craft Advisory for Rough Bar|Small Craft Advisory for Winds|Rip Current Statement|High Surf Advisory|High Surf Warning|Coastal Flood Warning|Coastal Flood Advisory|Marine Weather Statement|Dense Fog Advisory|Dense Fog Warning|Special Weather Statement|Heat Advisory|Excessive Heat Warning)$/;
// Marine Weather Statement / Special Weather Statement can be routine chatter: only pass them if they mention something sharp
const SHARP = /waterspout|strong thunderstorm|gusty winds|lightning|50 knots|40 knots|34 knots/i;

const cache = new Map<string, any[]>();
async function alertsAt(lat: number, lng: number) {
  const key = lat.toFixed(2) + "," + lng.toFixed(2); // one lookup per ~1 km block
  if (cache.has(key)) return cache.get(key)!;
  let out: any[] = [];
  try {
    const r = await fetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`, {
      headers: { "User-Agent": "fishing-map (rich9267@gmail.com)", Accept: "application/geo+json" }, signal: AbortSignal.timeout(15000),
    });
    if (r.ok) out = ((await r.json()).features || []).map((f: any) => f.properties);
  } catch (_) { /* NWS busy: try again next run */ }
  cache.set(key, out);
  return out;
}

const clean = (s: string) => (s || "").replace(/\s+/g, " ").trim();
const until = (iso?: string, tz = "America/New_York") => {
  if (!iso) return "";
  try { return " until " + new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }); } catch (_) { return ""; }
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const { data: cfg } = await db.from("push_config").select("hook_secret").eq("id", 1).maybeSingle();
  if (!cfg || req.headers.get("x-hook-secret") !== cfg.hook_secret) return json({ error: "no" }, 401);
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty body is fine */ }

  const { data: targets, error } = await db.rpc("weather_targets");
  if (error) return json({ error: error.message }, 500);
  const sent: any[] = [];
  for (const t of (targets || []) as any[]) {
    const list = await alertsAt(+t.lat, +t.lng);
    for (const a of list) {
      const ev = String(a.event || "");
      const urgent = URGENT.test(ev);
      if (!urgent && !NORMAL.test(ev)) continue;
      if (!urgent && /Statement$/.test(ev) && ev !== "Rip Current Statement" && !SHARP.test(clean(a.headline) + " " + clean(a.description))) continue;
      if (a.status && a.status !== "Actual") continue;
      if (a.messageType === "Cancel") continue;
      const title = (urgent ? "⛈️ " : "🌊 ") + ev;
      const msg = (ev + until(a.ends || a.expires) + " for " + clean(a.areaDesc).split(";")[0] + ". " + (urgent ? "Get to safe shelter / shore now." : "Plan your day around it.")).slice(0, 160);
      const row = { user_id: t.user_id, event: ev, urgent, title, msg, id: a.id };
      if (!body.dry_run) {
        await db.rpc("enqueue_notification", {
          p_user: t.user_id, p_kind: urgent ? "weather_urgent" : "weather", p_title: title, p_body: msg,
          p_url: "?go=weather", p_dedupe: "wx:" + a.id + ":" + t.user_id,
        });
      }
      sent.push(row);
    }
  }
  return json({ ok: true, people: (targets || []).length, alerts: sent.length, sent: body.dry_run ? sent : undefined });
});
