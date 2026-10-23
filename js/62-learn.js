// ---- 📚 Learn (plans/learn-page-plan.md, step 1): a page opened from the Home card. A state picker (all states + DC; starts on the state you are in)
// and six tiles. Only 📜 Rules works so far: it shows the chosen state's fishing rules from the data we already hold (fish_rules rows read by js/10:
// Florida's `fishRules`, other states' `stateRules`), the state agency's links (js/54), the closed areas on our map (js/33) and when each rule was checked.
// The other tiles say "Coming soon". Nothing new is written or stored: no database change. Every rule still says "guide only — confirm with <agency>".
const LN = { st: null, tile: "rules", loadedRules: false };
const LN_TILES = [["rules", "📜", "Rules"], ["fish", "🐟", "Fish"], ["rigs", "🪝", "Rigs"], ["bait", "🎣", "Bait & lures"], ["knots", "🪢", "Knots"], ["info", "📍", "State info"]];
const LN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The state you are in now (the "area now", js/29); Florida when it can't tell
function lnHere() {
  const st = typeof stateOf === "function" ? stateOf(LAT, LNG) : null;
  return st && STATE_NAMES[st] ? st : "FL";
}
// "03-01" → "Mar 1"; "2026-03-01" → "Mar 1, 2026"
function lnMd(s) {
  const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(String(s || "")); if (!m) return String(s || "");
  return LN_MONTHS[+m[2] - 1] + " " + (+m[3]) + (m[1] ? ", " + m[1] : "");
}
const lnRanges = list => list.map(([a, b]) => lnMd(a) + " – " + lnMd(b)).join(", ");
function lnSeason(r) {
  const out = [];
  if (Array.isArray(r.closed) && r.closed.length) out.push("Closed " + lnRanges(r.closed));
  if (Array.isArray(r.open_only) && r.open_only.length) out.push("Open only " + lnRanges(r.open_only));
  return out.join(" · ");
}
const lnDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || "")); return m ? LN_MONTHS[+m[2] - 1] + " " + (+m[3]) + ", " + m[1] : ""; };

// The rows for one state, sorted by fish name
function lnRows(st) {
  const rows = st === "FL" ? (typeof fishRules !== "undefined" ? fishRules : []) : (typeof stateRules !== "undefined" ? stateRules.filter(r => r.regions.includes(st)) : []);
  return rows.slice().sort((a, b) => String(a.species).localeCompare(String(b.species)));
}
// Closed areas of our national list that sit in this state (js/33 keeps them on the phone)
function lnZones(st) { return typeof zn !== "undefined" ? zn.rows.filter(r => (r.state || "FL") === st).length : 0; }

function lnRulesPanel(st) {
  const box = el("div", "learn-rules"), nm = STATE_NAMES[st] || st, ag = stateAgency(st), short = ag ? ag.short : "your state's fish & wildlife agency";
  box.appendChild(el("h2", "learn-h", nm + " fishing rules"));
  box.appendChild(el("div", "spot-meta", "A guide only — confirm with " + short + " before keeping a fish."));
  if (ag) {
    const links = el("div", "gate-links");
    [[short + " rules ↗", ag.rules], ["Fishing licence ↗", ag.license]].forEach(([t, u]) => { const a = el("a", "btn small", t); a.href = u; a.target = "_blank"; a.rel = "noopener"; a.style.textDecoration = "none"; links.appendChild(a); });
    box.appendChild(links);
  }
  const rows = lnRows(st);
  if (!rows.length) {
    const g = typeof stateRulesGate === "function" ? stateRulesGate({ state: st }) : { text: "We don't have " + nm + " rules yet." };
    box.appendChild(el("div", "spot-meta", lnNoRulesAtAll() && lnWaiting() ? "Loading the rules…" : g.text));
  } else {
    const dates = rows.map(r => r.verified_on).filter(Boolean).sort();
    if (dates.length) box.appendChild(el("div", "spot-meta", "Checked " + (dates[0] === dates[dates.length - 1] ? lnDate(dates[0]) : lnDate(dates[0]) + " – " + lnDate(dates[dates.length - 1])) + " · " + rows.length + " fish."));
    const list = el("div", "learn-list");
    rows.forEach(r => {
      const item = el("div", "learn-rule");
      item.appendChild(el("div", "learn-fish", r.species));
      item.appendChild(el("div", null, st === "FL" ? ruleLine(r) : ruleSummary(r)));
      const season = lnSeason(r); if (season) item.appendChild(el("div", "spot-meta", "📅 " + season));
      const when = r.verified_on ? "Checked " + lnDate(r.verified_on) + (ruleStale(r) ? " — older than 90 days, double-check" : "") : "No check date — double-check";
      const meta = el("div", "spot-meta", when + " · ");
      if (r.source_url && /^https?:\/\//.test(r.source_url)) { const a = el("a", null, "source ↗"); a.href = r.source_url; a.target = "_blank"; a.rel = "noopener"; meta.appendChild(a); } else meta.textContent = when;
      item.appendChild(meta);
      list.appendChild(item);
    });
    box.appendChild(list);
    if (st === "FL") box.appendChild(el("div", "spot-meta", "Florida's rules differ by coast and area — the 📅 Seasons page shows the ones for where you are."));
  }
  const n = lnZones(st);
  box.appendChild(el("h3", "learn-h2", "🚫 Closed areas"));
  box.appendChild(el("div", "spot-meta", (n ? n + " no-fishing or closed area" + (n === 1 ? "" : "s") + " in " + nm + (n === 1 ? " is" : " are") + " on our map (red), and a saved spot inside one shows a warning. " : "We have no closed areas listed for " + nm + ". ")
    + "Parks, refuges, preserves, seasonal and local closures may not be on the list — confirm with " + short + "."));
  return box;
}
// no rules of any state on the phone yet (not signed in yet, or still loading)
const lnNoRulesAtAll = () => (typeof fishRules === "undefined" || !fishRules.length) && (typeof stateRules === "undefined" || !stateRules.length);
// are the rules still being asked for? (js/10 loadRules runs once signed in)
function lnWaiting() {
  if (LN.loadedRules) return false;
  LN.loadedRules = true;
  if (typeof loadRules === "function") loadRules().then(() => { if ($("view-learn") && !$("view-learn").hidden) renderLearn(); });
  return true;
}

function renderLearn() {
  const body = $("learn-body"); if (!body) return;
  if (!LN.st) LN.st = lnHere();
  const st = LN.st;
  body.textContent = "";
  // state picker + 📍 Here
  const bar = el("div", "learn-bar");
  const sel = el("select", "learn-select"); sel.id = "learn-state"; sel.setAttribute("aria-label", "State");
  Object.keys(STATE_NAMES).sort((a, b) => STATE_NAMES[a].localeCompare(STATE_NAMES[b])).forEach(k => { const o = el("option", null, STATE_NAMES[k]); o.value = k; if (k === st) o.selected = true; sel.appendChild(o); });
  sel.addEventListener("change", () => { LN.st = sel.value; renderLearn(); });
  const here = el("button", "btn ghost small", "📍 Here"); here.type = "button"; here.title = "Back to the state you are in";
  here.addEventListener("click", () => { LN.st = lnHere(); renderLearn(); });
  bar.appendChild(sel); bar.appendChild(here); body.appendChild(bar);
  // tiles
  const grid = el("div", "learn-grid");
  LN_TILES.forEach(([k, ico, label]) => {
    const b = el("button", "learn-tile" + (k === LN.tile ? " on" : "") + (k === "rules" ? "" : " soon"), ico + " " + label); b.type = "button"; b.dataset.tile = k;
    if (k !== "rules") b.appendChild(el("span", "learn-soon", "Coming soon"));
    b.addEventListener("click", () => { LN.tile = k; renderLearn(); });
    grid.appendChild(b);
  });
  body.appendChild(grid);
  if (LN.tile === "rules") {
    body.appendChild(lnRulesPanel(st));
    if (typeof zonesEnsure === "function") { const p = zonesEnsure(); if (p && p.then) p.then(() => { if (!$("view-learn").hidden && LN.st === st && LN.tile === "rules") renderLearn(); }); }
  } else {
    const t = LN_TILES.find(x => x[0] === LN.tile);
    body.appendChild(el("div", "spot-meta", t[1] + " " + t[2] + " is coming soon. Rules are ready now."));
  }
}
function openLearn() { LN.st = lnHere(); LN.tile = "rules"; showView("learn"); window.scrollTo({ top: 0 }); }

(function learnSetup() {
  const c = $("learn-card"), back = $("learn-back");
  if (c) c.addEventListener("click", openLearn);
  if (back) back.addEventListener("click", () => showView("list"));
})();
