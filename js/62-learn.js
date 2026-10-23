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
// ---- 🐟 Fish (step 2): a searchable list and a long card per fish, from data/learn/fish.json (kept with the app, saved on the phone by sw.js).
// The card's size / bag / season come ONLY from the rules rows of the chosen state (same rows as the Rules tile); everything else is marked as a general tip.
LN.fish = null; LN.fishErr = false; LN.fishQ = ""; LN.fishOpen = null;
function lnFishLoad() {
  if (LN.fish || LN.fishLoading) return;
  LN.fishLoading = true;
  fetch("data/learn/fish.json").then(r => { if (!r.ok) throw new Error("http"); return r.json(); })
    .then(j => { if (!j || !Array.isArray(j.fish)) throw new Error("bad"); LN.fish = j.fish; LN.fishT = j.t || ""; LN.fishHandling = j.handling || null; })
    .catch(() => { LN.fishErr = true; })
    .then(() => { LN.fishLoading = false; const v = $("view-learn"); if (v && !v.hidden && LN.tile === "fish") renderLearn(); });
}
const lnWords = f => [f.name].concat(f.match || []).map(w => String(w).toLowerCase());
// the state's rule rows that are about this fish (a card word equals a rule word, or is a whole word in the rule's fish name)
function lnFishRules(f, st) {
  const words = lnWords(f);
  return lnRows(st).filter(r => (r.match || []).some(w => words.includes(String(w).toLowerCase())) || words.some(w => new RegExp("\\b" + w.replace(/[^a-z0-9 ]/g, "") + "\\b").test(String(r.species).toLowerCase())));
}
function lnFishPick(box) {
  const q = LN.fishQ.trim().toLowerCase();
  const hits = (LN.fish || []).filter(f => !q || lnWords(f).some(w => w.includes(q)));
  box.textContent = "";
  if (!hits.length) { box.appendChild(el("div", "spot-meta", "No fish matches “" + LN.fishQ.trim() + "”.")); return; }
  [["salt", "🌊 Saltwater"], ["fresh", "🏞 Freshwater"]].forEach(([k, label]) => {
    const g = hits.filter(f => f.kind === k); if (!g.length) return;
    box.appendChild(el("h3", "learn-h2", label));
    g.forEach(f => {
      const b = el("button", "learn-fishrow", f.name); b.type = "button";
      b.addEventListener("click", () => { LN.fishOpen = f.name; renderLearn(); window.scrollTo({ top: 0 }); });
      box.appendChild(b);
    });
  });
}
function lnFishRuleBlock(f, st) {
  const nm = STATE_NAMES[st] || st, ag = stateAgency(st), short = ag ? ag.short : "your state's fish & wildlife agency";
  const b = el("div", "learn-fishrules");
  b.appendChild(el("h3", "learn-h2", "📏 " + nm + " rules (from our rules list)"));
  const rows = lnFishRules(f, st);
  if (!rows.length) b.appendChild(el("div", "spot-meta", "We don't have a " + nm + " rule for this fish on file. Confirm with " + short + " before keeping one."));
  rows.forEach(r => {
    const item = el("div", "learn-rule");
    if (rows.length > 1 || (r.regions && r.regions.length && st === "FL")) item.appendChild(el("div", "learn-fish", r.species + (st === "FL" && r.regions && r.regions.length ? " — " + regionsText(r.regions) : "")));
    item.appendChild(el("div", null, st === "FL" ? ruleLine(r) : ruleSummary(r)));
    const season = lnSeason(r); if (season) item.appendChild(el("div", "spot-meta", "📅 " + season));
    item.appendChild(el("div", "spot-meta", r.verified_on ? "Checked " + lnDate(r.verified_on) + (ruleStale(r) ? " — older than 90 days, double-check" : "") : "No check date — double-check"));
    b.appendChild(item);
  });
  b.appendChild(el("div", "spot-meta", "A guide only — confirm with " + short + " before keeping a fish."));
  return b;
}
// "Source: <name> ↗ · checked <date>" under a card (https links only)
function lnSourceLine(box, lead, src, t) {
  if (!src || !/^https?:\/\//.test(src.url || "")) return;
  const d = el("div", "spot-meta", lead + " "); const a = el("a", null, src.label + " ↗"); a.href = src.url; a.target = "_blank"; a.rel = "noopener"; d.appendChild(a);
  if (t) d.appendChild(el("span", null, " · checked " + lnDate(t)));
  box.appendChild(d);
}
function lnFishCard(f, st) {
  const box = el("div", "learn-fishcard");
  const back = el("button", "btn ghost small", "‹ All fish"); back.type = "button";
  back.addEventListener("click", () => { LN.fishOpen = null; renderLearn(); });
  box.appendChild(back);
  const hero = el("div", "learn-fishhero");
  if (typeof fishSvg === "function") { try { hero.appendChild(fishSvg(f.name, 96)); } catch (e) { /* no picture: the name is enough */ } }
  hero.appendChild(el("h2", "learn-h", f.name));
  box.appendChild(hero);
  box.appendChild(lnFishRuleBlock(f, st));
  box.appendChild(el("div", "spot-meta", "ℹ️ The rest of this card is general information from the official source linked at the bottom. It is not a rule."));
  const sec = (h, text) => { if (!text) return; box.appendChild(el("h3", "learn-h2", h)); box.appendChild(el("div", null, text)); };
  const list = (h, a) => { if (!a || !a.length) return; box.appendChild(el("h3", "learn-h2", h)); const u = el("ul", "learn-ul"); a.forEach(x => u.appendChild(el("li", null, x))); box.appendChild(u); };
  sec("👀 What it looks like", f.appearance); sec("📏 Size", f.size); sec("📍 Where it lives", f.range); sec("🌊 Habitat", f.habitat);
  list("🔎 Habits", f.habits); sec("🕑 Best time & tide", f.when);
  list("🪱 Best baits & lures", f.baits); lnRigList(box, f.rigs); list("💡 Tips", f.tips);
  sec("🔀 Look-alikes", f.lookalikes);
  if (f.kind === "salt" && LN.fishHandling) { list("💧 Release & handling", LN.fishHandling.points); const hs = LN.fishHandling.source; if (hs) lnSourceLine(box, "Handling advice from", hs, LN.fishT); }
  if (f.source) lnSourceLine(box, "Source:", f.source, LN.fishT);
  return box;
}
function lnFishPanel(st) {
  const box = el("div", "learn-fishpanel");
  if (LN.fishErr) { box.appendChild(el("div", "spot-meta", "The fish cards could not load. Check your connection and try again.")); return box; }
  if (!LN.fish) { lnFishLoad(); box.appendChild(el("div", "spot-meta", "Loading the fish cards…")); return box; }
  const open = LN.fishOpen && LN.fish.find(f => f.name === LN.fishOpen);
  if (open) { box.appendChild(lnFishCard(open, st)); return box; }
  box.appendChild(el("h2", "learn-h", "Fish"));
  const inp = el("input", "learn-search"); inp.type = "search"; inp.placeholder = "Search fish by name"; inp.value = LN.fishQ; inp.setAttribute("aria-label", "Search fish");
  const list = el("div", "learn-fishlist");
  inp.addEventListener("input", () => { LN.fishQ = inp.value; lnFishPick(list); });
  box.appendChild(inp); box.appendChild(list); lnFishPick(list);
  return box;
}

// ---- 🪢 Knots (step 3): a searchable list and a step-by-step card per knot, from data/learn/knots.json. Plain text for now;
// each card has a spot for a picture + credit line (`picture`, `credit`) that stays hidden until a licensed diagram is added.
LN.knots = null; LN.knotsErr = false; LN.knotsQ = ""; LN.knotOpen = null;
function lnKnotsLoad() {
  if (LN.knots || LN.knotsLoading) return;
  LN.knotsLoading = true;
  fetch("data/learn/knots.json").then(r => { if (!r.ok) throw new Error("http"); return r.json(); })
    .then(j => { if (!j || !Array.isArray(j.knots)) throw new Error("bad"); LN.knots = j.knots; })
    .catch(() => { LN.knotsErr = true; })
    .then(() => { LN.knotsLoading = false; const v = $("view-learn"); if (v && !v.hidden && LN.tile === "knots") renderLearn(); });
}
function lnKnotPick(box) {
  const q = LN.knotsQ.trim().toLowerCase();
  const hits = (LN.knots || []).filter(k => !q || [k.name].concat(k.aka || []).some(w => String(w).toLowerCase().includes(q)));
  box.textContent = "";
  if (!hits.length) { box.appendChild(el("div", "spot-meta", "No knot matches “" + LN.knotsQ.trim() + "”.")); return; }
  hits.forEach(k => {
    const b = el("button", "learn-fishrow", "🪢 " + k.name); b.type = "button";
    b.addEventListener("click", () => { LN.knotOpen = k.name; renderLearn(); window.scrollTo({ top: 0 }); });
    box.appendChild(b);
  });
}
function lnKnotCard(k) {
  const box = el("div", "learn-fishcard");
  const back = el("button", "btn ghost small", "‹ All knots"); back.type = "button";
  back.addEventListener("click", () => { LN.knotOpen = null; renderLearn(); });
  box.appendChild(back);
  box.appendChild(el("h2", "learn-h", "🪢 " + k.name));
  if (k.picture && /^(https?:\/\/|data\/)/.test(k.picture)) {
    const fig = el("div", "learn-fig"), img = el("img"); img.src = k.picture; img.alt = k.name + " knot diagram"; img.loading = "lazy"; fig.appendChild(img);
    if (k.credit) fig.appendChild(el("div", "spot-meta", "Picture: " + k.credit));
    box.appendChild(fig);
  }
  box.appendChild(el("div", null, k.what));
  box.appendChild(el("h3", "learn-h2", "🎣 When to use it")); box.appendChild(el("div", null, k.use));
  box.appendChild(el("h3", "learn-h2", "Steps"));
  const ol = el("ol", "learn-ul"); (k.steps || []).forEach(s => ol.appendChild(el("li", null, s))); box.appendChild(ol);
  if (k.tip) { box.appendChild(el("h3", "learn-h2", "💡 Tip")); box.appendChild(el("div", null, k.tip)); }
  box.appendChild(el("div", "spot-meta", "General advice written for this app, not yet checked against an official source. Practise with a spare piece of line before you need it. Wet the knot before you pull it tight."));
  return box;
}
function lnKnotsPanel() {
  const box = el("div", "learn-fishpanel");
  if (LN.knotsErr) { box.appendChild(el("div", "spot-meta", "The knot cards could not load. Check your connection and try again.")); return box; }
  if (!LN.knots) { lnKnotsLoad(); box.appendChild(el("div", "spot-meta", "Loading the knots…")); return box; }
  const open = LN.knotOpen && LN.knots.find(k => k.name === LN.knotOpen);
  if (open) { box.appendChild(lnKnotCard(open)); return box; }
  box.appendChild(el("h2", "learn-h", "Knots"));
  const inp = el("input", "learn-search"); inp.type = "search"; inp.placeholder = "Search knots by name"; inp.value = LN.knotsQ; inp.setAttribute("aria-label", "Search knots");
  const list = el("div", "learn-fishlist");
  inp.addEventListener("input", () => { LN.knotsQ = inp.value; lnKnotPick(list); });
  box.appendChild(inp); box.appendChild(list); lnKnotPick(list);
  return box;
}

// ---- 🪝 Rigs (step 4): a searchable list and a step-by-step card per rig, from data/learn/rigs.json. Each card names its knot (a tap opens that
// knot card) and fish cards' rig names tap through to the rig when a rig's `find` words are in the name. Plain text; `picture`/`credit` hidden until filled.
LN.rigs = null; LN.rigsErr = false; LN.rigsQ = ""; LN.rigOpen = null;
function lnRigsLoad() {
  if (LN.rigs || LN.rigsLoading || LN.rigsErr) return;   // (after a failure, a fish card must not keep asking)
  LN.rigsLoading = true;
  fetch("data/learn/rigs.json").then(r => { if (!r.ok) throw new Error("http"); return r.json(); })
    .then(j => { if (!j || !Array.isArray(j.rigs)) throw new Error("bad"); LN.rigs = j.rigs; })
    .catch(() => { LN.rigsErr = true; })
    .then(() => { LN.rigsLoading = false; const v = $("view-learn"); if (v && !v.hidden && (LN.tile === "rigs" || (LN.tile === "fish" && LN.fishOpen))) renderLearn(); });
}
const lnRigFor = text => { const t = String(text).toLowerCase(); return (LN.rigs || []).find(r => (r.find || []).some(w => t.includes(String(w).toLowerCase()))) || null; };
const lnOpenRig = name => { LN.tile = "rigs"; LN.rigOpen = name; renderLearn(); window.scrollTo({ top: 0 }); };
// the "Rigs that work" list on a fish card: a rig we have a card for becomes a tap
function lnRigList(box, rigs) {
  if (!rigs || !rigs.length) return;
  lnRigsLoad();
  box.appendChild(el("h3", "learn-h2", "🪝 Rigs that work"));
  const u = el("ul", "learn-ul");
  rigs.forEach(x => {
    const li = el("li"), r = lnRigFor(x);
    if (r) { const b = el("button", "learn-link", x + " ›"); b.type = "button"; b.addEventListener("click", () => lnOpenRig(r.name)); li.appendChild(b); }
    else li.textContent = x;
    u.appendChild(li);
  });
  box.appendChild(u);
}
function lnRigPick(box) {
  const q = LN.rigsQ.trim().toLowerCase();
  const hits = (LN.rigs || []).filter(r => !q || [r.name].concat(r.aka || []).some(w => String(w).toLowerCase().includes(q)));
  box.textContent = "";
  if (!hits.length) { box.appendChild(el("div", "spot-meta", "No rig matches “" + LN.rigsQ.trim() + "”.")); return; }
  hits.forEach(r => {
    const b = el("button", "learn-fishrow", "🪝 " + r.name); b.type = "button";
    b.addEventListener("click", () => { LN.rigOpen = r.name; renderLearn(); window.scrollTo({ top: 0 }); });
    box.appendChild(b);
  });
}
function lnRigCard(r) {
  const box = el("div", "learn-fishcard");
  const back = el("button", "btn ghost small", "‹ All rigs"); back.type = "button";
  back.addEventListener("click", () => { LN.rigOpen = null; renderLearn(); });
  box.appendChild(back);
  box.appendChild(el("h2", "learn-h", "🪝 " + r.name));
  if (r.picture && /^(https?:\/\/|data\/)/.test(r.picture)) {
    const fig = el("div", "learn-fig"), img = el("img"); img.src = r.picture; img.alt = r.name + " diagram"; img.loading = "lazy"; fig.appendChild(img);
    if (r.credit) fig.appendChild(el("div", "spot-meta", "Picture: " + r.credit));
    box.appendChild(fig);
  }
  box.appendChild(el("div", null, r.what));
  box.appendChild(el("h3", "learn-h2", "🎣 When to use it")); box.appendChild(el("div", null, r.use));
  if (r.need && r.need.length) { box.appendChild(el("h3", "learn-h2", "🧰 What you need")); const u = el("ul", "learn-ul"); r.need.forEach(x => u.appendChild(el("li", null, x))); box.appendChild(u); }
  box.appendChild(el("h3", "learn-h2", "Steps"));
  const ol = el("ol", "learn-ul"); (r.steps || []).forEach(s => ol.appendChild(el("li", null, s))); box.appendChild(ol);
  if (r.knot) {
    box.appendChild(el("h3", "learn-h2", "🪢 Knot to use"));
    const b = el("button", "learn-link", r.knot + " ›"); b.type = "button";
    b.addEventListener("click", () => { LN.tile = "knots"; LN.knotOpen = r.knot; renderLearn(); window.scrollTo({ top: 0 }); });
    box.appendChild(b);
  }
  if (r.tip) { box.appendChild(el("h3", "learn-h2", "💡 Tip")); box.appendChild(el("div", null, r.tip)); }
  box.appendChild(el("div", "spot-meta", "General advice written for this app, not yet checked against an official source. Check the state's rules on hooks, gear and bait before you fish."));
  return box;
}
function lnRigsPanel() {
  const box = el("div", "learn-fishpanel");
  if (LN.rigsErr) { box.appendChild(el("div", "spot-meta", "The rig cards could not load. Check your connection and try again.")); return box; }
  if (!LN.rigs) { lnRigsLoad(); box.appendChild(el("div", "spot-meta", "Loading the rigs…")); return box; }
  const open = LN.rigOpen && LN.rigs.find(r => r.name === LN.rigOpen);
  if (open) { box.appendChild(lnRigCard(open)); return box; }
  box.appendChild(el("h2", "learn-h", "Rigs"));
  const inp = el("input", "learn-search"); inp.type = "search"; inp.placeholder = "Search rigs by name"; inp.value = LN.rigsQ; inp.setAttribute("aria-label", "Search rigs");
  const list = el("div", "learn-fishlist");
  inp.addEventListener("input", () => { LN.rigsQ = inp.value; lnRigPick(list); });
  box.appendChild(inp); box.appendChild(list); lnRigPick(list);
  return box;
}

// ---- 🎣 Bait & lures (step 5): a searchable list and a card per bait or lure, from data/learn/bait.json. Every line carries a [n] pointing at the official page
// it came from (listed under the card with the checked date); the fish that name it are taps into their fish cards.
LN.bait = null; LN.baitSrc = {}; LN.baitT = ""; LN.baitErr = false; LN.baitQ = ""; LN.baitOpen = null;
function lnBaitLoad() {
  if (LN.bait || LN.baitLoading) return;
  LN.baitLoading = true;
  fetch("data/learn/bait.json").then(r => { if (!r.ok) throw new Error("http"); return r.json(); })
    .then(j => { if (!j || !Array.isArray(j.bait)) throw new Error("bad"); LN.baitSrc = j.sources || {}; LN.baitT = j.t || ""; LN.bait = j.bait; })
    .catch(() => { LN.baitErr = true; })
    .then(() => { LN.baitLoading = false; const v = $("view-learn"); if (v && !v.hidden && LN.tile === "bait") renderLearn(); });
}
function lnBaitPick(box) {
  const q = LN.baitQ.trim().toLowerCase();
  const hits = (LN.bait || []).filter(b => !q || [b.name].concat(b.aka || []).some(w => String(w).toLowerCase().includes(q)));
  box.textContent = "";
  if (!hits.length) { box.appendChild(el("div", "spot-meta", "No bait or lure matches “" + LN.baitQ.trim() + "”.")); return; }
  hits.forEach(b => {
    const r = el("button", "learn-fishrow", (b.kind === "lure" ? "🎣 " : "🪱 ") + b.name); r.type = "button";
    r.addEventListener("click", () => { LN.baitOpen = b.name; renderLearn(); window.scrollTo({ top: 0 }); });
    box.appendChild(r);
  });
}
function lnBaitCard(b) {
  const box = el("div", "learn-fishcard");
  const back = el("button", "btn ghost small", "‹ All baits & lures"); back.type = "button";
  back.addEventListener("click", () => { LN.baitOpen = null; renderLearn(); });
  box.appendChild(back);
  box.appendChild(el("h2", "learn-h", (b.kind === "lure" ? "🎣 " : "🪱 ") + b.name));
  box.appendChild(el("div", "spot-meta", b.kind === "lure" ? "Lure (artificial)" : "Bait"));
  const used = [];   // source keys in the order first used → [1], [2] …
  box.appendChild(el("h3", "learn-h2", "What the official pages say"));
  const u = el("ul", "learn-ul");
  (b.facts || []).forEach(f => {
    if (used.indexOf(f.s) < 0) used.push(f.s);
    u.appendChild(el("li", null, f.t + " [" + (used.indexOf(f.s) + 1) + "]"));
  });
  box.appendChild(u);
  if (b.fish && b.fish.length) {
    box.appendChild(el("h3", "learn-h2", "🐟 Fish that name it"));
    b.fish.forEach(n => {
      const l = el("button", "learn-link", n + " ›"); l.type = "button";
      l.addEventListener("click", () => { LN.tile = "fish"; LN.fishOpen = n; renderLearn(); window.scrollTo({ top: 0 }); });
      box.appendChild(l);
    });
  }
  used.forEach((k, i) => lnSourceLine(box, "[" + (i + 1) + "]", LN.baitSrc[k], LN.baitT));
  box.appendChild(el("div", "spot-meta", "Not a rule. Check the state's rules on bait, hooks and gear before you fish."));
  return box;
}
function lnBaitPanel() {
  const box = el("div", "learn-fishpanel");
  if (LN.baitErr) { box.appendChild(el("div", "spot-meta", "The bait and lure cards could not load. Check your connection and try again.")); return box; }
  if (!LN.bait) { lnBaitLoad(); box.appendChild(el("div", "spot-meta", "Loading the baits and lures…")); return box; }
  const open = LN.baitOpen && LN.bait.find(b => b.name === LN.baitOpen);
  if (open) { box.appendChild(lnBaitCard(open)); return box; }
  box.appendChild(el("h2", "learn-h", "Bait & lures"));
  box.appendChild(el("div", "spot-meta", "Only baits and lures that an official page names are listed, each with its source."));
  const inp = el("input", "learn-search"); inp.type = "search"; inp.placeholder = "Search baits and lures"; inp.value = LN.baitQ; inp.setAttribute("aria-label", "Search baits and lures");
  const list = el("div", "learn-fishlist");
  inp.addEventListener("input", () => { LN.baitQ = inp.value; lnBaitPick(list); });
  box.appendChild(inp); box.appendChild(list); lnBaitPick(list);
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
    const b = el("button", "learn-tile" + (k === LN.tile ? " on" : "") + (k === "rules" || k === "fish" || k === "knots" || k === "rigs" || k === "bait" ? "" : " soon"), ico + " " + label); b.type = "button"; b.dataset.tile = k;
    if (k !== "rules" && k !== "fish" && k !== "knots" && k !== "rigs" && k !== "bait") b.appendChild(el("span", "learn-soon", "Coming soon"));
    b.addEventListener("click", () => { LN.tile = k; if (k === "bait") LN.baitOpen = null; if (k === "fish") LN.fishOpen = null; if (k === "knots") LN.knotOpen = null; if (k === "rigs") LN.rigOpen = null; renderLearn(); });
    grid.appendChild(b);
  });
  body.appendChild(grid);
  if (LN.tile === "rules") {
    body.appendChild(lnRulesPanel(st));
    if (typeof zonesEnsure === "function") { const p = zonesEnsure(); if (p && p.then) p.then(() => { if (!$("view-learn").hidden && LN.st === st && LN.tile === "rules") renderLearn(); }); }
  } else if (LN.tile === "fish") {
    body.appendChild(lnFishPanel(st));
    if (LN.fishOpen && LN.fish && lnNoRulesAtAll()) lnWaiting();   // rules not here yet: asked for once, the page redraws itself
  } else if (LN.tile === "knots") {
    body.appendChild(lnKnotsPanel());
  } else if (LN.tile === "rigs") {
    body.appendChild(lnRigsPanel());
  } else if (LN.tile === "bait") {
    body.appendChild(lnBaitPanel());
  } else {
    const t = LN_TILES.find(x => x[0] === LN.tile);
    body.appendChild(el("div", "spot-meta", t[1] + " " + t[2] + " is coming soon. Rules, Fish, Rigs, Bait & lures and Knots are ready now."));
  }
}
function openLearn() { LN.st = lnHere(); LN.tile = "rules"; showView("learn"); window.scrollTo({ top: 0 }); }

(function learnSetup() {
  const c = $("learn-card"), back = $("learn-back");
  if (c) c.addEventListener("click", openLearn);
  if (back) back.addEventListener("click", () => showView("list"));
})();
