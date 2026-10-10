  // ---- Shared spots (Supabase database) ----
  const SUPABASE_URL = "https://euxcisnyansdrzzjyvsl.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WzAISSZCvquNsRJ3iJEP-Q_GjtILF7p"; // public key, safe in the page
  const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  let me = null;           // { id, email, name, isAdmin } once signed in and on the invite list
  const isMine = row => !!(me && row && row.created_by === me.id);
  let spots = null;       // null = still loading (your circle: you + friends)
  let spotsAll = [];      // every spot you can see, including strangers' public ones (🌎 Public tab only)
  // Your circle = you + accepted friends. The main tabs only use the circle; strangers' public posts stay in 🌎 Public.
  let circlePromise = null, friendSig = null;
  function getCircle(fresh) {
    if (fresh || !circlePromise) circlePromise = (async () => {
      try {
        const { data, error } = await db.from("friendships").select("user_a,user_b").eq("status", "accepted");
        if (error) throw error;
        return new Set(data.map(r => (r.user_a === me.id ? r.user_b : r.user_a)));
      } catch (e) { circlePromise = null; return null; }
    })();
    return circlePromise;
  }
  const inCircle = (set, id) => !id || !set || (me && id === me.id) || set.has(id);
  let spotsError = null;
  let pickedLoc = null;

  const VIS_LABEL = { private: "🔒 Private", friends: "👥 Friends", public: "🌎 Public" };
  const follows = new Set(); // spots I follow ⭐ (morning bite alerts include them)
  const visIcon = s => (follows.has(s.id) ? "⭐ " : "") + (s.visibility === "public" ? "🌎 " : s.visibility === "private" || s.is_private ? "🔒 " : "");
  const WATER_LABEL = { saltwater: "Saltwater", brackish: "Brackish / tidal canal", freshwater: "Freshwater" };
  const $ = id => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // textContent keeps typed text safe
    return e;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ---- Per-spot conditions: nearest tide station or freshwater gauge ----
  // NOAA tide-prediction stations in and around Broward County
  const TIDE_STATIONS = [
    { id: "8722670", name: "Lake Worth Pier", lat: 26.6128, lng: -80.0342 },
    { id: "8722802", name: "Lake Wyman (Boca Raton)", lat: 26.37, lng: -80.07 },
    { id: "8722832", name: "Deerfield Beach", lat: 26.3133, lng: -80.0817 },
    { id: "8722854", name: "Hillsboro Beach, ICWW", lat: 26.2733, lng: -80.08 },
    { id: "8722859", name: "Hillsboro", lat: 26.26, lng: -80.085 },
    { id: "8722861", name: "Hillsboro Inlet, inside", lat: 26.2583, lng: -80.0817 },
    { id: "8722862", name: "Hillsboro Inlet, ocean", lat: 26.2567, lng: -80.08 },
    { id: "8722899", name: "Lauderdale-by-the-Sea", lat: 26.1883, lng: -80.0933 },
    { id: "8722937", name: "Ft. Lauderdale, Andrews Ave Bridge", lat: 26.1183, lng: -80.145 },
    { id: "8722939", name: "Ft. Lauderdale, Bahia Yacht Club", lat: 26.1133, lng: -80.1083 },
    { id: "8722946", name: "Mayan Lake", lat: 26.1, lng: -80.1083 },
    { id: "8722951", name: "Port Everglades, Lake Mabel", lat: 26.0917, lng: -80.1233 },
    { id: "8722956", name: "South Port Everglades", lat: 26.0817, lng: -80.1167 },
    { id: "8722957", name: "North Dania Sound", lat: 26.08, lng: -80.1117 },
    { id: "8722968", name: "Port Laudania", lat: 26.06, lng: -80.13 },
    { id: "8722971", name: "Whiskey Creek, south entrance", lat: 26.055, lng: -80.1133 },
    { id: "8722977", name: "West Lake, north end", lat: 26.0433, lng: -80.1267 },
    { id: "8722979", name: "Hollywood Beach", lat: 26.04, lng: -80.115 },
    { id: "8722982", name: "West Lake, south end", lat: 26.0333, lng: -80.1233 },
    { id: "8723214", name: "Virginia Key", lat: 25.7314, lng: -80.1618 },
    // Palm Beach County
    { id: "8722404", name: "Peck Lake, St. Lucie Inlet", lat: 27.1133, lng: -80.145 },
    { id: "8722429", name: "Hobe Sound Bridge", lat: 27.065, lng: -80.1233 },
    { id: "8722445", name: "Hobe Sound State Park", lat: 27.0367, lng: -80.1067 },
    { id: "8722471", name: "Conch Bar, Jupiter Sound", lat: 26.9883, lng: -80.0933 },
    { id: "8722472", name: "North Loxahatchee River", lat: 26.9867, lng: -80.1417 },
    { id: "8722481", name: "Loxahatchee River", lat: 26.97, lng: -80.1267 },
    { id: "8722486", name: "Tequesta, N. Fork Loxahatchee", lat: 26.96, lng: -80.105 },
    { id: "8722491", name: "Jupiter Sound, south end", lat: 26.9517, lng: -80.08 },
    { id: "8722492", name: "Jupiter West", lat: 26.9467, lng: -80.09 },
    { id: "8722494", name: "SW Fork, Loxahatchee River", lat: 26.9433, lng: -80.12 },
    { id: "8722495", name: "Jupiter Inlet", lat: 26.9433, lng: -80.0733 },
    { id: "8722496", name: "Loxahatchee River Lock", lat: 26.935, lng: -80.1433 },
    { id: "8722499", name: "Jupiter, ICWW", lat: 26.935, lng: -80.085 },
    { id: "8722512", name: "Lake Worth Creek", lat: 26.9117, lng: -80.08 },
    { id: "8722528", name: "Donald Ross Bridge", lat: 26.8817, lng: -80.07 },
    { id: "8722548", name: "PGA Boulevard Bridge", lat: 26.8433, lng: -80.0667 },
    { id: "8722557", name: "North Palm Beach", lat: 26.8267, lng: -80.055 },
    { id: "8722588", name: "Port of West Palm Beach", lat: 26.77, lng: -80.0517 },
    { id: "8722607", name: "Palm Beach", lat: 26.7333, lng: -80.0417 },
    { id: "8722621", name: "Palm Beach (south)", lat: 26.705, lng: -80.045 },
    { id: "8722654", name: "West Palm Beach", lat: 26.645, lng: -80.045 },
    { id: "8722706", name: "Boynton Beach", lat: 26.5483, lng: -80.0533 },
    { id: "8722718", name: "Ocean Ridge", lat: 26.5267, lng: -80.0533 },
    { id: "8722746", name: "Delray Beach", lat: 26.4733, lng: -80.0617 },
    { id: "8722761", name: "South Delray Beach", lat: 26.4467, lng: -80.065 },
    { id: "8722784", name: "Yamato", lat: 26.4033, lng: -80.07 },
    { id: "8722816", name: "Boca Raton", lat: 26.3433, lng: -80.0767 },
    // Miami-Dade County
    { id: "8723026", name: "Golden Beach", lat: 25.9667, lng: -80.125 },
    { id: "8723044", name: "Dumfoundling Bay", lat: 25.9417, lng: -80.125 },
    { id: "8723050", name: "North Miami Beach", lat: 25.93, lng: -80.12 },
    { id: "8723073", name: "Haulover Inside", lat: 25.9033, lng: -80.125 },
    { id: "8723080", name: "Haulover Pier", lat: 25.9033, lng: -80.12 },
    { id: "8723087", name: "Sunny Isles, Biscayne Creek", lat: 25.9283, lng: -80.13 },
    { id: "8723089", name: "Biscayne Creek, ICWW", lat: 25.88, lng: -80.1633 },
    { id: "8723094", name: "Indian Creek Golf Club", lat: 25.875, lng: -80.1433 },
    { id: "8723155", name: "Miami Ship Base", lat: 25.77, lng: -80.1683 },
    { id: "8723156", name: "San Marino", lat: 25.7933, lng: -80.1633 },
    { id: "8723165", name: "Miami, Biscayne Bay", lat: 25.7783, lng: -80.185 },
    { id: "8723170", name: "Miami Beach", lat: 25.7683, lng: -80.1317 },
    { id: "8723178", name: "Government Cut", lat: 25.7633, lng: -80.13 },
    { id: "8723205", name: "Dinner Key Marina", lat: 25.7267, lng: -80.2367 },
    { id: "8723232", name: "Key Biscayne Yacht Club", lat: 25.6983, lng: -80.17 },
    { id: "8723251", name: "Cape Florida, Key Biscayne", lat: 25.6517, lng: -80.16 },
    { id: "8723289", name: "Cutler, Biscayne Bay", lat: 25.615, lng: -80.305 },
    { id: "8723303", name: "Soldier Key", lat: 25.59, lng: -80.1617 },
    { id: "8723350", name: "Ragged Key #3", lat: 25.5333, lng: -80.1717 },
    { id: "8723372", name: "Sands Key", lat: 25.5067, lng: -80.1883 },
    { id: "8723393", name: "Elliott Key (outside)", lat: 25.4767, lng: -80.18 },
    { id: "8723409", name: "Elliott Key Harbor", lat: 25.4533, lng: -80.1967 },
    { id: "8723423", name: "Turkey Point", lat: 25.4367, lng: -80.33 },
    { id: "8723453", name: "Adams Key", lat: 25.3967, lng: -80.2333 },
    { id: "8723465", name: "East Arsenicker, Card Sound", lat: 25.3733, lng: -80.29 },
    { id: "8723491", name: "Card Sound West", lat: 25.345, lng: -80.3317 },
    { id: "8723506", name: "Pumpkin Key, Card Sound", lat: 25.325, lng: -80.2933 }
  ];

  function miles(aLat, aLng, bLat, bLng) {
    const R = 3958.8, rad = Math.PI / 180;
    const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function hasLoc(s) { return s && s.lat != null && s.lng != null; }

  // Stations found by asking NOAA about places outside the built-in list (remembered on this phone)
  let extraStations = [];
  try { extraStations = JSON.parse(localStorage.getItem("fm-extra-stations") || "[]"); } catch (e) {}
  const stationLookups = {};
  function lookupStationsNear(lat, lng) {
    const key = lat.toFixed(1) + "," + lng.toFixed(1);
    if (stationLookups[key]) return;
    stationLookups[key] = true;
    fetch(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/tidepredstations.json?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&radius=25`)
      .then(r => r.json())
      .then(d => {
        const list = (d.stationList || d.stations || []).map(x => ({ id: String(x.stationId || x.id), name: x.stationName || x.commonName || x.name, lat: +x.lat, lng: +(x.lon != null ? x.lon : x.lng) }))
          .filter(x => x.id && isFinite(x.lat) && isFinite(x.lng) && !/^TEC/.test(x.id));
        const known = new Set(TIDE_STATIONS.concat(extraStations).map(t => t.id));
        const add = list.filter(x => !known.has(x.id));
        if (!add.length) return;
        extraStations = extraStations.concat(add).slice(-300);
        try { localStorage.setItem("fm-extra-stations", JSON.stringify(extraStations)); } catch (e) {}
        refreshConditions(); renderSpots();
      }).catch(() => {});
  }

  // The tide station a spot uses (Hillsboro for spots without a location)
  function stationFor(s) {
    if (!hasLoc(s)) return { ...TIDE_STATIONS.find(t => t.id === STATION), dist: null };
    let best = null;
    TIDE_STATIONS.concat(extraStations).forEach(t => {
      const d = miles(s.lat, s.lng, t.lat, t.lng);
      if (!best || d < best.dist) best = { ...t, dist: d };
    });
    if (best && best.dist > 5) lookupStationsNear(s.lat, s.lng); // far from everything we know — ask NOAA
    return best;
  }

  // Each station's high/lows are fetched once and shared by every spot that uses it
  const tideCache = {};
  function stationTides(id) {
    if (!tideCache[id]) {
      const start = new Date(); start.setDate(start.getDate() - 1);
      const url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter" +
        `?product=predictions&application=fishing_map&begin_date=${ymd(start)}&range=120` +
        `&datum=MLLW&station=${id}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
      tideCache[id] = fetch(url).then(r => r.json()).then(d => {
        if (!d.predictions) throw new Error("No tide data");
        return d.predictions.map(p => ({ when: parseNoaa(p.t), high: p.type === "H" }));
      });
      tideCache[id].done = false;
      tideCache[id].then(t => { tideCache[id].done = t; refreshConditions(); },
                         () => { tideCache[id].done = "error"; refreshConditions(); });
    }
    return tideCache[id];
  }

  function stageFrom(tides, when) {
    const prev = [...tides].reverse().find(t => t.when <= when);
    const next = tides.find(t => t.when > when);
    if (!prev || !next) return null;
    const SLACK = 30 * 60000;
    let stage;
    if (when - prev.when < SLACK) stage = prev.high ? "high slack" : "low slack";
    else if (next.when - when < SLACK) stage = next.high ? "high slack" : "low slack";
    else stage = next.high ? "incoming" : "outgoing";
    return { stage, next };
  }

  // A spot's own tide times: the station's, shifted by the spot's "tide timing here" setting
  const shiftTides = (tides, min) => !min ? tides : tides.map(t => ({ ...t, when: new Date(t.when.getTime() + min * 60000) }));
  function spotTides(s) {
    const p = stationTides(stationFor(s).id);
    return p.done && p.done !== "error" ? shiftTides(p.done, s.tide_offset_min || 0) : p.done;
  }
  const offsetText = min => !min ? "" : `${min > 0 ? "+" : "−"}${Math.abs(min) >= 60 ? Math.floor(Math.abs(min) / 60) + " hr " : ""}${Math.abs(min) % 60 ? Math.abs(min) % 60 + " min" : ""}`.trim();

  function spotTideText(s) {
    const st = stationFor(s);
    const t = spotTides(s);
    if (!t) return "Loading tide…";
    if (t === "error") return "Tide unavailable";
    const r = stageFrom(t, new Date());
    if (!r) return "Tide unavailable";
    const arrow = { incoming: "⬆ Incoming", outgoing: "⬇ Outgoing", "high slack": "High slack", "low slack": "Low slack" }[r.stage];
    const adj = s.tide_offset_min ? `, ${offsetText(s.tide_offset_min)} here` : "";
    const where = st.dist != null ? ` (${st.name}, ${st.dist < 0.1 ? "here" : st.dist.toFixed(1) + " mi"}${adj})` : "";
    return `${arrow} · ${r.next.high ? "high" : "low"} ${clock(r.next.when)}${where}`;
  }

  // Freshwater: nearest active USGS gauge with a water-level reading, plus its 24-hour change
  const gaugeCache = {};
  function gaugeFor(s) {
    if (!hasLoc(s)) return null;
    const key = s.id + ":" + s.lat + "," + s.lng;
    if (!gaugeCache[key]) {
      const box = [s.lng - 0.3, s.lat - 0.3, s.lng + 0.3, s.lat + 0.3].map(v => v.toFixed(4)).join(",");
      const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${box}` +
        "&parameterCd=00065,62614,62615,62620&siteStatus=active&period=P1D";
      gaugeCache[key] = fetch(url).then(r => r.json()).then(d => {
        let best = null;
        (d.value.timeSeries || []).forEach(ts => {
          const vals = (ts.values[0] && ts.values[0].value || []).filter(v => v.value !== "" && +v.value > -999990);
          if (!vals.length) return;
          const loc = ts.sourceInfo.geoLocation.geogLocation;
          const dist = miles(s.lat, s.lng, loc.latitude, loc.longitude);
          if (best && best.dist <= dist) return; // keep the closest gauge
          const latest = vals[vals.length - 1], first = vals[0];
          best = {
            name: ts.sourceInfo.siteName, dist,
            ft: +latest.value, change: +latest.value - +first.value,
            hours: (new Date(latest.dateTime) - new Date(first.dateTime)) / 3600000
          };
        });
        return best;
      });
      gaugeCache[key].done = false;
      gaugeCache[key].then(g => { gaugeCache[key].done = g || "none"; refreshConditions(); },
                           () => { gaugeCache[key].done = "error"; refreshConditions(); });
    }
    return gaugeCache[key];
  }

  function spotWaterText(s) {
    if (!hasLoc(s)) return "Set a location to see water level";
    const g = gaugeFor(s);
    if (!g.done) return "Loading water level…";
    if (g.done === "error") return "Water level unavailable";
    if (g.done === "none") return "No water-level gauge nearby";
    const v = g.done;
    const trend = v.hours < 6 ? "" : Math.abs(v.change) < 0.05 ? " steady" : v.change > 0 ? ` ↗ up ${v.change.toFixed(2)} ft` : ` ↘ down ${Math.abs(v.change).toFixed(2)} ft`;
    return `💧 ${v.ft.toFixed(2)} ft${trend}${v.hours >= 6 ? " (24 hr)" : ""} · gauge ${v.dist.toFixed(1)} mi away`;
  }

  // Spots more than ~15 miles from Pompano get their own current wind & pressure (Open-Meteo, cached per area)
  const localWxCache = {};
  function localWx(s) {
    const key = s.lat.toFixed(1) + "," + s.lng.toFixed(1);
    if (!localWxCache[key]) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat.toFixed(2)}&longitude=${s.lng.toFixed(2)}` +
        "&current=temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl&hourly=pressure_msl&past_hours=3&forecast_hours=1" +
        "&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=America%2FNew_York";
      const p = localWxCache[key] = fetch(url).then(r => r.json()).then(d => {
        const c = d.current, h = d.hourly && d.hourly.pressure_msl;
        const inHg = c.pressure_msl / 33.8639;
        let trend = null;
        if (h && h.length >= 4 && h[0] != null) { const ch = inHg - h[0] / 33.8639; trend = ch >= 0.03 ? "rising" : ch <= -0.03 ? "falling" : "steady"; }
        return { wind: `💨 ${compass(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} mph · ${Math.round(c.temperature_2m)}°`,
                 deg: c.wind_direction_10m,
                 pressure: Math.round(inHg * 100) / 100, trend };
      });
      p.done = false;
      p.then(v => { p.done = v; refreshConditions(); }, () => { p.done = "error"; });
    }
    return localWxCache[key];
  }

  // ---- Water temperature ----
  // NOAA stations whose water-temperature sensors read believable ocean values.
  // (Port Everglades is left out: its sensor reads 92–98°F, far above the surrounding ocean.)
  const WT_STATIONS = [
    { id: "8722670", name: "Lake Worth Pier", lat: 26.6128, lng: -80.0342 },
    { id: "8723214", name: "Virginia Key", lat: 25.7314, lng: -80.1618 },
    { id: "8723970", name: "Vaca Key", lat: 24.711, lng: -81.1065 },
    { id: "8724580", name: "Key West", lat: 24.5557, lng: -81.8079 }
  ];
  const WT_RANGE = [45, 93];            // anything outside this is a bad reading
  const WT_STATION_MI = 20;             // use a station only if it's this close
  const okTemp = v => typeof v === "number" && isFinite(v) && v >= WT_RANGE[0] && v <= WT_RANGE[1];

  function wtSourceFor(lat, lng) {
    const st = WT_STATIONS.map(t => ({ ...t, dist: miles(lat, lng, t.lat, t.lng) })).sort((a, b) => a.dist - b.dist)[0];
    return st && st.dist <= WT_STATION_MI ? st : null;
  }

  // Current water temperature at a place: nearby NOAA station, otherwise an ocean model for that exact spot
  const wtNowCache = {};
  function waterTempNow(lat, lng) {
    const st = wtSourceFor(lat, lng);
    const key = st ? st.id : lat.toFixed(2) + "," + lng.toFixed(2);
    if (wtNowCache[key]) return wtNowCache[key];
    const job = (async () => {
      if (st) {
        try {
          const d = await (await fetch("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&application=fishing_map" +
            `&date=latest&station=${st.id}&units=english&time_zone=lst_ldt&format=json`)).json();
          const v = d.data && d.data[0] && parseFloat(d.data[0].v);
          if (okTemp(v)) return { f: Math.round(v * 10) / 10, source: `${st.name} station`, label: `${st.name}, ${st.dist.toFixed(0)} mi` };
        } catch (e) {}
      }
      const d = await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
        "&current=sea_surface_temperature&temperature_unit=fahrenheit&timezone=America%2FNew_York")).json();
      const v = d.current && d.current.sea_surface_temperature;
      if (!okTemp(v)) throw new Error("No water temperature here");
      return { f: Math.round(v * 10) / 10, source: "ocean model", label: "ocean estimate" };
    })();
    wtNowCache[key] = job;
    job.done = false;
    job.then(v => { job.done = v; refreshConditions(); }, () => { job.done = "error"; });
    return job;
  }

  // Water temperature at a past moment (for logging catches)
  async function waterTempAt(lat, lng, when) {
    const st = wtSourceFor(lat, lng);
    const day = ymd(when);
    if (st) {
      try {
        const d = await (await fetch("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&application=fishing_map" +
          `&begin_date=${day}&end_date=${day}&interval=h&station=${st.id}&units=english&time_zone=lst_ldt&format=json`)).json();
        const best = (d.data || []).map(r => ({ t: parseNoaa(r.t), v: parseFloat(r.v) })).filter(r => okTemp(r.v))
          .sort((a, b) => Math.abs(a.t - when) - Math.abs(b.t - when))[0];
        if (best && Math.abs(best.t - when) <= 2 * 3600000) return { f: Math.round(best.v * 10) / 10, source: `${st.name} station` };
      } catch (e) {}
    }
    const dd = ymdDash(when);
    const d = await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
      `&hourly=sea_surface_temperature&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=${dd}&end_date=${dd}`)).json();
    const h = d.hourly || {};
    const i = (h.time || []).indexOf(`${dd}T${pad2(when.getHours())}:00`);
    const v = i >= 0 ? h.sea_surface_temperature[i] : null;
    if (okTemp(v)) return { f: Math.round(v * 10) / 10, source: "ocean model" };
    // Last resort for older dates: NOAA's daily satellite record (one value per day)
    const sat = await erddapJson("https://coastwatch.noaa.gov/erddap/griddap/noaacrwsstDaily.json?analysed_sst" +
      `[(${dd}T12:00:00Z)][(${lat.toFixed(3)})][(${lng.toFixed(3)})]`);
    const row = sat.table && sat.table.rows && sat.table.rows[0];
    const c = row ? row[row.length - 1] : null;
    const f = typeof c === "number" ? c * 9 / 5 + 32 : null;
    if (!okTemp(f)) throw new Error("No water temperature record");
    return { f: Math.round(f * 10) / 10, source: "satellite (daily)" };
  }

  // ---- Fill in water temperature on older catches (your own — only the owner can change a catch) ----
  // Runs quietly a few at a time; anything that can't be found is retried after a week.
  let backfilling = false;
  async function backfillWaterTemps() {
    if (backfilling || !me || !navigator.onLine) return;
    let tried = {};
    try { tried = JSON.parse(localStorage.getItem("fm-wt-tried") || "{}"); } catch (e) {}
    const WEEK = 7 * 86400000, now = Date.now();
    const todo = Object.values(catchesBySpot).flat().filter(c => {
      if (!isMine(c) || c.water_temp_f != null) return false;
      if (tried[c.id] && now - tried[c.id] < WEEK) return false;
      const s = (spots || []).find(x => x.id === c.spot_id);
      return s && hasLoc(s) && s.water_type !== "freshwater" && new Date(c.caught_at) <= new Date();
    }).slice(0, 25);
    if (!todo.length) return;
    backfilling = true;
    let filled = 0;
    for (const c of todo) {
      const s = spots.find(x => x.id === c.spot_id);
      try {
        const r = await waterTempAt(s.lat, s.lng, new Date(c.caught_at));
        const { error } = await db.from("catches").update({ water_temp_f: r.f, water_temp_source: r.source }).eq("id", c.id);
        if (error) throw error;
        c.water_temp_f = r.f; c.water_temp_source = r.source;
        filled++;
      } catch (e) {
        if (isNetErr(e)) break;
        tried[c.id] = now;
      }
      await new Promise(r => setTimeout(r, 400)); // be gentle with the free data services
    }
    try { localStorage.setItem("fm-wt-tried", JSON.stringify(tried)); } catch (e) {}
    backfilling = false;
    if (filled) { renderSpots(); renderInsights(); }
  }
  function spotWaterTemp(s) {
    if (!hasLoc(s) || s.water_type === "freshwater") return null; // ocean readings don't apply to fresh water
    const w = waterTempNow(s.lat, s.lng);
    return w.done && w.done !== "error" ? `🌊 ${Math.round(w.done.f)}°F water` : null;
  }

  function spotConditions(s) {
    const first = s.water_type === "freshwater" ? spotWaterText(s) : spotTideText(s);
    return [first, spotWaterTemp(s), spotWindPressure(s), canalText(s)].filter(Boolean).join("  ·  ");
  }

  // Canal salinity and flow from USGS sensors within ~8 miles (free; mostly Miami-Dade canals + Hillsboro Canal at S-6)
  const CANAL_NEAR_MI = 8;
  const canalCache = {};
  function canalFor(s) {
    if (!hasLoc(s)) return null;
    const key = s.lat.toFixed(2) + "," + s.lng.toFixed(2);
    if (!canalCache[key]) {
      const box = [s.lng - 0.15, s.lat - 0.13, s.lng + 0.15, s.lat + 0.13].map(v => v.toFixed(4)).join(",");
      const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${box}&parameterCd=00480,00060,00065&siteStatus=active&period=P1D`;
      canalCache[key] = fetch(url).then(r => r.json()).then(d => {
        const best = {};
        (d.value.timeSeries || []).forEach(ts => {
          const code = ts.variable.variableCode[0].value;
          const vals = (ts.values[0] && ts.values[0].value || []).filter(v => v.value !== "" && +v.value > -999990);
          if (!vals.length) return;
          const loc = ts.sourceInfo.geoLocation.geogLocation;
          const dist = miles(s.lat, s.lng, loc.latitude, loc.longitude);
          if (dist > CANAL_NEAR_MI || (best[code] && best[code].dist <= dist)) return;
          const latest = vals[vals.length - 1];
          best[code] = { name: niceSite(ts.sourceInfo.siteName), dist, v: +latest.value, first: +vals[0].value, when: new Date(latest.dateTime) };
        });
        return { salt: best["00480"] || null, flow: best["00060"] || null, level: best["00065"] || null };
      });
      canalCache[key].done = false;
      canalCache[key].then(g => { canalCache[key].done = g; refreshConditions(); },
                           () => { canalCache[key].done = "error"; });
    }
    return canalCache[key];
  }
  const niceSite = n => n.toLowerCase().replace(/\b(fl|nr)\b/g, m => m === "nr" ? "near" : "").replace(/,\s*$/, "").replace(/\s+/g, " ").trim()
    .replace(/(^|\s)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(S|G)-?(\d+[a-z]?)\b/gi, (m, a, b) => a.toUpperCase() + "-" + b.toUpperCase()).replace(/\b(At|Of|Near|Upstream|Downstream)\b/g, m => m.toLowerCase());
  function canalText(s) {
    const c = canalFor(s);
    if (!c || !c.done || c.done === "error") return null;
    const parts = [];
    const { salt, flow, level } = c.done;
    if (salt) {
      const kind = salt.v < 0.5 ? "fresh" : salt.v < 5 ? "slightly salty" : salt.v < 18 ? "brackish" : "salty";
      parts.push(`🧂 Canal ${salt.v.toFixed(1)} ppt, ${kind} (${salt.name}, ${salt.dist.toFixed(1)} mi)`);
    }
    if (flow) {
      const f = Math.round(flow.v), was = Math.round(flow.first);
      const state = f < 5 ? "little or no flow" : `flowing ${f} cfs` + (Math.abs(f - was) >= Math.max(10, was * 0.3) ? ` (${f > was ? "up" : "down"} from ${was} a day ago)` : "");
      parts.push(`🚰 ${flow.name}: ${state}`);
    }
    if (level) {   // canal level (gage height): the datum differs by site, so only the change over the last day is meaningful
      const d = level.v - level.first, dir = Math.abs(d) < 0.1 ? "steady" : d > 0 ? `rising ${d.toFixed(1)} ft` : `falling ${Math.abs(d).toFixed(1)} ft`;
      parts.push(`🌊 ${level.name}: canal level ${level.v.toFixed(2)} ft, ${dir} in a day${Math.abs(d) >= 0.1 ? " (a gate may have opened/closed)" : ""}`);
    }
    return parts.join("  ·  ") || null;
  }
  function spotWindPressure(s) {
    if (hasLoc(s) && miles(s.lat, s.lng, LAT, LNG) > 15) {
      const w = localWx(s);
      if (w.done && w.done !== "error") {
        const arrow = { rising: " ↗", falling: " ↘", steady: " →" }[w.done.trend] || "";
        return [w.done.wind + windKindText(s, w.done.deg), `${w.done.pressure.toFixed(2)} inHg${arrow}`].join("  ·  ");
      }
    }
    return [cond.wind && cond.wind + windKindText(s, degOf(cond.windDir)), pressureShort()].filter(Boolean).join("  ·  ");
  }
  // Onshore / offshore / cross wind for a spot that has a "water lies to the…" direction.
  // deg = where the wind blows FROM; faces = the direction of the water from the spot.
  const COMPASS16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const degOf = name => { const i = COMPASS16.indexOf(String(name || "").toUpperCase()); return i < 0 ? null : i * 22.5; };
  function windKind(deg, faces) {
    if (deg == null || faces == null) return null;
    const d = Math.abs(((deg - faces) % 360 + 540) % 360 - 180); // 0 = wind comes from the water side
    return d <= 50 ? "onshore" : d >= 130 ? "offshore" : "cross";
  }
  const KIND_ICON = { onshore: "⬅ onshore", offshore: "➡ offshore", cross: "↔ cross" };
  function windKindText(s, deg) { const k = windKind(deg, s.faces_deg); return k ? ` (${KIND_ICON[k]})` : ""; }
  function pressureShort() {
    if (cond.pressure == null) return null;
    const arrow = { rising: " ↗", falling: " ↘", steady: " →" }[cond.pressureTrend] || "";
    return `${cond.pressure.toFixed(2)} inHg${arrow}`;
  }

