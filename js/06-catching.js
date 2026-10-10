  // ---- Quick catch: snap a photo, the app does the rest ----
  const QC_NEAR_MI = 0.15;           // within ~800 ft counts as "at" a saved spot
  const COMMON_SPECIES = ["Snook", "Mangrove snapper", "Jack crevalle", "Tarpon", "Sheepshead", "Spanish mackerel", "Mullet", "Ladyfish"];
  const qc = { stream: null, blob: null, pos: null, when: null, watch: null };

  function toast(text, ms) {
    const t = $("qc-toast"); t.textContent = text; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms || 3500);
  }

  function nearbySpots(pos) {
    return (spots || []).filter(hasLoc)
      .map(s => ({ s, d: miles(pos.lat, pos.lng, s.lat, s.lng) }))
      .sort((a, b) => a.d - b.d);
  }
  function fmtDist(mi) { return mi < 0.2 ? `${Math.round(mi * 5280)} ft` : `${mi.toFixed(1)} mi`; }

  function updateWhere() {
    const w = $("qc-where");
    if (!qc.pos) return;
    const near = nearbySpots(qc.pos)[0];
    w.textContent = near && near.d <= QC_NEAR_MI ? `📍 At ${near.s.name}` : "📍 New spot here";
  }

  async function startCamera() {
    $("qc-camerr").hidden = true;
    try {
      qc.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
      $("qc-video").srcObject = qc.stream;
      await $("qc-video").play().catch(() => {});
    } catch (e) {
      $("qc-camerr").hidden = false;
      $("qc-camerr").textContent = "Camera not available — allow camera access for this site, or tap Library / No photo.";
    }
  }
  function stopCamera() {
    if (qc.stream) qc.stream.getTracks().forEach(t => t.stop());
    qc.stream = null;
  }
  function startLocation() {
    qc.pos = null;
    if (!navigator.geolocation) { $("qc-where").textContent = "📍 Location not available"; return; }
    qc.watch = navigator.geolocation.watchPosition(p => {
      qc.pos = { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5), acc: p.coords.accuracy, at: new Date().toISOString() };
      updateWhere();
      if (!$("qc-review").hidden) fillSpotChoices();
    }, () => { $("qc-where").textContent = "📍 Couldn't get location — you can pick the spot"; },
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 });
  }
  function stopLocation() { if (qc.watch != null) navigator.geolocation.clearWatch(qc.watch); qc.watch = null; }

  function openQuickCatch() {
    qc.blob = null; qc.when = null; qc.source = ""; qc.visTouched = false;
    $("qc-length").value = ""; $("qc-weight").value = ""; $("qc-size-note").textContent = "";
    $("qc-spot").innerHTML = ""; // start fresh — don't carry over the last catch's spot
    $("qc").hidden = false; $("qc-cam").hidden = false; $("qc-review").hidden = true;
    qcMeasureSet(false);
    $("qc-where").textContent = "📍 Finding your location…";
    startLocation();
    startCamera();
  }
  function closeQuickCatch() {
    stopCamera(); stopLocation(); qcMeasureSet(false);
    try { window.removeEventListener("deviceorientation", mOri); } catch (e) { /* ok */ }
    $("qc").hidden = true;
    if ($("qc-shot").src) { URL.revokeObjectURL($("qc-shot").src); $("qc-shot").removeAttribute("src"); }
  }

  async function snap() {
    const v = $("qc-video");
    if (!qc.stream || !v.videoWidth) return;
    const MAX = 1600, scale = Math.min(1, MAX / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    qc.blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.8));
    keepAppPhoto(qc.blob);
    qc.when = new Date();
    qc.source = "";
    showReview();
    qcAutoMeasure();
  }

  function fillSpotChoices() {
    const sel = $("qc-spot"), keep = sel.value;
    sel.innerHTML = "";
    const list = qc.pos ? nearbySpots(qc.pos) : (spots || []).map(s => ({ s, d: null }));
    const nearest = list[0];
    const atSpot = qc.pos && nearest && nearest.d <= QC_NEAR_MI;
    if (qc.pos) {
      const o = document.createElement("option"); o.value = "__new";
      o.textContent = "➕ New spot right here"; sel.appendChild(o);
    }
    list.slice(0, 15).forEach(({ s, d }) => {
      const o = document.createElement("option"); o.value = s.id;
      o.textContent = s.name + (d != null ? ` — ${fmtDist(d)}` : ""); sel.appendChild(o);
    });
    (spots || []).filter(s => !hasLoc(s)).forEach(s => {
      const o = document.createElement("option"); o.value = s.id; o.textContent = s.name + " (no location)"; sel.appendChild(o);
    });
    sel.value = keep && [...sel.options].some(o => o.value === keep) ? keep : (atSpot ? nearest.s.id : (qc.pos ? "__new" : (sel.options[0] && sel.options[0].value)));
    spotNote();
  }
  function spotNote() {
    const v = $("qc-spot").value;
    $("qc-spot-note").textContent = v === "__new"
      ? "A private spot will be created here — add its details later with ✎ Edit spot."
      : !qc.pos ? "No location yet — pick the spot you're at." : "";
    syncQcVis(); qcContestHint();
  }
  $("qc-spot").addEventListener("change", spotNote);

  // Who can see the catch: starts at the spot's level (a brand-new quick spot is private) until you pick one yourself
  function qcVisDefault() {
    const v = $("qc-spot").value;
    if (v === "__new") return "private";
    const sp = (spots || []).find(x => x.id === v);
    return (sp && (sp.visibility || (sp.is_private ? "private" : "friends"))) || "friends";
  }
  function syncQcVis() { if (!qc.visTouched) $("qc-vis").value = qcVisDefault(); }
  $("qc-vis").addEventListener("change", () => { qc.visTouched = true; qcContestHint(); });
  $("qc-measure").addEventListener("click", () => {
    if (!qc.blob) { $("qc-size-note").textContent = "📷 Take or choose a photo first, then tap 📏. Lay a ruler, dollar bill or card next to the fish and shoot from straight above."; return; }
    openMeasure(qc.blob, len => { $("qc-length").value = len; updateQcSize(); }, { onMarked: qcSetMarked });
  });
  function updateQcSize() {
    const len = parseFloat($("qc-length").value), w = parseFloat($("qc-weight").value);
    const chip = $("qc-species").querySelector(".fchip.on"), sp = ($("qc-species-other").value.trim() || (chip && chip.textContent) || "");
    const est = len > 0 && !(w > 0) ? estWeight(sp, len) : null;
    $("qc-size-note").textContent = est ? `⚖️ About ${lbText(est)} (estimated from length — type a weight if you weighed it)` : "";
    keeperShow($("qc-keeper"), sp, len, new Date());
    qcContestHint();
  }
  $("qc-length").addEventListener("input", updateQcSize); $("qc-weight").addEventListener("input", updateQcSize);
  $("qc-species").addEventListener("click", () => setTimeout(updateQcSize, 0)); $("qc-species-other").addEventListener("input", updateQcSize);
  // Tells you which of your joined, running contests this catch will count in (the app checks the same rules the scoreboard does)
  function qcContestHint() {
    const box = $("qc-contest-hint"); if (!box) return;
    const live = (typeof ctRows !== "undefined" ? ctRows : []).filter(t => ctMine[t.id] === "joined" && ctState(t).k === "live");
    box.innerHTML = "";
    const trip = activeTripFor($("qc-spot").value === "__new" ? null : $("qc-spot").value, qc.pos);
    box.hidden = !live.length && !trip;
    if (trip) { const ts = (spots || []).find(x => x.id === trip.spot_id); box.appendChild(el("div", null, `🎣 Part of your planned trip${ts ? " at " + ts.name : ""} (${planWhen(new Date(trip.plan_at))}) — your trip mates will see it in the trip review${qc.pos && qc.pos.acc != null ? ", with its exact spot" : ""}.`)); }
    const chip = $("qc-species").querySelector(".fchip.on");
    const species = ($("qc-species-other").value.trim() || (chip && chip.textContent) || "").trim().toLowerCase();
    live.forEach(t => {
      const bad = [], note = [];
      if (t.kind === "official" && $("qc-vis").value !== "public") bad.push("set to 🌎 Public");
      if (t.require_photo && !qc.blob) bad.push("add a photo");
      if (t.species && species && species !== t.species.toLowerCase()) bad.push("only " + t.species + " counts");
      if (t.plan_id) { // a trip contest only counts catches at the trip spot (within a mile)
        const tp = plans.find(x => x.id === t.plan_id), tps = tp && (spots || []).find(x => x.id === tp.spot_id);
        const pickedId = $("qc-spot").value, picked = (spots || []).find(x => x.id === pickedId);
        if (tp && tps) {
          const near = pickedId === tp.spot_id || (hasLoc(tps) && ((hasLoc(picked) && miles(picked.lat, picked.lng, tps.lat, tps.lng) <= 1) || (qc.pos && miles(qc.pos.lat, qc.pos.lng, tps.lat, tps.lng) <= 1)));
          if (!near) bad.push("only catches at " + tps.name + " count");
        }
      }
      if (t.require_length && !(parseFloat($("qc-length").value) > 0)) bad.push("add the length (📏 or type it)");
      if (t.geo_lat != null) {
        if (!qc.pos || qc.pos.acc == null) bad.push("needs live GPS");
        else if (miles(qc.pos.lat, qc.pos.lng, t.geo_lat, t.geo_lng) > t.geo_radius_mi) bad.push("you're outside the contest area");
        else note.push("📍 inside the area ✓");
      }
      const line = el("div", null, `🏁 ${t.title}: ` + (bad.length ? "won't count yet — " + bad.join(", ") : "counts ✓") + (note.length ? " (" + note.join("; ") + ")" : ""));
      box.appendChild(line);
    });
  }
  $("qc-species").addEventListener("click", () => setTimeout(qcContestHint, 0));
  $("qc-species-other").addEventListener("input", qcContestHint);

  function showReview() {
    stopCamera();
    $("qc-cam").hidden = true; $("qc-review").hidden = false;
    $("qc-source").textContent = qc.source || "";
    if (qc.blob) { $("qc-shot").src = URL.createObjectURL(qc.blob); $("qc-shot").hidden = false; }
    else $("qc-shot").hidden = true;
    $("qc-id-box").hidden = !qc.blob; $("qc-id-msg").textContent = ID_NOTE; $("qc-id-sugg").innerHTML = "";
    fillSpotChoices();
    // species chips: my recent species first, then common local ones
    const mine = Object.values(catchesBySpot).flat().filter(isMine)
      .sort((a, b) => new Date(b.caught_at) - new Date(a.caught_at)).map(c => cap((c.species || "").trim())).filter(Boolean);
    const names = [...new Set(mine.concat(COMMON_SPECIES))].slice(0, 9);
    const box = $("qc-species"); box.innerHTML = "";
    names.forEach(n => {
      const b = el("button", "fchip", n); b.type = "button";
      b.addEventListener("click", () => {
        box.querySelectorAll(".fchip").forEach(x => x.classList.remove("on"));
        b.classList.add("on"); $("qc-species-other").value = "";
      });
      box.appendChild(b);
    });
    $("qc-species-other").value = ""; $("qc-count").value = 1; $("qc-msg").textContent = "";
    fillBaitList();
    const last = Object.values(catchesBySpot).flat().filter(c => isMine(c) && c.bait).sort((a, b) => new Date(b.caught_at) - new Date(a.caught_at))[0];
    $("qc-bait").value = last ? last.bait : "";
  }
  $("qc-species-other").addEventListener("input", () => { if ($("qc-species-other").value) $("qc-species").querySelectorAll(".fchip").forEach(x => x.classList.remove("on")); });
  $("qc-minus").addEventListener("click", () => { $("qc-count").value = Math.max(1, (+$("qc-count").value || 1) - 1); });
  $("qc-plus").addEventListener("click", () => { $("qc-count").value = Math.min(500, (+$("qc-count").value || 1) + 1); });

  // All the automatic conditions for a spot at a moment (same sources as the regular catch form)
  async function conditionsFor(spot, when) {
    const fresh = spot.water_type === "freshwater";
    const [tide, wx, wt] = await Promise.allSettled([
      fresh ? Promise.reject(new Error("freshwater")) : tideStageAt(when, stationFor(spot).id, spot.tide_offset_min),
      weatherAt(when, spot.lat, spot.lng),
      !fresh && hasLoc(spot) ? waterTempAt(spot.lat, spot.lng, when) : Promise.reject(new Error("no water temp"))
    ]);
    let w = wx.status === "fulfilled" ? wx.value : null;
    if (!w && cond.pressure != null) w = { pressure: cond.pressure, trend: cond.pressureTrend, windDir: cond.windDir, windMph: cond.windMph, tempF: cond.tempF, source: "nws" };
    let moon = null, sol = null;
    try { moon = moonAt(when); sol = solunarAt(when); } catch (e) {}
    w = w || {};
    return {
      tide_stage: tide.status === "fulfilled" ? tide.value : (fresh ? null : cond.tideStage || null),
      pressure_inhg: w.pressure != null ? w.pressure : null, pressure_trend: w.trend || null,
      wind_dir: w.windDir || null, wind_mph: w.windMph != null ? w.windMph : null, air_temp_f: w.tempF != null ? w.tempF : null,
      moon_phase: moon ? moon.phase : null, moon_illum: moon ? moon.illum : null, solunar: sol || null,
      conditions_source: w.source || null,
      water_temp_f: wt.status === "fulfilled" ? wt.value.f : null,
      water_temp_source: wt.status === "fulfilled" ? wt.value.source : null
    };
  }

  async function createSpotHere(pos) {
    // Name it after a public place right here if there is one; guess saltwater near a tide station
    const sugg = (suggestions || []).map(g => ({ g, d: miles(pos.lat, pos.lng, g.lat, g.lng) })).sort((a, b) => a.d - b.d)[0];
    const named = sugg && sugg.d < 0.08 && !/unnamed/.test(sugg.g.name) ? sugg.g : null;
    const st = stationFor({ lat: pos.lat, lng: pos.lng });
    const row = {
      name: named ? named.name : `Quick spot · ${new Date().toLocaleDateString([], { month: "short", day: "numeric" })}`,
      spot_type: named ? ({ ramp: "ramp", jetty: "jetty", bridge: "bridge", pier: "pier", dock: "dock" }[named.kind] || "dock") : "dock",
      water_type: st.dist != null && st.dist < 1.5 ? "saltwater" : "brackish",
      public_access: "unsure", added_by: me.name, lat: pos.lat, lng: pos.lng, is_private: true,
      notes: "Created from a quick catch — check the type, water and access."
    };
    const { data, error } = await db.from("spots").insert(row).select("*").single();
    if (error) throw error;
    return data;
  }

  // Save one quick catch. Used right away when there's signal, and later for catches waiting in the queue.
  // `item.choice` is updated once a new spot exists, so a retry never creates the spot twice.
  async function saveQuickCatch(item, onSpotCreated) {
    const when = new Date(item.when);
    let spot;
    if (item.choice === "__new") {
      const near = item.pos && nearbySpots(item.pos)[0];
      spot = near && near.d <= QC_NEAR_MI ? near.s : await createSpotHere(item.pos); // reuse a spot made since (e.g. by an earlier queued catch)
      item.choice = spot.id;
      if (onSpotCreated) await onSpotCreated(item);
      if (!(spots || []).some(s => s.id === spot.id)) spots = (spots || []).concat(spot);
    } else {
      spot = (spots || []).find(s => s.id === item.choice);
      if (!spot) throw new Error("That spot no longer exists");
    }
    const c = await conditionsFor(spot, when);
    const base = { spot_id: spot.id, caught_at: when.toISOString(), species: item.species, how_many: item.count, bait: item.bait, caught_by: item.name, ...c };
    if (item.vis) base.visibility = item.vis;
    Object.assign(base, sizeFields(item.species, item.length, item.weight));
    if (item.session) await syncSessions();
    let { data: saved, error } = await db.from("catches").insert(item.session ? { ...base, session_id: item.session } : base).select("id").single();
    if (error && item.session && /foreign key|session/i.test(error.message || "")) // the trip didn't reach the database — keep the catch anyway
      ({ data: saved, error } = await db.from("catches").insert(base).select("id").single());
    if (error) throw error;
    await saveCatchGeo(saved.id, item.pos); // live GPS stamp for geo-locked contests
    let photoOk = true;
    if (item.blob) {
      try { await uploadPhoto(new File([item.blob], "catch.jpg", { type: "image/jpeg" }), spot.id, saved.id, { when, lat: item.pos ? item.pos.lat : null, lng: item.pos ? item.pos.lng : null }); }
      catch (pe) { photoOk = false; }
    }
    expanded.add(spot.id);
    return { spot, c, photoOk };
  }

  $("qc-save").addEventListener("click", async () => {
    const chip = $("qc-species").querySelector(".fchip.on");
    const species = ($("qc-species-other").value.trim() || (chip && chip.textContent) || "").trim();
    if (!species) { $("qc-msg").className = "msg err"; $("qc-msg").textContent = "Tap a species (or type one)."; return; }
    const choice = $("qc-spot").value;
    if (!choice) { $("qc-msg").className = "msg err"; $("qc-msg").textContent = "Pick a spot."; return; }
    const item = {
      id: newId(), when: (qc.when || new Date()).toISOString(), pos: qc.pos || null, choice, species,
      count: Math.max(1, Math.min(500, parseInt($("qc-count").value, 10) || 1)),
      bait: $("qc-bait").value.trim() || null, name: me.name, blob: qc.blob || null, user: me.id, vis: $("qc-vis").value, length: $("qc-length").value, weight: $("qc-weight").value
    };
    const trip = activeSession();
    if (trip && trip.spot_id === choice) item.session = trip.id;
    closeQuickCatch();
    if (!navigator.onLine) {
      await queueCatch(item);
      return;
    }
    toast("Saving your catch…", 20000);
    try {
      const r = await saveQuickCatch(item);
      await loadSpots();
      toast(`✓ ${item.count > 1 ? item.count + " " : ""}${item.species} logged at ${r.spot.name}${r.c.tide_stage ? " · " + r.c.tide_stage + " tide" : ""}` +
            (r.photoOk ? "" : " (photo didn't upload)"));
      if (!activeSession() && Date.now() - new Date(item.when) < 30 * 60000) showAsk(r.spot, `🎣 Fishing at ${r.spot.name} for a while? Start a trip so the hours count.`);
    } catch (err) {
      if (isNetErr(err)) await queueCatch(item); // signal dropped mid-save — keep it for later
      else toast("Couldn't save the catch: " + (err.message || err), 8000);
    }
  });

  // ---- Offline: catches waiting to upload (kept in the phone's own storage, photos included) ----
  function isNetErr(e) {
    const m = String(e && (e.message || e) || "");
    return !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed|internet connection|timed out|offline/i.test(m);
  }
  function setOffline(on) {
    $("offline-bar").hidden = !on;
    if (on) $("offline-bar").textContent = "📶 No signal — showing the copy saved on this phone. Quick catches will upload when you're back online.";
  }
  function saveCopy(kind, data) {
    try { if (me) localStorage.setItem(`fm-copy-${kind}-${me.id}`, JSON.stringify(data)); } catch (e) {}
  }
  function loadCopy(kind) {
    try { return me ? JSON.parse(localStorage.getItem(`fm-copy-${kind}-${me.id}`) || "null") : null; } catch (e) { return null; }
  }

  function idb() {
    if (idb.p) return idb.p;
    idb.p = new Promise((res, rej) => {
      const r = indexedDB.open("fishing-map", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("queue", { keyPath: "id" });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return idb.p;
  }
  async function qStore(mode) { return (await idb()).transaction("queue", mode).objectStore("queue"); }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function queuePut(item) { return reqP((await qStore("readwrite")).put(item)); }
  async function queueDel(id) { return reqP((await qStore("readwrite")).delete(id)); }
  async function queueAll() { try { return await reqP((await qStore("readonly")).getAll()); } catch (e) { return []; } }

  async function queueCatch(item) {
    try {
      await queuePut(item);
      toast(`📶 No signal — ${item.species} saved on this phone. It'll upload when you're back online.`, 5000);
    } catch (e) {
      toast("No signal, and this phone couldn't store the catch: " + (e.message || e), 8000);
    }
    updatePendingBar();
  }

  async function updatePendingBar() {
    const mine = (await queueAll()).filter(i => !me || i.user === me.id);
    $("pending-bar").hidden = !mine.length;
    if (mine.length) $("pending-text").textContent = `⏳ ${mine.length} catch${mine.length === 1 ? "" : "es"} waiting to upload`;
  }

  let flushing = false;
  async function flushQueue() {
    if (flushing || !me || !navigator.onLine) return;
    const items = (await queueAll()).filter(i => i.user === me.id).sort((a, b) => a.when.localeCompare(b.when));
    if (!items.length) { updatePendingBar(); return; }
    flushing = true;
    await syncSessions(); // a catch may belong to a trip that started without signal
    $("pending-text").textContent = "⏳ Uploading saved catches…";
    let sent = 0, stuck = null;
    for (const item of items) {
      try {
        await saveQuickCatch(item, it => queuePut(it)); // remember the new spot before going further
        await queueDel(item.id);
        sent++;
      } catch (err) {
        if (isNetErr(err)) break;           // still no signal — try again later
        stuck = err.message || String(err); // a real problem with this one — leave it, keep going
      }
    }
    flushing = false;
    if (sent) { setOffline(false); toast(`✓ ${sent} saved catch${sent === 1 ? "" : "es"} uploaded`); await loadSpots(); }
    if (stuck) toast("One saved catch couldn't upload: " + stuck, 8000);
    updatePendingBar();
  }
  $("pending-send").addEventListener("click", () => {
    if (!navigator.onLine) return toast("Still no signal — it'll send automatically when you're back online.");
    flushQueue();
  });
  window.addEventListener("online", () => { loadSpots(); flushQueue(); });
  window.addEventListener("offline", () => setOffline(true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) flushQueue(); });
  setInterval(() => flushQueue(), 60000);

  // ---- Fishing trips ("sessions"): every trip counts, even with no fish ----
  // Knowing when people fished and caught nothing lets the predictions learn what doesn't work.
  let sessionsBySpot = {};
  const uuid4 = () => crypto.randomUUID ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full */ } };
  const activeSession = () => me ? lsGet(`fm-session-${me.id}`, null) : null;
  function setActive(a) { lsSet(`fm-session-${me.id}`, a); renderSessionBar(); renderSpots(); }
  const pendingSessions = () => me ? lsGet(`fm-session-pending-${me.id}`, []) : [];
  function addPending(row) {
    const list = pendingSessions(), i = list.findIndex(r => r.id === row.id);
    if (i >= 0) list[i] = { ...list[i], ...row }; else list.push(row);
    lsSet(`fm-session-pending-${me.id}`, list);
  }
  // Send trips saved on this phone to the database (full rows, so it works whether or not the start ever reached it)
  async function syncSessions() {
    if (!me || !db || !navigator.onLine) return;
    const list = pendingSessions();
    if (!list.length) return;
    const left = [];
    for (let i = 0; i < list.length; i++) {
      try { const { error } = await db.from("sessions").upsert(list[i]); if (error) throw error; }
      catch (e) { if (isNetErr(e)) { left.push(...list.slice(i)); break; } left.push(list[i]); }
    }
    lsSet(`fm-session-pending-${me.id}`, left.length ? left : null);
  }
  const dur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? " " + (m % 60) + " min" : ""}`; };
  const sessionCatches = id => Object.values(catchesBySpot).flat().filter(c => c.session_id === id);
  // Fish on a finished trip: the catches linked to it (edits and deletes included), or what was counted when it ended
  const tripFish = x => { const n = sessionCatches(x.id).reduce((k, c) => k + (c.how_many || 1), 0); return n || x.fish || 0; };
  const tripHours = x => Math.max(1 / 60, (new Date(x.ended_at) - new Date(x.started_at)) / 3600000);

  async function startSession(spot) {
    if (activeSession()) await endSession(true);
    const row = { id: uuid4(), spot_id: spot.id, started_at: new Date().toISOString(), created_by: me.id };
    setActive({ ...row, spotName: spot.name });
    $("session-ask").hidden = true;
    addPending(row); syncSessions();
    toast(`🎣 Trip started at ${spot.name}. Catches you log here count toward it — tap End trip when you leave.`, 5000);
  }

  // Conditions for each hour of a trip (tide, time of day, solunar, moon, wind, water temp)
  function sessionHours(spot, start, end) {
    const out = [];
    for (let t = start.getTime() + 30 * 60000; t < end.getTime() && out.length < 24; t += 3600000) out.push(factorsAt(spot, new Date(t)));
    if (!out.length) out.push(factorsAt(spot, new Date((start.getTime() + end.getTime()) / 2)));
    return out;
  }

  async function endSession(quiet, endAt) {
    const a = activeSession();
    if (!a) return;
    const spot = (spots || []).find(x => x.id === a.spot_id);
    const start = new Date(a.started_at);
    let end = endAt || new Date();
    if (end - start < 60000) end = new Date(start.getTime() + 60000);
    const queued = (await queueAll()).filter(i => i.session === a.id).reduce((n, i) => n + (i.count || 1), 0);
    const fish = sessionCatches(a.id).reduce((n, c) => n + (c.how_many || 1), 0) + queued;
    addPending({ id: a.id, spot_id: a.spot_id, started_at: a.started_at, created_by: me.id, ended_at: end.toISOString(),
      fish: Math.min(1000, fish), hours: spot ? sessionHours(spot, start, end) : null, notes: endAt ? "Ended automatically" : null });
    setActive(null);
    await syncSessions();
    loadSessions();
    if (!quiet) toast(fish ? `✓ Trip saved: ${dur(end - start)} at ${a.spotName}, ${fish} fish 🎣`
      : `✓ Trip saved: ${dur(end - start)} at ${a.spotName}. Skunked — but it still counts, and it helps the predictions.`, 6000);
  }

  // A trip left running (phone forgotten in the truck) is closed for you after 12 hours
  function closeStaleSession() {
    const a = activeSession();
    if (!a) return;
    const start = new Date(a.started_at);
    if (Date.now() - start < 12 * 3600000) return;
    const last = sessionCatches(a.id).map(c => new Date(c.caught_at).getTime()).sort((x, y) => y - x)[0];
    const end = new Date(Math.min(start.getTime() + 8 * 3600000, Math.max(start.getTime() + 2 * 3600000, (last || 0) + 30 * 60000)));
    endSession(true, end).then(() => toast(`Your trip at ${a.spotName} was still running — it was ended at ${clock(end)}.`, 6000));
  }

  function renderSessionBar() {
    const a = activeSession();
    $("session-bar").hidden = !a;
    if (!a) return;
    const fish = sessionCatches(a.id).reduce((n, c) => n + (c.how_many || 1), 0);
    $("session-text").textContent = `🎣 Fishing at ${a.spotName} · ${dur(Date.now() - new Date(a.started_at))} · ${fish} fish`;
  }
  setInterval(renderSessionBar, 60000);
  $("session-end").addEventListener("click", () => endSession(false));

  async function loadSessions() {
    if (!db || !me) return;
    try {
      const { data, error } = await db.from("sessions").select("*").is("deleted_at", null).order("started_at", { ascending: false }).limit(2000);
      if (error) throw error;
      sessionsBySpot = {};
      data.forEach(x => (sessionsBySpot[x.spot_id] = sessionsBySpot[x.spot_id] || []).push(x));
      saveCopy("sessions", data);
    } catch (e) {
      const copy = loadCopy("sessions");
      if (copy) { sessionsBySpot = {}; copy.forEach(x => (sessionsBySpot[x.spot_id] = sessionsBySpot[x.spot_id] || []).push(x)); }
    }
    closeStaleSession();
    renderSessionBar(); renderBest(); renderInsights();
  }

  // "You're at Hillsboro — start a fishing trip here?" (only if location is already allowed, so it never nags)
  function showAsk(spot, text) {
    $("session-ask-text").textContent = text || `📍 You're at ${spot.name} — start a fishing trip here?`;
    $("session-ask").dataset.spot = spot.id;
    $("session-ask").hidden = false;
  }
  async function maybeAskSession() {
    if (!me || !spots || activeSession() || !navigator.geolocation || !$("session-ask").hidden) return;
    try {
      if (!navigator.permissions) return;
      const p = await navigator.permissions.query({ name: "geolocation" });
      if (p.state !== "granted") return;
    } catch (e) { return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const near = nearbySpots({ lat: pos.coords.latitude, lng: pos.coords.longitude })[0];
      if (!near || near.d > QC_NEAR_MI || activeSession()) return;
      if (Date.now() - (lsGet("fm-ask-" + near.s.id, 0) || 0) < 4 * 3600000) return; // said "not now" recently
      showAsk(near.s);
    }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 });
  }
  $("session-ask-yes").addEventListener("click", () => {
    const sp = (spots || []).find(x => x.id === $("session-ask").dataset.spot);
    if (sp) startSession(sp);
  });
  $("session-ask-no").addEventListener("click", () => {
    lsSet("fm-ask-" + $("session-ask").dataset.spot, Date.now());
    $("session-ask").hidden = true;
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { renderSessionBar(); maybeAskSession(); } });

  $("qc-fab").addEventListener("click", openQuickCatch);
  $("qc-close").addEventListener("click", closeQuickCatch);
  $("qc-shutter").addEventListener("click", snap);
  $("qc-skip").addEventListener("click", () => { qc.blob = null; qc.when = new Date(); qc.source = ""; showReview(); });
  $("qc-back").addEventListener("click", () => { $("qc-review").hidden = true; $("qc-cam").hidden = false; qc.blob = null; if (qc.measure) mTiltStart(); startCamera(); });
  $("qc-file").addEventListener("change", async () => {
    const f = $("qc-file").files[0];
    $("qc-file").value = "";
    if (!f) return;
    const info = await photoInfo(f);
    qc.blob = await compressImage(f);
    const validTime = info.when && info.when - Date.now() < 15 * 60000;
    qc.when = validTime ? info.when : new Date();
    const fmt = d => d.toLocaleString([], { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined, hour: "numeric", minute: "2-digit" });
    const parts = [validTime ? `🕒 Taken ${fmt(qc.when)} (from the photo)` : "🕒 No time in this photo — using now"];
    if (info.lat != null) { stopLocation(); qc.pos = { lat: info.lat, lng: info.lng }; parts.push("📍 Location from the photo"); }
    else if (Date.now() - qc.when > 30 * 60000) {
      // older photo: where you are now isn't where it was taken
      stopLocation(); qc.pos = null; parts.push("📍 No location in this photo — pick the spot below");
    } else parts.push("📍 Using where you are now");
    qc.source = parts.join("  ·  ");
    showReview();
    qcAutoMeasure(true);
  });

  // ---- Filters (remembered on this phone) ----
  // Within a group, any ticked option matches; across groups, all must match.
  const FILTER_GROUPS = [
    { key: "water", title: "Water", options: [["saltwater", "Saltwater"], ["brackish", "Brackish / canal"], ["freshwater", "Freshwater"]],
      test: (s, v) => v.has(s.water_type) },
    { key: "type", title: "Spot type", options: [["dock", "Dock"], ["bridge", "Bridge"], ["inlet", "Inlet"], ["pier", "Pier"], ["jetty", "Jetty"], ["seawall", "Seawall"], ["ramp", "Ramp"]],
      test: (s, v) => v.has(s.spot_type) },
    { key: "access", title: "Getting there", options: [["public", "Public access"], ["free", "Free parking"], ["anyparking", "Has parking"], ["nolongwalk", "No long walk"], ["no4x4", "No 4x4 needed"]],
      all: true, // these are each requirements, so every ticked one must be true
      test: (s, v) => [...v].every(o =>
        o === "public" ? s.public_access === "yes" :
        o === "free" ? s.parking === "free lot" :
        o === "anyparking" ? !!s.parking && s.parking !== "none" :
        o === "nolongwalk" ? s.getting_there === "walk-up" || s.getting_there === "short walk" :
        o === "no4x4" ? s.getting_there !== "needs 4x4" : true) },
    { key: "other", title: "Other", options: [["mine", "Only my spots"], ["private", "Private only"], ["catches", "Has catches"]],
      all: true,
      test: (s, v) => [...v].every(o =>
        o === "mine" ? isMine(s) :
        o === "private" ? !!s.is_private :
        o === "catches" ? (catchesBySpot[s.id] || []).length > 0 : true) }
  ];
  const filters = {};
  FILTER_GROUPS.forEach(g => { filters[g.key] = new Set(); });
  try {
    const saved = JSON.parse(localStorage.getItem("fm-filters") || "{}");
    FILTER_GROUPS.forEach(g => (saved[g.key] || []).forEach(v => filters[g.key].add(v)));
  } catch (e) {}
  function saveFilters() {
    try { const o = {}; FILTER_GROUPS.forEach(g => { o[g.key] = [...filters[g.key]]; }); localStorage.setItem("fm-filters", JSON.stringify(o)); } catch (e) {}
  }
  function activeFilterCount() { return FILTER_GROUPS.reduce((n, g) => n + filters[g.key].size, 0); }

  let spotQuery = "", spotSort = "name", sortPos = null;
  try { spotSort = localStorage.getItem("fm-spot-sort") || "name"; } catch (e) {}
  function filteredSpots() {
    let l = (spots || []).filter(s => FILTER_GROUPS.every(g => !filters[g.key].size || g.test(s, filters[g.key])));
    const q = spotQuery.trim().toLowerCase();
    if (q) l = l.filter(s => [s.name, s.spot_type, s.water_type, s.notes, s.access_notes, s.added_by, s.parking].filter(Boolean).join(" ").toLowerCase().includes(q));
    const n = s => (catchesBySpot[s.id] || []).length;
    const last = s => { const c = (catchesBySpot[s.id] || [])[0]; return c ? new Date(c.caught_at).getTime() : 0; };
    const byName = (a, b) => String(a.name).localeCompare(String(b.name));
    if (spotSort === "catches") l = l.slice().sort((a, b) => n(b) - n(a) || byName(a, b));
    else if (spotSort === "recent") l = l.slice().sort((a, b) => last(b) - last(a) || byName(a, b));
    else if (spotSort === "new") l = l.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")) || byName(a, b));
    else if (spotSort === "near" && sortPos) {
      const d = s => (s.lat != null && s.lng != null) ? miles(sortPos.lat, sortPos.lng, s.lat, s.lng) : 1e9;
      l = l.slice().sort((a, b) => d(a) - d(b) || byName(a, b));
    } else l = l.slice().sort(byName);
    return l;
  }

  function buildFilterPanel() {
    const panel = $("filter-panel");
    panel.innerHTML = "";
    FILTER_GROUPS.forEach(g => {
      const box = el("div", "fgroup");
      box.appendChild(el("div", "fgroup-title", g.title));
      const chips = el("div", "fchips");
      g.options.forEach(([val, label]) => {
        const b = el("button", "fchip" + (filters[g.key].has(val) ? " on" : ""), label);
        b.type = "button";
        b.addEventListener("click", () => {
          filters[g.key].has(val) ? filters[g.key].delete(val) : filters[g.key].add(val);
          b.classList.toggle("on");
          saveFilters();
          renderSpots(); renderPins(); renderBest();
        });
        chips.appendChild(b);
      });
      box.appendChild(chips);
      panel.appendChild(box);
    });
    const row = el("div", "row");
    const clear = el("button", "linkbtn", "Clear all"); clear.type = "button";
    clear.addEventListener("click", clearFilters);
    const done = el("button", "btn small", "Done"); done.type = "button";
    done.addEventListener("click", () => { panel.hidden = true; });
    row.appendChild(clear); row.appendChild(done);
    panel.appendChild(row);
  }
  function clearFilters() {
    FILTER_GROUPS.forEach(g => filters[g.key].clear());
    saveFilters();
    buildFilterPanel();
    renderSpots(); renderPins();
  }
  function updateFilterStatus(shownCount) {
    const n = activeFilterCount();
    $("filter-btn").textContent = n ? `⚙ Filter (${n})` : "⚙ Filter";
    $("filter-btn").classList.toggle("on", n > 0);
    const st = $("filter-status");
    st.hidden = !n;
    if (!n) return;
    st.innerHTML = "";
    st.appendChild(el("span", null, `Showing ${shownCount} of ${(spots || []).length} spots`));
    const clear = el("button", "linkbtn", "Clear filters"); clear.type = "button";
    clear.addEventListener("click", clearFilters);
    st.appendChild(clear);
  }
  $("filter-btn").addEventListener("click", () => {
    const panel = $("filter-panel");
    if (panel.hidden) buildFilterPanel();
    panel.hidden = !panel.hidden;
  });

  // ---- Catch log ----
  let catchesBySpot = {};        // spot id -> list of catches, newest first
  let openCatchSpot = null;      // spot id whose "log a catch" form is open
  const expanded = new Set();    // spot ids whose catch history is showing
  const STAGE_LABEL = { incoming: "⬆ incoming", outgoing: "⬇ outgoing", "high slack": "high slack", "low slack": "low slack" };

  // One form, built once and moved under whichever spot is being logged,
  // so a background refresh never wipes what someone is typing.
  const catchForm = document.createElement("form");
  catchForm.className = "catch-form";
  catchForm.innerHTML = `
    <div class="label" id="c-title">Log a catch</div>
    <label for="c-species">Species *</label>
    <input id="c-species" required maxlength="60" list="species-list" placeholder="e.g., Snook">
    <datalist id="species-list">
      <option>Snook</option><option>Tarpon</option><option>Jack crevalle</option>
      <option>Mangrove snapper</option><option>Lane snapper</option><option>Yellowtail snapper</option>
      <option>Mutton snapper</option><option>Sheepshead</option><option>Spanish mackerel</option>
      <option>Bluefish</option><option>Florida pompano</option><option>Permit</option>
      <option>Barracuda</option><option>Ladyfish</option><option>Mullet</option>
      <option>Grunt</option><option>Porgy</option><option>Triggerfish</option>
      <option>Redfish</option><option>Black drum</option><option>Gag grouper</option>
      <option>Goliath grouper (released)</option><option>Gulf toadfish</option>
      <option>Peacock bass</option><option>Largemouth bass</option><option>Mayan cichlid</option>
      <option>Bluegill</option><option>Clown knifefish</option>
    </datalist>
    <div class="two">
      <div><label for="c-count">How many</label><input id="c-count" type="number" min="1" max="500" value="1"></div>
      <div><label for="c-tide">Tide stage</label>
        <select id="c-tide">
          <option value="">—</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option>
          <option value="high slack">High slack</option><option value="low slack">Low slack</option>
        </select>
      </div>
    </div>
    <label for="c-bait">Bait / lure</label>
    <input id="c-bait" maxlength="80" list="bait-list" placeholder="e.g., live shrimp, white bucktail">
    <label for="c-when">When</label>
    <input id="c-when" type="datetime-local">
    <label for="c-by">Caught by</label>
    <input id="c-by" maxlength="40" placeholder="Your name">
    <label for="c-notes">Notes</label>
    <input id="c-notes" maxlength="500" placeholder="Where on the spot, etc.">
    <label for="c-vis">Who can see this catch?</label>
    <select id="c-vis">
      <option value="friends">👥 Friends</option>
      <option value="private">🔒 Private — only you</option>
      <option value="public">🌎 Public — everyone on the app (the spot stays hidden unless it's public too)</option>
    </select>
    <label for="c-photo">📷 Photo (optional)</label>
    <input id="c-photo" type="file" accept="image/*">
    <div class="spot-meta" id="c-photo-info" style="margin-top:6px"></div>
    <button type="button" class="btn ghost small" id="c-more-btn" style="margin-top:6px">➕ Add more photos of this catch</button>
    <input id="c-more" type="file" accept="image/*" multiple hidden>
    <div class="spot-meta" id="c-more-info" style="margin-top:6px"></div>
    <div class="two">
      <div><label for="c-length">Length (inches)</label><input id="c-length" type="number" min="0.5" max="199" step="0.25" inputmode="decimal"></div>
      <div><label for="c-weight">Weight (lb)</label><input id="c-weight" type="number" min="0.05" max="1999" step="0.05" inputmode="decimal" placeholder="Optional"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="btn ghost small" id="c-measure" type="button">📏 Measure (camera or photo)</button>
      <button class="btn ghost small" id="c-identify" type="button">🔍 Identify fish</button>
    </div>
    <div class="spot-meta" id="c-id-msg"></div>
    <div class="id-sugg" id="c-id-sugg"></div>
    <div class="spot-meta" id="c-size-note" style="margin-top:6px"></div>
    <div class="keeper" id="c-keeper" hidden></div>
    <div class="spot-meta" id="c-cond" style="margin-top:10px"></div>
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" id="c-cancel" type="button">Cancel</button>
      <button class="btn" id="c-save" type="submit">Save catch</button>
    </div>
    <div class="msg" id="c-msg"></div>`;

  function localInputValue(d) {
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // ---- Conditions at any date & time (used by the catch log) ----
  const LAT = 26.24, LNG = -80.10;   // Pompano Beach / Hillsboro Inlet area
  let catchCond = null;              // conditions looked up for the time in the form
  let condPromise = null;            // the lookup in progress, so Save can wait for it
  let condRequest = 0;               // ignore an old lookup if the time changes again
  let tideTouched = false;           // the angler picked the tide stage by hand
  const pad2 = n => String(n).padStart(2, "0");
  const ymdDash = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  function compass(deg) {
    const pts = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    return pts[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
  }

  // Tide stage at a given moment, from NOAA's high/low predictions (works for any date)
  async function tideStageAt(when, stationId, offsetMin) {
    when = new Date(when.getTime() - (offsetMin || 0) * 60000); // the tide here runs late/early: look up the station's matching moment
    const start = new Date(when.getTime() - 36 * 3600000);
    const url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter" +
      `?product=predictions&application=fishing_map&begin_date=${ymd(start)}&range=72` +
      `&datum=MLLW&station=${stationId || STATION}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
    const data = await (await fetch(url)).json();
    if (!data.predictions) throw new Error("No tide data");
    const tides = data.predictions.map(p => ({ when: parseNoaa(p.t), high: p.type === "H" }));
    const prev = [...tides].reverse().find(t => t.when <= when);
    const next = tides.find(t => t.when > when);
    if (!prev || !next) throw new Error("No tide data for that time");
    const SLACK = 30 * 60000;
    if (when - prev.when < SLACK) return prev.high ? "high slack" : "low slack";
    if (next.when - when < SLACK) return next.high ? "high slack" : "low slack";
    return next.high ? "incoming" : "outgoing";
  }

  // Pressure (+3-hour trend), wind and temperature for a given hour, from Open-Meteo's free weather records
  async function weatherAt(when, lat, lng) {
    if (lat == null || lng == null) { lat = LAT; lng = LNG; }
    const day = ymdDash(when), dayBefore = ymdDash(new Date(when.getTime() - 86400000));
    const params = `latitude=${(+lat).toFixed(3)}&longitude=${(+lng).toFixed(3)}` +
      "&hourly=pressure_msl,wind_speed_10m,wind_direction_10m,temperature_2m" +
      "&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=America%2FNew_York" +
      `&start_date=${dayBefore}&end_date=${day}`;
    const recentUrl = "https://api.open-meteo.com/v1/forecast?" + params;
    const archiveUrl = "https://archive-api.open-meteo.com/v1/archive?" + params;
    const ageDays = (Date.now() - when) / 86400000;
    for (const url of ageDays > 60 ? [archiveUrl, recentUrl] : [recentUrl, archiveUrl]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const h = (await res.json()).hourly;
        const i = h.time.indexOf(`${day}T${pad2(when.getHours())}:00`);
        if (i < 0 || h.pressure_msl[i] == null) continue;
        const inHg = h.pressure_msl[i] / 33.8639;
        let trend = null;
        if (i >= 3 && h.pressure_msl[i - 3] != null) {
          const change = inHg - h.pressure_msl[i - 3] / 33.8639;
          trend = change >= 0.03 ? "rising" : change <= -0.03 ? "falling" : "steady";
        }
        return {
          pressure: Math.round(inHg * 100) / 100, trend,
          windDir: h.wind_direction_10m[i] != null ? compass(h.wind_direction_10m[i]) : null,
          windMph: h.wind_speed_10m[i] != null ? Math.round(h.wind_speed_10m[i]) : null,
          tempF: h.temperature_2m[i] != null ? Math.round(h.temperature_2m[i]) : null,
          source: "open-meteo"
        };
      } catch (e) { /* try the other source */ }
    }
    throw new Error("No weather record for that time");
  }

  // Moon phase and solunar periods (pure astronomy, works offline for any date)
  const MOON_EMOJI = { "new moon": "🌑", "waxing crescent": "🌒", "first quarter": "🌓", "waxing gibbous": "🌔",
    "full moon": "🌕", "waning gibbous": "🌖", "last quarter": "🌗", "waning crescent": "🌘" };
  function moonAt(when) {
    const m = SunCalc.getMoonIllumination(when), p = m.phase;
    const phase = p < 0.03 || p > 0.97 ? "new moon" : p < 0.22 ? "waxing crescent" : p < 0.28 ? "first quarter" :
      p < 0.47 ? "waxing gibbous" : p < 0.53 ? "full moon" : p < 0.72 ? "waning gibbous" : p < 0.78 ? "last quarter" : "waning crescent";
    return { phase, illum: Math.round(m.fraction * 100), emoji: MOON_EMOJI[phase] };
  }
  // Major = moon overhead or underfoot (about 2 hours); minor = moonrise or moonset (about 1 hour)
  function solunarPeriods(day) {
    const d0 = new Date(day); d0.setHours(0, 0, 0, 0);
    const d1 = new Date(d0.getTime() + 86400000);
    const out = [], STEP = 5 * 60000, t0 = d0.getTime() - 2 * 3600000;
    const alt = [];
    for (let t = t0; t <= d1.getTime() + 2 * 3600000; t += STEP) alt.push(SunCalc.getMoonPosition(new Date(t), LAT, LNG).altitude);
    for (let k = 1; k < alt.length - 1; k++) {
      const t = new Date(t0 + k * STEP);
      if (t < d0 || t >= d1) continue;
      const peak = alt[k] > alt[k - 1] && alt[k] >= alt[k + 1], trough = alt[k] < alt[k - 1] && alt[k] <= alt[k + 1];
      if (peak || trough) out.push({ type: "major", center: t, why: peak ? "moon overhead" : "moon underfoot",
        start: new Date(t - 3600000), end: new Date(+t + 3600000) });
    }
    const mt = SunCalc.getMoonTimes(d0, LAT, LNG);
    [["rise", "moonrise"], ["set", "moonset"]].forEach(([k, why]) => {
      if (mt[k]) out.push({ type: "minor", center: mt[k], why, start: new Date(mt[k] - 1800000), end: new Date(+mt[k] + 1800000) });
    });
    return out.sort((a, b) => a.start - b.start);
  }
  function solunarAt(when) {
    let hit = null;
    [-1, 0, 1].forEach(off => solunarPeriods(new Date(when.getTime() + off * 86400000)).forEach(p => {
      if (when >= p.start && when <= p.end && (!hit || p.type === "major")) hit = p.type;
    }));
    return hit;
  }

  function catchWhen() {
    const v = catchForm.querySelector("#c-when").value;
    return v ? new Date(v) : new Date();
  }

  function lookupCatchConditions() {
    const id = ++condRequest;
    const out = catchForm.querySelector("#c-cond");
    const when = catchWhen();
    catchCond = null;
    if (when - Date.now() > 15 * 60000) {
      out.textContent = "That time is in the future — pick when you caught it.";
      condPromise = Promise.resolve();
      return;
    }
    let moon = null, sol = null;
    try { moon = moonAt(when); sol = solunarAt(when); } catch (e) {}
    out.textContent = "Looking up conditions for that time…";
    const recent = Math.abs(Date.now() - when) <= 2 * 3600000;
    const spot = (spots || []).find(x => x.id === openCatchSpot);
    const fresh = spot && spot.water_type === "freshwater";
    const tideJob = fresh ? Promise.reject(new Error("freshwater")) : tideStageAt(when, spot ? stationFor(spot).id : STATION, spot && spot.tide_offset_min);
    const wtJob = spot && hasLoc(spot) && !fresh ? waterTempAt(spot.lat, spot.lng, when) : Promise.reject(new Error("no water temp"));
    condPromise = Promise.allSettled([tideJob, weatherAt(when, spot && spot.lat, spot && spot.lng), wtJob]).then(([tide, wx, wt]) => {
      if (id !== condRequest) return; // the time changed again; a newer lookup is running
      let w = wx.status === "fulfilled" ? wx.value : null;
      if (!w && recent && cond.pressure != null) {
        // Weather records unavailable — fall back to the live readings for a just-caught fish
        w = { pressure: cond.pressure, trend: cond.pressureTrend, windDir: cond.windDir, windMph: cond.windMph, tempF: cond.tempF, source: "nws" };
      }
      const stage = tide.status === "fulfilled" ? tide.value : (recent && !fresh ? cond.tideStage : null);
      catchCond = { ...(w || {}), tideStage: stage || null, moon, solunar: sol,
        waterF: wt.status === "fulfilled" ? wt.value.f : null, waterSource: wt.status === "fulfilled" ? wt.value.source : null };
      const tideSel = catchForm.querySelector("#c-tide");
      if (!tideTouched) tideSel.value = stage || "";
      out.textContent = condSummary(catchCond) + (!w ? " (Weather record not available for that time.)" : "");
    });
  }

  function condSummary(c) {
    const parts = [
      c.tideStage && `tide ${c.tideStage}`,
      c.pressure != null && `${Number(c.pressure).toFixed(2)} inHg${c.trend ? " " + c.trend : ""}`,
      c.windDir && c.windMph != null && `wind ${c.windDir} ${c.windMph} mph`,
      c.tempF != null && `${c.tempF}°F air`,
      c.waterF != null && `${Math.round(c.waterF)}°F water`,
      c.moon && `${c.moon.emoji} ${c.moon.phase} (${c.moon.illum}%)`,
      c.solunar && `${c.solunar} solunar period`
    ].filter(Boolean);
    return parts.length ? "Saved with this catch: " + parts.join(" · ") : "Couldn't find conditions for that time.";
  }

  catchForm.querySelector("#c-when").addEventListener("change", lookupCatchConditions);

  catchForm.querySelector("#c-photo").addEventListener("change", async () => {
    const out = catchForm.querySelector("#c-photo-info");
    const f = catchForm.querySelector("#c-photo").files[0];
    out.textContent = "";
    if (!f) return;
    out.textContent = "Reading photo details…";
    const info = await photoInfo(f);
    const notes = [];
    if (info.when && info.when - Date.now() < 15 * 60000) {
      const whenInput = catchForm.querySelector("#c-when");
      const before = whenInput.value;
      whenInput.value = localInputValue(info.when);
      if (whenInput.value !== before) {
        notes.push(`🕒 Time set from the photo: ${info.when.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
        tideTouched = false;
        lookupCatchConditions();
      } else notes.push("🕒 Photo time matches");
    } else notes.push("🕒 No time saved in this photo — keep the time above");
    const spot = (spots || []).find(x => x.id === openCatchSpot);
    if (info.lat != null) {
      if (spot && hasLoc(spot)) {
        const d = miles(spot.lat, spot.lng, info.lat, info.lng);
        if (d > 0.3) {
          const near = (spots || []).filter(hasLoc).map(x => ({ x, d: miles(x.lat, x.lng, info.lat, info.lng) })).sort((a, b) => a.d - b.d)[0];
          notes.push(`📍 Heads up: this photo was taken ${d.toFixed(1)} mi from ${spot.name}` +
            (near && near.x.id !== spot.id && near.d < 0.3 ? ` — it looks like ${near.x.name}.` : "."));
        } else notes.push(`📍 Taken at ${spot.name} ✓`);
      } else notes.push("📍 Photo has a location");
    } else notes.push("📍 No location in this photo (phones often remove it)");
    out.textContent = notes.join("  ·  ");
    catchForm.photoInfo = info;
  });
  catchForm.querySelector("#c-tide").addEventListener("change", () => { tideTouched = true; });
  // Extra photos for the same catch (the first photo above stays the one used for time, measuring and fish ID)
  const EXTRA_MAX = 29;
  catchForm.extraPhotos = [];
  function showExtraPhotos() {
    const n = catchForm.extraPhotos.length, out = catchForm.querySelector("#c-more-info");
    out.textContent = n ? `+${n} more photo${n === 1 ? "" : "s"} will be added with this catch` : "";
    if (n) { const x = el("button", "linkbtn", " Clear"); x.type = "button"; x.addEventListener("click", () => { catchForm.extraPhotos = []; showExtraPhotos(); }); out.appendChild(x); }
  }
  catchForm.querySelector("#c-more-btn").addEventListener("click", () => catchForm.querySelector("#c-more").click());
  catchForm.querySelector("#c-more").addEventListener("change", () => {
    const inp = catchForm.querySelector("#c-more"), picked = Array.from(inp.files || []); inp.value = "";
    const room = EXTRA_MAX - catchForm.extraPhotos.length;
    if (picked.length > room) toast(`A catch can have up to ${EXTRA_MAX + 1} photos in total.`, 3500);
    catchForm.extraPhotos = catchForm.extraPhotos.concat(picked.slice(0, Math.max(0, room)));
    showExtraPhotos();
  });

