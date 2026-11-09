// ---- 🌙 Sun, moon & feeding times (weather plan step 8; Project doc claude/weather-plan.md; layout canvas board 3 "Weather bottom") ----
// Loaded only when the Weather screen opens (js/48 LAZY_CODE "wx", after js/78). One card below Water & waves, for the chosen place:
//  • First light, sunrise, sunset, last light (SunCalc; first/last light = civil dawn / dusk, sun 6° below the horizon)
//  • A drawn moon picture, its phase + % lit (js/06 moonAt), and the next new and full moon
//  • Major / minor feeding times (js/06 solunarPeriods for the place's own day) with why, "now" and "past" marks, and "near sunrise/sunset"
// Today / Tomorrow chips switch the day (not remembered). Everything is worked out on the phone — works offline, no calls.
const WXM_H = 3600000, WXM_D = 86400000;

// SunCalc times for the place's day (noon there, so the right calendar day is used in any time zone)
function wxmSun(day, p) {
  const d0 = +tzDayStart(day, p.tz), t = SunCalc.getTimes(new Date(d0 + 12 * WXM_H), p.lat, p.lng);
  const good = x => x && isFinite(x) ? x : null;
  return { first: good(t.dawn), rise: good(t.sunrise), set: good(t.sunset), last: good(t.dusk) };
}
// The next new moon and full moon after `from` (hour steps, up to 32 days): { newAt, fullAt }
function wxmNextPhases(from) {
  let newAt = null, fullAt = null, prev = SunCalc.getMoonIllumination(new Date(from)).phase;
  for (let t = from + WXM_H; t < from + 32 * WXM_D && (!newAt || !fullAt); t += WXM_H) {
    const ph = SunCalc.getMoonIllumination(new Date(t)).phase;
    if (!newAt && prev > 0.75 && ph < 0.25) newAt = t;
    if (!fullAt && prev < 0.5 && ph >= 0.5) fullAt = t;
    prev = ph;
  }
  return { newAt, fullAt };
}
// "in 4 days" / "today" / "tomorrow" on the place's calendar
function wxmWhen(t, tz) {
  const d = tzDayDiff(new Date(t), tz);
  return d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
}
// The moon drawn as SVG text: dark disk + the lit part (right side lit while growing, as seen from the northern half of the world)
function wxmMoonSvg(phase, fraction, size, south) {
  const r = size / 2 - 2, c = size / 2, f = Math.max(0, Math.min(1, fraction)), rx = Math.abs(1 - 2 * f) * r;
  const waxing = phase < 0.5, crescent = f < 0.5;
  // right half (waxing) or left half (waning), then back along the shadow line
  const outer = waxing ? 1 : 0, inner = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
  const lit = f < 0.01 ? "" : f > 0.99 ? `<circle cx="${c}" cy="${c}" r="${r}" class="wxm-lit"/>` :
    `<path class="wxm-lit" d="M${c} ${c - r} A${r} ${r} 0 0 ${outer} ${c} ${c + r} A${rx.toFixed(2)} ${r} 0 0 ${inner} ${c} ${c - r}Z"/>`;
  return `<svg class="wxm-moon" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><g${south ? ` transform="translate(${size} 0) scale(-1 1)"` : ""}>` +
    `<circle cx="${c}" cy="${c}" r="${r}" class="wxm-dark"/>${lit}</g></svg>`;
}
// A feeding time that overlaps the hour around sunrise or sunset is usually the best bite of the day
function wxmNearSun(x, sun) {
  const hit = t => t && +x.start <= +t + WXM_H && +x.end >= +t - WXM_H;
  return hit(sun.rise) ? "near sunrise" : hit(sun.set) ? "near sunset" : "";
}

function wxmSection(w, p) {
  const sec = el("div", "wx-sec wxm-card"); sec.id = "wx-sunmoon";
  const head = el("div", "wxh-head"); head.appendChild(el("b", null, "Sun, moon & feeding times"));
  const days = el("div", "wxm-days"); head.appendChild(days); sec.appendChild(head);
  const body = el("div", "wxm-body"); sec.appendChild(body);
  let off = 0;
  const draw = () => {
    body.innerHTML = "";
    days.querySelectorAll("button").forEach((b, i) => { b.classList.toggle("on", i === off); b.setAttribute("aria-pressed", String(i === off)); });
    const now = Date.now(), day = new Date(now + off * WXM_D), short = t => t ? clock(new Date(t), p.tz) : "–";
    // sun
    let sun = { first: null, rise: null, set: null, last: null };
    try { sun = wxmSun(day, p); } catch (e) { /* no sun data */ }
    const sg = el("div", "wxm-sun"); sg.id = "wxm-sun";
    [["First light", sun.first, "wxm-first"], ["Sunrise", sun.rise, "wxm-rise"], ["Sunset", sun.set, "wxm-set"], ["Last light", sun.last, "wxm-last"]].forEach(([lab, t, id]) => {
      const s = el("span"); s.id = id; s.append(document.createTextNode(lab + " "), el("b", null, short(t))); sg.appendChild(s);
    });
    body.appendChild(sg);
    if (!sun.rise && !sun.set) body.appendChild(el("div", "spot-meta", "The sun doesn't rise or set here that day."));
    // moon (now for today; noon that day for tomorrow)
    const mt = off ? +tzDayStart(day, p.tz) + 12 * WXM_H : now;
    try {
      const m = moonAt(new Date(mt)), ill = SunCalc.getMoonIllumination(new Date(mt)), nx = wxmNextPhases(now);
      const row = el("div", "wxm-moonrow"); row.id = "wxm-moonrow";
      const pic = el("span", "wxm-pic"); pic.innerHTML = wxmMoonSvg(ill.phase, ill.fraction, 40, p.lat < 0); row.appendChild(pic);
      const tx = el("div", "wxm-moontx");
      const t1 = el("b", null, `${cap(m.phase)} · ${m.illum}% lit`); t1.id = "wxm-phase";
      const next = [["New moon", nx.newAt], ["Full moon", nx.fullAt]].filter(x => x[1]).sort((a, b) => a[1] - b[1])
        .map(([n, t]) => `${n} ${wxmWhen(t, p.tz)}`);
      const t2 = el("span", "wxm-next", next.join(" · ")); t2.id = "wxm-next";
      tx.append(t1, t2); row.appendChild(tx); body.appendChild(row);
    } catch (e) { body.appendChild(el("div", "spot-meta", "Moon details aren't available right now.")); }
    // feeding times
    let per = [];
    try { per = solunarPeriods(day, p.lat, p.lng, p.tz); } catch (e) { per = []; }
    const list = el("div", "wxm-feed"); list.id = "wxm-feed";
    per.forEach(x => {
      const r = el("div", "wxm-row " + x.type + (+x.end < now ? " past" : "") + (+x.start <= now && now <= +x.end ? " now" : ""));
      const why = [x.why, wxmNearSun(x, sun)].filter(Boolean).join(" · ");
      r.append(el("span", "wxm-kind", x.type === "major" ? "Major" : "Minor"), el("span", "wxm-time", `${short(x.start)} – ${short(x.end)}`),
        el("span", "wxm-why", (+x.start <= now && now <= +x.end ? "now · " : "") + why));
      list.appendChild(r);
    });
    if (!per.length) list.appendChild(el("div", "spot-meta", "No feeding times worked out for that day."));
    body.appendChild(list);
    body.appendChild(el("div", "spot-meta", "Major = moon overhead or underfoot (about 2 hours). Minor = moonrise or moonset (about 1 hour). Fish often feed more then, best when it lines up with sunrise, sunset or a moving tide. A help, not a promise."));
  };
  ["Today", "Tomorrow"].forEach((lab, i) => {
    const b = el("button", "wxm-day", lab); b.type = "button"; b.id = i ? "wxm-tomorrow" : "wxm-today";
    b.addEventListener("click", () => { off = i; draw(); });
    days.appendChild(b);
  });
  draw();
  return sec;
}
