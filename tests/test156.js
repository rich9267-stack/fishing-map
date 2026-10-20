// Play: tank first (plans/ui-review.md item 4A): coin pills in the title line, one chip row with ⓘ and sound, explanation behind ⓘ, taller tank. Head copied from test102.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
const ADMIN = process.env.DEL_ADMIN === "1";
const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0 }];
const CATCHES = [{ id: "c1", spot_id: "s1", species: "Snook", how_many: 1, caught_at: new Date(Date.now() - 3600000).toISOString(), created_by: ME, length_in: 25 }];
const ORDER = [], RPCS = [], REMOVED = [], STATE = { missing: false, fail: false, signedOut: false };
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, neq: () => o, order: () => o, range: () => p, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new" }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "sam@x.com", display_name: "Sam", is_admin: ADMIN, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => { STATE.signedOut = true; } },
    rpc: async (fn, a) => {
      RPCS.push([fn, a]); ORDER.push(fn);
      if (fn === "ensure_profile") return { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null };
      if (/^delete_my_account/.test(fn) && STATE.missing) return { data: null, error: { message: "Could not find the function public." + fn + " in the schema cache" } };
      if (fn === "delete_my_account_preview") return { data: { spots: 1, catches: 1, photos: 2, messages: 5, friends: 3, groups: 1, admin: ADMIN }, error: null };
      if (fn === "delete_my_account") return STATE.fail ? { data: null, error: { message: "network" } } : { data: { ok: true, spots_handed_over: 0 }, error: null };
      return { data: null, error: null };
    },
    storage: { from: b => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }),
      list: async folder => ({ data: b === "avatars" && folder === ME ? [{ name: "me.jpg" }] : b === "group-avatars" && folder === "g1" ? [{ name: "pic.jpg" }] : [], error: null }),
      remove: async paths => { REMOVED.push([b, paths]); ORDER.push("remove:" + b); return { data: paths, error: null }; } }) },
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: () => chain(null), upsert: () => Promise.resolve({ error: null }), update: () => chain(null) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1000);
  let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
  const $ = id => d.getElementById(id), ev = c => w.eval(c);
  d.querySelector('#bnav [data-nav="play"]').click(); await wait(150);
  ev(`wallet = { coins: 120, gems: 3, today: 3, cap: 50, added: null, recent: [{ currency: "coins", amount: 40, reason: "new species", detail: "Snook" }] }; walletDraw()`);
  const head = d.querySelector("#play-top .play-head");
  ok(!!head && head.contains($("wallet-box")) && head.querySelector("h1").textContent === "Play", "coins sit in the Play title line");
  const pills = [...$("wallet-box").querySelectorAll(".coin-chip")];
  ok(pills.length === 2 && /120/.test(pills[0].textContent) && /3/.test(pills[1].textContent), "two pills: 120 coins, 3 gems");
  ok(!/Today:/.test($("wallet-box").textContent) && !/How do I earn/.test($("wallet-box").textContent), "no long text in the title line");
  // the bar
  const bar = $("tank-card");
  ok(bar.classList.contains("play-bar") && [...bar.querySelectorAll("#tank-sw .fchip")].map(b => b.textContent).join(",") === "Tanks,Lagoon,Pond,Shop", "one chip row: Tanks, Lagoon, Pond, Shop");
  ok(bar.contains($("tank-help-btn")) && bar.contains($("tank-snd-row")) && !!$("tank-snd-row").querySelector(".snd-btn.snd-icon"), "ⓘ and the sound button at the end of the row");
  const snd = $("tank-snd-row").querySelector(".snd-btn");
  ok(snd.textContent === "🔇" && snd.getAttribute("aria-label") === "Tank sound" && snd.getAttribute("aria-pressed") === "false", "sound button is a small 🔇 with a spoken name");
  // ⓘ panel
  const help = $("tank-help"), hb = $("tank-help-btn");
  ok(help.hidden && hb.getAttribute("aria-expanded") === "false", "explanation starts hidden");
  ok(/heaviest catch of each species/.test(help.textContent) && /Today: 3 of 50 catch coins/.test(help.textContent) && /How do I earn/.test(help.textContent), "ⓘ panel holds the explanation, today's coins and how to earn");
  hb.click(); ok(!help.hidden && hb.getAttribute("aria-expanded") === "true", "ⓘ opens it");
  hb.click(); ok(help.hidden, "ⓘ again closes it");
  // the tank comes right after the bar
  const after = bar.nextElementSibling;
  ok(after === help && help.nextElementSibling === $("tank-body"), "tank body follows the bar (the ⓘ panel is hidden in between)");
  const tank = d.querySelector("#tank-body .tank");
  ok(!!tank && parseInt(tank.style.height) >= 440, "tank is at least 440 px tall (was 230+): " + (tank && tank.style.height));
  // chips switch views and show which is on
  const chip = m => d.querySelector(`#tank-sw [data-mode="${m}"]`);
  chip("lagoon").click(); await wait(50);
  ok(chip("lagoon").classList.contains("on") && chip("lagoon").getAttribute("aria-pressed") === "true" && !chip("tanks").classList.contains("on") && !$("lagoon-body").hidden && $("tank-body").hidden, "Lagoon chip switches the view");
  chip("tanks").click(); await wait(50);
  ok(chip("tanks").classList.contains("on") && !$("tank-body").hidden, "back to Tanks");
  // pills stay for the other Play tabs
  d.querySelector('#play-sw [data-sub="fish"]').click(); await wait(50);
  ok(!$("view-tank").hidden && $("play-tank").hidden && $("wallet-box").querySelectorAll(".coin-chip").length === 2, "coins still show on My fish");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
