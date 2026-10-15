  // ---- 🛡 Anti-framing: if another website puts this app inside its own page (a "clickjacking" trick), hide it ----
  try { if (window.top !== window.self) document.documentElement.style.display = "none"; } catch (e) { document.documentElement.style.display = "none"; }
  // ---- 🐞 Error log: remember the last few errors on this phone, so "Report a problem" (js/17) can include them ----
  const appErrors = [];
  function logAppError(msg, at) {
    try {
      appErrors.push({ msg: String(msg || "").slice(0, 300), at: String(at || "").slice(0, 120), t: new Date().toISOString() });
      if (appErrors.length > 10) appErrors.shift();
    } catch (e) { /* never let the error log cause an error */ }
  }
  window.addEventListener("error", e => logAppError(e.message, e.filename ? e.filename.split("/").pop().split("?")[0] + ":" + e.lineno : ""));
  window.addEventListener("unhandledrejection", e => logAppError(e.reason && (e.reason.message || e.reason), "promise"));

  let STATION = "8722859";   // the tide station for the "area now" (js/29 changes it when you travel)
  // Today's conditions, shared by every spot for now (all spots are in the Hillsboro area)
  const cond = { tide: null, wind: null };

  function ymd(d) {
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  }
  function parseNoaa(t) {
    // NOAA gives "2026-10-08 07:24" in local station time (Eastern)
    const [date, time] = t.split(" ");
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }
  function clock(d) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  function dayName(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const that = new Date(d); that.setHours(0, 0, 0, 0);
    const diff = Math.round((that - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  }
  function untilText(ms) {
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }

  async function load() {
    const start = new Date(); start.setDate(start.getDate() - 1);
    const url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter" +
      `?product=predictions&application=fishing_map&begin_date=${ymd(start)}&range=96` +
      `&datum=MLLW&station=${STATION}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;

    const stage = document.getElementById("stage");
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.predictions) throw new Error(data.error ? data.error.message : "No data");

      const tides = data.predictions.map(p => ({
        when: parseNoaa(p.t), high: p.type === "H", ft: parseFloat(p.v)
      }));
      const now = new Date();
      const next = tides.find(t => t.when > now);

      if (next) {
        stage.textContent = next.high ? "⬆ Incoming (rising)" : "⬇ Outgoing (falling)";
        stage.className = "now " + (next.high ? "rising" : "falling");
        document.getElementById("next").textContent =
          `Next ${next.high ? "high" : "low"} tide at ${clock(next.when)} — in ${untilText(next.when - now)}`;
        cond.tide = `${next.high ? "⬆ Incoming" : "⬇ Outgoing"} · ${next.high ? "high" : "low"} ${clock(next.when)}`;
        // Tide stage saved with catches: "slack" within 30 min of a high or low
        const prev = [...tides].reverse().find(t => t.when <= now);
        const SLACK = 30 * 60000;
        if (prev && now - prev.when < SLACK) cond.tideStage = prev.high ? "high slack" : "low slack";
        else if (next.when - now < SLACK) cond.tideStage = next.high ? "high slack" : "low slack";
        else cond.tideStage = next.high ? "incoming" : "outgoing";
        refreshConditions();
      } else {
        stage.textContent = "No upcoming tides found";
      }

      // Group today and the next 2 days
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const groups = {};
      tides.filter(t => t.when >= todayStart).forEach(t => {
        const key = t.when.toDateString();
        (groups[key] = groups[key] || []).push(t);
      });

      const days = document.getElementById("days"); days.innerHTML = ""; // clean slate so "Try again" never doubles the list
      Object.keys(groups).slice(0, 3).forEach(key => {
        const list = groups[key];
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<div class="label">${dayName(list[0].when)}</div><ul></ul>`;
        const ul = card.querySelector("ul");
        list.forEach(t => {
          const li = document.createElement("li");
          if (t.when < now) li.className = "past";
          li.innerHTML = `<span class="kind ${t.high ? "rising" : "falling"}">${t.high ? "High" : "Low"}</span>` +
            `<span>${clock(t.when)}<span class="ft">${t.ft.toFixed(1)} ft</span></span>`;
          ul.appendChild(li);
        });
        days.appendChild(card);
      });
    } catch (err) {
      stage.textContent = "Couldn't load tides right now";
      document.getElementById("next").textContent = "Check your connection and refresh the page.";
    }
  }

  // ---- Wind & weather from the National Weather Service ----
  const nowPointStr = () => `${LAT.toFixed(3)},${LNG.toFixed(3)}`; // the "area now" (js/29): home waters, or where your phone is

  async function getJson(url) {
    // The weather service sometimes hiccups; try twice before giving up
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
        if (res.ok) return await res.json();
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error("Weather request failed");
  }

  async function loadWeather() {
    const nowEl = document.getElementById("wx-now");
    const detailEl = document.getElementById("wx-detail");
    try {
      const point = await getJson(`https://api.weather.gov/points/${nowPointStr()}`);
      const hourly = await getJson(point.properties.forecastHourly);
      const now = new Date();
      const periods = hourly.properties.periods.filter(p => new Date(p.endTime) > now);
      if (!periods.length) throw new Error("No forecast");

      const cur = periods[0];
      cond.hours = periods.slice(0, 24).map(p => {
        const m = String(p.windSpeed || "").match(/\d+/g);
        return { start: new Date(p.startTime), end: new Date(p.endTime), mph: m ? parseInt(m[m.length - 1], 10) : null };
      });
      setTimeout(renderBest, 0);
      nowEl.textContent = `💨 ${cur.windDirection} ${cur.windSpeed}`;
      cond.wind = `💨 ${cur.windDirection} ${cur.windSpeed} · ${cur.temperature}°`;
      cond.windDir = cur.windDirection || null;
      const mph = String(cur.windSpeed || "").match(/\d+/g); // "10 mph" or "5 to 10 mph"
      cond.windMph = mph ? parseInt(mph[mph.length - 1], 10) : null;
      cond.tempF = cur.temperatureUnit === "F" ? cur.temperature : null;
      refreshConditions();
      nowEl.className = "now";
      const rain = cur.probabilityOfPrecipitation && cur.probabilityOfPrecipitation.value;
      detailEl.textContent = `${cur.shortForecast}, ${cur.temperature}°${cur.temperatureUnit}` +
        (rain != null ? ` · ${rain}% chance of rain` : "");

      // Next several hours, every 2 hours
      const ul = document.getElementById("wx-hours"); ul.innerHTML = "";
      periods.slice(1, 13).filter((_, i) => i % 2 === 0).forEach(p => {
        const li = document.createElement("li");
        const r = p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value;
        li.innerHTML = `<span>${clock(new Date(p.startTime))}</span>` +
          `<span>${p.windDirection} ${p.windSpeed}<span class="ft">${r != null ? r + "% rain" : ""}</span></span>`;
        ul.appendChild(li);
      });
    } catch (err) {
      nowEl.textContent = "Couldn't load weather right now";
      detailEl.textContent = "Tides still work — try refreshing in a minute.";
    }
  }

  // ---- Barometric pressure from nearby weather-station observations ----
  // Pompano Beach Airpark first; Fort Lauderdale airport as a backup
  const PRESSURE_STATIONS = ["KPMP", "KFLL"];

  // Near Pompano the two known airports; anywhere else, the National Weather Service's own list of stations nearest the "area now"
  const pressureStationCache = {};
  async function pressureStationsNow() {
    if (miles(LAT, LNG, 26.24, -80.10) < 15) return PRESSURE_STATIONS;
    const key = LAT.toFixed(1) + "," + LNG.toFixed(1);
    if (pressureStationCache[key]) return pressureStationCache[key];
    try {
      const pt = await getJson(`https://api.weather.gov/points/${LAT.toFixed(3)},${LNG.toFixed(3)}`);
      const list = await getJson(pt.properties.observationStations);
      const ids = (list.features || []).slice(0, 5).map(f => f.properties && f.properties.stationIdentifier).filter(Boolean);
      if (ids.length) return (pressureStationCache[key] = ids);
    } catch (e) { /* none found */ }
    return [];
  }

  async function loadPressure() {
    const out = $("wx-pressure");
    for (const st of await pressureStationsNow()) {
      try {
        const data = await getJson(`https://api.weather.gov/stations/${st}/observations?limit=24`);
        const obs = data.features
          .map(f => ({ when: new Date(f.properties.timestamp), pa: f.properties.barometricPressure && f.properties.barometricPressure.value }))
          .filter(o => o.pa != null)
          .sort((a, b) => b.when - a.when);
        if (!obs.length) continue;
        const latest = obs[0];
        if (Date.now() - latest.when > 3 * 3600000) continue; // too old, try the backup station
        const inHg = latest.pa / 3386.39;
        // Compare with the reading from about 3 hours earlier
        const target = latest.when - 3 * 3600000;
        const earlier = obs.filter(o => o.when <= latest.when - 2 * 3600000 && o.when >= latest.when - 4 * 3600000)
          .sort((a, b) => Math.abs(a.when - target) - Math.abs(b.when - target))[0];
        let trend = null;
        if (earlier) {
          const change = inHg - earlier.pa / 3386.39;
          trend = change >= 0.03 ? "rising" : change <= -0.03 ? "falling" : "steady";
        }
        cond.pressure = Math.round(inHg * 100) / 100;
        cond.pressureTrend = trend;
        const arrow = { rising: "↗ rising", falling: "↘ falling", steady: "→ steady" }[trend] || "";
        out.textContent = `🌡 Pressure ${cond.pressure.toFixed(2)} inHg ${arrow}`.trim();
        refreshConditions();
        return;
      } catch (e) { /* try the next station */ }
    }
    out.textContent = "Pressure not available right now";
  }

