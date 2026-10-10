  // ---- Best spot today ----
  // For each spot, compare each hour of the next 12 against its catch history.
  // A condition scores well when more fish were caught under it than chance alone would give
  // (e.g. dusk is only ~2 of 24 hours, so 3 of 5 dusk catches is a strong signal).
  const BASELINE = { // roughly how much of the time each condition happens
    tide:  { incoming: .42, outgoing: .42, "high slack": .08, "low slack": .08 },
    trend: { falling: 1/3, steady: 1/3, rising: 1/3 },
    tod:   Object.fromEntries(TIME_BLOCKS.map(b => [b, 1 / 8])),
    sol:   { major: .167, minor: .083, none: .75 },
    moon:  { "new moon": .06, "waxing crescent": .19, "first quarter": .06, "waxing gibbous": .19,
             "full moon": .06, "waning gibbous": .19, "last quarter": .06, "waning crescent": .19 },
    wind:  { "0–5 mph": .25, "6–10 mph": .25, "11–15 mph": .25, "16+ mph": .25 },
    // Southeast Florida water over a year: rarely under 70°F, mostly mid-70s to mid-80s
    water: { "Under 70°F": .05, "70–74°F": .2, "75–79°F": .3, "80–84°F": .3, "85°F+": .15 }
  };
  const FACTOR_LABEL = {
    tide: v => cap(v) + " tide", trend: v => cap(v) + " pressure", tod: v => "Between " + v,
    sol: v => v === "none" ? "outside solunar periods" : cap(v) + " solunar period", moon: v => cap(v), wind: v => "wind " + v,
    water: v => "water " + v
  };
  function catchFactors(c) {
    return {
      tide: c.tide_stage || null, trend: c.pressure_trend || null, tod: timeOfDay(new Date(c.caught_at)),
      sol: c.moon_phase ? (c.solunar || "none") : null, moon: c.moon_phase || null, wind: windBand(c.wind_mph),
      water: waterBand(c.water_temp_f)
    };
  }
  function windAt(t) {
    const h = (cond.hours || []).find(x => t >= x.start && t < x.end);
    return h ? h.mph : cond.windMph;
  }
  function factorsAt(s, t, fh) {
    let tide = null;
    if (s.water_type !== "freshwater") {
      const st = spotTides(s);
      if (st && st !== "error") { const r = stageFrom(st, t); tide = r ? r.stage : null; }
    }
    let sol = null, moon = null;
    try { sol = solunarAt(t) || "none"; moon = moonAt(t).phase; } catch (e) {}
    let water = null;
    if (hasLoc(s) && s.water_type !== "freshwater") {
      const w = waterTempNow(s.lat, s.lng);
      if (w.done && w.done !== "error") water = waterBand(w.done.f);
    }
    return { tide, trend: fh ? fh.trend : (cond.pressureTrend || null), tod: timeOfDay(t), sol, moon, wind: windBand(fh ? fh.mph : windAt(t)), water };
  }

  // Things about the spot as a whole (same all day): is it the season for what's caught here, and have
  // people photographed those kinds of fish nearby lately? Small nudges on top of the hour-by-hour match.
  function spotExtras(s, catches) {
    let bonus = 0; const notes = [];
    // Season: what's been caught here (or by the group, for a new spot), weighted by fish
    const bySp = new Map();
    catches.forEach(c => {
      const f = seasonFor(c.species);
      if (f) bySp.set(f, (bySp.get(f) || 0) + (c.how_many || 1));
    });
    const m = new Date().getMonth();
    const tot = [...bySp.values()].reduce((a, b) => a + b, 0);
    if (tot) {
      // Season counts about as much as a strong tide or solunar match: peak +0.5, slow −0.5
      const avg = [...bySp.entries()].reduce((n, [f, k]) => n + shoreLevel(f, m) * k, 0) / tot;
      bonus += (avg - 1) * 0.5;
      const top = [...bySp.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const lvl = shoreLevel(top, m);
      notes.push(lvl === 2 ? `🔥 ${top.name} peak season from shore` : lvl === 1 ? `📅 ${top.name}: decent month` : `📅 ${top.name}: slow month from shore`);
      if (spawningIn(top, m)) {
        const sp = top.spawn;
        notes.push(sp.away && lvl === 0 ? `🥚 spawning offshore — rarely at shore spots now`
          : sp.gather ? `🥚 spawning — they bunch up within reach of shore` : sp.away && lvl === 1 ? `🥚 spawning offshore — fewer big ones inshore` : `🥚 spawning season`);
      }
      if (seasonOpen(top, new Date()) === false) notes.push(`⛔ closed to keep`);
      // Water temperature vs. what these fish like (salt and brackish spots — we don't have canal water temps)
      let t = null;
      if (hasLoc(s) && s.water_type !== "freshwater") { const w = waterTempNow(s.lat, s.lng); if (w.done && w.done !== "error") t = w.done.f; }
      if (t != null) {
        bonus += [...bySp.entries()].reduce((n, [f, k]) => n + tempFit(f, t).pen * k, 0) / tot;
        const fit = tempFit(top, t);
        if (fit.text) notes.push(fit.text);
      }
    }
    // Public sightings within 5 mi (iNaturalist, last 60 days)
    const seen = typeof sightsNear === "function" ? sightsNear(s) : [];
    if (seen.length) {
      bonus += seen.length >= 6 ? 0.3 : seen.length >= 3 ? 0.2 : 0.1;
      const kinds = [...new Set(seen.map(o => o.name))];
      notes.push(`👀 ${seen.length} game-fish sighting${seen.length === 1 ? "" : "s"} nearby (${kinds.slice(0, 2).join(", ")}${kinds.length > 2 ? "…" : ""})`);
    }
    return { bonus, notes };
  }

  // Score one moment against a set of catches. Returns { score, reasons }.
  // exposure: the hour-by-hour conditions of logged trips. When there are enough of them, "how often was it
  // like this while people were fishing" replaces the textbook baseline — so a tide you fish a lot doesn't
  // look magic just because most catches happened on it.
  function scoreMoment(now, history, exposure) {
    let score = 0; const reasons = [];
    Object.keys(BASELINE).forEach(f => {
      const v = now[f];
      if (!v || !BASELINE[f][v]) return;
      let base = BASELINE[f][v];
      if (exposure && exposure.length >= 12) {
        let n = 0, h = 0;
        exposure.forEach(e => { if (!e || !e[f]) return; n++; if (e[f] === v) h++; });
        if (n >= 12) base = Math.min(0.95, Math.max(0.02, (h + 12 * base) / (n + 12)));
      }
      let total = 0, hits = 0;
      history.forEach(h => { const hv = h.f[f]; if (!hv) return; total += h.n; if (hv === v) hits += h.n; });
      if (total < 2) return;
      const prior = 2; // pulls small samples toward "no effect"
      const lift = (hits + prior * base) / (total + prior) / base;
      // Moon phase changes slowly, so a few recent catches all share it — count it at half weight
      // and only call it a reason once there's more history
      const weight = f === "moon" ? 0.5 : 1;
      score += weight * Math.log(lift);
      if (f === "moon" && total < 8) return;
      if (lift >= 1.4 && hits >= 2) reasons.push({ text: `${FACTOR_LABEL[f](v)} — ${hits} of ${total} fish`, lift });
    });
    reasons.sort((a, b) => b.lift - a.lift);
    return { score, reasons };
  }

  // ---- 3-day outlook per spot (V4): hourly forecast scored with the same history as Best spot today ----
  const outlookOpen = new Set();   // spot ids whose outlook is showing
  const outlookSel = {};           // spot id -> selected hour (ms)
  const fcCache = {};
  function spotForecast(s) {
    const key = s.lat.toFixed(1) + "," + s.lng.toFixed(1);
    let p = fcCache[key];
    if (!p || (p.done && Date.now() - p.at > 3600000)) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat.toFixed(2)}&longitude=${s.lng.toFixed(2)}` +
        "&hourly=pressure_msl,wind_speed_10m,wind_direction_10m&past_hours=3&forecast_hours=76" +
        "&wind_speed_unit=mph&timeformat=unixtime";
      p = fcCache[key] = fetch(url).then(r => r.json()).then(d => {
        const h = d.hourly, hours = [];
        h.time.forEach((t, i) => {
          if (h.wind_speed_10m[i] == null || h.pressure_msl[i] == null) return;
          let trend = null;
          if (i >= 3 && h.pressure_msl[i - 3] != null) {
            const ch = (h.pressure_msl[i] - h.pressure_msl[i - 3]) / 33.8639;
            trend = ch >= 0.03 ? "rising" : ch <= -0.03 ? "falling" : "steady";
          }
          hours.push({ t: t * 1000, mph: Math.round(h.wind_speed_10m[i]), deg: h.wind_direction_10m[i], trend });
        });
        if (!hours.length) throw new Error("empty");
        return hours;
      });
      p.done = false; p.at = Date.now();
      p.then(v => { p.done = v; p.at = Date.now(); refreshConditions(); }, () => { p.done = "error"; p.at = Date.now(); refreshConditions(); });
    }
    return p;
  }
  const fcHour = (hours, t) => hours.find(h => t.getTime() >= h.t && t.getTime() < h.t + 3600000) || null;
  // The catch history / baseline / extras for one spot (same rules as Best spot today); null if too few catches
  function historyFor(s) {
    const has = c => c.moon_phase || c.tide_stage || c.pressure_trend;
    const all = Object.values(catchesBySpot).flat().filter(has);
    const toHist = list => list.map(c => ({ f: catchFactors(c), n: c.how_many || 1 }));
    const own = (catchesBySpot[s.id] || []).filter(has);
    const ownFish = own.reduce((n, c) => n + (c.how_many || 1), 0);
    let hist;
    if (ownFish >= 3) hist = toHist(own);
    else if (all.reduce((n, c) => n + (c.how_many || 1), 0) >= 5) hist = toHist(all);
    else return null;
    const allTrips = Object.values(sessionsBySpot).flat().filter(x => x.ended_at);
    const trips = (sessionsBySpot[s.id] || []).filter(x => x.ended_at);
    const expo = (trips.length >= 3 ? trips : allTrips).flatMap(x => x.hours || []);
    const sameWater = all.filter(c => { const cs = spots.find(x => x.id === c.spot_id); return cs && cs.water_type === s.water_type; });
    return { hist, expo, extra: spotExtras(s, ownFish >= 3 ? own : sameWater) };
  }
  const DAYNAME = d => d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString([], { weekday: "short" });
  const hourLabel = d => d.toLocaleTimeString([], { hour: "numeric" }).replace(":00", "").replace(/\s/g, "").toLowerCase();
  function fillOutlook(box, s) {
    box.innerHTML = "";
    if (!hasLoc(s)) { box.appendChild(el("div", "spot-meta", "Set this spot's location to see its outlook.")); return; }
    const fc = spotForecast(s);
    if (!fc.done) { box.appendChild(el("div", "spot-meta", "Loading forecast…")); return; }
    if (fc.done === "error") { box.appendChild(el("div", "spot-meta", "Forecast unavailable right now — try again in a bit.")); return; }
    if (s.water_type !== "freshwater" && !spotTides(s)) { box.appendChild(el("div", "spot-meta", "Loading tides…")); return; }
    const hours = fc.done, H = historyFor(s);
    const start = new Date(); start.setMinutes(0, 0, 0);
    const slots = [];
    for (let i = 0; i < 72; i++) {
      const t = new Date(start.getTime() + i * 3600000), fh = fcHour(hours, t);
      if (!fh) continue;
      let score = null, reasons = [];
      if (H) { const r = scoreMoment(factorsAt(s, t, fh), H.hist, H.expo); score = r.score + H.extra.bonus; reasons = r.reasons; }
      const lvl = score == null ? null : score > 1.2 ? "strong" : score > 0.4 ? "good" : "";
      slots.push({ t, fh, score, lvl, reasons });
    }
    if (!slots.length) { box.appendChild(el("div", "spot-meta", "No forecast hours available.")); return; }
    if (H) {
      const runs = []; let cur = null;
      slots.forEach(x => {
        if (!x.lvl) return;
        if (!cur || x.t - cur.end > 3600000) { cur = { start: x.t, end: x.t, peak: x.score }; runs.push(cur); }
        cur.end = x.t; cur.peak = Math.max(cur.peak, x.score);
      });
      runs.sort((a, b) => b.peak - a.peak);
      const fmt = r => `${DAYNAME(r.start)} ${hourLabel(r.start)}–${hourLabel(new Date(r.end.getTime() + 3600000))}`;
      box.appendChild(el("div", "best-why", runs.length ? "⭐ Best windows: " + runs.slice(0, 3).map(fmt).join(" · ")
        : "No standout window in the next 3 days for what's been caught here."));
    } else {
      box.appendChild(el("div", "spot-meta", "Log about 3 catches here (or 5 across the group) and the bar will light up with the best windows. Wind is shown below."));
    }
    const detail = el("div", "spot-meta");
    const showDetail = x => {
      const kind = windKind(x.fh.deg, s.faces_deg);
      detail.textContent = `${DAYNAME(x.t)} ${hourLabel(x.t)} · 💨 ${compass(x.fh.deg)} ${x.fh.mph} mph${kind ? " (" + KIND_ICON[kind] + ")" : ""}` +
        (x.fh.trend ? ` · pressure ${x.fh.trend}` : "") +
        (x.score != null ? ` · ${x.lvl === "strong" ? "Strong match" : x.lvl === "good" ? "Good match" : "Weak match"}` : "") +
        (x.reasons.length ? " — " + x.reasons.slice(0, 2).map(r => r.text).join(" · ") : "");
    };
    const days = [];
    slots.forEach(x => { const k = x.t.toDateString(); let d = days.find(y => y.k === k); if (!d) days.push(d = { k, date: x.t, slots: [] }); d.slots.push(x); });
    const selected = slots.find(x => x.t.getTime() === outlookSel[s.id]) || null;
    days.forEach(d => {
      const mph = d.slots.map(x => x.fh.mph);
      let sx = 0, sy = 0; // prevailing direction: average the wind's direction, weighted by speed
      d.slots.forEach(x => { const a = x.fh.deg * Math.PI / 180; sx += Math.sin(a) * (x.fh.mph + 1); sy += Math.cos(a) * (x.fh.mph + 1); });
      const dir = (Math.atan2(sx, sy) * 180 / Math.PI + 360) % 360;
      const kind = windKind(dir, s.faces_deg);
      const head = el("div", "ol-day", DAYNAME(d.date));
      head.appendChild(el("span", null, `💨 ${compass(dir)} ${Math.min(...mph)}–${Math.max(...mph)} mph${kind ? " · " + KIND_ICON[kind] : ""}`));
      box.appendChild(head);
      const bar = el("div", "ol-bar");
      for (let h = 0; h < 24; h++) {
        const x = d.slots.find(y => y.t.getHours() === h);
        const c = el("button", "ol-c" + (x ? (x.lvl ? " " + x.lvl : "") : " off"));
        c.type = "button";
        if (x) {
          c.setAttribute("aria-label", hourLabel(x.t));
          if (selected === x) c.classList.add("sel");
          c.addEventListener("click", () => {
            outlookSel[s.id] = x.t.getTime();
            box.querySelectorAll(".ol-c.sel").forEach(n => n.classList.remove("sel"));
            c.classList.add("sel"); showDetail(x);
          });
        } else c.disabled = true;
        bar.appendChild(c);
      }
      box.appendChild(bar);
      const axis = el("div", "ol-axis");
      ["12a", "6a", "12p", "6p", "12a"].forEach(t => axis.appendChild(el("span", null, t)));
      box.appendChild(axis);
    });
    if (selected) showDetail(selected); else detail.textContent = "Tap an hour for its wind and why it scores that way.";
    box.appendChild(detail);
    if (H) box.appendChild(el("div", "spot-meta", "Green = hours that match this spot's catch history (dark green = strong). Wind from Open-Meteo; tides shifted for this spot." +
      (s.faces_deg == null ? " Edit the spot to say which way the water lies and wind will show onshore/offshore." : "")));
  }

  function renderBest() {
    const box = $("best-list");
    if (!box || !spots) return;
    box.innerHTML = "";
    const all = Object.values(catchesBySpot).flat().filter(c => c.moon_phase || c.tide_stage || c.pressure_trend);
    const toHist = list => list.map(c => ({ f: catchFactors(c), n: c.how_many || 1 }));
    const groupHist = toHist(all);
    const start = new Date(); start.setMinutes(0, 0, 0);
    const hours = []; for (let i = 0; i <= 12; i++) hours.push(new Date(start.getTime() + i * 3600000));
    const ranked = [], skipped = [];
    const allTrips = Object.values(sessionsBySpot).flat().filter(x => x.ended_at);
    const gHrs = allTrips.reduce((n, x) => n + tripHours(x), 0);
    const groupRate = allTrips.length >= 3 ? allTrips.reduce((n, x) => n + tripFish(x), 0) / gHrs : null;
    filteredSpots().forEach(s => {
      const own = (catchesBySpot[s.id] || []).filter(c => c.moon_phase || c.tide_stage || c.pressure_trend);
      const ownFish = own.reduce((n, c) => n + (c.how_many || 1), 0);
      let hist, basis;
      if (ownFish >= 3) { hist = toHist(own); basis = `${ownFish} fish caught here`; }
      else if (groupHist.reduce((n, h) => n + h.n, 0) >= 5) { hist = groupHist; basis = "few catches here yet — using everyone's catches"; }
      else { skipped.push(s); return; }
      const trips = (sessionsBySpot[s.id] || []).filter(x => x.ended_at);
      const expo = (trips.length >= 3 ? trips : allTrips).flatMap(x => x.hours || []);
      let best = null;
      hours.forEach((t, i) => {
        const r = scoreMoment(factorsAt(s, i === 0 ? new Date() : t), hist, expo);
        if (!best || r.score > best.score + 0.01) best = { ...r, t, now: i === 0 };
      });
      const sameWater = all.filter(c => { const cs = spots.find(x => x.id === c.spot_id); return cs && cs.water_type === s.water_type; });
      const extra = spotExtras(s, ownFish >= 3 ? own : sameWater);
      best.score += extra.bonus;
      // Catch rate from logged trips (skunks included) vs. the group's overall rate
      if (trips.length >= 3) {
        const hrs = trips.reduce((n, x) => n + tripHours(x), 0), fish = trips.reduce((n, x) => n + tripFish(x), 0);
        const rate = fish / hrs, skunks = trips.filter(x => !tripFish(x)).length;
        if (groupRate != null) best.score += Math.max(-0.4, Math.min(0.4, 0.3 * Math.log((rate + 0.05) / (groupRate + 0.05))));
        basis += ` · ${trips.length} trips, ${rate.toFixed(1)} fish/hr` + (skunks ? `, ${skunks} skunked` : "");
      }
      ranked.push({ s, best, basis, own: ownFish >= 3, extra });
    });
    ranked.sort((a, b) => (b.own - a.own) || (b.best.score - a.best.score));
    if (!ranked.length) {
      box.appendChild(el("div", "empty", "Not enough catches yet. Once a spot has about 3 fish logged (or the group has 5), it'll be ranked here."));
      return;
    }
    ranked.slice(0, 5).forEach((r, i) => {
      const row = el("div", "best");
      const top = el("div", "best-top");
      const name = el("div");
      name.appendChild(el("span", "best-rank", `${i + 1}.`));
      name.appendChild(el("span", "best-name", r.s.name));
      const rating = r.best.score > 1.2 ? ["strong", "Strong match"] : r.best.score > 0.4 ? ["", "Good match"] : ["", "Weak match"];
      name.appendChild(el("span", "rating " + rating[0], rating[1]));
      top.appendChild(name);
      top.appendChild(el("span", "best-when", r.best.now ? "Best: now" : `Best around ${clock(r.best.t)}`));
      row.appendChild(top);
      row.appendChild(el("div", "best-why", r.best.reasons.length ? "✓ " + r.best.reasons.slice(0, 3).map(x => x.text).join(" · ") : "No strong pattern yet for these conditions"));
      if (r.extra.notes.length) row.appendChild(el("div", "best-why", r.extra.notes.join(" · ")));
      row.appendChild(el("div", "spot-meta", "Based on " + r.basis));
      box.appendChild(row);
    });
    if (skipped.length) box.appendChild(el("div", "spot-meta", `Not ranked yet (too few catches): ${skipped.map(s => s.name).join(", ")}`));
  }

  function refreshConditions() {
    clearTimeout(refreshConditions.t);
    refreshConditions.t = setTimeout(() => { renderBest(); if (!$("plan-form").hidden) planSuggest(); }, 200);
    (spots || []).forEach(s => {
      const node = document.querySelector(`.spot-cond[data-spot="${s.id}"]`);
      if (node) node.textContent = spotConditions(s);
    });
    document.querySelectorAll(".outlook[data-spot]").forEach(box => {
      const s = (spots || []).find(x => String(x.id) === box.dataset.spot);
      if (s) fillOutlook(box, s);
    });
  }

  function renderSpots() {
    const list = $("spot-list");
    list.innerHTML = "";
    if (spotsError) { list.appendChild(el("div", "empty", spotsError)); return; }
    if (spots === null) { list.appendChild(el("div", "empty", "Loading spots…")); return; }
    if (!spots.length) {
      list.appendChild(el("div", "empty", "No spots yet. Tap “+ Add a spot” to save your first one."));
      return;
    }
    const shown = filteredSpots();
    updateFilterStatus(shown.length);
    if (!shown.length) list.appendChild(el("div", "empty", "No spots match these filters."));
    shown.forEach(s => {
      const item = el("div", "spot");
      item.appendChild(el("div", "spot-name", visIcon(s) + s.name + (spotSort === "near" && sortPos && s.lat != null && s.lng != null ? ` · ${miles(sortPos.lat, sortPos.lng, s.lat, s.lng).toFixed(1)} mi` : "")));
      item.appendChild(el("div", "spot-meta",
        `${cap(s.spot_type)} · ${WATER_LABEL[s.water_type] || s.water_type}` + (s.added_by ? ` · added by ${s.added_by}` : "")));
      const condEl = el("div", "spot-cond", spotConditions(s));
      condEl.dataset.spot = s.id;
      item.appendChild(condEl);
      const sightEl = el("div", "spot-meta spot-sight", sightLine(s));
      sightEl.dataset.spot = s.id; sightEl.hidden = !sightEl.textContent;
      item.appendChild(sightEl);

      const chips = el("div", "chips");
      const accessText = { yes: "Public access", no: "Not public", unsure: "Access unsure" }[s.public_access];
      [accessText, s.parking && `Parking: ${s.parking}`, s.getting_there && cap(s.getting_there)]
        .filter(Boolean).forEach(t => chips.appendChild(el("span", "chip", t)));
      if (s.faces_deg != null) chips.appendChild(el("span", "chip", "🧭 Water to the " + compass(s.faces_deg)));
      chips.appendChild(el("span", "chip", VIS_LABEL[s.visibility || (s.is_private ? "private" : "friends")]));
      if (s.is_exact === false) chips.appendChild(el("span", "chip", "📍 Approximate pin (within ¼ mile)"));
      if (s.lat != null && s.lng != null && s.is_exact !== false) {
        const a = el("a", "chip", "📍 Directions");
        a.href = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
        a.target = "_blank"; a.rel = "noopener";
        chips.appendChild(a);
      }
      item.appendChild(chips);

      if (s.access_notes) item.appendChild(el("div", "spot-notes", "🚗 " + s.access_notes));
      if (s.notes) item.appendChild(el("div", "spot-notes", s.notes));
      if (isMine(s)) {
        const editSpot = el("button", "linkbtn", "✎ Edit spot");
        editSpot.type = "button";
        editSpot.addEventListener("click", () => openForm(true, s));
        item.appendChild(editSpot);
      }
      const olBtn = el("button", "linkbtn", outlookOpen.has(s.id) ? "▴ Hide 3-day outlook" : "📅 3-day outlook");
      olBtn.type = "button";
      olBtn.addEventListener("click", () => { outlookOpen.has(s.id) ? outlookOpen.delete(s.id) : outlookOpen.add(s.id); renderSpots(); });
      item.appendChild(olBtn);
      if (outlookOpen.has(s.id)) {
        const box = el("div", "outlook"); box.dataset.spot = s.id;
        fillOutlook(box, s);
        item.appendChild(box);
      }
      item.appendChild(spotPhotoSection(s));
      item.appendChild(catchSection(s));
      list.appendChild(item);
    });
  }

  async function loadSpots() {
    try {
      if (!window.supabase) throw new Error("Database library didn't load");
      const { data, error } = await db.from("spots_visible").select("*").order("name");
      if (error) throw error;
      const circle = await getCircle();
      spotsAll = data;
      spots = data.filter(x => inCircle(circle, x.created_by));
      spotsError = null;
      saveCopy("spots", spots);
      setOffline(false);
      loadCatches();
      loadPhotos().then(sweepDeletedCatchPhotos);
      syncSessions().then(loadSessions).then(maybeAskSession);
      renderPins();
      if (!loadSpots.suggStarted) { loadSpots.suggStarted = true; loadSuggestions(); } // centred on your spots
      loadSightings();
      loadPlans();
      if (typeof renderSuggestions === "function") renderSuggestions();
    } catch (err) {
      const copy = isNetErr(err) && loadCopy("spots");
      if (copy) {
        spots = copy; spotsError = null; setOffline(true);
        const cc = loadCopy("catches");
        if (cc) { catchesBySpot = {}; cc.forEach(c => (catchesBySpot[c.spot_id] = catchesBySpot[c.spot_id] || []).push(c)); }
        renderPins();
      } else spotsError = "Couldn't load spots: " + (err.message || err);
    }
    renderSpots();
  }

  let editingSpot = null;   // the spot being edited, or null when adding a new one

  function openForm(show, existing) {
    $("spot-form").hidden = !show;
    $("add-btn").hidden = show;
    $("form-msg").textContent = "";
    $("spot-del").hidden = true;
    if (!show) return;
    if (existing) {
      $("spot-del").hidden = !(isMine(existing) || (me && me.isAdmin));
      editingSpot = existing;
      $("f-title").textContent = "Edit spot";
      $("save-btn").textContent = "Save changes";
      $("f-name").value = existing.name || "";
      $("f-type").value = existing.spot_type;
      $("f-water").value = existing.water_type;
      $("f-access").value = existing.public_access || "unsure";
      $("f-parking").value = existing.parking || "";
      $("f-getting").value = existing.getting_there || "";
      $("f-access-notes").value = existing.access_notes || "";
      $("f-notes").value = existing.notes || "";
      $("f-tide-offset").value = existing.tide_offset_min ? existing.tide_offset_min : "";
      $("f-faces").value = existing.faces_deg != null ? String(existing.faces_deg) : "";
      $("f-by").value = existing.added_by || "";
      $("f-vis").value = existing.visibility || (existing.is_private ? "private" : "friends");
      $("f-hide").checked = !!existing.hide_exact_from_friends;
      syncHideRow();
      $("f-tide-box").hidden = existing.water_type === "freshwater";
      pickedLoc = hasLoc(existing) ? { lat: existing.lat, lng: existing.lng } : null;
      $("loc-text").textContent = pickedLoc ? "Set ✓ (keep, or pick a new one)" : "Not set";
      $("spots-card").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (!editingSpot) {
      $("f-title").textContent = "New spot";
      $("save-btn").textContent = "Save spot";
      if (!$("f-by").value) $("f-by").value = (me && me.name) || "";
    }
    $("f-name").focus();
  }
  function closeSpotForm() {
    $("spot-form").reset(); pickedLoc = null; editingSpot = null; $("f-tide-msg").textContent = ""; syncHideRow();
    $("loc-text").textContent = "Not set";
    openForm(false);
  }

  $("add-btn").addEventListener("click", () => { closeSpotForm(); openForm(true); });

  // 🗑 Delete a spot (e.g. one made by accident while testing). It's a soft delete, so Undo brings it back with its catches and trips.
  $("spot-del").addEventListener("click", async () => {
    const sp = editingSpot; if (!sp) return;
    const mine = (catchesBySpot[sp.id] || []).length;
    if (!confirm(`Delete “${sp.name}”?` + (mine ? `\n\nIts ${mine} catch${mine === 1 ? "" : "es"} will be removed too.` : "") + "\n\nYou'll have a few seconds to Undo.")) return;
    const msg = $("form-msg"); $("spot-del").disabled = true;
    const { error } = await db.rpc("delete_spot", { p_id: sp.id });
    $("spot-del").disabled = false;
    if (error) { msg.className = "msg err"; msg.textContent = "Couldn't delete: " + (error.message || error); return; }
    closeSpotForm();
    undoToast(`🗑 “${sp.name}” deleted.`, async () => {
      const { error: e2 } = await db.rpc("restore_spot", { p_id: sp.id });
      if (e2) alert("Couldn't undo: " + (e2.message || e2));
      await loadSpots(); loadCatches(); loadPlans();
    }, "Undo", 12000);
    await loadSpots(); loadCatches(); loadPlans();
  });
  $("cancel-btn").addEventListener("click", closeSpotForm);

  $("loc-btn").addEventListener("click", () => {
    if (!navigator.geolocation) { $("loc-text").textContent = "Location not available on this device"; return; }
    $("loc-text").textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(
      pos => {
        pickedLoc = { lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) };
        $("loc-text").textContent = `Set ✓ (${pickedLoc.lat}, ${pickedLoc.lng})`;
      },
      () => { $("loc-text").textContent = "Couldn't get location — allow it in your browser and try again"; },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });

  // Work out the tide timing from a high or low tide seen at the spot right now
  async function tideTurnNow(high) {
    const msg = $("f-tide-msg");
    const where = pickedLoc || (editingSpot && hasLoc(editingSpot) ? editingSpot : null);
    if (!where) { msg.textContent = "Set the spot's location first (below), so we know which tide station to compare with."; return; }
    const st = stationFor({ lat: where.lat, lng: where.lng });
    msg.textContent = "Checking the station's tide times…";
    try {
      const p = stationTides(st.id);
      const tides = await p;
      const now = Date.now();
      const near = tides.filter(t => t.high === high).map(t => ({ t, d: now - t.when.getTime() })).sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
      if (!near || Math.abs(near.d) > 5 * 3600000) { msg.textContent = `No ${high ? "high" : "low"} tide at ${st.name} within 5 hours of now — try at the next turn.`; return; }
      const min = Math.round(near.d / 60000 / 5) * 5;
      $("f-tide-offset").value = min;
      msg.textContent = `${st.name} had ${high ? "high" : "low"} tide at ${clock(near.t.when)}, so the tide here runs ${min === 0 ? "right on time" : offsetText(min).replace(/^[+−]/, "") + (min > 0 ? " later" : " earlier")}. Tap Save to keep it.` + (Math.abs(min) > 120 ? " (That's a big difference — make sure the water has really stopped and turned.)" : "");
    } catch (e) { msg.textContent = "Couldn't get the station's tide times — check your signal."; }
  }
  $("f-tide-high").addEventListener("click", () => tideTurnNow(true));
  $("f-tide-low").addEventListener("click", () => tideTurnNow(false));
  function syncHideRow() { $("f-hide-row").hidden = $("f-vis").value === "private"; }
  $("f-vis").addEventListener("change", syncHideRow);
  $("f-water").addEventListener("change", () => { $("f-tide-box").hidden = $("f-water").value === "freshwater"; });

  $("spot-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("form-msg");
    msg.className = "msg"; msg.textContent = "Saving…";
    $("save-btn").disabled = true;
    const val = id => { const v = $(id).value.trim(); return v === "" ? null : v; };
    const row = {
      name: val("f-name"),
      spot_type: $("f-type").value,
      water_type: $("f-water").value,
      public_access: $("f-access").value,
      parking: val("f-parking"),
      getting_there: val("f-getting"),
      access_notes: val("f-access-notes"),
      notes: val("f-notes"),
      tide_offset_min: Math.max(-300, Math.min(300, Math.round((parseFloat($("f-tide-offset").value) || 0) / 5) * 5)),
      faces_deg: $("f-faces").value === "" ? null : parseInt($("f-faces").value, 10),
      added_by: val("f-by"),
      visibility: $("f-vis").value,
      is_private: $("f-vis").value === "private",
      hide_exact_from_friends: $("f-vis").value !== "private" && $("f-hide").checked,
      lat: pickedLoc ? pickedLoc.lat : null,
      lng: pickedLoc ? pickedLoc.lng : null
    };
    try {
      if (!db) throw new Error("Not connected to the database");
      const { error } = editingSpot
        ? await db.from("spots").update(row).eq("id", editingSpot.id)
        : await db.from("spots").insert(row);
      if (error) throw error;
      if (!editingSpot) { try { localStorage.setItem("fm-name", row.added_by || ""); } catch (e2) {} }
      closeSpotForm();
      await loadSpots();
    } catch (err) {
      msg.className = "msg err";
      msg.textContent = "Couldn't save: " + (err.message || err);
    } finally {
      $("save-btn").disabled = false;
    }
  });

  // ---- Today's moon & solunar card ----
  function loadMoon() {
    try {
      const now = new Date(), m = moonAt(now);
      $("moon-now").textContent = `${m.emoji} ${cap(m.phase)} · ${m.illum}% lit`;
      const periods = solunarPeriods(now);
      const current = periods.find(p => now >= p.start && now <= p.end);
      const upcoming = periods.find(p => p.start > now);
      $("moon-detail").textContent = current
        ? `In a ${current.type} solunar period now (${current.why}) until ${clock(current.end)}`
        : upcoming ? `Next: ${upcoming.type} period at ${clock(upcoming.start)}` : "No more solunar periods today";
      const ul = $("moon-periods");
      ul.innerHTML = "";
      periods.forEach(p => {
        const li = el("li", p.end < now ? "past" : null);
        li.appendChild(el("span", "kind " + (p.type === "major" ? "rising" : ""), cap(p.type)));
        const right = el("span", null, `${clock(p.start)} – ${clock(p.end)}`);
        right.appendChild(el("span", "ft", p.why));
        li.appendChild(right);
        ul.appendChild(li);
      });
    } catch (e) {
      $("moon-now").textContent = "Couldn't load moon info";
    }
  }

  // ---- Map view (Leaflet + OpenStreetMap / satellite imagery) ----
  const WATER_COLOR = { saltwater: "#1d6fd6", brackish: "#16a085", freshwater: "#b7791f" };
  let map = null, pinLayer = null, meMarker = null, satellite = false, streetTiles = null, satTiles = null;
  let planPick = null; // set while choosing a spot for a trip plan from the map
  let placing = null; // null, {mode:"new"}, {mode:"form"} or {mode:"move", spot}

  function showView(which) {
    const isMap = which === "map";
    $("view-map").hidden = !isMap;
    $("view-list").hidden = which !== "list";
    $("view-insights").hidden = which !== "insights";
    $("view-seasons").hidden = which !== "seasons";
    $("tab-seasons").classList.toggle("on", which === "seasons");
    if (which === "seasons") renderSeasons();
    $("view-feed").hidden = which !== "feed";
    $("tab-feed").classList.toggle("on", which === "feed");
    if (which === "feed") { renderFeed(); loadFeed(); setFeedMode(feedMode); }
    renderPlanLine();
    if (which === "feed" || Date.now() - plansLoadedAt > 60000) loadPlans();
    $("tab-map").classList.toggle("on", isMap);
    $("tab-list").classList.toggle("on", which === "list");
    $("tab-insights").classList.toggle("on", which === "insights");
    if (which === "insights") renderInsights();
    if (isMap) {
      initMap();
      if (!map) { $("map").textContent = "The map couldn't load — check your connection and refresh."; return; }
      setTimeout(() => { map.invalidateSize(); }, 50);
      const focusing = !!pubFocus;
      renderPins();
      if (mapPublic && !focusing) setMapPublic(true);
    }
  }
  // ---- 🧭 Navigation shell (UX step 1): bottom bar, Me menu, Stats switch. The old tab buttons stay (hidden) and do the real work. ----
  (function navShell() {
    const bn = $("bnav"), TABS = ["tab-list", "tab-map", "tab-insights", "tab-seasons", "tab-feed"];
    const on = id => $(id).classList.contains("on");
    const btn = k => bn.querySelector(`[data-nav="${k}"]`);
    function sync() {
      btn("home").classList.toggle("on", on("tab-list")); btn("map").classList.toggle("on", on("tab-map"));
      btn("community").classList.toggle("on", on("tab-feed")); btn("stats").classList.toggle("on", on("tab-insights") || on("tab-seasons"));
      document.querySelectorAll(".stats-sw button").forEach(b => b.classList.toggle("ghost", !on(b.dataset.tab)));
    }
    TABS.forEach(id => new MutationObserver(sync).observe($(id), { attributes: true, attributeFilter: ["class"] }));
    const go = id => { if (on(id)) window.scrollTo({ top: 0, behavior: "smooth" }); else $(id).click(); };
    bn.addEventListener("click", e => {
      const b = e.target.closest("[data-nav]"); if (!b) return;
      const k = b.dataset.nav;
      if (k === "log") $("qc-fab").click();
      else if (k === "home") go("tab-list"); else if (k === "map") go("tab-map"); else if (k === "community") go("tab-feed");
      else if (k === "stats") { if (on("tab-insights") || on("tab-seasons")) window.scrollTo({ top: 0, behavior: "smooth" }); else $("tab-insights").click(); }
    });
    // Insights / Seasons switch at the top of both Stats pages
    ["view-insights", "view-seasons"].forEach(v => {
      const row = el("div", "stats-sw");
      [["tab-insights", "📊 Insights"], ["tab-seasons", "📅 Seasons"]].forEach(([t, label]) => { const b = el("button", "btn small", label); b.type = "button"; b.dataset.tab = t; b.addEventListener("click", () => $(t).click()); row.appendChild(b); });
      $(v).insertBefore(row, $(v).firstChild);
    });
    // show only when signed in
    const showBar = () => { bn.hidden = $("app").hidden; document.body.classList.toggle("has-bnav", !$("app").hidden); };
    new MutationObserver(showBar).observe($("app"), { attributes: true, attributeFilter: ["hidden"] }); showBar();
    // Me menu
    const mb = $("me-btn"), mm = $("me-menu");
    const closeMe = () => { mm.hidden = true; mb.setAttribute("aria-expanded", "false"); };
    mb.addEventListener("click", e => { e.stopPropagation(); mm.hidden = !mm.hidden; mb.setAttribute("aria-expanded", String(!mm.hidden)); });
    mm.addEventListener("click", () => setTimeout(closeMe, 0));
    document.addEventListener("click", e => { if (!mm.hidden && !mm.contains(e.target) && e.target !== mb) closeMe(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMe(); });
    // unread badges: read the counts the old buttons already show, e.g. "💬 Messages (2)"
    const num = id => +((/\((\d+)\)/.exec($(id).textContent) || [])[1] || 0);
    function badges() {
      const a = num("inbox-btn"), c = num("chat-btn") + num("friends-btn");
      $("me-badge").hidden = !a; $("me-badge").textContent = a;
      $("com-badge").hidden = !c; $("com-badge").textContent = c;
    }
    ["inbox-btn", "chat-btn", "friends-btn"].forEach(id => new MutationObserver(badges).observe($(id), { childList: true, characterData: true, subtree: true }));
    badges(); sync();
  })();
  $("tab-list").addEventListener("click", () => { stopPlacing(); showView("list"); });
  $("tab-map").addEventListener("click", () => showView("map"));
  $("tab-insights").addEventListener("click", () => { stopPlacing(); showView("insights"); });
  $("tab-seasons").addEventListener("click", () => { stopPlacing(); showView("seasons"); });
  $("tab-feed").addEventListener("click", () => { stopPlacing(); showView("feed"); });

  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { zoomControl: true }).setView([LAT, LNG], 12);
    streetTiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    satTiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics"
    });
    pinLayer = L.layerGroup().addTo(map);
    map.on("click", e => onMapTap(e.latlng));
    let fitted = false;
    map.whenReady(() => { if (!fitted) { fitted = true; fitToSpots(); } });
  }

  function fitToSpots() {
    const placed = (spots || []).filter(s => s.lat != null && s.lng != null);
    if (placed.length === 1) map.setView([placed[0].lat, placed[0].lng], 15);
    else if (placed.length > 1) map.fitBounds(placed.map(s => [s.lat, s.lng]), { padding: [30, 30], maxZoom: 15 });
  }

  function popupFor(s) {
    const box = document.createElement("div");
    box.appendChild(el("div", "pop-name", visIcon(s) + s.name));
    if (s.is_private) box.appendChild(el("div", "pop-meta", "Private — only you can see this"));
    else if (s.is_exact === false) box.appendChild(el("div", "pop-meta", "Approximate pin — within about ¼ mile"));
    box.appendChild(el("div", "pop-meta", `${cap(s.spot_type)} · ${WATER_LABEL[s.water_type] || s.water_type}`));
    box.appendChild(el("div", "pop-cond", spotConditions(s)));
    const n = (catchesBySpot[s.id] || []).reduce((t, c) => t + (c.how_many || 1), 0);
    box.appendChild(el("div", "pop-meta", n ? `${n} fish logged here` : "No catches logged yet"));
    const actions = el("div", "pop-actions");
    const open = el("button", null, "Open in list"); open.type = "button";
    open.addEventListener("click", () => goToSpot(s.id, false));
    const log = el("button", null, "🐟 Log a catch"); log.type = "button";
    log.addEventListener("click", () => goToSpot(s.id, true));
    const dir = el("a", null, "Directions");
    dir.href = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
    dir.target = "_blank"; dir.rel = "noopener";
    const fol = el("button", null, follows.has(s.id) ? "⭐ Following" : "☆ Follow"); fol.type = "button";
    fol.addEventListener("click", async () => { await toggleFollow(s); fol.textContent = follows.has(s.id) ? "⭐ Following" : "☆ Follow"; });
    const move = el("button", null, "Move pin"); move.type = "button";
    move.addEventListener("click", () => { map.closePopup(); startPlacing({ mode: "move", spot: s }); });
    const edit = el("button", null, "Edit"); edit.type = "button";
    edit.addEventListener("click", () => { map.closePopup(); showView("list"); openForm(true, s); });
    if (planPick) {
      if (s.is_private) box.appendChild(el("div", "pop-meta", "Private spots can't be used for plans"));
      else {
        const use = el("button", null, "✅ Use this spot"); use.type = "button";
        use.addEventListener("click", () => finishPlanPick(s.id));
        actions.appendChild(use);
      }
    }
    [open, log, fol, dir].concat(isMine(s) ? [move, edit] : []).forEach(b => actions.appendChild(b));
    box.appendChild(actions);
    return box;
  }

  function renderPins() {
    if (!map) return;
    pinLayer.clearLayers();
    filteredSpots().filter(s => s.lat != null && s.lng != null).forEach(s => {
      L.circleMarker([s.lat, s.lng], {
        radius: 9, weight: 3, color: s.is_private ? "#222222" : "#ffffff", dashArray: s.is_private ? "3 3" : null,
        fillColor: WATER_COLOR[s.water_type] || "#555", fillOpacity: 1
      }).bindPopup(() => popupFor(s)).addTo(pinLayer);
    });
    renderPublicPins();
    const n = activeFilterCount();
    $("map-filter-note").hidden = !n;
    if (n) $("map-filter-note").textContent = `Filters on — showing ${filteredSpots().length} of ${(spots || []).length} spots. Change them in the list view.`;
    const unplaced = (spots || []).filter(s => s.lat == null || s.lng == null);
    $("unplaced-card").hidden = !unplaced.length;
    const ul = $("unplaced-list"); ul.innerHTML = "";
    unplaced.forEach(s => {
      const li = el("li");
      li.appendChild(el("span", null, s.name));
      if (isMine(s)) {
        const b = el("button", "btn ghost small", "Place on map"); b.type = "button";
        b.addEventListener("click", () => startPlacing({ mode: "move", spot: s }));
        li.appendChild(b);
      }
      ul.appendChild(li);
    });
  }

  function goToSpot(id, logCatch) {
    map && map.closePopup();
    showView("list");
    if (logCatch) openCatchForm(id);
    const node = document.querySelector(`.spot-cond[data-spot="${id}"]`);
    const item = node && node.closest(".spot");
    if (item) {
      item.scrollIntoView({ behavior: "smooth", block: "start" });
      item.classList.remove("flash"); void item.offsetWidth; item.classList.add("flash");
    }
  }

  function startPlacing(p) {
    placing = p;
    showView("map");
    $("place-banner").hidden = false;
    $("place-text").textContent = p.mode === "plan" ? "Tap a pin, then “Use this spot” to plan your trip there" : p.mode === "move" ? `Tap the map where “${p.spot.name}” is` : "Tap the map where the spot is";
    $("map").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function stopPlacing() { placing = null; planPick = null; $("place-banner").hidden = true; }
  $("place-cancel").addEventListener("click", () => {
    const wasForm = placing && placing.mode === "form";
    if (placing && placing.mode === "plan") { finishPlanPick(null); return; }
    stopPlacing();
    if (wasForm) showView("list");
  });

  async function onMapTap(latlng) {
    if (!placing || placing.mode === "plan") return;
    const loc = { lat: +latlng.lat.toFixed(5), lng: +latlng.lng.toFixed(5) };
    const p = placing;
    stopPlacing();
    if (p.mode === "move") {
      try {
        const { error } = await db.from("spots").update(loc).eq("id", p.spot.id);
        if (error) throw error;
        await loadSpots();
        renderPins();
      } catch (err) {
        alert("Couldn't save the location: " + (err.message || err));
      }
      return;
    }
    // New spot (from the map button) or the open add-spot form
    pickedLoc = loc;
    $("loc-text").textContent = `Set on map ✓`;
    showView("list");
    if ($("spot-form").hidden) openForm(true);
    $("spots-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("map-add").addEventListener("click", () => startPlacing({ mode: "new" }));
  $("loc-map-btn").addEventListener("click", () => startPlacing({ mode: "form" }));
  $("loc-photo-btn").addEventListener("click", () => $("loc-photo").click());
  $("loc-photo").addEventListener("change", async () => {
    const f = $("loc-photo").files[0];
    if (!f) return;
    $("loc-text").textContent = "Reading photo…";
    const info = await photoInfo(f);
    $("loc-photo").value = "";
    if (info.lat == null) { $("loc-text").textContent = "That photo has no location saved (phones often remove it) — try Pick on map"; return; }
    pickedLoc = { lat: info.lat, lng: info.lng };
    $("loc-text").textContent = "Set ✓ from photo" + (info.when ? ` taken ${info.when.toLocaleDateString([], { month: "short", day: "numeric" })}` : "");
  });
  $("map-layer").addEventListener("click", () => {
    satellite = !satellite;
    if (satellite) { map.removeLayer(streetTiles); satTiles.addTo(map); }
    else { map.removeLayer(satTiles); streetTiles.addTo(map); }
    $("map-layer").textContent = satellite ? "🗺 Street map" : "🛰 Satellite";
  });
  $("map-me").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Location isn't available on this device.");
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (meMarker) meMarker.setLatLng(ll);
      else meMarker = L.circleMarker(ll, { radius: 7, weight: 3, color: "#fff", fillColor: "#e53935", fillOpacity: 1 }).addTo(map).bindPopup("You are here");
      map.setView(ll, 15);
    }, () => alert("Couldn't get your location — allow it in your browser settings."), { enableHighAccuracy: true, timeout: 15000 });
  });

  // ---- Suggested spots (OpenStreetMap via the free Overpass API) ----
  const SUGG_KEY = "fm-suggestions-v2";
  let suggAnchor = null; // where suggestions are centred: "Near me", else the middle of your spots, else Pompano
  function suggCenter() {
    if (suggAnchor) return suggAnchor;
    const placed = (spots || []).filter(hasLoc);
    if (!placed.length) return { lat: LAT, lng: LNG };
    // the middle of your spots (median, so one far-off spot doesn't drag it into the Everglades)
    const med = arr => { const v = arr.slice().sort((a, b) => a - b), m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
    return { lat: med(placed.map(s => s.lat)), lng: med(placed.map(s => s.lng)) };
  }
  function suggBox(c) { // about 20 miles each way
    const dLat = 0.3, dLng = 0.33;
    return [c.lat - dLat, c.lng - dLng, c.lat + dLat, c.lng + dLng].map(v => v.toFixed(3)).join(",");
  }
  const KIND_EMOJI = { pier: "🎣", ramp: "🚤", jetty: "🪨", bridge: "🌉", dock: "⚓" };
  let suggestions = null, suggError = null, suggShowAll = false, suggLayer = null, suggOnMap = false;

  function osmToSpot(e) {
    const t = e.tags || {};
    const lat = e.lat != null ? e.lat : e.center && e.center.lat;
    const lng = e.lon != null ? e.lon : e.center && e.center.lon;
    if (lat == null || lng == null) return null;
    if (/^(private|no|customers)$/.test(t.access || "")) return null;
    const publicish = !!t.name || t.fishing === "yes" || t.leisure === "fishing" || /^(yes|public|permissive)$/.test(t.access || "");
    let kind;
    if (t.leisure === "slipway") kind = "ramp";
    else if (/^(breakwater|groyne)$/.test(t.man_made || "")) kind = "jetty";
    else if (t.bridge === "yes") kind = "bridge";
    else if (t.man_made === "pier") { if (!publicish) return null; kind = "pier"; } // skips private backyard docks
    else if (t.leisure === "fishing") kind = "dock";
    else return null;
    if (kind === "jetty" && !t.name) return null; // unnamed seawall rocks aren't useful suggestions
    const label = { pier: "Pier", ramp: "Boat ramp", jetty: "Jetty", bridge: "Bridge", dock: "Fishing spot" }[kind];
    return { key: e.type + "/" + e.id, name: t.name || `${label} (unnamed)`, kind, label, lat: +lat.toFixed(5), lng: +lng.toFixed(5) };
  }

  async function loadSuggestions() {
    const center = suggCenter();
    const area = (Math.round(center.lat * 4) / 4) + "," + (Math.round(center.lng * 4) / 4); // ~15-mile grid
    try {
      const cached = JSON.parse(localStorage.getItem(SUGG_KEY) || "null");
      if (cached && cached.area === area && Date.now() - cached.t < 7 * 86400000) { suggestions = cached.items; renderSuggestions(); return; }
    } catch (e) {}
    const SUGG_BOX = suggBox(center);
    suggestions = null; renderSuggestions();
    const q = `[out:json][timeout:25];(` +
      `nwr["man_made"="pier"](${SUGG_BOX});` +
      `nwr["leisure"="slipway"](${SUGG_BOX});` +
      `nwr["leisure"="fishing"](${SUGG_BOX});` +
      `nwr["man_made"~"^(breakwater|groyne)$"](${SUGG_BOX});` +
      `way["bridge"="yes"]["fishing"="yes"](${SUGG_BOX});` +
      `);out center tags;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST", body: "data=" + encodeURIComponent(q),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (!res.ok) throw new Error("Map data service is busy (" + res.status + ")");
      const data = await res.json();
      const seen = new Set();
      suggestions = data.elements.map(osmToSpot).filter(x => x && !seen.has(x.key) && seen.add(x.key));
      try { localStorage.setItem(SUGG_KEY, JSON.stringify({ t: Date.now(), area, items: suggestions })); } catch (e) {}
      suggError = null;
    } catch (err) {
      suggError = "Couldn't load suggestions right now — try again later.";
    }
    renderSuggestions();
  }

  // Suggestions nobody has saved yet (nothing saved within ~150 m), closest to your spots first
  function openSuggestions() {
    if (!suggestions) return [];
    const placed = (spots || []).filter(hasLoc);
    const anchor = suggCenter();
    return suggestions
      .filter(g => !placed.some(s => miles(s.lat, s.lng, g.lat, g.lng) < 0.1))
      .map(g => ({ ...g, dist: miles(anchor.lat, anchor.lng, g.lat, g.lng) }))
      .sort((a, b) => a.dist - b.dist);
  }

  function addSuggestion(g) {
    map && map.closePopup();
    showView("list");
    closeSpotForm();
    openForm(true);
    $("f-name").value = g.name.replace(/ \(unnamed\)$/, "");
    $("f-type").value = g.kind === "ramp" ? "ramp" : g.kind === "jetty" ? "jetty" : g.kind === "bridge" ? "bridge" : g.kind === "dock" ? "dock" : "pier";
    pickedLoc = { lat: g.lat, lng: g.lng };
    $("loc-text").textContent = "Set ✓ (from the suggestion)";
    $("form-msg").className = "msg";
    $("form-msg").textContent = "Check the water type and access, then save.";
    $("spots-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderSuggestions() {
    const ul = $("sugg-list");
    ul.innerHTML = "";
    if (suggError) { ul.appendChild(el("li", "empty", suggError)); $("sugg-more").hidden = true; return; }
    if (!suggestions || spots === null) { ul.appendChild(el("li", "empty", "Loading suggestions…")); return; }
    const list = openSuggestions();
    if (!list.length) { ul.appendChild(el("li", "empty", "No new suggestions nearby.")); $("sugg-more").hidden = true; return; }
    list.slice(0, suggShowAll ? 25 : 6).forEach(g => {
      const li = el("li");
      const left = el("div");
      left.appendChild(el("div", "sugg-name", `${KIND_EMOJI[g.kind] || ""} ${g.name}`));
      left.appendChild(el("div", "spot-meta", `${g.label} · ${g.dist.toFixed(1)} mi`));
      const btns = el("div", "sugg-btns");
      const mapBtn = el("button", "btn ghost small", "Map"); mapBtn.type = "button";
      mapBtn.addEventListener("click", () => { showView("map"); setSuggOnMap(true); map.setView([g.lat, g.lng], 16); });
      const add = el("button", "btn small", "+ Add"); add.type = "button";
      add.addEventListener("click", () => addSuggestion(g));
      btns.appendChild(mapBtn); btns.appendChild(add);
      li.appendChild(left); li.appendChild(btns);
      ul.appendChild(li);
    });
    $("sugg-more").hidden = list.length <= 6;
    $("sugg-more").textContent = suggShowAll ? "Show fewer" : `Show more (${Math.min(list.length, 25) - 6})`;
    if (suggOnMap) renderSuggPins();
  }
  $("sugg-more").addEventListener("click", () => { suggShowAll = !suggShowAll; renderSuggestions(); });
  $("sugg-near").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Location isn't available on this device.");
    $("sugg-near").textContent = "◎ Finding you…";
    navigator.geolocation.getCurrentPosition(p => {
      suggAnchor = { lat: p.coords.latitude, lng: p.coords.longitude };
      $("sugg-near").textContent = "◎ Near me ✓";
      loadSuggestions();
    }, () => { $("sugg-near").textContent = "◎ Near me"; alert("Couldn't get your location — allow it in your browser settings."); },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  });

  function renderSuggPins() {
    if (!map) return;
    if (!suggLayer) suggLayer = L.layerGroup();
    suggLayer.clearLayers();
    openSuggestions().forEach(g => {
      L.circleMarker([g.lat, g.lng], { radius: 6, weight: 2, color: "#777", fillColor: "#ffffff", fillOpacity: 1 })
        .bindPopup(() => {
          const box = document.createElement("div");
          box.appendChild(el("div", "pop-name", `${KIND_EMOJI[g.kind] || ""} ${g.name}`));
          box.appendChild(el("div", "pop-meta", `${g.label} · suggested from OpenStreetMap`));
          const actions = el("div", "pop-actions");
          const add = el("button", null, "+ Add to my spots"); add.type = "button";
          add.addEventListener("click", () => addSuggestion(g));
          actions.appendChild(add);
          box.appendChild(actions);
          return box;
        }).addTo(suggLayer);
    });
  }
  function setSuggOnMap(on) {
    suggOnMap = on;
    if (!map) return;
    if (on) { renderSuggPins(); suggLayer.addTo(map); } else if (suggLayer) map.removeLayer(suggLayer);
    $("map-sugg").textContent = on ? "☆ Hide suggestions" : "☆ Show suggestions";
  }
  $("map-sugg").addEventListener("click", () => setSuggOnMap(!suggOnMap));

  // ---- Satellite layers: water temperature and clarity (NOAA CoastWatch, free) ----
  // Images are requested in thin north–south strips so they line up with the map's projection,
  // and colors are stretched across today's actual range so a 2-degree temperature break shows up.
  const ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/";
  const SAT_BOX = { s: 24.3, n: 31.0, w: -87.7, e: -79.6 }; // all of Florida: Keys to Jacksonville, Panhandle to the Gulf Stream
  const SAT_LAYERS = {
    sst: {
      title: "Water temperature (satellite, daily)",
      candidates: [{ id: "jplMURSST41", v: "analysed_sst" }],
      palette: "Rainbow", scale: "Linear",
      gradient: "linear-gradient(90deg,#3b0f9f,#2c6bff,#22c3e6,#3fd36b,#f4e04d,#f08a24,#d7191c)",
      fmt: c => `${Math.round(c * 9 / 5 + 32)}°F`,
      fallback: { lo: 24, hi: 31 }, // typical South Florida range (°C) if today's range can't be read
      note: "Warm and cool edges (temperature breaks) are worth checking — bait and predators often gather along them."
    },
    chl: {
      title: "Water clarity (satellite chlorophyll)",
      // "Gap-filled" versions have no cloud holes. These datasets have an extra altitude slot and store latitude north-to-south.
      // grid: true = download the numbers once (about 1,300 squares, ~9 km each) and draw the picture on the phone,
      // instead of asking NOAA's slow image maker for many slices.
      candidates: [{ id: "nesdisVHNnoaaSNPPnoaa20NRTchlaGapfilledDaily", v: "chlor_a", alt: true, desc: true, grid: true },
                   { id: "nesdisVHNnoaaSNPPnoaa20chlaGapfilledDaily", v: "chlor_a", alt: true, desc: true, grid: true }],
      colors: ["#3b0f9f", "#2c6bff", "#22c3e6", "#3fd36b", "#f4e04d", "#f08a24", "#d7191c"],
      palette: "Rainbow", scale: "Log",
      gradient: "linear-gradient(90deg,#3b0f9f,#2c6bff,#22c3e6,#3fd36b,#f4e04d,#f08a24,#d7191c)",
      fmt: (v, end) => end === "lo" ? "← clearer" : "murkier →",
      fallback: { lo: 0.05, hi: 5 },
      note: "Blue = clear water, red = green/murky water. Cloudy areas are filled in by NOAA from nearby days. Color changes (weed lines, edges) often hold fish."
    }
  };
  let satLayer = null, satOn = null;

  // NOAA's data server doesn't allow normal cross-site data requests (CORS) but supports the older
  // "JSONP" style: the answer comes back as a small script that hands us the data.
  let jsonpN = 0;
  function erddapJson(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const cb = "__erddap" + (++jsonpN) + "_" + Date.now();
      const el = document.createElement("script");
      const done = () => { clearTimeout(t); delete window[cb]; el.remove(); };
      const t = setTimeout(() => { done(); reject(new Error("NOAA didn't answer")); }, timeoutMs || 20000);
      window[cb] = data => { done(); resolve(data); };
      el.onerror = () => { done(); reject(new Error("NOAA request failed")); };
      el.src = url + (url.includes("?") ? "&" : "?") + ".jsonp=" + cb;
      document.head.appendChild(el);
    });
  }

  // Ask NOAA for a coarse sample of the latest image to learn its date and value range
  // Build the "which slice" part of a NOAA request: [time][altitude?][latitude][longitude]
  function satQuery(c, s, n, stride, desc) {
    const st = stride ? `:${stride}:` : ":";
    const lat = desc ? `[(${n})${st}(${s})]` : `[(${s})${st}(${n})]`;
    return `${c.v}[(last)]${c.alt ? "[(0.0)]" : ""}${lat}[(${SAT_BOX.w})${st}(${SAT_BOX.e})]`;
  }

  async function satProbe(def) {
    for (const c0 of def.candidates) {
      for (const desc of [!!c0.desc, !c0.desc]) { // if the latitude order guess is wrong, try the other way
      const c = { ...c0, desc };
      try {
        const q = `${ERDDAP}${c.id}.json?${satQuery(c, SAT_BOX.s, SAT_BOX.n, c.grid ? 0 : 20, desc)}`;
        const d = await erddapJson(q, c.grid ? 30000 : 20000);
        const rows = (d.table && d.table.rows) || [];
        const vals = rows.map(r => r[r.length - 1]).filter(v => typeof v === "number" && isFinite(v) && (def.scale !== "Log" || v > 0)).sort((a, b) => a - b);
        if (vals.length < 10) continue;
        const pct = q => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))];
        let lo = pct(0.05), hi = pct(0.95);
        if (def.scale === "Linear" && hi - lo < 1) { lo -= 0.5; hi += 0.5; }
        return { c, time: rows[0][0], lo, hi, rows: c.grid ? rows : null };
      } catch (e) { /* try the next source */ }
      }
    }
    throw new Error("No satellite image available right now");
  }

  // Paint downloaded satellite numbers into a picture. Rows are placed using the map's own
  // (Mercator) stretching so each square lines up with the coastline.
  function satGridOverlay(def, p) {
    const pts = p.rows.map(r => ({ lat: r[r.length - 3], lng: r[r.length - 2], v: r[r.length - 1] }))
      .filter(o => typeof o.v === "number" && isFinite(o.v) && o.v > 0);
    const lats = [...new Set(p.rows.map(r => r[r.length - 3]))].sort((a, b) => a - b);
    const lngs = [...new Set(p.rows.map(r => r[r.length - 2]))].sort((a, b) => a - b);
    const dLat = lats.length > 1 ? (lats[lats.length - 1] - lats[0]) / (lats.length - 1) : 0.0833;
    const dLng = lngs.length > 1 ? (lngs[lngs.length - 1] - lngs[0]) / (lngs.length - 1) : 0.0833;
    const S = lats[0] - dLat / 2, N = lats[lats.length - 1] + dLat / 2;
    const W = lngs[0] - dLng / 2, E = lngs[lngs.length - 1] + dLng / 2;
    const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    const mS = merc(S), mN = merc(N);
    const Wpx = lngs.length * 8, Hpx = lats.length * 8;
    const cv = document.createElement("canvas");
    cv.width = Wpx; cv.height = Hpx;
    const ctx = cv.getContext("2d");
    const rgb = def.colors.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
    const lo = Math.log(p.lo), hi = Math.log(p.hi);
    const color = v => {
      let t = (Math.log(v) - lo) / ((hi - lo) || 1);
      t = Math.max(0, Math.min(1, t)) * (rgb.length - 1);
      const i = Math.min(rgb.length - 2, Math.floor(t)), f = t - i;
      const c = rgb[i].map((a, k) => Math.round(a + (rgb[i + 1][k] - a) * f));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    };
    for (const o of pts) {
      const x0 = Math.floor((o.lng - dLng / 2 - W) / (E - W) * Wpx), x1 = Math.ceil((o.lng + dLng / 2 - W) / (E - W) * Wpx);
      const y0 = Math.floor((mN - merc(o.lat + dLat / 2)) / (mN - mS) * Hpx), y1 = Math.ceil((mN - merc(o.lat - dLat / 2)) / (mN - mS) * Hpx);
      ctx.fillStyle = color(o.v);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    return L.imageOverlay(cv.toDataURL(), [[S, W], [N, E]], { opacity: 0.6, interactive: false });
  }

  async function showSat(kind) {
    if (satLayer) { map.removeLayer(satLayer); satLayer = null; }
    $("map-sst").classList.toggle("on", kind === "sst");
    $("map-chl").classList.toggle("on", kind === "chl");
    satOn = kind;
    if (!kind) { $("sat-legend").hidden = true; return; }
    const def = SAT_LAYERS[kind];
    $("sat-legend").hidden = false;
    $("sat-title").textContent = def.title;
    $("sat-bar").style.background = def.gradient;
    $("sat-min").textContent = ""; $("sat-max").textContent = "";
    $("sat-note").textContent = "Loading satellite image…";
    try {
      let p, guessed = false;
      try { p = await satProbe(def); }
      catch (e) { p = { c: def.candidates[0], time: null, ...def.fallback }; guessed = true; } // still draw it, with a typical color range
      if (satOn !== kind) return; // switched away while loading
      const lo = def.scale === "Log" ? p.lo.toPrecision(2) : p.lo.toFixed(2);
      const hi = def.scale === "Log" ? p.hi.toPrecision(2) : p.hi.toFixed(2);
      const bar = encodeURIComponent(`${def.palette}|C|${def.scale}|${lo}|${hi}|`);
      satLayer = L.layerGroup();
      if (p.rows) { satGridOverlay(def, p).addTo(satLayer); }
      else {
      const STEP = 0.5; // half-degree slices keep the picture lined up with the coastline
      for (let lat = SAT_BOX.s; lat < SAT_BOX.n - 1e-9; lat += STEP) {
        const top = Math.min(SAT_BOX.n, lat + STEP);
        const url = `${ERDDAP}${p.c.id}.transparentPng?${satQuery(p.c, lat.toFixed(2), top.toFixed(2), 0, p.c.desc)}&.colorBar=${bar}`;
        L.imageOverlay(url, [[lat, SAT_BOX.w], [top, SAT_BOX.e]], { opacity: 0.6, interactive: false }).addTo(satLayer);
      }
      }
      satLayer.addTo(map);
      const when = new Date(p.time);
      $("sat-min").textContent = def.fmt(p.lo, "lo");
      $("sat-max").textContent = def.fmt(p.hi, "hi");
      $("sat-note").textContent = `${def.note} ` + (guessed
        ? "(Couldn't read today's range, so colors use a typical range. If nothing appears over the water, the image isn't available right now.)"
        : `Image from ${isNaN(when) ? "the latest pass" : when.toLocaleDateString([], { month: "short", day: "numeric" })}.`);
    } catch (e) {
      if (satOn === kind) $("sat-note").textContent = "This satellite layer isn't available right now — try again later.";
    }
  }
  $("map-sst").addEventListener("click", () => { initMap(); showSat(satOn === "sst" ? null : "sst"); });
  $("map-chl").addEventListener("click", () => { initMap(); showSat(satOn === "chl" ? null : "chl"); });

  // ---- Map extras: nautical chart, artificial reefs, boat ramps, protected zones (free public data) ----
  // Reefs and ramps come from Florida Fish & Wildlife (FWC); the chart from NOAA. Only the part of the map you're
  // looking at is requested, and if a service is down you get a plain message instead of an error.
  const MX = {
    chartUrl: "https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/MapServer/export",
    reef: { url: "https://gis.myfwc.com/mapping/rest/services/Open_Data/Artificial_Reef_Locations_in_Florida/MapServer/12/query", minZoom: 9,
            fields: "Name,MatDescrip,Depth,Relief,County,DeployDate,DDate,Tonnage", color: "#0e9aa7", label: "artificial reefs" },
    ramp: { url: "https://gis.myfwc.com/mapping/rest/services/Open_Data/FWC_Florida_Boat_Ramp_Inventory/MapServer/4/query", minZoom: 9,
            fields: "RampName,WaterBodyName,TotalLanes,isFeeRequired,FeeAmount,Hours,Status,Amenities,ContactPhone,Street1,City,DockType,RampCondition", color: "#e67e22", label: "boat ramps" },
    zoneUrls: ["https://services1.arcgis.com/eGSDp8lpKe5izqVc/ArcGIS/rest/services/Marine_Protected_Areas__MPAIs_/FeatureServer/0/query",
               "https://oceandata.rad.rutgers.edu/arcgis/rest/services/Administrative/NOAAMarineProtectedAreasInventory2023/MapServer/0/query"],
    zoneMinZoom: 8
  };
  const mxOn = { chart: false, reef: false, ramp: false, zone: false };
  const mxLayers = { chart: null, reef: null, ramp: null, zone: null };
  let mxTimer = null, mxSeq = { reef: 0, ramp: 0, zone: 0 };
  const mxMsg = {};

  function mxNote() {
    const parts = Object.keys(mxMsg).filter(k => mxOn[k] && mxMsg[k]).map(k => mxMsg[k]);
    if (mxOn.zone) parts.push("Protected-zone outlines are a guide only — always check current FWC / NOAA rules before you fish.");
    if (mxOn.chart) parts.push("Chart: NOAA — not for navigation.");
    const n = $("mx-note");
    n.hidden = !parts.length; n.textContent = parts.join(" ");
  }

  function mxChartLayer() {
    // The chart service draws pictures on request; each map square asks for its own picture in Web Mercator meters.
    const Chart = L.TileLayer.extend({
      getTileUrl(c) {
        const size = 256, R = 6378137, world = 2 * Math.PI * R, res = world / (size * Math.pow(2, c.z));
        const x0 = -world / 2 + c.x * size * res, y1 = world / 2 - c.y * size * res;
        const bbox = [x0, y1 - size * res, x0 + size * res, y1].join(",");
        return `${MX.chartUrl}?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size},${size}&format=png32&transparent=true&f=image`;
      }
    });
    const layer = new Chart("", { maxZoom: 19, opacity: 0.85, attribution: "Charts &copy; NOAA" });
    let ok = 0, bad = 0;
    layer.on("tileload", () => { ok++; if (mxMsg.chart) { mxMsg.chart = ""; mxNote(); } });
    layer.on("tileerror", () => { bad++; if (!ok && bad >= 3 && mxMsg.chart !== "NOAA's chart service isn't answering right now — try again later.") { mxMsg.chart = "NOAA's chart service isn't answering right now — try again later."; mxNote(); } });
    return layer;
  }

  function mxVal(v) { return v == null || v === "" || v === " " ? null : String(v).trim(); }
  function mxPopup(title, rows, ll) {
    const box = document.createElement("div");
    box.appendChild(el("div", "pop-name", title));
    rows.forEach(([k, v]) => { v = mxVal(v); if (v) box.appendChild(el("div", "pop-meta", `${k}: ${v}`)); });
    if (ll) {
      const a = el("a", "pop-meta", "Directions ↗");
      a.href = `https://www.google.com/maps/dir/?api=1&destination=${ll[0]},${ll[1]}`; a.target = "_blank"; a.rel = "noopener";
      box.appendChild(a);
    }
    return box;
  }
  function reefPopup(a, ll) {
    const when = mxVal(a.DeployDate) || mxVal(a.DDate);
    return mxPopup("🪸 " + (mxVal(a.Name) || "Artificial reef"), [["Material", a.MatDescrip], ["Depth", mxVal(a.Depth) && a.Depth + " ft"],
      ["Relief", mxVal(a.Relief) && a.Relief + " ft"], ["County", a.County], ["Deployed", when && (isNaN(+when) ? when : new Date(+when).getFullYear())],
      ["Tons", a.Tonnage]], ll);
  }
  function rampPopup(a, ll) {
    const lanes = mxVal(a.TotalLanes);
    const fee = a.isFeeRequired === "Yes" || a.isFeeRequired === 1 || a.isFeeRequired === "Y" ? ("Yes" + (mxVal(a.FeeAmount) ? " — " + a.FeeAmount : "")) : mxVal(a.isFeeRequired) && "No";
    return mxPopup("⛵ " + (mxVal(a.RampName) || "Boat ramp"), [["Water", a.WaterBodyName], ["Lanes", lanes], ["Fee", fee], ["Hours", a.Hours],
      ["Status", a.Status], ["Condition", a.RampCondition], ["Dock", a.DockType], ["Amenities", a.Amenities], ["Phone", a.ContactPhone],
      ["Address", [a.Street1, a.City].filter(mxVal).join(", ")]], ll);
  }

  function mxBounds() {
    const b = map.getBounds();
    return `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`;
  }
  function mxQueryUrl(base, fields, geomType, extra) {
    return `${base}?where=1%3D1&geometry=${mxBounds()}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=${encodeURIComponent(fields)}&returnGeometry=true&outSR=4326&f=${geomType}${extra || ""}`;
  }

  async function mxLoadPoints(kind) {
    const def = MX[kind], seq = ++mxSeq[kind];
    if (mxLayers[kind]) { map.removeLayer(mxLayers[kind]); mxLayers[kind] = null; }
    if (map.getZoom() < def.minZoom) { mxMsg[kind] = `Zoom in a little to see ${def.label}.`; mxNote(); return; }
    mxMsg[kind] = `Loading ${def.label}…`; mxNote();
    try {
      const r = await fetch(mxQueryUrl(def.url, def.fields, "json", "&resultRecordCount=1500"));
      if (!r.ok) throw new Error("bad answer");
      const d = await r.json();
      if (seq !== mxSeq[kind] || !mxOn[kind]) return;
      if (d.error || !Array.isArray(d.features)) throw new Error("bad data");
      const g = L.layerGroup();
      d.features.forEach(f => {
        if (!f.geometry || f.geometry.y == null) return;
        const ll = [f.geometry.y, f.geometry.x], a = f.attributes || {};
        const m = L.circleMarker(ll, { radius: kind === "reef" ? 6 : 7, color: "#fff", weight: 1.5, fillColor: def.color, fillOpacity: 0.95 });
        m.bindPopup(() => kind === "reef" ? reefPopup(a, ll) : rampPopup(a, ll));
        m.addTo(g);
      });
      g.addTo(map); mxLayers[kind] = g;
      mxMsg[kind] = d.features.length ? (d.exceededTransferLimit ? `Showing many ${def.label} — zoom in to see them all.` : "") : `No ${def.label} in this view.`;
    } catch (e) {
      if (seq === mxSeq[kind]) mxMsg[kind] = `Couldn't load ${def.label} right now (the state's map service may be down) — try again later.`;
    }
    mxNote();
  }

  async function mxLoadZones() {
    const seq = ++mxSeq.zone;
    if (mxLayers.zone) { map.removeLayer(mxLayers.zone); mxLayers.zone = null; }
    if (map.getZoom() < MX.zoneMinZoom) { mxMsg.zone = "Zoom in a little to see protected zones."; mxNote(); return; }
    mxMsg.zone = "Loading protected zones…"; mxNote();
    const simplify = "&maxAllowableOffset=" + (360 / (256 * Math.pow(2, map.getZoom()))).toFixed(6);
    for (const base of MX.zoneUrls) {
      try {
        const r = await fetch(mxQueryUrl(base, "*", "geojson", simplify + "&resultRecordCount=300"));
        if (!r.ok) continue;
        const d = await r.json();
        if (seq !== mxSeq.zone || !mxOn.zone) return;
        if (d.error || !Array.isArray(d.features)) continue;
        const layer = L.geoJSON(d, { style: { color: "#c0392b", weight: 2, fillColor: "#c0392b", fillOpacity: 0.12, dashArray: "6 4" },
          onEachFeature: (f, l) => l.bindPopup(() => zonePopup(f.properties || {})) });
        layer.addTo(map); mxLayers.zone = layer;
        mxMsg.zone = d.features.length ? "" : "No protected zones in this view.";
        mxNote(); return;
      } catch (e) { /* try the next source */ }
    }
    if (seq === mxSeq.zone) mxMsg.zone = "Couldn't load protected zones right now — try again later.";
    mxNote();
  }
  // The zone lists name their columns differently, so look for the usual ones.
  function zonePopup(p) {
    const find = re => { const k = Object.keys(p).find(k => re.test(k) && mxVal(p[k])); return k ? p[k] : null; };
    return mxPopup("🚫 " + (find(/^(site_?name|name|area_?name|mpa_?name)$/i) || "Protected area"),
      [["Fishing rules", find(/fish.*(restrict|rule|regul)|no_?take|restrict/i)], ["Level of protection", find(/protection|level/i)],
       ["Managed by", find(/manag|agency|authority|^gov/i)], ["Type", find(/type|designation/i)]], null);
  }

  function mxRefresh() {
    clearTimeout(mxTimer);
    mxTimer = setTimeout(() => {
      if (mxOn.reef) mxLoadPoints("reef");
      if (mxOn.ramp) mxLoadPoints("ramp");
      if (mxOn.zone) mxLoadZones();
    }, 400);
  }

  function mxToggle(kind) {
    initMap();
    if (!map) return;
    mxOn[kind] = !mxOn[kind];
    $("mx-" + kind).classList.toggle("on", mxOn[kind]);
    if (kind === "chart") {
      if (mxOn.chart) { mxLayers.chart = mxLayers.chart || mxChartLayer(); mxLayers.chart.addTo(map); mxLayers.chart.bringToFront && mxLayers.chart.bringToFront(); }
      else if (mxLayers.chart) map.removeLayer(mxLayers.chart);
      mxNote(); return;
    }
    if (!mxOn[kind]) {
      mxSeq[kind]++; mxMsg[kind] = "";
      if (mxLayers[kind]) { map.removeLayer(mxLayers[kind]); mxLayers[kind] = null; }
      mxNote(); return;
    }
    kind === "zone" ? mxLoadZones() : mxLoadPoints(kind);
    if (!map._mxBound) { map._mxBound = true; map.on("moveend", mxRefresh); }
  }
  ["chart", "reef", "ramp", "zone"].forEach(k => $("mx-" + k).addEventListener("click", () => mxToggle(k)));

