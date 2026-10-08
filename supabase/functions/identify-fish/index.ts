// Fishing Map — "🔍 Identify fish": sends one catch photo to Google Gemini (free tier) and returns
// up to 3 species suggestions. The Gemini key lives only here, as the secret GEMINI_API_KEY.
// Only signed-in members of the invite list can use it.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Tried in order; if one isn't on the free tier (or is busy), the next is used.
const MODELS = (Deno.env.get("GEMINI_MODELS") || "gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash")
  .split(",").map((m) => m.trim()).filter(Boolean);

const NAMES = "Snook, Tarpon, Jack crevalle, Bar jack, Horse-eye jack, Blue runner, Mangrove snapper, Lane snapper, Yellowtail snapper, " +
  "Mutton snapper, Red snapper, Schoolmaster, Sheepshead, Spanish mackerel, King mackerel, Bluefish, Florida pompano, Permit, " +
  "Barracuda, Ladyfish, Mullet, Grunt, Porgy, Triggerfish, Redfish, Black drum, Spotted seatrout, Whiting, Gag grouper, " +
  "Black grouper, Red grouper, Goliath grouper, Hogfish, Cobia, Mahi, Wahoo, Sailfish, Bonefish, Gulf toadfish, Catfish, " +
  "Peacock bass, Largemouth bass, Mayan cichlid, Bluegill, Clown knifefish, Bullseye snakehead, Tilapia, Oscar, Florida gar";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: member, error: mErr } = await sb.rpc("is_member");
    if (mErr || !member) return reply({ error: "Only invited members can use fish ID." }, 403);

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return reply({ error: "Fish ID isn't set up yet (no Gemini key saved in Supabase)." }, 503);

    const { image, water } = await req.json();
    if (typeof image !== "string" || image.length < 1000) return reply({ error: "No photo received." }, 400);
    if (image.length > 2_000_000) return reply({ error: "Photo too large." }, 413);

    const where = water === "freshwater" ? "freshwater (canal or lake)" : water === "saltwater" ? "saltwater" : water === "brackish" ? "brackish / tidal canal" : "unknown water type";
    const prompt =
      `An angler caught this fish in Southeast Florida (Palm Beach to Miami), ${where}. ` +
      `Identify the fish. Give up to 3 most likely species, best first, using the names Florida anglers use. ` +
      `Prefer these names when one fits: ${NAMES}. Use another common name only if none fit. ` +
      `For each, give confidence (high, medium or low) and one short clue you used (a visible feature, under 12 words). ` +
      `If there is no fish clearly visible, set fish_visible to false and give no suggestions.`;

    const body = {
      contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            fish_visible: { type: "BOOLEAN" },
            suggestions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  confidence: { type: "STRING", enum: ["high", "medium", "low"] },
                  clue: { type: "STRING" },
                },
                required: ["name", "confidence"],
              },
            },
          },
          required: ["fish_visible", "suggestions"],
        },
      },
    };

    let lastErr = "";
    const tried = new Set<string>();
    const call = async (model: string) => {
      tried.add(model);
      return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      });
    };
    // Ask Google which "flash" models this key can use (names change over time), newest first
    const available = async (): Promise<string[]> => {
      try {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
        if (!r.ok) { console.error("list models", r.status, (await r.text()).slice(0, 300)); return []; }
        const j = await r.json();
        return (j.models || [])
          .filter((m: { name: string; supportedGenerationMethods?: string[] }) => (m.supportedGenerationMethods || []).includes("generateContent") &&
            /flash/.test(m.name) && !/(image|tts|live|audio|thinking|embedding)/.test(m.name))
          .map((m: { name: string }) => m.name.replace(/^models\//, ""))
          .sort((a: string, b: string) => b.localeCompare(a, undefined, { numeric: true }));
      } catch (e) { console.error("list models failed", e); return []; }
    };
    const queue = [...MODELS];
    let listed = false;
    while (queue.length || !listed) {
      if (!queue.length) { listed = true; queue.push(...(await available()).filter((m) => !tried.has(m)).slice(0, 4)); if (!queue.length) break; }
      const model = queue.shift()!;
      const res = await call(model);
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 400);
        console.error("gemini", model, res.status, detail);
        lastErr += (lastErr ? " | " : "") + `${model}: ${res.status} ${(detail.match(/"message":\s*"([^"]{0,160})/) || [])[1] || ""}`;
        if ([404, 429, 500, 503].includes(res.status)) continue; // not available / busy → try the next model
        if (res.status === 403 || (res.status === 400 && /API key|API_KEY/i.test(detail))) return reply({ error: "Gemini rejected the key — check GEMINI_API_KEY in Supabase.", detail: lastErr }, 502);
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
      let out;
      try { out = JSON.parse(text); } catch { lastErr += (lastErr ? " | " : "") + `${model}: unreadable answer`; continue; }
      const suggestions = (Array.isArray(out.suggestions) ? out.suggestions : []).slice(0, 3).map((s: Record<string, unknown>) => ({
        name: String(s.name || "").slice(0, 60),
        confidence: ["high", "medium", "low"].includes(String(s.confidence)) ? s.confidence : "low",
        clue: String(s.clue || "").slice(0, 120),
      })).filter((s: { name: string }) => s.name);
      return reply({ fish_visible: !!out.fish_visible, suggestions, model });
    }
    return reply({ error: "Fish ID couldn't get an answer from Gemini right now — try again later.", detail: lastErr }, 503);
  } catch (e) {
    return reply({ error: "Fish ID failed: " + ((e as Error).message || e) }, 500);
  }
});
