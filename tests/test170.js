// test170: 🧠 Help improve Fish ID checkbox (js/56, setup/97): off by default, ticking inserts own row, unticking deletes it, state reloads, errors revert
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

// fake page + fake Supabase (one table, own rows only)
const els = {}; const mk = id => els[id] = { id, checked: false, disabled: false, textContent: "", className: "", listeners: {}, addEventListener(t, f) { this.listeners[t] = f; } };
["fit-on", "fit-msg", "settings-btn"].forEach(mk);
let rows = [], fail = null, log = [];
const table = {
  select: () => ({ eq: (c, v) => ({ maybeSingle: async () => fail ? { data: null, error: { message: fail } } : { data: rows.find(r => r.user_id === v) || null, error: null } }) }),
  insert: async r => { log.push("insert"); if (fail) return { error: { message: fail } }; if (rows.some(x => x.user_id === r.user_id)) return { error: { message: "duplicate key" } }; rows.push(r); return { error: null }; },
  delete: () => ({ eq: async (c, v) => { log.push("delete"); if (fail) return { error: { message: fail } }; rows = rows.filter(r => r.user_id !== v); return { error: null }; } })
};
const mkS = () => new Function("$", "db", "me", read("js/56-fishid-training.js") + "; return { fitLoad, fitChange };")(id => els[id], { from: n => { if (n !== "fishid_training_optin") throw new Error("wrong table " + n); return table; } }, { id: "u1" });
const S = mkS();
const tick = async v => { els["fit-on"].checked = v; await els["fit-on"].listeners.change(); };

(async () => {
  await S.fitLoad();
  ok("off by default for a member with no row", els["fit-on"].checked === false && els["fit-on"].disabled === false);
  await tick(true);
  ok("ticking inserts the member's own row", rows.length === 1 && rows[0].user_id === "u1" && els["fit-on"].checked === true && /Thanks/.test(els["fit-msg"].textContent));
  await S.fitLoad();
  ok("reopening Settings shows it ticked", els["fit-on"].checked === true);
  await tick(false);
  ok("unticking deletes the row", rows.length === 0 && /Turned off/.test(els["fit-msg"].textContent));
  await S.fitLoad();
  ok("reopening shows it off again", els["fit-on"].checked === false);
  rows = [{ user_id: "u1" }]; await tick(true);
  ok("ticking when a row already exists is not an error", els["fit-on"].checked === true && els["fit-msg"].className === "msg");
  rows = []; fail = "relation does not exist"; await tick(true);
  ok("a failed save puts the box back and says so", els["fit-on"].checked === false && els["fit-msg"].className === "msg err" && /isn't switched on/.test(els["fit-msg"].textContent));
  await S.fitLoad();
  ok("a failed load leaves the box off and disabled", els["fit-on"].checked === false && els["fit-on"].disabled === true);
  fail = null;

  // wiring
  const html = read("index.html"), settings = html.slice(html.indexOf('data-sec="data"'), html.indexOf('id="del-area"'));
  ok("box sits in Settings → Your data, starts unticked", /id="fit-on" type="checkbox" disabled>/.test(settings) && !/id="fit-on"[^>]*checked/.test(settings));
  ok("box text promises: Friends and Public only, never Private, turn off, deleting removes photos", /Help improve Fish ID/.test(settings) && /Friends and Public catches/.test(settings) && /Never Private/.test(settings) && /Turn it off any time/.test(settings) && /takes its photos out/.test(settings));
  ok("js/56 loaded by the page and kept offline", /<script src="js\/56-fishid-training\.js\?v=\d+"><\/script>/.test(html) && read("sw.js").includes('"./js/56-fishid-training.js"'));
  ok("privacy.html has the training line, optional, never Private, removal", /Fish ID training \(optional, off unless you turn it on in Settings\)/.test(read("privacy.html")) && /Never Private catches/.test(read("privacy.html")));
  const sql = read("setup/97-fishid-training-optin.sql").replace(/--.*$/gm, "");
  ok("SQL: own-row policies, no anon grants, owner-only list, private catches left out", /user_id = auth\.uid\(\)/.test(sql) && /revoke all on public\.fishid_training_optin from anon, public/.test(sql) && /is_owner\(\)/.test(sql) && /in \('friends', 'public'\)/.test(sql) && !/'private'/.test(sql) && !/\b(truncate)\b/i.test(sql));
  ok("What's New entry added", /2026-10-22a/.test(read("js/13-groups-misc.js")));

  console.log(bad ? `test170 FAILED (${bad})` : "test170 OK");
  process.exit(bad ? 1 : 0);
})();
