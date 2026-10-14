// 🗑 Delete my account (setup/54): Settings → preview counts → CSV offer → "are you sure" → type DELETE → photo files, RPC, sign out.
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
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  const $ = id => d.getElementById(id), msg = () => $("del-msg").textContent;
  check("delete button in Settings", !!$("del-btn") && !!$("settings-card").contains($("del-btn")));
  if (ADMIN) {
    $("del-btn").click(); await wait(100);
    check("admin: refused, box stays closed, no RPC", /Admins can't delete/.test(msg()) && $("del-box").hidden && !RPCS.some(r => /^delete_my/.test(r[0])));
    console.log(good ? "OK" : "FAIL"); process.exit(good ? 0 : 1);
  }
  // not switched on yet (SQL not pasted)
  STATE.missing = true; $("del-btn").click(); await wait(100);
  check("SQL missing: plain message, can't continue", /isn't switched on yet/.test($("del-sum").textContent) && $("del-go1").disabled);
  STATE.missing = false; $("del-cancel").click();
  // open: counts + CSV offer
  $("del-btn").click(); await wait(100);
  console.log("summary:", $("del-sum").textContent);
  check("box open with counts", !$("del-box").hidden && /1 spot, 1 catch, 2 photos, 5 messages, 3 friends, and 1 group you made/.test($("del-sum").textContent));
  let saved = null; w.URL.createObjectURL = () => { saved = "blob"; return "blob:x"; }; w.URL.revokeObjectURL = () => {};
  $("del-exp-catches").click(); await wait(20);
  check("CSV export offered and works", saved === "blob" && /Saved 1 catches/.test(msg()));
  // first "are you sure": No → nothing
  let asked = null; w.confirm = t => { asked = t; return false; };
  $("del-go1").click(); await wait(50);
  check("asks are-you-sure #1 with counts", /Delete your account\?/.test(asked) && /can't be undone/.test(asked) && /2 photos/.test(asked));
  check("said no: step 2 stays hidden", $("del-step2").hidden);
  w.confirm = () => true; $("del-go1").click(); await wait(50);
  check("said yes: step 2 shows, final button off", !$("del-step2").hidden && $("del-final").disabled);
  const typ = v => { $("del-type").value = v; $("del-type").dispatchEvent(new w.Event("input")); };
  typ("delet"); check("wrong word: still off", $("del-final").disabled);
  typ("delete"); check("typed DELETE: final button on", !$("del-final").disabled);
  // network failure: nothing signed out, can retry
  STATE.fail = true; $("del-final").click(); await wait(150);
  check("failure: message, button back, still signed in", /Couldn't finish/.test(msg()) && !$("del-final").disabled && !STATE.signedOut);
  // success
  STATE.fail = false; REMOVED.length = 0; w.localStorage.setItem("fm-spot-sort", "near"); w.localStorage.setItem("other-key", "1");
  $("del-final").click(); await wait(200);
  const call = RPCS.filter(r => r[0] === "delete_my_account").pop();
  check("RPC called with DELETE", call && call[1].p_confirm === "DELETE");
  check("photo files removed", REMOVED.some(r => r[0] === "photos" && r[1].includes(ME + "/a.jpg") && r[1].includes(ME + "/b.jpg")));
  check("profile picture removed", REMOVED.some(r => r[0] === "avatars" && r[1].includes(ME + "/me.jpg")));
  check("group picture removed", REMOVED.some(r => r[0] === "group-avatars" && r[1].includes("g1/pic.jpg")));
  check("files removed before the database step", ORDER.lastIndexOf("remove:photos") < ORDER.lastIndexOf("delete_my_account"));
  check("app's saved settings cleared (others left)", w.localStorage.getItem("fm-spot-sort") === null && w.localStorage.getItem("other-key") === "1");
  check("signed out", STATE.signedOut);
  check("goodbye note shown", /has been deleted/.test(d.body.textContent));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
