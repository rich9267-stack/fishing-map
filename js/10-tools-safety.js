  // ---- 🚤 Boat mode: big, glanceable screen for use on the water ----
  // Shows speed and heading from the phone's GPS, keeps the screen awake, and has two huge buttons:
  // one-tap catch (uses your chosen species) and mark-this-spot (saves a private spot right where you are).
  const boat = { watch: null, pos: null, prev: null, speed: null, heading: null, lock: null, units: "mph", species: null, logged: 0, busy: false, tick: null };
  try { boat.units = localStorage.getItem("fm-boat-units") === "kn" ? "kn" : "mph"; boat.species = localStorage.getItem("fm-boat-species"); } catch (e) {}
  const BOAT_MARKS_KEY = () => `fm-boat-marks-${me ? me.id : "x"}`;
  const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

  function boatMsg(t, err) { const m = $("boat-msg"); m.textContent = t; m.className = err ? "err" : ""; }

  const BOAT_MORE = ["Redfish", "Black drum", "Cobia", "Mahi-mahi", "King mackerel", "Barracuda", "Permit", "Pompano", "Yellowtail snapper", "Lane snapper",
    "Gag grouper", "Red grouper", "Goliath grouper", "Bonefish", "Bluefish", "Grunt", "Triggerfish", "Amberjack", "Wahoo", "Sailfish", "Blackfin tuna",
    "Largemouth bass", "Peacock bass", "Bluegill", "Tilapia", "Catfish", "Shark", "Stingray"];
  function boatSpeciesChips() {
    const mine = Object.values(catchesBySpot).flat().filter(isMine);
    const counts = {}; mine.forEach(c => { counts[c.species] = (counts[c.species] || 0) + 1; });
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    // Your most-caught first, then the usual suspects, then a long tail — swipe sideways to see them all
    let names = [...new Set((boat.species ? [boat.species] : []).concat(top, COMMON_SPECIES, BOAT_MORE))];
    if (!boat.species) boat.species = names[0];
    const box = $("boat-species"); box.innerHTML = "";
    const pick = (n, b) => {
      boat.species = n; try { localStorage.setItem("fm-boat-species", n); } catch (e) {}
      box.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      $("boat-other").hidden = true;
    };
    names.forEach(n => {
      const b = el("button", n === boat.species ? "on" : "", n); b.type = "button";
      b.addEventListener("click", () => pick(n, b));
      box.appendChild(b);
    });
    const other = el("button", "", "✏️ Other…"); other.type = "button";
    other.addEventListener("click", () => { $("boat-other").hidden = false; $("boat-other-in").focus(); });
    box.appendChild(other);
    box.scrollLeft = 0;
  }
  $("boat-other-ok").addEventListener("click", () => {
    const v = $("boat-other-in").value.trim();
    if (!v) return;
    boat.species = v.slice(0, 40); try { localStorage.setItem("fm-boat-species", boat.species); } catch (e) {}
    $("boat-other-in").value = ""; $("boat-other").hidden = true;
    boatSpeciesChips();
    const on = $("boat-species").querySelector("button.on"); if (on) on.scrollIntoView && on.scrollIntoView({ inline: "center", block: "nearest" });
  });

  // Next tide (high or low) at the nearest NOAA station, and a sunset countdown that turns amber in the last hour
  function boatInTime(ms) { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; }
  function boatInfo() {
    const here = boat.pos || { lat: 26.257, lng: -80.081 }, now = new Date();
    const st = stationFor({ lat: here.lat, lng: here.lng }), tb = $("boat-tide");
    if (st && st.id) {
      const p = stationTides(st.id);
      if (p.done && p.done !== "error") {
        const nx = p.done.find(t => t.when > now);
        if (nx) { tb.innerHTML = ""; tb.appendChild(el("span", null, nx.high ? "🌊 Next high tide" : "🌊 Next low tide")); tb.appendChild(el("b", null, nx.when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))); tb.appendChild(el("span", null, "in " + boatInTime(nx.when - now))); }
      } else tb.textContent = p.done === "error" ? "🌊 Tide times unavailable" : "🌊 Loading tide…";
    }
    const t = SunCalc.getTimes(now, here.lat, here.lng), sb = $("boat-sun");
    let label = "🌅 Sunset", at = t.sunset;
    if (now > t.sunset) { const t2 = SunCalc.getTimes(new Date(now.getTime() + 86400000), here.lat, here.lng); label = "🌅 Sunrise"; at = now < t.sunrise ? t.sunrise : t2.sunrise; }
    else if (now < t.sunrise) { label = "🌅 Sunrise"; at = t.sunrise; }
    sb.innerHTML = ""; sb.appendChild(el("span", null, label)); sb.appendChild(el("b", null, at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })));
    const left = at - now; sb.appendChild(el("span", null, label === "🌅 Sunset" && left < 3600000 ? `only ${boatInTime(left)} of light — head in soon` : "in " + boatInTime(left)));
    sb.classList.toggle("soon", label === "🌅 Sunset" && left < 3600000);
  }

  function boatRender() {
    boatInfo();
    const fresh = boat.pos && Date.now() - boat.pos.t < 15000;
    $("boat-gps").textContent = !boat.pos ? "📡 Finding GPS…" : fresh ? `📡 GPS good (±${Math.round(boat.pos.acc * 3.28)} ft)` : "📡 GPS signal lost…";
    const conv = boat.units === "kn" ? 1.94384 : 2.23694;
    $("boat-unit").textContent = boat.units === "kn" ? "knots" : "mph";
    $("boat-units").textContent = boat.units === "kn" ? "knots" : "mph";
    const sp = fresh && boat.speed != null ? boat.speed * conv : null;
    $("boat-speed").textContent = sp == null ? "--" : (sp < 10 ? sp.toFixed(1) : String(Math.round(sp)));
    $("boat-speed").parentNode.classList.toggle("stale", !fresh);
    const h = boat.heading;
    $("boat-head").textContent = h == null ? "--" : String(Math.round(h)).padStart(3, "0") + "°";
    $("boat-card").textContent = h == null ? "heading" : COMPASS[Math.round(h / 22.5) % 16];
    $("boat-arrow").style.transform = h == null ? "none" : `rotate(${h}deg)`;
    $("boat-head").parentNode.classList.toggle("stale", !fresh || h == null);
    $("boat-catch").disabled = boat.busy; $("boat-mark").disabled = boat.busy;
  }

  function boatOnFix(p) {
    const c = p.coords, now = Date.now();
    const cur = { lat: c.latitude, lng: c.longitude, acc: c.accuracy || 0, t: now };
    let speed = typeof c.speed === "number" && isFinite(c.speed) ? c.speed : null;
    const prev = boat.prev;
    if (prev) {
      const dt = (now - prev.t) / 1000, dm = miles(prev.lat, prev.lng, cur.lat, cur.lng) * 1609.34;
      if (speed == null && dt > 0.5 && dt < 20) speed = dm / dt;
      // Heading: the phone's own reading when moving; otherwise work it out from where we went (ignore tiny GPS wobble)
      if (typeof c.heading === "number" && isFinite(c.heading) && (speed || 0) > 0.5) boat.heading = (c.heading + 360) % 360;
      else if (dm > 8) {
        const y = Math.sin((cur.lng - prev.lng) * Math.PI / 180) * Math.cos(cur.lat * Math.PI / 180);
        const x = Math.cos(prev.lat * Math.PI / 180) * Math.sin(cur.lat * Math.PI / 180) - Math.sin(prev.lat * Math.PI / 180) * Math.cos(cur.lat * Math.PI / 180) * Math.cos((cur.lng - prev.lng) * Math.PI / 180);
        boat.heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      }
      if (dm > 8) boat.prev = cur;
    } else {
      boat.prev = cur;
      if (typeof c.heading === "number" && isFinite(c.heading) && (speed || 0) > 0.5) boat.heading = (c.heading + 360) % 360;
    }
    if (speed != null && speed < 0.25) speed = 0; // GPS jitter while drifting
    boat.speed = speed; boat.pos = cur;
    boatRender(); ciMaybePing(cur);
  }

  async function boatWake() {
    const foot = $("boat-foot");
    try {
      if (!navigator.wakeLock) throw new Error("none");
      boat.lock = await navigator.wakeLock.request("screen");
      foot.textContent = "🔆 Screen will stay on while this is open.";
      boat.lock.addEventListener && boat.lock.addEventListener("release", () => { boat.lock = null; });
    } catch (e) {
      foot.textContent = "⚠ This phone won't let the app keep the screen on — set Auto-Lock to Never in your phone's Settings while you're out.";
    }
  }
  document.addEventListener("visibilitychange", () => { if (!$("boat").hidden && document.visibilityState === "visible" && !boat.lock) boatWake(); });

  function openBoat() {
    if (!me) return;
    $("boat").hidden = false; document.body.style.overflow = "hidden";
    boat.logged = 0; boat.busy = false; boat.pos = null; boat.prev = null; boat.speed = null; boat.heading = null;
    boatMsg(""); boatSpeciesChips(); boatRender(); boatWake(); boatFlushMarks(); ciBoatRender(); ciLoad(); wxRefresh();
    if (!navigator.geolocation) { boatMsg("This phone can't share its location.", true); return; }
    boat.watch = navigator.geolocation.watchPosition(boatOnFix, err => {
      boatMsg(err && err.code === 1 ? "Location is blocked — allow location for this site in your phone's settings." : "Can't get a GPS fix yet…", true);
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
    boat.tick = setInterval(() => { boatRender(); if (Date.now() - (boat.wxAt || 0) > 300000 && boat.pos) { boat.wxAt = Date.now(); wxRefresh(true); } }, 3000);
  }
  function closeBoat() {
    $("boat").hidden = true; document.body.style.overflow = "";
    if (boat.watch != null) navigator.geolocation.clearWatch(boat.watch);
    boat.watch = null; clearInterval(boat.tick);
    if (boat.lock) { try { boat.lock.release(); } catch (e) {} boat.lock = null; }
  }

  function boatNeedFix() {
    if (!boat.pos || Date.now() - boat.pos.t > 30000) { boatMsg("Waiting for a GPS fix — try again in a moment.", true); return null; }
    return { lat: boat.pos.lat, lng: boat.pos.lng, acc: boat.pos.acc };
  }
  function boatBuzz() { try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} }

  async function boatCatch() {
    const pos = boatNeedFix(); if (!pos || boat.busy) return;
    if (!boat.species) { boatMsg("Tap a species first.", true); return; }
    boat.busy = true; boatRender(); boatBuzz();
    const near = nearbySpots(pos)[0];
    const atSpot = near && near.d <= QC_NEAR_MI ? near.s : null;
    const item = {
      id: newId(), when: new Date().toISOString(), pos, choice: atSpot ? atSpot.id : "__new", species: boat.species, count: 1, bait: null,
      name: me.name, blob: null, user: me.id, vis: atSpot ? (atSpot.visibility || (atSpot.is_private ? "private" : "friends")) : "private", length: "", weight: ""
    };
    const trip = activeSession();
    if (trip && atSpot && trip.spot_id === atSpot.id) item.session = trip.id;
    const stamp = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    boatMsg("Saving…");
    try {
      if (!navigator.onLine) { await queueCatch(item); boat.logged++; boatMsg(`✓ ${item.species} saved on phone (no signal) · ${stamp} · #${boat.logged}`); }
      else {
        const r = await saveQuickCatch(item);
        boat.logged++; boatMsg(`✓ ${item.species} logged at ${r.spot.name} · ${stamp} · #${boat.logged} this outing`);
        loadSpots().catch(() => {});
      }
    } catch (err) {
      if (isNetErr(err)) { await queueCatch(item); boat.logged++; boatMsg(`✓ ${item.species} saved on phone (no signal) · ${stamp}`); }
      else boatMsg("Couldn't save: " + (err.message || err), true);
    }
    setTimeout(() => { boat.busy = false; boatRender(); }, 1200); // short pause so a double-tap doesn't log two fish
  }

  async function boatMakeMark(m) {
    const st = stationFor({ lat: m.lat, lng: m.lng });
    const d = new Date(m.when);
    const row = {
      name: "Marked · " + d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      spot_type: "dock", water_type: st.dist != null && st.dist < 1.5 ? "saltwater" : "brackish",
      public_access: "unsure", added_by: me.name, lat: +m.lat.toFixed(5), lng: +m.lng.toFixed(5), is_private: true,
      notes: "Marked from Boat mode — rename it and fill in the details when you're back."
    };
    const { data, error } = await db.from("spots").insert(row).select("*").single();
    if (error) throw error;
    if (!(spots || []).some(x => x.id === data.id)) spots = (spots || []).concat(data);
    return data;
  }
  async function boatFlushMarks() {
    let list; try { list = JSON.parse(localStorage.getItem(BOAT_MARKS_KEY()) || "[]"); } catch (e) { list = []; }
    if (!list.length || !navigator.onLine) return;
    const left = [];
    for (const m of list) { try { await boatMakeMark(m); } catch (e) { left.push(m); } }
    try { localStorage.setItem(BOAT_MARKS_KEY(), JSON.stringify(left)); } catch (e) {}
    if (left.length < list.length) { try { await loadSpots(); } catch (e) {} }
  }
  window.addEventListener("online", () => { if (me) boatFlushMarks(); });

  async function boatMark() {
    const pos = boatNeedFix(); if (!pos || boat.busy) return;
    boat.busy = true; boatRender(); boatBuzz();
    const m = { lat: pos.lat, lng: pos.lng, when: new Date().toISOString() };
    const stamp = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const keep = () => { let l; try { l = JSON.parse(localStorage.getItem(BOAT_MARKS_KEY()) || "[]"); } catch (e) { l = []; } l.push(m); try { localStorage.setItem(BOAT_MARKS_KEY(), JSON.stringify(l)); } catch (e) {} };
    try {
      if (!navigator.onLine) { keep(); boatMsg(`📍 Spot saved on phone (no signal) · ${stamp} — it uploads when you're back online.`); }
      else { const sp = await boatMakeMark(m); boatMsg(`📍 Marked "${sp.name}" · private spot saved`); loadSpots().catch(() => {}); }
    } catch (err) {
      if (isNetErr(err)) { keep(); boatMsg(`📍 Spot saved on phone (no signal) · ${stamp}`); }
      else boatMsg("Couldn't save the spot: " + (err.message || err), true);
    }
    setTimeout(() => { boat.busy = false; boatRender(); }, 1200);
  }

  $("boat-open").addEventListener("click", openBoat);
  $("boat-close").addEventListener("click", closeBoat);
  $("boat-catch").addEventListener("click", boatCatch);
  $("boat-mark").addEventListener("click", boatMark);
  $("boat-units").addEventListener("click", () => { boat.units = boat.units === "mph" ? "kn" : "mph"; try { localStorage.setItem("fm-boat-units", boat.units); } catch (e) {} boatRender(); });

  // ---- 📏 Keeper checker: size / season rules from the fish_rules table (admin-editable), shown while logging a catch ----
  // Always a guide only — the message always says to check FWC.
  let fishRules = [];
  async function loadRules() {
    if (!me) return;
    try {
      const { data, error } = await db.from("fish_rules").select("*").eq("active", true);
      if (error) throw error;
      fishRules = data || [];
    } catch (e) { /* no rules yet: the checker just stays quiet */ }
  }
  function ruleFor(species) {
    const sp = String(species || "").toLowerCase().trim(); if (!sp) return null;
    let best = null, bl = 0;
    fishRules.forEach(r => (r.match || []).forEach(w => { if (w && sp.includes(w.toLowerCase()) && w.length > bl) { best = r; bl = w.length; } }));
    return best;
  }
  const mdOf = d => String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const inMd = (md, a, b) => a <= b ? (md >= a && md <= b) : (md >= a || md <= b); // may wrap past New Year
  function seasonState(r, when) {
    const md = mdOf(when), ymd0 = when.getFullYear() + "-" + md;
    if (Array.isArray(r.closed) && r.closed.some(([a, b]) => inMd(md, a, b))) return "closed";
    if (Array.isArray(r.open_only) && r.open_only.length && !r.open_only.some(([a, b]) => a.length > 5 ? (ymd0 >= a && ymd0 <= b) : inMd(md, a, b))) return "closed";
    return "open";
  }
  const inch = n => (+n).toFixed(2).replace(/\.?0+$/, "") + "″";
  const RULE_STALE_DAYS = 90;
  const ruleAge = r => r && r.verified_on ? Math.floor((Date.now() - new Date(r.verified_on + "T12:00:00").getTime()) / 86400000) : null;
  const ruleStale = r => { const a = ruleAge(r); return a == null || a > RULE_STALE_DAYS; };
  function keeperCheck(species, len, when) {
    const r = ruleFor(species); if (!r) return null;
    when = when || new Date();
    const lenName = r.measure === "fork" ? "fork length" : "total length";
    const size = r.min_in != null && r.max_in != null ? `${inch(r.min_in)}–${inch(r.max_in)}` : r.min_in != null ? `${inch(r.min_in)} minimum` : r.max_in != null ? `${inch(r.max_in)} maximum` : "";
    const foot = ` Rule: ${size ? size + " " + lenName + " · " : ""}${r.bag ? r.bag + " · " : ""}${r.note ? r.note + " " : ""}${ruleStale(r) ? `⚠️ This rule was last checked ${ruleAge(r) == null ? "a while ago" : ruleAge(r) + " days ago"} — it may have changed, so confirm with FWC.` : `Always check FWC (checked ${r.verified_on}).`}`;
    if (r.release_only) return { level: "bad", text: `🚫 ${r.species}: catch-and-release only — let it go.${r.note ? " " + r.note : ""} Always check FWC.` };
    if (seasonState(r, when) === "closed") return { level: "bad", text: `🚫 ${r.species} is out of season right now — release it.${foot}` };
    if (!(len > 0)) return { level: "info", text: `📏 ${r.species} —${foot} Add a length to check this fish.` };
    const near = r.measure === "fork" ? " Measure to the fork of the tail (fork length is a bit shorter than nose-to-tip)." : "";
    if (r.min_in != null && len < r.min_in) return { level: "bad", text: `❌ Under size — ${inch(len)} is ${inch(r.min_in - len)} short of the ${inch(r.min_in)} minimum. Release it.${near}${foot}` };
    if (r.max_in != null && len > r.max_in) {
      return r.one_over ? { level: "warn", text: `⚠️ Over the ${inch(r.max_in)} slot — only one fish this big is allowed per the rule (see below), otherwise release it.${foot}` }
        : { level: "bad", text: `❌ Over the ${inch(r.max_in)} slot — release it.${foot}` };
    }
    if (r.measure === "fork" && r.min_in != null && len < r.min_in + 1.5) return { level: "warn", text: `⚠️ Close call — ${inch(len)} vs the ${inch(r.min_in)} fork-length minimum. Re-measure to the fork of the tail before keeping it.${foot}` };
    return { level: "ok", text: `✅ Keeper size (${inch(len)}).${foot}` };
  }
  function keeperShow(box, species, len, when) {
    const k = keeperCheck(species, len, when);
    box.hidden = !k; if (!k) return;
    box.className = "keeper " + k.level; box.textContent = k.text;
  }

  // Admin: edit the rules table (Invite card → 🐟 Size & bag rules)
  const mdList = t => String(t || "").split(/[;,]/).map(x => x.trim()).filter(Boolean).map(x => x.split(/\s*(?:\.\.|to|–|-(?=\d{2}-))\s*/)).filter(a => a.length === 2);
  const mdText = j => (Array.isArray(j) ? j : []).map(([a, b]) => `${a}..${b}`).join("; ");
  function ruleForm(r) {
    const f = el("div", "rule-form");
    const fld = (label, id, type, val, ph) => { const w = el("div"); w.appendChild(el("label", null, label)); const i = el("input"); i.type = type; i.id = id; i.value = val == null ? "" : val; if (ph) i.placeholder = ph; if (type === "number") i.step = "0.25"; w.appendChild(i); f.appendChild(w); return i; };
    if (!r.id) { fld("Species name", "rf-species", "text", r.species, "e.g., Tripletail"); fld("Words that match a catch", "rf-match", "text", (r.match || []).join(", "), "e.g., tripletail, triple tail"); }
    const two = el("div", "two"); f.appendChild(two);
    const a = fld("Minimum (in)", "rf-min", "number", r.min_in), b = fld("Maximum / slot top (in)", "rf-max", "number", r.max_in);
    two.appendChild(a.parentNode); two.appendChild(b.parentNode);
    const ms = el("select"); ms.id = "rf-measure"; [["total", "Total length"], ["fork", "Fork length"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; ms.appendChild(o); }); ms.value = r.measure || "total";
    f.appendChild(el("label", null, "Measured as")); f.appendChild(ms);
    const chk = (label, id, v) => { const l = el("label", "check-row"); const c = el("input"); c.type = "checkbox"; c.id = id; c.checked = !!v; l.appendChild(c); l.appendChild(el("span", null, label)); f.appendChild(l); };
    chk("One fish over the maximum is allowed", "rf-oneover", r.one_over); chk("Catch-and-release only", "rf-release", r.release_only);
    fld("Bag limit", "rf-bag", "text", r.bag, "e.g., 3 per person");
    fld("Closed dates (MM-DD..MM-DD; …)", "rf-closed", "text", mdText(r.closed), "e.g., 12-15..01-31; 06-01..08-31");
    fld("Open ONLY these dates (optional)", "rf-open", "text", mdText(r.open_only), "e.g., 2026-10-09..2026-10-22");
    fld("Note", "rf-note", "text", r.note);
    chk("Show this rule in the app", "rf-active", r.active !== false);
    return f;
  }
  async function saveRule(r, f) {
    const g = id => f.querySelector("#" + id), num = id => { const v = parseFloat(g(id).value); return isFinite(v) ? v : null; };
    const row = { min_in: num("rf-min"), max_in: num("rf-max"), measure: g("rf-measure").value, one_over: g("rf-oneover").checked, release_only: g("rf-release").checked,
      bag: g("rf-bag").value.trim() || null, closed: mdList(g("rf-closed").value).length ? mdList(g("rf-closed").value) : null,
      open_only: mdList(g("rf-open").value).length ? mdList(g("rf-open").value) : null, note: g("rf-note").value.trim() || null, active: g("rf-active").checked,
      verified_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() };
    let res;
    if (r.id) res = await db.from("fish_rules").update(row).eq("id", r.id);
    else {
      const species = g("rf-species").value.trim(), match = g("rf-match").value.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (!species || !match.length) { toast("Add a species name and at least one matching word."); return false; }
      res = await db.from("fish_rules").insert({ ...row, species, match });
    }
    if (res.error) { toast("Couldn't save: " + res.error.message); return false; }
    toast("Rule saved ✓ (marked checked today)"); await loadRules(); return true;
  }
  let rulesOpen = false;
  function renderRulesAdmin() {
    const box = $("rules-admin"); box.innerHTML = "";
    if (!me || !me.isAdmin) return;
    const staleN = (rulesOpen ? rulesAll : fishRules).filter(r => r.active !== false && ruleStale(r)).length;
    const head = frBtn((rulesOpen ? "🐟 Size & bag rules ▴" : "🐟 Size & bag rules ▾") + (staleN ? ` — ⚠️ ${staleN} need a re-check` : ""), async () => { rulesOpen = !rulesOpen; if (rulesOpen) await loadRulesAll(); renderRulesAdmin(); });
    head.style.marginTop = "10px"; box.appendChild(head);
    if (!rulesOpen) return;
    box.appendChild(el("div", "spot-meta", "These power the ✅ / ❌ keeper check when logging a catch. Check the FWC page, then edit — saving stamps today's date."));
    (rulesAll || []).slice().sort((a, b) => a.species.localeCompare(b.species)).forEach(r => {
      const row = el("div", "rule-row");
      const size = r.release_only ? "release only" : [r.min_in != null ? "min " + inch(r.min_in) : "", r.max_in != null ? "max " + inch(r.max_in) : ""].filter(Boolean).join(" · ") || "no size limit";
      row.appendChild(el("b", null, r.species + (r.active === false ? " (hidden)" : "")));
      row.appendChild(el("div", "spot-meta", `${size} · ${r.bag || "bag: —"} · checked ${r.verified_on || "never"}${ruleStale(r) ? " ⚠️ " + (ruleAge(r) == null ? "never checked" : ruleAge(r) + " days ago — re-check") : ""}`));
      if (ruleStale(r)) row.appendChild(frBtn("✓ Still correct (checked today)", async () => {
        const { error } = await db.from("fish_rules").update({ verified_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq("id", r.id);
        if (error) { toast("Couldn't save: " + error.message); return; }
        toast("Marked checked today ✓"); await loadRules(); await loadRulesAll(); renderRulesAdmin();
      }));
      const edit = frBtn("✏️ Edit", () => { if (row.querySelector(".rule-form")) return; const f = ruleForm(r); row.appendChild(f);
        const bar = el("div", "ci-btns"); bar.appendChild(frBtn("Save", async () => { if (await saveRule(r, f)) { await loadRulesAll(); renderRulesAdmin(); } }, "btn small")); bar.appendChild(frBtn("Close", () => { f.remove(); bar.remove(); })); row.appendChild(bar); });
      row.appendChild(edit); box.appendChild(row);
    });
    const add = frBtn("+ Add a species", () => { if (box.querySelector(".rule-new")) return; const w = el("div", "rule-row rule-new"); const f = ruleForm({ measure: "total" }); w.appendChild(f);
      const bar = el("div", "ci-btns"); bar.appendChild(frBtn("Save", async () => { if (await saveRule({}, f)) { await loadRulesAll(); renderRulesAdmin(); } }, "btn small")); bar.appendChild(frBtn("Close", () => w.remove())); w.appendChild(bar); box.appendChild(w); });
    box.appendChild(add);
  }
  let rulesAll = [];
  async function loadRulesAll() { const { data } = await db.from("fish_rules").select("*"); rulesAll = data || []; }

  // ---- 🖼 Share card: one picture of the catch (photo, species, size, date) for the phone's share sheet ----
  // The place name is only printed when the catch is set to 🌎 Public; Private / Friends catches never show where.
  function loadImg(src) {
    return new Promise(res => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  }
  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(/\s+/); let line = "", n = 0;
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines) return y; } else line = t;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }
  async function drawShareCard(c, withPhoto) {
    const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, "#0d2a35"); grad.addColorStop(1, "#06141a"); g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const ph = (photosBySpot[c.spot_id] || []).find(p => p.catch_id === c.id);
    const img = withPhoto && ph && photoUrls[ph.path] ? await loadImg(photoUrls[ph.path]) : null;
    if (img) { // fill the top area like "cover"
      const bw = W, bh = 960, r = Math.max(bw / img.width, bh / img.height), sw = bw / r, sh = bh / r;
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, bw, bh);
    } else { g.font = "300px serif"; g.textAlign = "center"; g.fillText("🎣", W / 2, 620); }
    const fade = g.createLinearGradient(0, 760, 0, 960); fade.addColorStop(0, "rgba(6,20,26,0)"); fade.addColorStop(1, "rgba(6,20,26,1)"); g.fillStyle = fade; g.fillRect(0, 760, W, 200);
    g.textAlign = "left"; g.fillStyle = "#fff"; g.font = "bold 84px system-ui, -apple-system, sans-serif";
    const title = `${c.how_many > 1 ? c.how_many + " " : ""}${cap(c.species || "Catch")}`;
    let y = wrapText(g, title, 60, 1040, W - 120, 92, 2);
    const size = [c.length_in != null && `${+Number(c.length_in).toFixed(1)}″`, c.weight_lb != null && (c.weight_est ? "≈" : "") + lbText(Number(c.weight_lb))].filter(Boolean).join("  ·  ");
    g.font = "600 52px system-ui, -apple-system, sans-serif"; g.fillStyle = "#8fe3ad";
    if (size) { g.fillText(size, 60, y + 4); y += 64; }
    g.font = "40px system-ui, -apple-system, sans-serif"; g.fillStyle = "#cfe6ee";
    const when = new Date(c.caught_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const sp = (spots || []).find(x => x.id === c.spot_id), place = c.visibility === "public" && sp ? sp.name : "";
    g.fillText(when + (place ? "  ·  " + place : ""), 60, y + 6, W - 120);
    g.font = "600 34px system-ui, -apple-system, sans-serif"; g.fillStyle = "#7fa3b0"; g.fillText("🎣 Fishing Map", 60, H - 50);
    g.textAlign = "right"; g.fillText(c.caught_by || (me && me.name) || "", W - 60, H - 50);
    return cv;
  }
  const canvasBlob = cv => new Promise(res => { try { cv.toBlob(b => res(b), "image/jpeg", 0.92); } catch (e) { res(null); } });
  async function shareCatchCard(c) {
    toast("Making your share picture…");
    let cv = await drawShareCard(c, true), blob = await canvasBlob(cv);
    if (!blob) { cv = await drawShareCard(c, false); blob = await canvasBlob(cv); } // the photo's host blocked drawing: share without it
    if (!blob) { toast("Couldn't make the picture on this phone."); return; }
    const url = URL.createObjectURL(blob), file = new File([blob], `catch-${(c.species || "fish").replace(/\W+/g, "-").toLowerCase()}.jpg`, { type: "image/jpeg" });
    $("share-img").src = url; $("share-note").textContent = c.visibility === "public" ? "" : "🔒 The spot name is left off because this catch isn't set to 🌎 Public.";
    $("share-modal").hidden = false; share.file = file; share.url = url;
    $("share-send").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
  }
  const share = { file: null, url: null };
  $("share-send").addEventListener("click", async () => { try { await navigator.share({ files: [share.file], title: "My catch" }); } catch (e) { /* cancelled */ } });
  $("share-save").addEventListener("click", () => { const a = document.createElement("a"); a.href = share.url; a.download = share.file.name; document.body.appendChild(a); a.click(); a.remove(); });
  $("share-close").addEventListener("click", () => { $("share-modal").hidden = true; try { URL.revokeObjectURL(share.url); } catch (e) {} });

  // ---- 🔔 Alerts inbox: the notifications table (own rows), newest first ----
  let inbox = [];
  const INBOX_SEEN = () => `fm-inbox-seen-${me ? me.id : "x"}`;
  const inboxSeen = () => { try { return +localStorage.getItem(INBOX_SEEN()) || 0; } catch (e) { return 0; } };
  const ago = d => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(d).toLocaleDateString([], { month: "short", day: "numeric" }); };
  function inboxBadge() {
    const n = inbox.filter(x => +new Date(x.created_at) > inboxSeen() && x.kind !== "test").length;
    $("inbox-btn").textContent = n ? `🔔 Alerts (${n})` : "🔔 Alerts";
  }
  async function inboxLoad() {
    if (!me) return;
    try {
      const { data, error } = await db.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      inbox = data || [];
    } catch (e) { /* keep the last list */ }
    inboxBadge(); if (!$("inbox-card").hidden) inboxRender();
  }
  function inboxRender(seenBefore) {
    const box = $("inbox-list"); box.innerHTML = "";
    if (!inbox.length) { box.appendChild(el("div", "empty", "Nothing yet. Alerts you get on your phone will be listed here too.")); return; }
    inbox.forEach(x => {
      const row = el("div", "feed-item"); row.style.cursor = x.url ? "pointer" : "default";
      const fresh = +new Date(x.created_at) > (seenBefore || 0); if (fresh) row.style.borderLeft = "4px solid #1f9d55";
      const top = el("div", "feed-top"); top.appendChild(el("b", null, x.title)); top.appendChild(el("span", "spot-meta", ago(x.created_at))); row.appendChild(top);
      if (x.body) row.appendChild(el("div", null, x.body));
      if (x.result === "quiet hours") row.appendChild(el("div", "spot-meta", "🌙 Held back — it arrived during your quiet hours"));
      if (x.url) row.addEventListener("click", () => { $("inbox-card").hidden = true; handleGo(x.url); });
      box.appendChild(row);
    });
  }
  $("inbox-btn").addEventListener("click", async () => {
    const seen = inboxSeen();
    $("inbox-card").hidden = false; await inboxLoad(); inboxRender(seen);
    try { localStorage.setItem(INBOX_SEEN(), String(Date.now())); } catch (e) {}
    inboxBadge(); $("inbox-card").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("inbox-close").addEventListener("click", () => { $("inbox-card").hidden = true; });

  // ---- 🧰 Polish (D): spot search & sort, undo delete, export CSV, offline map area, admin dashboard ----
  function undoToast(text, onUndo, label, ms) {
    const t = $("qc-toast"); t.textContent = ""; t.hidden = false;
    t.appendChild(document.createTextNode(text + " "));
    const b = el("button", "linkbtn", label || "Undo"); b.type = "button"; b.id = label ? "toast-action" : "undo-btn"; b.style.cssText = "color:#8fe3ff;font-weight:700";
    b.addEventListener("click", () => { clearTimeout(toast.t); t.hidden = true; onUndo(); });
    t.appendChild(b);
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms || 8000);
  }
  // Anything that got 3 reports is blurred for everyone with a warning; tap once to view it anyway (remembered until you reload)
  const reviewPeeked = new Set();
  function markReview(node, tiny, id) {
    node.classList.add("under-review", "peekable");
    if (id && reviewPeeked.has(id)) node.classList.add("peek");
    node.appendChild(el("div", "review-note", tiny ? "⚠️ reported — tap to view" : "⚠️ Reported by others — may be offensive. Tap to view anyway."));
    node.addEventListener("click", () => { if (!node.classList.contains("peek")) { node.classList.add("peek"); if (id) reviewPeeked.add(id); } });
    return node;
  }
  // Search + sort
  $("spot-sort").value = spotSort;
  $("spot-search").addEventListener("input", e => { spotQuery = e.target.value; renderSpots(); });
  $("spot-sort").addEventListener("change", e => {
    spotSort = e.target.value;
    try { localStorage.setItem("fm-spot-sort", spotSort); } catch (x) {}
    if (spotSort === "near" && !sortPos) {
      if (!navigator.geolocation) { toast("This phone can't tell where you are — sorted A–Z"); spotSort = "name"; e.target.value = "name"; renderSpots(); return; }
      toast("Finding where you are…", 8000);
      navigator.geolocation.getCurrentPosition(
        p => { sortPos = { lat: p.coords.latitude, lng: p.coords.longitude }; $("qc-toast").hidden = true; renderSpots(); },
        () => { toast("Couldn't get your location — sorted A–Z", 4000); spotSort = "name"; e.target.value = "name"; renderSpots(); },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    } else renderSpots();
  });
  // Export my data (CSV)
  function csvCell(v) {
    if (v == null) return "";
    let t = String(v);
    if (/^[=+\-@]/.test(t)) t = "'" + t;      // stop spreadsheet formulas
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function toCsv(cols, rows) {
    return "﻿" + [cols.map(c => c[0]).join(",")].concat(rows.map(r => cols.map(c => csvCell(c[1](r))).join(","))).join("\r\n") + "\r\n";
  }
  function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function exportCatches() {
    const spotName = id => ((spotsAll || []).concat(spots || []).find(x => x.id === id) || {}).name || "";
    const rows = myCatches().slice().sort((a, b) => new Date(a.caught_at) - new Date(b.caught_at));
    const cols = [["Date/time", c => c.caught_at], ["Species", c => c.species], ["How many", c => c.how_many], ["Length (in)", c => c.length_in], ["Weight (lb)", c => c.weight_lb],
      ["Spot", c => spotName(c.spot_id)], ["Bait/lure", c => c.bait], ["Tide", c => c.tide_stage], ["Wind", c => c.wind_dir && c.wind_mph != null ? c.wind_dir + " " + c.wind_mph + " mph" : ""],
      ["Pressure (inHg)", c => c.pressure_inhg], ["Water temp (F)", c => c.water_temp_f], ["Moon", c => c.moon_phase], ["Who can see", c => c.visibility], ["Notes", c => c.notes]];
    downloadText("my-catches.csv", toCsv(cols, rows));
    return rows.length;
  }
  function exportSpots() {
    const rows = (spots || []).filter(isMine).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const cols = [["Name", s => s.name], ["Type", s => s.spot_type], ["Water", s => s.water_type], ["Latitude", s => s.lat], ["Longitude", s => s.lng],
      ["Who can see", s => s.visibility], ["Public access", s => s.public_access], ["Parking", s => s.parking], ["Getting there", s => s.getting_there],
      ["Access notes", s => s.access_notes], ["Notes", s => s.notes], ["Catches logged", s => (catchesBySpot[s.id] || []).length]];
    downloadText("my-spots.csv", toCsv(cols, rows));
    return rows.length;
  }
  $("export-catches").addEventListener("click", () => { const n = exportCatches(); $("export-msg").className = "msg"; $("export-msg").textContent = n ? `Saved ${n} catches.` : "No catches to export yet."; });
  $("export-spots").addEventListener("click", () => { const n = exportSpots(); $("export-msg").className = "msg"; $("export-msg").textContent = n ? `Saved ${n} spots.` : "No spots of yours to export yet."; });
  // Offline map area: saves the street (or satellite) tiles for what's on screen, a few zoom levels in, so the map works with no signal
  const TILE_CACHE = "fishing-map-tiles";
  function tileUrls(b, z, tpl) {
    const n = 2 ** z, rad = Math.PI / 180;
    const x = lng => Math.floor((lng + 180) / 360 * n);
    const y = lat => Math.floor((1 - Math.log(Math.tan(lat * rad) + 1 / Math.cos(lat * rad)) / Math.PI) / 2 * n);
    const out = [];
    for (let i = x(b.getWest()); i <= x(b.getEast()); i++) for (let j = y(b.getNorth()); j <= y(b.getSouth()); j++)
      out.push(tpl.replace("{z}", z).replace("{x}", i).replace("{y}", j));
    return out;
  }
  async function saveMapArea() {
    const btn = $("map-offline");
    if (!map || !window.caches) { toast("This phone can't save maps for offline use", 4000); return; }
    const tpl = satellite ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const b = map.getBounds(), z0 = Math.min(Math.round(map.getZoom()), 17);
    let urls = [];
    for (let z = z0; z <= Math.min(z0 + 2, 17); z++) {
      const u = tileUrls(b, z, tpl);
      if (urls.length + u.length > 250) break;
      urls = urls.concat(u);
    }
    if (!urls.length || urls.length > 250) { toast("Zoom in a bit first — that area is too big to save", 4500); return; }
    btn.disabled = true;
    try {
      const cache = await caches.open(TILE_CACHE);
      let done = 0, bad = 0;
      for (let i = 0; i < urls.length; i += 6) {
        await Promise.all(urls.slice(i, i + 6).map(async u => {
          try { if (await cache.match(u)) { done++; return; } const r = await fetch(u, { mode: "cors" }); if (!r.ok) throw 0; await cache.put(u, r); done++; } catch (e) { bad++; }
        }));
        btn.textContent = `⬇ Saving… ${Math.min(i + 6, urls.length)}/${urls.length}`;
      }
      toast(bad ? `Saved ${done} map tiles (${bad} didn't download)` : `✓ Saved this map area (${done} tiles) for offline`, 5000);
    } catch (e) { toast("Couldn't save the map — check your signal", 4500); }
    btn.disabled = false; btn.textContent = "⬇ Save map for offline";
  }
  $("map-offline").addEventListener("click", saveMapArea);
  // Admin dashboard (inside the Invite card)
  async function loadAdminDash() {
    const box = $("admin-dash"); if (!box) return;
    box.innerHTML = "";
    if (!me || !me.isAdmin) return;
    const { data: st, error } = await db.rpc("admin_stats");
    if (error || !st) { box.appendChild(el("div", "msg err", "Couldn't load the dashboard.")); return; }
    box.appendChild(el("div", "label", "📊 Dashboard"));
    const grid = el("div", "dash-grid");
    [["People", st.members_approved, st.members_pending ? `${st.members_pending} waiting` : ""], ["Active this week", st.active_7d, ""], ["Spots", st.spots, ""],
     ["Catches", st.catches, `${st.catches_7d} this week`], ["Alerts on", st.push_users, "phones"], ["Open reports", st.open_reports, st.members_blocked ? `${st.members_blocked} banned` : ""]]
      .forEach(([k, v, sub]) => { const t = el("div", "dash-tile"); t.appendChild(el("div", "dash-n", String(v))); t.appendChild(el("div", "spot-meta", k)); if (sub) t.appendChild(el("div", "spot-meta", sub)); grid.appendChild(t); });
    box.appendChild(grid);
    if ((st.top_species || []).length) box.appendChild(el("div", "spot-meta", "Top species: " + st.top_species.map(x => `${x.species} (${x.n})`).join(" · ")));
    if ((st.hidden || []).length) {
      box.appendChild(el("div", "label", `🚩 Blurred — needs your decision (${st.hidden.length})`));
      box.appendChild(el("div", "spot-meta", "Each got 3 reports and is blurred with a warning (anyone can tap to view it anyway). Keep = unblur for good; Remove = delete it."));
      st.hidden.forEach(h => {
        const row = el("div", "feed-item");
        row.appendChild(el("div", null, `🚩 ${h.type}: ${h.snippet || "(gone)"}`));
        row.appendChild(el("div", "spot-meta", `${h.reports} reports · hidden ${new Date(h.hidden_at).toLocaleDateString([], { month: "short", day: "numeric" })}`));
        const decide = (action, ask) => async () => {
          if (ask && !confirm(ask)) return;
          const { error: e2 } = await db.rpc("review_flagged", { p_id: h.id, p_action: action });
          if (e2) { alert("Couldn't do that: " + (e2.message || e2)); return; }
          loadAdminDash(); loadReports(); loadCatches();
        };
        const acts = el("div", "feed-actions");
        const keep = el("button", "btn ghost small", "✓ Keep (unblur)"); keep.type = "button"; keep.addEventListener("click", decide("keep"));
        const rm = el("button", "btn ghost small danger", "🗑 Remove"); rm.type = "button"; rm.addEventListener("click", decide("remove", `Remove this ${h.type} for everyone?`));
        acts.appendChild(keep); acts.appendChild(rm); row.appendChild(acts); box.appendChild(row);
      });
    }
  }

  // ---- 🛟 Safety: severe-weather banner + "Heading out / I'm back" check-in (float plan) ----
  // Weather: National Weather Service alerts for where you are (Boat mode GPS, else the map centre, else the middle of your spots).
  // Check-in: tell chosen friends where you're going and when you'll be back; if you don't check in, they get an alert.
  const WX_URGENT = /^(Tornado Warning|Severe Thunderstorm Warning|Special Marine Warning|Flash Flood Warning|Hurricane Warning|Tropical Storm Warning|Storm Surge Warning|Extreme Wind Warning|Gale Warning|Storm Warning|Hurricane Force Wind Warning|Tsunami Warning|Waterspout Warning)$/;
  const WX_NORMAL = /^(Tornado Watch|Severe Thunderstorm Watch|Flash Flood Watch|Hurricane Watch|Tropical Storm Watch|Storm Surge Watch|Gale Watch|Small Craft Advisory.*|Rip Current Statement|High Surf Advisory|High Surf Warning|Coastal Flood Warning|Coastal Flood Advisory|Dense Fog Advisory|Dense Fog Warning|Heat Advisory|Excessive Heat Warning)$/;
  const wx = { cache: {}, list: [], open: null, timer: null };
  const ci = { mine: null, watch: [], lastPing: 0, timer: null, pick: new Set(), hours: 4, sending: false };
  const CI_BUD_KEY = () => `fm-ci-buddies-${me ? me.id : "x"}`;
  const fmtClock = d => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  function wxPoint() {
    if (!$("boat").hidden && boat.pos) return { lat: boat.pos.lat, lng: boat.pos.lng };
    if (ci.mine && ci.mine.last_lat != null) return { lat: ci.mine.last_lat, lng: ci.mine.last_lng };
    try { if (map && !$("view-map").hidden) { const c = map.getCenter(); return { lat: c.lat, lng: c.lng }; } } catch (e) {}
    const mine = (spots || []).filter(s => s.created_by === me.id && hasLoc(s));
    if (mine.length) return { lat: mine.reduce((n, s) => n + s.lat, 0) / mine.length, lng: mine.reduce((n, s) => n + s.lng, 0) / mine.length };
    return { lat: 26.24, lng: -80.12 }; // Pompano Beach
  }
  async function wxFetch(pt, force) {
    const key = pt.lat.toFixed(2) + "," + pt.lng.toFixed(2), c = wx.cache[key];
    if (c && !force && Date.now() - c.t < 300000) return c.list;
    try {
      const r = await fetch(`https://api.weather.gov/alerts/active?point=${pt.lat.toFixed(4)},${pt.lng.toFixed(4)}`, { headers: { Accept: "application/geo+json" } });
      if (!r.ok) throw new Error("NWS " + r.status);
      const list = ((await r.json()).features || []).map(f => f.properties || {}).filter(a => (WX_URGENT.test(a.event || "") || WX_NORMAL.test(a.event || "")) && a.messageType !== "Cancel")
        .map(a => ({ event: a.event, urgent: WX_URGENT.test(a.event), ends: a.ends || a.expires, area: String(a.areaDesc || "").split(";")[0], headline: a.headline || "", text: String(a.description || "").replace(/\s+/g, " ").trim() }))
        .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
      wx.cache[key] = { t: Date.now(), list }; return list;
    } catch (e) { return c ? c.list : []; }
  }
  function wxRender() {
    const box = $("wx-banner"); box.innerHTML = "";
    wx.list.slice(0, 4).forEach((a, i) => {
      const d = el("div", "wx-item" + (a.urgent ? " urgent" : ""));
      d.appendChild(el("b", null, (a.urgent ? "⛈️ " : "🌊 ") + a.event));
      d.appendChild(el("span", null, (a.ends ? " — until " + fmtClock(a.ends) : "") + (a.area ? " · " + a.area : "")));
      if (wx.open === i) d.appendChild(el("div", "wx-more", a.text.slice(0, 600) + (a.text.length > 600 ? "…" : "") + "\nSource: National Weather Service"));
      d.addEventListener("click", () => { wx.open = wx.open === i ? null : i; wxRender(); });
      box.appendChild(d);
    });
    box.hidden = !wx.list.length;
    const bw = $("boat-wx"), top = wx.list[0];
    bw.hidden = !top; bw.className = top && top.urgent ? "urgent" : "";
    if (top) bw.textContent = (top.urgent ? "⛈️ " : "🌊 ") + top.event + (top.ends ? " until " + fmtClock(top.ends) : "") + (wx.list.length > 1 ? ` (+${wx.list.length - 1} more)` : "");
    safetyStripShow();
  }
  async function wxRefresh(force) {
    if (!me) return;
    wx.list = await wxFetch(wxPoint(), force); wxRender();
  }

  function safetyStripShow() {
    $("safety-strip").hidden = !me;
    $("ci-start").hidden = !!ci.mine;
  }
  async function ciLoad() {
    if (!me) return;
    try {
      const { data, error } = await db.from("float_plans").select("*").in("status", ["active", "alerted"]).order("created_at", { ascending: false });
      if (error) throw error;
      ci.mine = (data || []).find(p => p.user_id === me.id) || null;
      ci.watch = (data || []).filter(p => p.user_id !== me.id);
    } catch (e) { /* keep what we had */ }
    ciRender();
  }
  const ciWho = id => { const p = friendProfiles[id]; return p ? p.display_name : "A friend"; };
  const ciLeft = due => { const m = Math.round((new Date(due) - Date.now()) / 60000); const a = Math.abs(m), t = a >= 60 ? `${Math.floor(a / 60)} h ${a % 60} min` : `${a} min`; return m >= 0 ? `in ${t}` : `${t} ago`; };
  const mapsLink = (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`;
  function ciRender() {
    const mine = $("ci-mine"), w = $("ci-watch"); mine.innerHTML = ""; w.innerHTML = "";
    const p = ci.mine;
    if (p) {
      const late = p.status === "alerted" || new Date(p.due_at) < Date.now();
      mine.className = "ci-box mine" + (late ? " late" : "");
      mine.appendChild(el("b", null, late ? "🛟 You're past your check-in time" : "🛟 Check-in running"));
      mine.appendChild(el("div", null, `${p.place} · back by ${fmtClock(p.due_at)} (${ciLeft(p.due_at)})`));
      mine.appendChild(el("div", "spot-meta", p.status === "alerted" ? "Your buddies have been alerted. Tap “I'm back” as soon as you can." : `Watching: ${(p.buddies || []).map(ciWho).join(", ")} · alert ${p.grace_min} min after`));
      const row = el("div", "ci-btns");
      row.appendChild(frBtn("✅ I'm back", () => ciBack(p.id, false), "btn small"));
      row.appendChild(frBtn("+1 hour", () => ciExtend(p.id)));
      row.appendChild(frBtn("Cancel", () => ciBack(p.id, true)));
      mine.appendChild(row); mine.hidden = false;
    } else mine.hidden = true;
    ci.watch.forEach(x => {
      const late = x.status === "alerted";
      const d = el("div", "ci-box" + (late ? " late" : ""));
      d.appendChild(el("b", null, late ? `⚠️ ${ciWho(x.user_id)} hasn't checked back in` : `👀 You're watching out for ${ciWho(x.user_id)}`));
      d.appendChild(el("div", null, `${x.place} · back by ${fmtClock(x.due_at)} (${ciLeft(x.due_at)})`));
      if (x.note) d.appendChild(el("div", "spot-meta", x.note));
      const row = el("div", "ci-btns");
      if (x.last_lat != null) { const a = el("a", "btn ghost small", `📍 Last seen ${fmtClock(x.last_at)}`); a.href = mapsLink(x.last_lat, x.last_lng); a.target = "_blank"; a.rel = "noopener"; row.appendChild(a); }
      else d.appendChild(el("div", "spot-meta", "No position shared (it only updates while they have Boat mode open)."));
      row.appendChild(frBtn("💬 Message", () => openChatWith(x.user_id), "btn small"));
      d.appendChild(row); w.appendChild(d);
    });
    safetyStripShow(); ciBoatRender();
  }
  function ciBoatRender() {
    const p = ci.mine, box = $("boat-ci");
    box.classList.toggle("on", !!p);
    $("boat-ci-text").textContent = p ? `🛟 Back by ${fmtClock(p.due_at)} · ${p.place}` : "🛟 No check-in running";
    $("boat-ci-btn").textContent = p ? "✅ I'm back" : "🛟 Check in";
  }
  async function ciBack(id, cancel) {
    if (cancel && !confirm("Cancel this check-in? Your buddies will be told it was cancelled.")) return;
    const { error } = await db.rpc("end_float_plan", { p_id: id, p_cancel: !!cancel });
    if (error) { toast("Couldn't update: " + error.message); return; }
    toast(cancel ? "Check-in cancelled — buddies told." : "Welcome back 👋 — your buddies were told you're safe.", 4500);
    ci.mine = null; await ciLoad();
  }
  async function ciExtend(id) {
    const { error } = await db.rpc("extend_float_plan", { p_id: id, p_minutes: 60 });
    if (error) { toast("Couldn't extend: " + error.message); return; }
    toast("Back-by time pushed 1 hour."); await ciLoad();
  }
  // Boat mode shares your position about every 2 minutes, so buddies can see where you were last
  function ciMaybePing(cur) {
    const p = ci.mine;
    if (!p || p.status !== "active" || !navigator.onLine || Date.now() - ci.lastPing < 120000) return;
    ci.lastPing = Date.now();
    db.rpc("ping_float_plan", { p_id: p.id, p_lat: +cur.lat.toFixed(5), p_lng: +cur.lng.toFixed(5) }).then(() => {}, () => {});
  }

  // --- the "Heading out" form ---
  function ciDue() {
    const t = $("ci-time").value;
    if (t) { const [h, m] = t.split(":").map(Number), d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() < Date.now() + 300000) d.setDate(d.getDate() + 1); return d; }
    return new Date(Date.now() + ci.hours * 3600000);
  }
  function ciDueText() { $("ci-due-text").textContent = "Back by " + fmtClock(ciDue()) + (ciDue().getDate() !== new Date().getDate() ? " tomorrow" : ""); }
  function ciOpen() {
    if (!me || ci.mine) return;
    if (!me.friendIds && !ciOpen.tried) { ciOpen.tried = true; loadFriends().then(ciOpen); return; }
    const friends = [...(me.friendIds || [])];
    $("ci-msg").textContent = ""; $("ci-time").value = ""; $("ci-note").value = ""; $("ci-grace").value = "30";
    $("ci-places").innerHTML = ""; (spots || []).filter(s => s.created_by === me.id).slice(0, 40).forEach(s => { const o = document.createElement("option"); o.value = s.name; $("ci-places").appendChild(o); });
    const last = (() => { try { return JSON.parse(localStorage.getItem(CI_BUD_KEY()) || "[]"); } catch (e) { return []; } })().filter(id => friends.includes(id));
    ci.pick = new Set(last);
    if (!ci.pick.size) { const rico = friends.find(id => /rico/i.test(((friendProfiles[id] || {}).display_name || "") + " " + ((friendProfiles[id] || {}).handle || ""))); if (rico) ci.pick.add(rico); }
    const pr = $("ci-presets"); pr.innerHTML = "";
    [2, 4, 6, 8].forEach(h => { const b = el("button", ci.hours === h ? "on" : "", `${h} hours`); b.type = "button"; b.addEventListener("click", () => { ci.hours = h; $("ci-time").value = ""; pr.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); ciDueText(); }); pr.appendChild(b); });
    const bx = $("ci-buddies"); bx.innerHTML = "";
    if (!friends.length) bx.appendChild(el("div", "spot-meta", "You need at least one friend first — add one in 👥 Friends."));
    friends.slice(0, 40).forEach(id => {
      const b = el("button", "ci-bud" + (ci.pick.has(id) ? " on" : ""), ciWho(id)); b.type = "button"; b.style.margin = "0 8px 8px 0";
      b.addEventListener("click", () => { if (ci.pick.has(id)) ci.pick.delete(id); else if (ci.pick.size < 5) ci.pick.add(id); b.classList.toggle("on", ci.pick.has(id)); });
      bx.appendChild(b);
    });
    ciDueText(); $("ci-sheet").hidden = false;
    // a spot you're standing near is a good guess for "where"
    if (!$("ci-place").value && navigator.geolocation) navigator.geolocation.getCurrentPosition(p => {
      const n = nearbySpots({ lat: p.coords.latitude, lng: p.coords.longitude })[0];
      if (n && n.d <= 1 && !$("ci-place").value) $("ci-place").value = n.s.name;
    }, () => {}, { timeout: 4000, maximumAge: 300000 });
  }
  $("ci-time").addEventListener("input", ciDueText);
  $("ci-cancel").addEventListener("click", () => { $("ci-sheet").hidden = true; });
  $("ci-start").addEventListener("click", ciOpen);
  $("ci-form").addEventListener("submit", async e => {
    e.preventDefault(); if (ci.sending) return;
    const place = $("ci-place").value.trim(), msg = $("ci-msg");
    if (!place) { msg.className = "msg err"; msg.textContent = "Say where you're going."; return; }
    if (!ci.pick.size) { msg.className = "msg err"; msg.textContent = "Pick at least one buddy to watch out for you."; return; }
    ci.sending = true; $("ci-go").disabled = true; msg.className = "msg"; msg.textContent = "Starting…";
    const spot = (spots || []).find(s => s.created_by === me.id && s.name === place);
    const pos = await new Promise(res => { if (!navigator.geolocation) return res(null); navigator.geolocation.getCurrentPosition(p => res(p.coords), () => res(null), { timeout: 5000, maximumAge: 120000 }); });
    const { error } = await db.rpc("start_float_plan", { p_spot: spot ? spot.id : null, p_place: place, p_note: $("ci-note").value.trim(), p_due: ciDue().toISOString(),
      p_grace: +$("ci-grace").value, p_buddies: [...ci.pick], p_lat: pos ? +pos.latitude.toFixed(5) : null, p_lng: pos ? +pos.longitude.toFixed(5) : null });
    ci.sending = false; $("ci-go").disabled = false;
    if (error) { msg.className = "msg err"; msg.textContent = "Couldn't start: " + error.message; return; }
    try { localStorage.setItem(CI_BUD_KEY(), JSON.stringify([...ci.pick])); } catch (e2) {}
    $("ci-sheet").hidden = true; toast("🛟 Check-in started — your buddies know.", 4500);
    ci.lastPing = 0; await ciLoad(); wxRefresh(true);
  });
  $("boat-ci-btn").addEventListener("click", () => { if (ci.mine) ciBack(ci.mine.id, false); else ciOpen(); });

  function safetyStart() {
    safetyStripShow(); ciLoad(); wxRefresh();
    clearInterval(ci.timer); ci.timer = setInterval(() => { if (document.visibilityState === "visible" && me) { ciLoad(); wxRefresh(); inboxLoad(); } }, 60000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && me) { ciLoad(); wxRefresh(); } });
  }
  function safetyStop() { clearInterval(ci.timer); ci.mine = null; ci.watch = []; wx.list = []; $("safety-strip").hidden = true; }

