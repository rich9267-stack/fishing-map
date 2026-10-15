  // ---- 🏠 Home waters + "where am I" (Gulf expansion, step 1a) ----
  // Home waters = the area you fish most (picked in Profile; kept private in the home_waters table + on this phone).
  // The "area now" = where your phone is (if you allowed location) — otherwise home. Today's tide, wind, pressure, moon and the
  // header follow the area now. LAT / LNG / STATION (js/01, js/06) are the area-now values; everything that used them follows.
  const HOME_PRESETS = [
    { name: "Jupiter / Palm Beach", lat: 26.85, lng: -80.07 },
    { name: "Boca Raton / Delray", lat: 26.40, lng: -80.07 },
    { name: "Pompano Beach / Fort Lauderdale", lat: 26.24, lng: -80.10 },
    { name: "Hollywood / Miami Beach", lat: 25.95, lng: -80.12 },
    { name: "Miami / Biscayne Bay", lat: 25.70, lng: -80.20 },
    { name: "Key Largo / Upper Keys", lat: 25.09, lng: -80.45 },
    { name: "Islamorada / Marathon (Middle Keys)", lat: 24.85, lng: -80.80 },
    { name: "Lower Keys / Key West", lat: 24.60, lng: -81.50 },
    { name: "Everglades City / Ten Thousand Islands", lat: 25.85, lng: -81.38 },
    { name: "Marco Island / Naples", lat: 26.10, lng: -81.80 },
    { name: "Fort Myers / Sanibel", lat: 26.55, lng: -82.00 },
    { name: "Charlotte Harbor / Boca Grande", lat: 26.80, lng: -82.20 },
    { name: "Sarasota / Venice", lat: 27.30, lng: -82.55 },
    { name: "Tampa Bay / St. Petersburg", lat: 27.70, lng: -82.65 },
    { name: "Clearwater / Tarpon Springs", lat: 28.05, lng: -82.80 }
  ];
  const HW_KEY = "fm-home-waters", HW_ASK_KEY = "fm-hw-ask", HW_DEFAULT = { name: "Pompano Beach", lat: 26.24, lng: -80.10 };
  const HW_AWAY_MI = 40, HW_MOVE_MI = 10, HW_RECHECK_MS = 10 * 60000;
  let homeWaters = null, hwLoaded = { lat: null, lng: null }, hwLastCheck = 0, hwStationTimer = null;
  const area = { lat: LAT, lng: LNG, name: null, away: false, fromGps: false };
  try { const h = JSON.parse(localStorage.getItem(HW_KEY) || "null"); if (h && isFinite(h.lat) && isFinite(h.lng) && h.name) homeWaters = h; } catch (e) {}

  const hwHome = () => homeWaters || HW_DEFAULT;
  function hwNearestName(lat, lng) {
    let best = null;
    HOME_PRESETS.forEach(p => { const d = miles(lat, lng, p.lat, p.lng); if (d <= HW_AWAY_MI && (!best || d < best.d)) best = { n: p.name, d }; });
    return best ? best.n : null;
  }
  function hwHeader() {
    const sub = $("hdr-sub"); if (!sub) return;
    const h = hwHome();
    if (area.away) sub.textContent = `📍 ${area.name || "Away from home"} · home waters: ${h.name}`;
    else if (homeWaters) sub.textContent = `Home waters: ${h.name}`;
    else if (area.fromGps && area.name) sub.textContent = `📍 ${area.name}`;
    else sub.textContent = "South Florida · home waters: Pompano Beach";
  }

  // Make (lat, lng) the area now. Reloads tide / wind / pressure / moon when you've moved more than ~10 miles.
  function hwApply(lat, lng, fromGps) {
    const h = hwHome();
    area.lat = lat; area.lng = lng; area.fromGps = !!fromGps;
    area.away = !!homeWaters && miles(lat, lng, h.lat, h.lng) > HW_AWAY_MI;
    area.name = hwNearestName(lat, lng);
    if (area.away && !area.name) area.name = "A new area";
    LAT = lat; LNG = lng;
    hwHeader();
    if (typeof pubAreaChanged === "function") pubAreaChanged();   // Feed: Local follows the area now; 🏠 Home appears / disappears with area.away
    const moved = hwLoaded.lat == null || miles(lat, lng, hwLoaded.lat, hwLoaded.lng) > HW_MOVE_MI;
    if (!moved) return;
    hwLoaded = { lat, lng };
    hwPickStation(true);
    loadWeather(); loadPressure(); loadMoon();
    if (typeof hwAfterMove === "function") hwAfterMove();
  }
  // Pick the tide station for the area now. If NOAA has nothing close, say so instead of showing a far-away tide.
  function hwPickStation(first) {
    clearTimeout(hwStationTimer);
    const st = stationFor({ lat: area.lat, lng: area.lng });
    if (!st) return;
    if (st.dist != null && st.dist > 25) {
      if (first) { $("stage").textContent = "Finding the nearest tide station…"; $("stage").className = "now"; $("next").textContent = ""; }
      hwStationTimer = setTimeout(() => {
        const again = stationFor({ lat: area.lat, lng: area.lng });
        if (again && again.dist > 25) {
          $("stage").textContent = "No tide station within 25 miles"; $("stage").className = "now";
          $("next").textContent = "Tides, wind and moon still work. Spots you save here get their own nearest station.";
          $("days").innerHTML = "";
        } else hwPickStation(false);
      }, 8000);
      return;
    }
    if (st.id !== STATION || first) { STATION = st.id; load(); }
  }
  // js/02 calls this when NOAA has told us about more stations near a place
  function hwStationsAdded() { if (hwLoaded.lat != null) hwPickStation(false); }

  // Where is the phone? Only asks the browser silently when location is already allowed.
  function hwLocate(force) {
    if (!navigator.geolocation) return;
    if (!force && Date.now() - hwLastCheck < HW_RECHECK_MS) return;
    const go = () => navigator.geolocation.getCurrentPosition(p => {
      hwLastCheck = Date.now();
      hwApply(+p.coords.latitude.toFixed(4), +p.coords.longitude.toFixed(4), true);
      hwAskCheck();
    }, () => { hwAskCheck(); }, { maximumAge: 600000, timeout: 15000 });
    if (force) { go(); return; }
    try {
      if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(r => { if (r.state === "granted") go(); else hwAskCheck(); }, () => {});
    } catch (e) { /* no silent check: the "Allow location" button below does it */ }
  }

  // Remember home on this phone and in the database
  async function hwSetHome(h) {
    homeWaters = { name: h.name, lat: +(+h.lat).toFixed(4), lng: +(+h.lng).toFixed(4) };
    try { localStorage.setItem(HW_KEY, JSON.stringify(homeWaters)); } catch (e) {}
    if ($("pf-area")) $("pf-area").value = homeWaters.name;
    hwApply(area.fromGps ? area.lat : homeWaters.lat, area.fromGps ? area.lng : homeWaters.lng, area.fromGps);
    hwAskCheck();
    if (!me) return;
    try {
      await db.from("home_waters").upsert({ user_id: me.id, name: homeWaters.name, lat: homeWaters.lat, lng: homeWaters.lng, updated_at: new Date().toISOString() });
      if (me.profile) me.profile.home_area = homeWaters.name;
      await db.from("profiles").update({ home_area: homeWaters.name }).eq("user_id", me.id);
    } catch (e) { /* kept on this phone; saves next time */ }
  }
  // After sign-in: the database copy wins (so a new phone knows your home waters)
  async function hwLoadMine() {
    try {
      const { data } = await db.from("home_waters").select("name,lat,lng").eq("user_id", me.id).maybeSingle();
      if (data && data.name) {
        homeWaters = { name: data.name, lat: +data.lat, lng: +data.lng };
        try { localStorage.setItem(HW_KEY, JSON.stringify(homeWaters)); } catch (e) {}
        hwApply(area.fromGps ? area.lat : homeWaters.lat, area.fromGps ? area.lng : homeWaters.lng, area.fromGps);
      } else if (homeWaters) {   // set on this phone before the database had a row
        db.from("home_waters").upsert({ user_id: me.id, name: homeWaters.name, lat: homeWaters.lat, lng: homeWaters.lng }).then(() => {}, () => {});
      }
    } catch (e) { /* offline: this phone's copy is used */ }
    hwAskCheck();
  }

  // ---- The picker (Profile → Home waters) ----
  (function hwPicker() {
    const sel = $("hw-pick"); if (!sel) return;
    sel.appendChild(new Option("Choose your home waters…", ""));
    HOME_PRESETS.forEach((p, i) => sel.appendChild(new Option(p.name, String(i))));
    function sync() {
      const i = homeWaters ? HOME_PRESETS.findIndex(p => p.name === homeWaters.name) : -1;
      sel.value = i >= 0 ? String(i) : "";
      $("hw-msg").textContent = homeWaters && i < 0 ? `Saved: ${homeWaters.name} (your own point)` : homeWaters ? "Saved ✓" : "Not set yet — conditions use Pompano Beach until you pick.";
    }
    sel.addEventListener("change", () => {
      if (sel.value === "") return;
      const p = HOME_PRESETS[+sel.value]; hwSetHome(p); $("hw-msg").textContent = "Saved ✓";
    });
    $("hw-here").addEventListener("click", () => {
      if (!navigator.geolocation) { $("hw-msg").textContent = "Location isn't available on this device."; return; }
      $("hw-msg").textContent = "Finding you…";
      navigator.geolocation.getCurrentPosition(p => {
        const lat = p.coords.latitude, lng = p.coords.longitude, typed = ($("pf-area").value || "").trim();
        hwSetHome({ name: hwNearestName(lat, lng) || typed || "My home waters", lat, lng });
        hwLastCheck = Date.now(); sync(); $("hw-msg").textContent = `Saved ✓ — home is where you are now (${homeWaters.name}).`;
      }, () => { $("hw-msg").textContent = "Couldn't get your location — allow it in your browser and try again."; }, { enableHighAccuracy: true, timeout: 15000 });
    });
    $("profile-btn").addEventListener("click", sync);
  })();

  // ---- One-time friendly asks: set home waters, then allow location (each can be dismissed; asked again after 2 weeks) ----
  function hwAskState() { try { return JSON.parse(localStorage.getItem(HW_ASK_KEY) || "{}"); } catch (e) { return {}; } }
  function hwAskSet(k) { const s = hwAskState(); s[k] = Date.now(); try { localStorage.setItem(HW_ASK_KEY, JSON.stringify(s)); } catch (e) {} }
  function hwAskCheck() {
    const bar = $("hw-ask"); if (!bar) return;
    bar.hidden = true;
    if (!me) return;
    const s = hwAskState(), fresh = k => !s[k] || Date.now() - s[k] > 14 * 86400000;
    if (!homeWaters && fresh("home")) {
      bar.dataset.kind = "home"; $("hw-ask-text").textContent = "🏠 Where do you fish most? Set your home waters, and the app will notice when you travel."; $("hw-ask-yes").textContent = "Set it"; bar.hidden = false; return;
    }
    if (!area.fromGps && fresh("loc") && navigator.geolocation) {
      bar.dataset.kind = "loc"; $("hw-ask-text").textContent = "📍 Want tides, weather, rules and spot ideas for wherever you're fishing? Allow your location."; $("hw-ask-yes").textContent = "Allow"; bar.hidden = false;
    }
  }
  (function hwAskButtons() {
    const yes = $("hw-ask-yes"), no = $("hw-ask-no"); if (!yes) return;
    yes.addEventListener("click", () => {
      const k = $("hw-ask").dataset.kind; $("hw-ask").hidden = true;
      if (k === "home") $("profile-btn").click(); else { hwAskSet("loc"); hwLocate(true); }
    });
    no.addEventListener("click", () => { hwAskSet($("hw-ask").dataset.kind); $("hw-ask").hidden = true; setTimeout(hwAskCheck, 50); });
  })();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) hwLocate(false); });

  // Start-up: the area now begins as home (so the first tide / weather load is already right), then GPS refines it.
  function hwStart() {
    const h = hwHome(); area.lat = LAT = h.lat; area.lng = LNG = h.lng;
    hwLoaded = { lat: h.lat, lng: h.lng };
    STATION = stationFor({ lat: h.lat, lng: h.lng }).id;
    hwHeader();
    hwLocate(false);   // silent: only reads your location if you already allowed it
  }
