  // ---- 🏁 Contests (V4.6): official tournaments (admin only) and friend competitions ----
  const CT_BOARDS = { length: "Longest fish", weight: "Heaviest fish", fish: "Most fish", species: "Most species" };
  let ctRows = [], ctMine = {}, ctMembers = [], ctView = "list", ctId = null, ctErr = null, ctBusy = false;
  let ctTab = "contests"; // "contests" (anyone, with friends) or "tournaments" (official, run by admins / hosts)
  let ctPrefill = null;   // {title,start,end,invites} when a contest is started from a trip plan
  const CT_REPEAT = { weekly: "every week", monthly: "every month", yearly: "every year" };
  const ctFmt = d => new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  function ctState(t) {
    const now = Date.now();
    if (t.cancelled_at) return { k: "cancelled", label: "Cancelled" };
    if (now < new Date(t.starts_at)) return { k: "soon", label: "Starts " + ctFmt(t.starts_at) };
    if (now > new Date(t.ends_at)) return { k: "ended", label: "Ended" };
    return { k: "live", label: "🔴 LIVE" };
  }
  const ctOpen = t => { const k = ctState(t).k; return k === "live" || k === "soon"; };
  const ctForPlan = planId => ctRows.filter(t => t.plan_id === planId && !t.cancelled_at);
  const ctBoardLabel = (bd, v) => bd === "length" ? `${+Number(v).toFixed(2)}″` : bd === "weight" ? lbText(Number(v)) : bd === "fish" ? `${v} fish` : `${v} species`;
  // open a contest's page from anywhere (banner, trip review, trip card)
  function openContestPage(t) {
    stopPlacing(); ctId = t.id; ctView = "detail"; ctTab = t.kind === "official" ? "tournaments" : "contests"; feedMode = "contests";
    showView("feed"); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // open the 📖 review of the trip a contest was made for (only people on that trip can see it)
  async function openTripFor(planId) {
    try {
      const [a, b] = await Promise.all([db.from("trip_plans").select("*").eq("id", planId).maybeSingle(), db.from("trip_plan_rsvps").select("*").eq("plan_id", planId)]);
      const pl = a.data;
      if (!pl || pl.cancelled_at) { toast("That trip was cancelled or isn't available.", 4000); return; }
      planRsvps[pl.id] = b.data || [];
      if (!onTrip(pl)) { toast("Only people who were on that trip can see its details.", 4500); return; }
      stopPlacing(); ctId = null; feedMode = "circle";
      showView("feed");
      openTripReview(pl);
    } catch (e) { toast("Couldn't open the trip.", 4000); }
  }

  // A GPS stamp saved at the moment a catch is logged live — this is what geo-locked contests check.
  async function saveCatchGeo(catchId, pos) {
    if (!db || !catchId || !pos || pos.acc == null) return;
    try {
      await db.from("catch_geo").insert({ catch_id: catchId, lat: pos.lat, lng: pos.lng, accuracy_m: Math.round(pos.acc), captured_at: pos.at || new Date().toISOString() });
    } catch (e) {}
  }
  async function liveGeoIfNeeded() {
    try {
      if (!db || !navigator.geolocation || !me) return null;
      const [{ data: ts }, { data: ms }] = await Promise.all([
        db.from("tournaments").select("id,geo_lat,ends_at,cancelled_at"),
        db.from("tournament_members").select("tournament_id,status,user_id")
      ]);
      const joined = new Set((ms || []).filter(m => m.user_id === me.id && m.status === "joined").map(m => m.tournament_id));
      const need = (ts || []).some(t => t.geo_lat != null && !t.cancelled_at && new Date(t.ends_at) > new Date() && joined.has(t.id));
      const tripNeed = plans.some(pl => onTrip(pl) && Date.now() >= tripWindow(pl)[0] && Date.now() <= tripWindow(pl)[1]);
      if (!need && !tripNeed) return null;
      return await new Promise(res => navigator.geolocation.getCurrentPosition(
        p => res({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5), acc: p.coords.accuracy, at: new Date().toISOString() }),
        () => res(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 20000 }));
    } catch (e) { return null; }
  }

  // Banner under "Plan a trip": contests I'm signed up for (not ended, not cancelled), each linking to its details.
  function ctBannerRender() {
    const box = $("ct-banner"); if (!box) return;
    box.innerHTML = "";
    const mine = ctRows.filter(t => ctMine[t.id] === "joined" && ctOpen(t)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    box.hidden = !mine.length;
    mine.slice(0, 3).forEach(t => {
      const st = ctState(t);
      const b = el("button", "linkbtn", `🏁 ${t.title} — ${st.k === "live" ? "LIVE, ends " + ctFmt(t.ends_at) : st.label.toLowerCase().replace(/^starts/, "starts")} › details`);
      b.type = "button"; b.style.cssText = "display:block;text-align:left;margin-top:4px";
      b.addEventListener("click", () => openContestPage(t));
      box.appendChild(b);
    });
    if (mine.length > 3) box.appendChild(el("div", "spot-meta", `+${mine.length - 3} more in 🏁 Contests`));
  }
  async function refreshCtBanner() {
    try {
      if (!db || !me) return;
      const [a, b] = await Promise.all([db.from("tournaments").select("*").order("starts_at", { ascending: true }), db.from("tournament_members").select("*")]);
      if (a.error || b.error) return;
      ctRows = a.data || []; ctMembers = b.data || [];
      ctMine = {}; ctMembers.forEach(m => { if (m.user_id === me.id) ctMine[m.tournament_id] = m.status; });
      ctBannerRender();
    } catch (e) {}
  }
  async function ctLoad() {
    ctErr = null;
    try {
      const [a, b] = await Promise.all([
        db.from("tournaments").select("*").order("starts_at", { ascending: false }),
        db.from("tournament_members").select("*")
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      ctRows = a.data || []; ctMembers = b.data || [];
      ctMine = {}; ctMembers.forEach(m => { if (m.user_id === me.id) ctMine[m.tournament_id] = m.status; });
      ctBannerRender();
      await ensureProfiles([...ctRows.map(t => t.created_by), ...ctMembers.map(m => m.user_id)]);
    } catch (e) { ctErr = "Couldn't load contests: " + (e.message || e); }
  }
  // 🏛 Hall of Fame: top 3 on every board of each finished official tournament (rpc hall_of_fame)
  let hof = [], hofAt = 0;
  async function loadHof(force) {
    if (!me || (!force && Date.now() - hofAt < 300000)) return;
    try {
      const { data, error } = await db.rpc("hall_of_fame");
      if (error) throw error;
      hof = data || []; hofAt = Date.now();
      await ensureProfiles([...new Set(hof.map(r => r.user_id))]);
    } catch (e) { /* keep the last list */ }
  }
  const MEDAL = ["", "🥇", "🥈", "🥉"];
  const hofVal = r => r.board === "length" ? Number(r.value).toFixed(1).replace(/\.0$/, "") + "″" + (r.species ? " " + r.species : "") : r.board === "weight" ? Number(r.value).toFixed(1) + " lb" + (r.species ? " " + r.species : "")
    : r.board === "fish" ? r.value + " fish" : r.value + " species";
  const hofName = r => (profOf(r.user_id) || {}).display_name || "Someone";
  function hofSection(box) {
    box.appendChild(el("div", "label", "🏛 Hall of Fame")); box.lastChild.style.marginTop = "14px";
    if (!hof.length) { box.appendChild(el("div", "empty", "Winners of finished official tournaments show up here.")); return; }
    const groups = []; hof.forEach(r => { let g = groups.find(x => x.id === r.tournament_id); if (!g) groups.push(g = { id: r.tournament_id, title: r.title, ends: r.ends_at, rows: [] }); g.rows.push(r); });
    groups.slice(0, 8).forEach(g => {
      const d = el("div", "feed-item"); d.id = "hof-" + g.id;
      const top = el("div", "feed-top"); top.appendChild(el("b", null, "🏆 " + g.title)); top.appendChild(el("span", "spot-meta", new Date(g.ends).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }))); d.appendChild(top);
      ["length", "weight", "fish", "species"].forEach(b => {
        const rows = g.rows.filter(r => r.board === b); if (!rows.length) return;
        d.appendChild(el("div", "spot-meta", CT_BOARDS[b]));
        rows.forEach(r => d.appendChild(el("div", null, `${MEDAL[r.rank]} ${hofName(r)} — ${hofVal(r)}`)));
      });
      box.appendChild(d);
    });
  }
  async function openContests() { ctView = ctId && ctView === "detail" ? "detail" : (ctPrefill && ctView === "form") ? "form" : "list"; await ctLoad(); ctRender(); }
  function ctRender() {
    const box = $("ct-body"); box.innerHTML = "";
    if (ctErr) { box.appendChild(el("div", "msg err", ctErr)); }
    if (ctView === "form") return ctForm(box);
    if (ctView === "detail") return ctDetail(box);
    ctList(box);
  }
  function ctCard(t) {
    const st = ctState(t);
    const d = el("div", "feed-item"); d.style.cursor = "pointer";
    const top = el("div", "feed-top");
    top.appendChild(el("b", null, (t.kind === "official" ? "🏆 " : "🎣 ") + t.title));
    top.appendChild(el("span", "spot-meta", st.label));
    d.appendChild(top);
    const n = ctMembers.filter(m => m.tournament_id === t.id && m.status === "joined").length;
    d.appendChild(el("div", "spot-meta", `${ctFmt(t.starts_at)} → ${ctFmt(t.ends_at)} · ${t.boards.map(b => CT_BOARDS[b]).join(", ")}${n ? " · " + n + " in" : ""}${t.geo_lat != null ? " · 📍 " + (t.geo_label || "area") : ""}${t.series_id ? " · 🔁 repeating" : ""}`));
    d.addEventListener("click", () => { ctId = t.id; ctView = "detail"; ctRender(); });
    return d;
  }
  function ctList(box) {
    const top = el("div", "feed-top");
    top.appendChild(el("div", "label", "🏁 Compete"));
    box.appendChild(top);
    const tabs = el("div", "fchips"); tabs.style.margin = "6px 0";
    [["contests", "🎣 Contests"], ["tournaments", "🏆 Tournaments"]].forEach(([k, txt]) => {
      const b = el("button", "fchip" + (ctTab === k ? " on" : ""), txt); b.type = "button"; b.id = "ct-tab-" + k;
      b.addEventListener("click", () => { ctTab = k; ctRender(); });
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    const rank = t => ({ live: 0, soon: 1, ended: 2 })[ctState(t).k];
    const sect = (title, list, empty) => {
      box.appendChild(el("div", "label", title)); box.lastChild.style.marginTop = "14px";
      if (!list.length) box.appendChild(el("div", "empty", empty)); else list.forEach(t => box.appendChild(ctCard(t)));
    };
    const canMakeTournament = !!(me && me.isAdmin);
    if (ctTab === "contests") {
      box.appendChild(el("div", "spot-meta", "Contests are friendly competitions anyone can start with friends — for a trip, a weekend, or repeating every week, month or year."));
      const nb = el("button", "btn small", "+ Start a contest"); nb.type = "button"; nb.id = "ct-new"; nb.style.marginTop = "8px";
      nb.addEventListener("click", () => { ctPrefill = null; ctView = "form"; ctRender(); });
      box.appendChild(nb);
      const inv = ctRows.filter(t => t.kind === "friends" && ctMine[t.id] === "invited" && ctOpen(t));
      const mine = ctRows.filter(t => t.kind === "friends" && ctMine[t.id] === "joined");
      mine.sort((a, b) => rank(a) - rank(b) || new Date(b.starts_at) - new Date(a.starts_at));
      if (inv.length) sect("📨 Invitations", inv, "");
      sect("🎣 My contests", mine, "None yet — tap + Start a contest, or use “🏁 Start a contest” on a trip you planned.");
    } else {
      box.appendChild(el("div", "spot-meta", "Tournaments are official events run by hosts (admins today; clubs and brands later). Anyone can join an open one — catches need a photo, a measured length and to be set to 🌎 Public."));
      if (canMakeTournament) {
        const nb = el("button", "btn small", "+ Create a tournament"); nb.type = "button"; nb.id = "ct-new"; nb.style.marginTop = "8px";
        nb.addEventListener("click", () => { ctPrefill = null; ctView = "form"; ctRender(); });
        box.appendChild(nb);
      }
      const off = ctRows.filter(t => t.kind === "official" && !t.cancelled_at);
      off.sort((a, b) => rank(a) - rank(b) || new Date(b.starts_at) - new Date(a.starts_at));
      sect("🏆 Tournaments", off, "No tournaments yet.");
      hofSection(box);
      loadHof().then(() => { if (ctView === "list" && ctTab === "tournaments" && $("ct-body") && !$("ct-body").querySelector("[id^=hof-]") && hof.length) ctRender(); });
    }
  }

  function ctLocalInput(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); }
  async function ctForm(box) {
    const off = ctTab === "tournaments" && !!(me && me.isAdmin);
    const kindV = off ? "official" : "friends";
    const pre = ctPrefill; ctPrefill = null;
    const wrap = el("div"); box.appendChild(wrap);
    wrap.innerHTML = `
      <button class="btn ghost small" id="ctf-back" type="button">← Back</button>
      <div class="label" style="margin-top:10px">${off ? "Create a tournament" : "Start a contest"}</div>
      ${pre ? `<div class="spot-meta">Pre-filled from your trip — everyone going is entered automatically, and so is anyone who taps “I'm in” later. Change anything you like.</div>` : ""}
      <label for="ctf-title">Name</label><input id="ctf-title" maxlength="60" placeholder="${off ? "October Snook Slam" : "Keys weekend showdown"}">
      <label for="ctf-desc">Details (optional)</label><input id="ctf-desc" maxlength="300" placeholder="Prize, rules, anything people should know">
      <label for="ctf-repeat">Repeats</label>
      <select id="ctf-repeat"><option value="">Just once</option><option value="weekly">🔁 Every week</option><option value="monthly">🔁 Every month</option><option value="yearly">🔁 Every year</option></select>
      <div id="ctf-months-wrap" hidden><div class="spot-meta">Which months? (a new one opens on the 1st of each picked month)</div><div class="fchips" id="ctf-months">${MONTH_ABBR.map((m, i) => `<button class="fchip on" type="button" data-m="${i + 1}">${m}</button>`).join("")}</div></div>
      <div id="ctf-when">
      <label>When</label>
      <div class="fchips" id="ctf-presets"><button class="fchip" type="button" data-p="trip">This trip (next 8 hrs)</button><button class="fchip" type="button" data-p="today">Today</button><button class="fchip" type="button" data-p="weekend">This weekend</button><button class="fchip" type="button" data-p="week">Next 7 days</button><button class="fchip" type="button" data-p="month">Next 30 days</button><button class="fchip" type="button" data-p="year">A full year</button></div>
      <div class="two"><div><label for="ctf-start">Starts</label><input id="ctf-start" type="datetime-local"></div><div><label for="ctf-end">Ends</label><input id="ctf-end" type="datetime-local"></div></div>
      <div class="spot-meta">One run can last up to a year.</div>
      </div>
      <div class="spot-meta" id="ctf-repnote" hidden></div>
      <label>Winners (each one gets its own board)</label>
      <div class="fchips" id="ctf-boards">${Object.entries(CT_BOARDS).map(([k, v]) => `<button class="fchip${k === "length" ? " on" : ""}" type="button" data-b="${k}">${v}</button>`).join("")}</div>
      <label for="ctf-species">Only count one species? (optional)</label><input id="ctf-species" maxlength="40" placeholder="e.g. Snook — leave empty for any fish">
      <label>Proof required</label>
      <label class="check-row"><input type="checkbox" id="ctf-photo"><span>📷 Photo on every catch</span></label>
      <label class="check-row"><input type="checkbox" id="ctf-length"><span>📏 Measured length on every catch</span></label>
      <div class="spot-meta" id="ctf-offnote" hidden>Tournaments always need a photo, a measured length, and the catch set to 🌎 Public.</div>
      <label for="ctf-geo">Location lock</label>
      <select id="ctf-geo"><option value="">None — fish anywhere</option><option value="here">Around my location right now</option></select>
      <div id="ctf-radius-wrap" hidden><label for="ctf-radius">Radius</label><select id="ctf-radius"><option>1</option><option>3</option><option selected>5</option><option>10</option><option>25</option></select><div class="spot-meta">Catches must be logged live inside this many miles.</div></div>
      <div id="ctf-inv-wrap"><label>Invite friends</label><div id="ctf-inv" class="fchips"></div></div>
      <div class="msg" id="ctf-msg"></div>
      <button class="btn" id="ctf-save" type="button" style="margin-top:10px">${off ? "Create tournament" : "Start contest"}</button>`;
    const sel = wrap.querySelector("#ctf-geo"), rep = wrap.querySelector("#ctf-repeat");
    (spots || []).filter(hasLoc).forEach(s => { const o = document.createElement("option"); o.value = "spot:" + s.id; o.textContent = "Around spot: " + s.name; sel.appendChild(o); });
    const upd = () => {
      wrap.querySelector("#ctf-offnote").hidden = !off;
      ["#ctf-photo", "#ctf-length"].forEach(i => { const c = wrap.querySelector(i); if (off) c.checked = true; c.disabled = off; });
      wrap.querySelector("#ctf-inv-wrap").hidden = off;
      wrap.querySelector("#ctf-radius-wrap").hidden = !sel.value;
      const r = rep.value;
      wrap.querySelector("#ctf-when").hidden = !!r;
      wrap.querySelector("#ctf-months-wrap").hidden = r !== "monthly";
      const note = wrap.querySelector("#ctf-repnote"); note.hidden = !r;
      note.textContent = r === "weekly" ? "Starts now and runs to the end of this week (Sunday); a new round opens every Monday. Last round's players are asked if they want in again."
        : r === "monthly" ? "If this month is one of the months you picked, the first round runs from now to the end of the month; then a new one opens on the 1st of each picked month."
        : r === "yearly" ? "Starts now and runs to the end of this year; a new round opens every January 1." : "";
      if (r) note.textContent += off ? " Everyone is told when a new round opens." : " Your invited friends are asked each round. You can stop it any time (up to 3 repeating contests at once).";
    };
    wrap.querySelectorAll("#ctf-months .fchip").forEach(b => b.addEventListener("click", () => b.classList.toggle("on")));
    rep.addEventListener("change", upd);
    sel.addEventListener("change", upd); upd();
    wrap.querySelector("#ctf-back").addEventListener("click", () => { ctView = "list"; ctRender(); });
    wrap.querySelectorAll("#ctf-boards .fchip").forEach(b => b.addEventListener("click", () => b.classList.toggle("on")));
    const setRange = (a, b) => { wrap.querySelector("#ctf-start").value = ctLocalInput(a); wrap.querySelector("#ctf-end").value = ctLocalInput(b); };
    wrap.querySelectorAll("#ctf-presets .fchip").forEach(b => b.addEventListener("click", () => {
      const now = new Date(), p = b.dataset.p;
      if (p === "trip") setRange(now, new Date(now.getTime() + 8 * 3600000));
      else if (p === "today") { const e = new Date(now); e.setHours(23, 59, 0, 0); setRange(now, e); }
      else if (p === "week") setRange(now, new Date(now.getTime() + 7 * 86400000));
      else if (p === "month") setRange(now, new Date(now.getTime() + 30 * 86400000));
      else if (p === "year") setRange(now, new Date(now.getTime() + 365 * 86400000));
      else { // this weekend: Friday 5 pm → Sunday night (starts now if the weekend is already here)
        const dow = now.getDay(), toFri = dow === 6 || dow === 0 ? 0 : (5 - dow);
        const s = new Date(now); s.setDate(s.getDate() + toFri); s.setHours(17, 0, 0, 0);
        const e = new Date(s); e.setDate(e.getDate() + (dow === 0 ? 0 : (dow === 6 ? 1 : 2))); e.setHours(23, 59, 0, 0);
        setRange(s < now ? now : s, e);
      }
    }));
    if (pre) {
      wrap.querySelector("#ctf-title").value = pre.title || "";
      setRange(new Date(pre.start), new Date(pre.end));
    } else wrap.querySelector("#ctf-presets .fchip").click();
    const circle = await getCircle();
    const ids = circle ? [...circle] : [];
    await ensureProfiles(ids);
    const inv = wrap.querySelector("#ctf-inv");
    if (!ids.length) inv.appendChild(el("span", "spot-meta", "Add friends first (Profile → Friends) to invite them."));
    ids.forEach(id => { const b = el("button", "fchip" + (pre && (pre.invites || []).includes(id) ? " on" : ""), profName(id) || "Friend"); b.type = "button"; b.dataset.uid = id; b.addEventListener("click", () => b.classList.toggle("on")); inv.appendChild(b); });
    wrap.querySelector("#ctf-save").addEventListener("click", async () => {
      const msg = wrap.querySelector("#ctf-msg"); msg.className = "msg err";
      const title = wrap.querySelector("#ctf-title").value.trim();
      const cadence = rep.value;
      const s = new Date(wrap.querySelector("#ctf-start").value), e = new Date(wrap.querySelector("#ctf-end").value);
      const boards = [...wrap.querySelectorAll("#ctf-boards .fchip.on")].map(b => b.dataset.b);
      if (title.length < 3) { msg.textContent = "Give it a name (3+ letters)."; return; }
      if (!cadence && (isNaN(s) || isNaN(e) || e <= s)) { msg.textContent = "Pick a start and an end (end after start)."; return; }
      if (!cadence && e - s > 366 * 86400000) { msg.textContent = "One run can last up to a year."; return; }
      if (!boards.length) { msg.textContent = "Pick at least one winner board."; return; }
      const months = cadence === "monthly" ? [...wrap.querySelectorAll("#ctf-months .fchip.on")].map(b => +b.dataset.m) : [];
      if (cadence === "monthly" && !months.length) { msg.textContent = "Pick at least one month."; return; }
      let lat = null, lng = null, label = null;
      if (sel.value === "here") {
        msg.className = "msg"; msg.textContent = "Getting your location…";
        const p = await new Promise(res => navigator.geolocation ? navigator.geolocation.getCurrentPosition(x => res(x), () => res(null), { enableHighAccuracy: true, timeout: 12000 }) : res(null));
        if (!p) { msg.className = "msg err"; msg.textContent = "Couldn't get your location — allow location, or pick a spot."; return; }
        lat = +p.coords.latitude.toFixed(5); lng = +p.coords.longitude.toFixed(5); label = "Where I was";
      } else if (sel.value.startsWith("spot:")) {
        const sp = (spots || []).find(x => x.id === sel.value.slice(5)); lat = sp.lat; lng = sp.lng; label = sp.name.slice(0, 60);
      }
      if (ctBusy) return; ctBusy = true;
      msg.className = "msg"; msg.textContent = "Creating…";
      let tz = "America/New_York"; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e2) {}
      const common = {
        p_title: title, p_desc: wrap.querySelector("#ctf-desc").value.trim(), p_boards: boards, p_species: wrap.querySelector("#ctf-species").value.trim(),
        p_lat: lat, p_lng: lng, p_radius: lat != null ? +wrap.querySelector("#ctf-radius").value : null, p_photo: off || wrap.querySelector("#ctf-photo").checked,
        p_length: off || wrap.querySelector("#ctf-length").checked, p_invites: off ? [] : [...wrap.querySelectorAll("#ctf-inv .fchip.on")].map(b => b.dataset.uid)
      };
      const { data, error } = cadence ? await db.rpc("create_tournament_series", {
        p_kind: kindV, p_title: common.p_title, p_desc: common.p_desc, p_boards: boards, p_species: common.p_species, p_photo: common.p_photo, p_length: common.p_length,
        p_lat: lat, p_lng: lng, p_radius: common.p_radius, p_geo_label: label, p_tz: tz, p_cadence: cadence, p_months: cadence === "monthly" ? months : null, p_invites: common.p_invites
      }) : await db.rpc("create_tournament", {
        p_kind: kindV, p_title: title, p_desc: common.p_desc, p_starts: s.toISOString(), p_ends: e.toISOString(),
        p_boards: boards, p_species: common.p_species, p_photo: common.p_photo, p_length: common.p_length, p_lat: lat, p_lng: lng, p_radius: common.p_radius,
        p_geo_label: label, p_invites: common.p_invites
      });
      if (!error && !cadence && pre && pre.planId && data) { // started from a trip: link it so everyone going is entered (and later "I'm in" taps too)
        const lk = await db.rpc("link_contest_to_plan", { p_contest: data, p_plan: pre.planId });
        if (lk.error) toast("Contest made, but couldn't link it to the trip: " + lk.error.message, 6000);
      }
      ctBusy = false;
      if (error) { msg.className = "msg err"; msg.textContent = "Couldn't create it: " + error.message; return; }
      if (cadence && !data) { // saved, but this month isn't one of the chosen months
        const now = new Date().getMonth() + 1, nxt = months.find(m => m > now) || months[0];
        toast(`✓ Saved — the first one opens on ${MONTH_ABBR[nxt - 1]} 1.`, 6000);
        ctView = "list"; await ctLoad(); ctRender(); return;
      }
      ctId = data; ctView = "detail"; await ctLoad(); ctRender();
    });
  }

  async function ctAct(fn, args) {
    if (ctBusy) return; ctBusy = true;
    const { error } = await db.rpc(fn, args);
    ctBusy = false;
    if (error) { toast("Couldn't do that: " + error.message, 5000); return; }
    await ctLoad(); ctRender();
  }
  async function ctDetail(box) {
    const t = ctRows.find(x => x.id === ctId);
    const back = el("button", "btn ghost small", "← Back"); back.type = "button"; back.id = "ctd-back";
    back.addEventListener("click", () => { ctView = "list"; ctId = null; ctRender(); });
    box.appendChild(back);
    if (!t) { box.appendChild(el("div", "empty", "That contest or tournament isn't available.")); return; }
    const st = ctState(t), mineSt = ctMine[t.id];
    const h = el("div", "feed-top"); h.style.marginTop = "10px";
    h.appendChild(el("div", "label", (t.kind === "official" ? "🏆 " : "🎣 ") + t.title)); h.appendChild(el("span", "spot-meta", st.label)); box.appendChild(h);
    box.appendChild(el("div", "spot-meta", `${ctFmt(t.starts_at)} → ${ctFmt(t.ends_at)} · by ${t.created_by === me.id ? "you" : (profName(t.created_by) || "someone")}${t.series_id ? " · 🔁 repeating" : ""}`));
    if (t.description) box.appendChild(el("div", null, t.description));
    if (t.plan_id) box.appendChild(el("div", "spot-meta", "🗓 Made for a planned trip — everyone going on it is entered automatically."));
    const rules = [];
    if (t.plan_id) rules.push("📍 only catches at the trip spot (within 1 mile)");
    if (t.kind === "official") rules.push("Catch must be set to 🌎 Public");
    if (t.require_photo) rules.push("📷 photo on every catch");
    if (t.require_length) rules.push("📏 measured length");
    if (t.species) rules.push("only " + t.species);
    if (t.geo_lat != null) rules.push(`📍 logged live within ${t.geo_radius_mi} mi of ${t.geo_label || "the center"}`);
    box.appendChild(el("div", "spot-meta", "Rules: " + (rules.length ? rules.join(" · ") : "any catch in the time window")));
    // actions
    let seriesBox = [];
    const acts = el("div"); acts.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:10px 0";
    const btn = (txt, cls, fn, id) => { const b = el("button", cls, txt); b.type = "button"; if (id) b.id = id; b.addEventListener("click", fn); acts.appendChild(b); };
    const open = ctOpen(t);
    if (t.plan_id) btn("📖 See the trip", "btn ghost small", () => openTripFor(t.plan_id), "ctd-trip");
    if (open && mineSt !== "joined" && (t.kind === "official" || mineSt === "invited")) btn(mineSt === "invited" ? "Accept & join" : "Join", "btn small", () => ctAct("join_tournament", { p_id: t.id }), "ctd-join");
    if (open && mineSt === "invited") btn("Decline", "btn ghost small", () => ctAct("leave_tournament", { p_id: t.id }), "ctd-decline");
    if (mineSt === "joined" && t.created_by !== me.id && open) btn("Leave", "btn ghost small", () => ctAct("leave_tournament", { p_id: t.id }), "ctd-leave");
    if (t.series_id && (me.isAdmin || t.created_by === me.id)) {
      const { data: se } = await db.from("tournament_series").select("id,active,months,cadence").eq("id", t.series_id).maybeSingle();
      const rw = se ? CT_REPEAT[se.cadence] || "repeating" : "repeating";
      if (se && se.active) {
        btn(`⏹ Stop repeating (${rw})`, "btn ghost small", () => { if (confirm("Stop the repeat? This round keeps running; no new round opens.")) ctAct("stop_series", { p_series: t.series_id }); }, "ctd-stopseries");
        if (se.cadence === "monthly") {
          const mrow = el("div", "fchips"); mrow.id = "ctd-months"; mrow.style.margin = "6px 0";
          const have = new Set(se.months || []);
          MONTH_ABBR.forEach((m, i) => { const c = el("button", "fchip" + (have.has(i + 1) ? " on" : ""), m); c.type = "button"; c.dataset.m = i + 1; c.addEventListener("click", () => c.classList.toggle("on")); mrow.appendChild(c); });
          const save = el("button", "btn ghost small", "Save months"); save.type = "button"; save.id = "ctd-savemonths";
          save.addEventListener("click", () => { const ms = [...mrow.querySelectorAll(".fchip.on")].map(b => +b.dataset.m); if (!ms.length) { toast("Pick at least one month (or stop the repeat).", 4000); return; } ctAct("set_series_months", { p_series: t.series_id, p_months: ms }); });
          seriesBox = [el("div", "spot-meta", "🔁 Opens on the 1st of these months:"), mrow, save];
        } else seriesBox = [el("div", "spot-meta", "🔁 A new round opens " + rw + ".")];
      } else if (se) acts.appendChild(el("span", "spot-meta", "🔁 The repeat is stopped."));
    }
    if (!t.cancelled_at && (t.created_by === me.id || me.isAdmin) && st.k !== "ended") btn(t.kind === "official" ? "Cancel tournament" : "Cancel contest", "btn ghost small", () => { if (confirm(t.kind === "official" ? "Cancel this tournament for everyone?" : "Cancel this contest for everyone?")) ctAct("cancel_tournament", { p_id: t.id }); }, "ctd-cancel");
    box.appendChild(acts);
    seriesBox.forEach(n => box.appendChild(n));
    // standings
    const who = el("div"); box.appendChild(who);
    let rows = [], mineRows = [];
    if (!t.cancelled_at && st.k !== "soon") {
      const [a, b] = await Promise.all([db.rpc("tournament_standings", { p_id: t.id }), mineSt === "joined" ? db.rpc("tournament_my_catches", { p_id: t.id }) : Promise.resolve({ data: [] })]);
      rows = a.data || []; mineRows = b.data || [];
      await ensureProfiles(rows.map(r => r.user_id));
    }
    t.boards.forEach(bd => {
      box.appendChild(el("div", "label", CT_BOARDS[bd])); box.lastChild.style.marginTop = "12px";
      const list = rows.filter(r => r.board === bd).sort((x, y) => y.value - x.value || new Date(x.caught_at) - new Date(y.caught_at));
      if (!list.length) { box.appendChild(el("div", "empty", st.k === "soon" ? "Starts " + ctFmt(t.starts_at) : "No qualifying catches yet.")); return; }
      list.slice(0, 10).forEach((r, i) => {
        const label = bd === "length" ? `${+Number(r.value).toFixed(2)}″` : bd === "weight" ? lbText(Number(r.value)) : bd === "fish" ? `${r.value} fish` : `${r.value} species`;
        const det = r.species ? `${cap(r.species)} · ${new Date(r.caught_at).toLocaleDateString([], { month: "short", day: "numeric" })}` : "";
        box.appendChild(boardRow(i, { uid: r.user_id, c: {}, label, detail: det }));
      });
    });
    // teams (setup/37)
    try {
      const tb = await db.rpc("tournament_team_board", { p_id: t.id });
      const trows = (tb && tb.data) || [];
      const ownG = open && !t.cancelled_at ? (((await db.from("groups").select("id,name,created_by").eq("created_by", me.id)).data) || []) : [];
      const entered = new Set(trows.map(r => r.group_id));
      if (trows.length || ownG.length) {
        const th = el("div", "label", "👥 Teams"); th.style.marginTop = "14px"; box.appendChild(th);
        const teams = {}; trows.forEach(r => { teams[r.group_id] = { name: r.name, j: Number(r.joined_n), n: Number(r.total_n) }; });
        Object.values(teams).length && t.boards.forEach(bd => {
          box.appendChild(el("div", "spot-meta", CT_BOARDS[bd]));
          trows.filter(r => r.board === bd).sort((x, y) => y.value - x.value).forEach((r, i) => {
            const label = bd === "length" ? `${+Number(r.value).toFixed(2)}″` : bd === "weight" ? lbText(Number(r.value)) : bd === "fish" ? `${r.value} fish` : `${r.value} species`;
            const row = el("div", "team-row"); row.style.cssText = "display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--line)";
            row.appendChild(el("span", null, ["🥇", "🥈", "🥉"][i] || (i + 1) + "."));
            const nm = el("span", null, r.name); nm.style.flex = "1"; row.appendChild(nm);
            row.appendChild(el("span", "spot-meta", `${label} · ${r.joined_n} of ${r.total_n} joined`));
            box.appendChild(row);
          });
        });
        if (Object.values(teams).length) box.appendChild(el("div", "spot-meta", "A team counts the members who have joined this contest: best catch for length and weight, totals for fish and species."));
        ownG.forEach(g => {
          const b = el("button", "btn " + (entered.has(g.id) ? "ghost " : "") + "small", entered.has(g.id) ? "Withdraw " + g.name : "👥 Enter " + g.name + " as a team"); b.type = "button"; b.style.cssText = "margin:8px 8px 0 0";
          b.dataset.gid = g.id; b.className += " ctd-team-btn";
          b.addEventListener("click", () => ctAct(entered.has(g.id) ? "withdraw_team" : "enter_team", { p_tid: t.id, p_gid: g.id }));
          box.appendChild(b);
        });
      }
    } catch (e) { /* teams are optional */ }
    if (mineSt === "joined") {
      box.appendChild(el("div", "label", "My catches in this contest")); box.lastChild.style.marginTop = "14px";
      if (!mineRows.length) box.appendChild(el("div", "empty", "None in the time window yet."));
      mineRows.forEach(r => {
        const d = el("div", "feed-item"); const tp = el("div", "feed-top");
        tp.appendChild(el("b", null, `${r.ok ? "✅" : "⚠️"} ${cap(r.species || "Fish")}${r.how_many > 1 ? " ×" + r.how_many : ""}${r.length_in ? " · " + +Number(r.length_in).toFixed(2) + "″" : ""}`));
        tp.appendChild(el("span", "spot-meta", ctFmt(r.caught_at))); d.appendChild(tp);
        if (!r.ok) d.appendChild(el("div", "spot-meta", "Doesn't count: " + r.reason));
        box.appendChild(d);
      });
    }
    // people
    const joined = ctMembers.filter(m => m.tournament_id === t.id && m.status === "joined");
    const invited = ctMembers.filter(m => m.tournament_id === t.id && m.status === "invited");
    box.appendChild(el("div", "label", `People (${joined.length} in)`)); box.lastChild.style.marginTop = "14px";
    box.appendChild(el("div", "spot-meta", joined.map(m => m.user_id === me.id ? "You" : (profName(m.user_id) || "Someone")).join(", ") || "Nobody yet"));
    if (invited.length) box.appendChild(el("div", "spot-meta", "Invited: " + invited.map(m => m.user_id === me.id ? "You" : (profName(m.user_id) || "Someone")).join(", ")));
    if (t.kind === "friends" && t.created_by === me.id && open) {
      const circle = await getCircle(); const have = new Set(ctMembers.filter(m => m.tournament_id === t.id && m.status !== "left").map(m => m.user_id));
      const cand = circle ? [...circle].filter(id => !have.has(id)) : [];
      if (cand.length) {
        await ensureProfiles(cand);
        box.appendChild(el("div", "spot-meta", "Invite another friend:"));
        const ch = el("div", "fchips"); cand.forEach(id => { const b = el("button", "fchip", "+ " + (profName(id) || "Friend")); b.type = "button"; b.addEventListener("click", () => ctAct("invite_to_tournament", { p_id: t.id, p_user: id })); ch.appendChild(b); });
        box.appendChild(ch);
      }
    }
    if ((mineSt === "joined" || t.created_by === me.id) && !t.cancelled_at) {
      box.appendChild(groupChatPanel("contest", t.id));
      if (t.kind === "official") box.appendChild(el("div", "spot-meta", "This chat is open to everyone in the tournament. It doesn't send phone alerts."));
    }
    if (t.geo_lat != null) box.appendChild(el("div", "spot-meta", "📍 Location is checked from the GPS stamp saved when you log a catch live. Catches added later from the photo or by hand can't count here."));
  }


  // ---- 🔔 Phone alerts (V4.7): web push — turn on in Profile, pick what you want, tap an alert to jump to it ----
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const pushCapable = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const b64ToU8 = s => { const p = "=".repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  let pushMsgTimer = null;
  let pushCondLoc = null;
  function pushSay(text, err) { const m = $("push-msg"); m.className = "msg" + (err ? " err" : ""); m.textContent = text; clearTimeout(pushMsgTimer); if (text && !err) pushMsgTimer = setTimeout(() => { m.textContent = ""; }, 6000); }
  async function pushCurrentSub() {
    try { const reg = await navigator.serviceWorker.getRegistration(); return reg ? await reg.pushManager.getSubscription() : null; } catch (e) { return null; }
  }
  async function pushRefresh() {
    const st = $("push-status"), on = $("push-on"), off = $("push-off"), test = $("push-test"), prefs = $("push-prefs");
    $("push-ios").hidden = true; on.hidden = off.hidden = test.hidden = prefs.hidden = true;
    if (!pushCapable() || (isIOS && !isStandalone())) {
      if (isIOS && !isStandalone()) { st.textContent = "On iPhone, alerts only work from the Home Screen app."; $("push-ios").hidden = false; $("a2hs").open = true; }
      else st.textContent = "This browser can't receive phone alerts.";
      return;
    }
    if (Notification.permission === "denied") { st.textContent = "Alerts are blocked for this app. Allow notifications for it in your phone's settings, then come back."; return; }
    const sub = await pushCurrentSub();
    if (sub) {
      st.textContent = "🔔 Alerts are ON for this phone.";
      off.hidden = test.hidden = prefs.hidden = false;
      try {
        const { data } = await db.from("notif_prefs").select("*").eq("user_id", me.id).maybeSingle();
        const p = data || { social: true, contests: true, trips: true };
        $("push-p-social").checked = p.social !== false; $("push-p-contests").checked = p.contests !== false; $("push-p-trips").checked = p.trips !== false;
        $("push-p-wx").checked = p.weather !== false; $("push-p-weekly").checked = p.weekly !== false; $("push-p-cond").checked = !!p.conditions; $("push-c-opts").hidden = !p.conditions;
        $("push-c-time").value = String(p.cond_time || "06:30").slice(0, 5); $("push-c-radius").value = String(p.cond_radius_mi || 25);
        pushCondLoc = p.cond_lat != null && p.cond_lng != null ? { lat: p.cond_lat, lng: p.cond_lng } : null;
        $("push-c-loc").textContent = pushCondLoc ? "📍 Location saved — update it" : "📍 Use my current location";
        $("push-q-on").checked = !!p.quiet_enabled;
        $("push-q-start").value = String(p.quiet_start || "22:00").slice(0, 5); $("push-q-end").value = String(p.quiet_end || "06:00").slice(0, 5);
        $("push-q-times").hidden = $("push-q-note").hidden = !p.quiet_enabled;
      } catch (e) {}
    } else { st.textContent = "Alerts are off on this phone."; on.hidden = false; }
  }
  async function pushTurnOn() {
    $("push-on").disabled = true;
    try {
      pushSay("Asking your phone for permission…");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { pushSay("Permission wasn't given, so alerts stay off.", true); return; }
      const reg = await navigator.serviceWorker.ready;
      const r = await fetch(SUPABASE_URL + "/functions/v1/send-push", { headers: { apikey: SUPABASE_KEY } });
      const { publicKey } = await r.json();
      if (!publicKey) throw new Error("no key from the server");
      const subscribe = () => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) });
      let sub = (await reg.pushManager.getSubscription()) || await subscribe();
      const save = s => { const j = s.toJSON(); return db.from("push_subscriptions").insert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) }); };
      let { error } = await save(sub);
      if (error && error.code === "23505") { // this phone was registered by someone else (or earlier): start fresh
        await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe(); sub = await subscribe(); ({ error } = await save(sub));
      }
      if (error) throw error;
      pushSay("Alerts are on ✓ — tap “Send a test alert”.");
    } catch (e) { pushSay("Couldn't turn alerts on: " + (e.message || e), true); }
    finally { $("push-on").disabled = false; pushRefresh(); }
  }
  async function pushTurnOff() {
    try {
      const sub = await pushCurrentSub();
      if (sub) { await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
      pushSay("Alerts are off on this phone.");
    } catch (e) { pushSay("Couldn't turn alerts off: " + (e.message || e), true); }
    pushRefresh();
  }
  async function pushSavePrefs() {
    $("push-q-times").hidden = $("push-q-note").hidden = !$("push-q-on").checked;
    $("push-c-opts").hidden = !$("push-p-cond").checked;
    let tz = "America/New_York"; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
    const { error } = await db.from("notif_prefs").upsert({ user_id: me.id, social: $("push-p-social").checked, contests: $("push-p-contests").checked, trips: $("push-p-trips").checked,
      weather: $("push-p-wx").checked, weekly: $("push-p-weekly").checked, conditions: $("push-p-cond").checked, cond_time: $("push-c-time").value || "06:30", cond_radius_mi: +$("push-c-radius").value || 25,
      ...(pushCondLoc ? { cond_lat: pushCondLoc.lat, cond_lng: pushCondLoc.lng } : {}),
      quiet_enabled: $("push-q-on").checked, quiet_start: $("push-q-start").value || "22:00", quiet_end: $("push-q-end").value || "06:00", tz, updated_at: new Date().toISOString() });
    pushSay(error ? "Couldn't save: " + error.message : "Saved ✓", !!error);
  }
  $("push-on").addEventListener("click", pushTurnOn);
  $("push-off").addEventListener("click", pushTurnOff);
  $("push-test").addEventListener("click", async () => {
    const { error } = await db.rpc("send_test_push");
    pushSay(error ? "Couldn't send: " + error.message : "Sent — it should buzz in a few seconds.", !!error);
  });
  ["push-p-social", "push-p-contests", "push-p-trips", "push-p-wx", "push-p-weekly", "push-p-cond", "push-c-time", "push-c-radius", "push-q-on", "push-q-start", "push-q-end"].forEach(id => $(id).addEventListener("change", pushSavePrefs));
  $("push-weekly-preview").addEventListener("click", async () => {
    const out = $("push-weekly-out"); out.textContent = "…";
    const { data, error } = await db.rpc("weekly_preview");
    out.textContent = error ? "Couldn't check right now." : (data && data.body) || "";
  });
  $("push-c-loc").addEventListener("click", () => {
    if (!navigator.geolocation) { pushSay("This phone can't share its location.", true); return; }
    pushSay("Finding you…");
    navigator.geolocation.getCurrentPosition(async p => {
      pushCondLoc = { lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4) };
      await pushSavePrefs();
      $("push-c-loc").textContent = "📍 Location saved — update it";
    }, () => pushSay("Couldn't get your location — allow location for this app in your phone's settings.", true), { enableHighAccuracy: false, timeout: 15000 });
  });
  $("push-c-preview").addEventListener("click", async () => {
    const out = $("push-c-out"); out.hidden = false; out.textContent = "Checking today's tide, light, pressure and wind…";
    try {
      const { data: { session } } = await db.auth.getSession();
      const r = await fetch(SUPABASE_URL + "/functions/v1/morning-bites", { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ preview: true }) });
      const d = await r.json();
      out.textContent = d.text || d.error || "No answer — try again in a moment.";
    } catch (e) { out.textContent = "Couldn't check right now: " + (e.message || e); }
  });

  // Tapping an alert opens the right place: ?go=chat&with=ID · friends · contest&id=ID · feed · invite
  let pendingGo = /[?&]go=/.test(location.search) ? location.search : null;
  function handleGo(qs) {
    const q = new URLSearchParams(qs || "");
    const go = q.get("go");
    if (!go || !me) return;
    stopPlacing();
    if (go === "chat" && q.get("with")) openChatWith(q.get("with"));
    else if (go === "friends") $("friends-btn").click();
    else if (go === "group" && q.get("scope") === "team" && q.get("id")) { grOpen = q.get("id"); feedMode = "groups"; showView("feed"); window.scrollTo({ top: 0 }); }
    else if (go === "group" && q.get("scope") === "contest" && q.get("id")) { ctId = q.get("id"); ctView = "detail"; feedMode = "contests"; showView("feed"); window.scrollTo({ top: 0 }); }
    else if (go === "group" && q.get("scope") === "trip" && q.get("id")) {
      feedMode = "circle"; showView("feed");
      (async () => {
        let pl = plans.find(x => x.id === q.get("id")) || pastTrips.find(x => x.id === q.get("id"));
        if (!pl) { const { data } = await db.from("trip_plans").select("*").eq("id", q.get("id")).maybeSingle(); pl = data; }
        if (pl) openTripReview(pl);
      })();
    }
    else if (go === "contest" && q.get("id")) { ctId = q.get("id"); ctView = "detail"; feedMode = "contests"; showView("feed"); window.scrollTo({ top: 0 }); }
    else if (go === "spot" && q.get("id")) { goToSpot(q.get("id"), false); }
    else if (go === "plan" || go === "weather") { showView("list"); ciLoad(); wxRefresh(true); setTimeout(() => $("safety-strip").scrollIntoView({ behavior: "smooth", block: "start" }), 200); }
    else if (go === "invite" && me.isAdmin) $("invite-btn").click();
    else if (go === "insights") { showView("insights"); window.scrollTo({ top: 0 }); }
    else { feedMode = "circle"; showView("feed"); window.scrollTo({ top: 0 }); }
  }
  function runPendingGo() { if (pendingGo && me) { const g = pendingGo; pendingGo = null; try { history.replaceState(null, "", SITE); } catch (e) {} handleGo(g); } }
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.go) { pendingGo = e.data.go; runPendingGo(); } });

  // ---- 👋 Welcome flow (first sign-in): profile → Home Screen → alerts → location & camera ----
  let wl = null;
  const wlSet = async fields => db.from("notif_prefs").upsert({ user_id: me.id, ...fields });
  async function maybeWelcome() {
    try {
      if (!db || !me || !me.profile) return;
      try { if (sessionStorage.getItem("fm-welcome-later") === "1") return; } catch (e) {}
      const { data, error } = await db.from("notif_prefs").select("welcomed_at").eq("user_id", me.id).maybeSingle();
      if (error || (data && data.welcomed_at)) return;
      const phone = isIOS || /Android/i.test(navigator.userAgent);
      const needHome = phone && !isStandalone();
      const steps = ["profile"];
      if (needHome) steps.push("home");
      if (!(isIOS && !isStandalone())) { if (pushCapable()) steps.push("alerts"); steps.push("perms"); }
      wl = { steps, i: 0 };
      $("welcome").hidden = false; $("welcome").scrollTop = 0;
      renderWelcome();
    } catch (e) {}
  }
  function fillA2hs(box) { const t = $("a2hs-tpl"); box.innerHTML = ""; box.appendChild(t.content.cloneNode(true)); }
  function renderWelcome() {
    const st = wl.steps[wl.i], last = wl.i === wl.steps.length - 1, body = $("wl-body");
    $("wl-step").textContent = `Step ${wl.i + 1} of ${wl.steps.length}`;
    $("wl-msg").textContent = ""; $("wl-msg").className = "msg";
    const nxt = $("wl-next"); nxt.disabled = false;
    nxt.textContent = last ? (st === "home" && isIOS ? "Done for now" : "Finish") : "Next";
    if (st === "profile") {
      const p = me.profile || {};
      body.innerHTML = `<h2 style="margin:6px 0">Welcome to Fishing Map 🎣</h2>
        <div class="spot-meta">Share spots, log catches, plan trips with friends and run contests. First, tell everyone who you are.</div>
        <label for="wl-name">Your name</label><input id="wl-name" maxlength="40">
        <label for="wl-handle">Username</label><input id="wl-handle" maxlength="20" autocapitalize="none" autocomplete="off" placeholder="letters, numbers, _ (3–20)">
        <div class="spot-meta">Friends find you by this. It shows as @username.</div>
        <label for="wl-area">Home waters (optional)</label><input id="wl-area" maxlength="60" placeholder="e.g., Pompano Beach, FL">
        <label for="wl-bio">About you (optional)</label><textarea id="wl-bio" maxlength="300" placeholder="What you fish for, favorite bait…"></textarea>`;
      $("wl-name").value = p.display_name || me.name || ""; $("wl-handle").value = p.handle || "";
      $("wl-area").value = p.home_area || ""; $("wl-bio").value = p.bio || "";
    } else if (st === "home") {
      body.innerHTML = `<h2 style="margin:6px 0">Put it on your Home Screen 📲</h2>
        <div class="spot-meta">It opens like a regular app, still works with weak signal${isIOS ? ", and iPhones need it for phone alerts" : ""}.</div><div id="wl-a2hs"></div>
        ${isIOS ? '<div class="spot-meta" style="margin-top:8px">When you open the app from its new icon, this welcome picks up again so you can turn on alerts there.</div>' : ""}`;
      fillA2hs($("wl-a2hs"));
    } else if (st === "alerts") {
      body.innerHTML = `<h2 style="margin:6px 0">Phone alerts 🔔</h2>
        <div class="spot-meta">Get a buzz for messages, friend requests, contest invites and starts, and a reminder an hour before a planned trip. You can pick which kinds later in Profile.</div>
        <div style="margin-top:10px"><button class="btn" id="wl-alerts-btn" type="button">Turn on alerts</button></div>
        <div class="spot-meta" id="wl-alerts-st" style="margin-top:6px"></div>`;
      const stt = $("wl-alerts-st");
      const check = async () => { const s = await pushCurrentSub(); if (s) { stt.textContent = "✓ Alerts are on for this phone."; $("wl-alerts-btn").hidden = true; } else if (Notification.permission === "denied") stt.textContent = "Alerts are blocked in your phone's settings for this app. You can allow them there and turn them on later in Profile."; };
      $("wl-alerts-btn").addEventListener("click", async () => { stt.textContent = "Asking your phone…"; await pushTurnOn(); stt.textContent = ""; await check(); if (!$("wl-alerts-btn").hidden && Notification.permission !== "denied") stt.textContent = $("push-msg").textContent; });
      check();
    } else {
      body.innerHTML = `<h2 style="margin:6px 0">Location &amp; camera 📍📷</h2>
        <div class="spot-meta">Location finds the nearest spot when you log a catch, adds tide and weather for where you are, and verifies location-locked contests. The camera is for photographing catches. Allowing these shares nothing by itself — you still choose what is private, friends or public.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn small" id="wl-loc" type="button">Allow location</button><button class="btn small" id="wl-cam" type="button">Allow camera</button></div>
        <div class="spot-meta" id="wl-perm-st" style="margin-top:6px"></div>`;
      const say = t => { $("wl-perm-st").textContent = ($("wl-perm-st").dataset.t = ($("wl-perm-st").dataset.t || "") + " " + t).trim(); };
      $("wl-loc").addEventListener("click", () => {
        if (!navigator.geolocation) return say("📍 Location isn't available here.");
        navigator.geolocation.getCurrentPosition(() => { say("📍 Location ✓"); $("wl-loc").hidden = true; }, () => say("📍 Location wasn't allowed — you can change that in your phone's settings."), { timeout: 15000 });
      });
      $("wl-cam").addEventListener("click", async () => {
        try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t => t.stop()); say("📷 Camera ✓"); $("wl-cam").hidden = true; }
        catch (e) { say("📷 Camera wasn't allowed — you can change that in your phone's settings."); }
      });
    }
  }
  async function wlNext() {
    const st = wl.steps[wl.i], last = wl.i === wl.steps.length - 1, msg = $("wl-msg");
    if (st === "profile") {
      const name = $("wl-name").value.trim(), handle = $("wl-handle").value.trim().toLowerCase().replace(/^@/, "");
      if (!name) { msg.className = "msg err"; msg.textContent = "Please add your name."; return; }
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) { msg.className = "msg err"; msg.textContent = "Username: 3–20 letters, numbers or _ (no spaces)."; return; }
      msg.textContent = "Saving…"; $("wl-next").disabled = true;
      try {
        const area = $("wl-area").value.trim() || null, bio = $("wl-bio").value.trim() || null;
        const { error } = await db.from("profiles").update({ display_name: name, handle, home_area: area, bio }).eq("user_id", me.id);
        if (error) throw error;
        if (name !== me.name) { await db.rpc("set_my_name", { new_name: name }); me.name = name; }
        me.profile = { ...(me.profile || {}), display_name: name, handle, home_area: area, bio }; me.handle = handle;
        $("who").textContent = `Signed in as ${me.name} (@${handle})`;
      } catch (err) {
        $("wl-next").disabled = false; msg.className = "msg err";
        msg.textContent = err && err.code === "23505" ? "That username is taken — try another." : "Couldn't save: " + (err.message || err); return;
      }
    }
    if (last) {
      if (st === "home" && isIOS) { try { sessionStorage.setItem("fm-welcome-later", "1"); } catch (e) {} $("welcome").hidden = true; return; }
      await wlSet({ welcomed_at: new Date().toISOString() }); $("welcome").hidden = true; toast("You're all set 🎣");
      return;
    }
    wl.i++; renderWelcome(); $("welcome").scrollTop = 0;
  }
  $("wl-next").addEventListener("click", wlNext);
  $("wl-skip").addEventListener("click", async () => { await wlSet({ welcomed_at: new Date().toISOString() }); $("welcome").hidden = true; });
  fillA2hs($("a2hs-body"));

