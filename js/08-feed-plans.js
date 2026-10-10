  // ---- Catch feed (V4): latest catches with 👍 reactions and short comments ----
  let feedReacts = {}, feedComments = {}, feedError = null, feedShown = 30;
  const feedOpen = new Set(), feedDraft = {};
  const feedRefresh = () => { if ($("view-feed") && !$("view-feed").hidden) renderFeed(); if (typeof pubOpen === "function" && pubOpen()) renderPublic(); };
  const redrawFeeds = () => { renderFeed(); if (typeof pubOpen === "function" && pubOpen()) renderPublic(); };
  async function loadFeed() {
    try {
      const [r, c] = await Promise.all([
        db.from("catch_reactions").select("catch_id,user_id").limit(5000),
        db.from("catch_comments").select("*").is("deleted_at", null).order("created_at", { ascending: true }).limit(2000)
      ]);
      if (r.error) throw r.error;
      if (c.error) throw c.error;
      feedReacts = {}; r.data.forEach(x => (feedReacts[x.catch_id] = feedReacts[x.catch_id] || new Set()).add(x.user_id));
      feedComments = {}; c.data.forEach(x => (feedComments[x.catch_id] = feedComments[x.catch_id] || []).push(x));
      feedError = null;
    } catch (e) { feedError = "Couldn't load 👍s and comments right now."; }
    feedRefresh();
  }
  function feedWhen(d) {
    const m = (Date.now() - d) / 60000;
    if (m < 2) return "just now";
    if (m < 60) return Math.round(m) + " min ago";
    if (m < 24 * 60) return Math.round(m / 60) + " h ago";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  async function toggleReact(c) {
    if (!me) return;
    const set = feedReacts[c.id] || (feedReacts[c.id] = new Set());
    const had = set.has(me.id);
    had ? set.delete(me.id) : set.add(me.id);
    redrawFeeds();
    try {
      const { error } = had ? await db.from("catch_reactions").delete().eq("catch_id", c.id).eq("user_id", me.id)
                            : await db.from("catch_reactions").insert({ catch_id: c.id });
      if (error) throw error;
    } catch (e) {
      had ? set.add(me.id) : set.delete(me.id);
      redrawFeeds(); alert("Couldn't save that — check your signal and try again.");
    }
  }
  async function sendComment(c, input) {
    const body = input.value.trim().slice(0, 300);
    if (!body || !me) return;
    input.disabled = true;
    try {
      const { data, error } = await db.from("catch_comments").insert({ catch_id: c.id, body, author: me.name || null }).select("*").single();
      if (error) throw error;
      (feedComments[c.id] = feedComments[c.id] || []).push({ created_at: new Date().toISOString(), created_by: me.id, author: me.name, body, ...data });
      delete feedDraft[c.id];
    } catch (e) { input.disabled = false; alert("Couldn't post that comment — check your signal and try again."); return; }
    redrawFeeds();
  }
  async function deleteComment(c, cm) {
    if (!confirm("Delete your comment?")) return;
    const { error } = await db.from("catch_comments").update({ deleted_at: new Date().toISOString() }).eq("id", cm.id);
    if (error) return alert("Couldn't delete: " + (error.message || error));
    feedComments[c.id] = (feedComments[c.id] || []).filter(x => x !== cm);
    redrawFeeds();
  }
  function feedCard(c, o) {
      const spot = (spots || []).find(x => x.id === c.spot_id);
      const item = el("div", "feed-item");
      const top = el("div", "feed-top");
      const rest = `caught ${c.how_many > 1 ? c.how_many + " " : "a "}${c.species}` + sizeText(c);
      if (o.who) {
        const sp = el("span", "feed-what"), nm = el("button", "linkbtn", o.who); nm.type = "button";
        nm.addEventListener("click", () => o.onWho && o.onWho());
        sp.appendChild(nm); sp.appendChild(document.createTextNode(" " + rest)); top.appendChild(sp);
      } else top.appendChild(el("span", "feed-what", `${c.caught_by || "Someone"} ${rest}`));
      top.appendChild(el("span", "feed-when", feedWhen(new Date(c.caught_at))));
      item.appendChild(top);
      const place = o.place !== undefined ? o.place : (spot ? (spot.is_private ? "🔒 " : "📍 ") + spot.name : null);
      item.appendChild(el("div", "spot-meta", [place,
        c.bait && `on ${c.bait}`, c.tide_stage && STAGE_LABEL[c.tide_stage], c.water_temp_f != null && `${Math.round(c.water_temp_f)}°F water`]
        .filter(Boolean).join(" · ") + (o.place === undefined && spot && spot.is_private ? " — private, only you see this" : "")));
      const ph = o.photos || (photosBySpot[c.spot_id] || []).filter(x => x.catch_id === c.id && photoUrls[x.path]);
      if (ph.length) {
        const img = document.createElement("img");
        img.className = "feed-photo"; img.src = photoUrls[ph[0].path]; img.alt = "Photo of the catch"; img.loading = "lazy";
        img.addEventListener("click", () => openViewer(ph[0]));
        item.appendChild(img);
        if (ph.length > 1) item.appendChild(thumbStrip(ph.slice(1)));
      }
      if (c.notes) item.appendChild(el("div", "spot-meta", c.notes));
      const reacts = feedReacts[c.id] || new Set(), cms = feedComments[c.id] || [];
      const mine = !!(me && reacts.has(me.id));
      const acts = el("div", "feed-actions");
      const like = el("button", "btn ghost small" + (mine ? " on" : ""), `👍 ${reacts.size || ""}`.trim());
      like.type = "button"; like.setAttribute("aria-pressed", mine);
      like.addEventListener("click", () => toggleReact(c));
      const cbtn = el("button", "btn ghost small" + (feedOpen.has(c.id) ? " on" : ""), `💬 ${cms.length || ""}`.trim());
      cbtn.type = "button";
      cbtn.addEventListener("click", () => { feedOpen.has(c.id) ? feedOpen.delete(c.id) : feedOpen.add(c.id); redrawFeeds(); });
      acts.appendChild(like); acts.appendChild(cbtn);
      if (o.report && me && c.created_by !== me.id) {
        const rb = el("button", "linkbtn", "⚑ Report"); rb.type = "button"; rb.style.marginLeft = "auto";
        rb.addEventListener("click", () => openReport({ type: "catch", id: c.id, userId: c.created_by, snippet: `${c.species} — ${c.caught_by || ""}`, label: `${c.caught_by || "this person"}'s ${c.species} catch` }));
        acts.appendChild(rb);
      }
      item.appendChild(acts);
      if (feedOpen.has(c.id)) {
        const wrap = el("div", "feed-cm");
        cms.forEach(cm => {
          const p = el("p");
          if (cm.review_state === "blurred") markReview(p, true, cm.id);
          p.appendChild(el("b", null, (cm.author || "Someone") + ": "));
          p.appendChild(document.createTextNode(cm.body));
          if (me && cm.created_by === me.id) {
            const x = el("button", "linkbtn danger", "✕"); x.type = "button"; x.setAttribute("aria-label", "Delete comment");
            x.addEventListener("click", () => deleteComment(c, cm));
            p.appendChild(document.createTextNode(" ")); p.appendChild(x);
          } else if (o.report && me) {
            const rb = el("button", "linkbtn", "⚑"); rb.type = "button"; rb.setAttribute("aria-label", "Report this comment");
            rb.addEventListener("click", () => openReport({ type: "comment", id: cm.id, userId: cm.created_by, snippet: cm.body, label: `a comment by ${cm.author || "someone"}` }));
            p.appendChild(document.createTextNode(" ")); p.appendChild(rb);
          }
          wrap.appendChild(p);
        });
        const form = document.createElement("form");
        const input = document.createElement("input");
        input.type = "text"; input.maxLength = 300; input.placeholder = "Add a comment…"; input.value = feedDraft[c.id] || "";
        input.addEventListener("input", () => { feedDraft[c.id] = input.value; });
        const go = el("button", "btn small", "Send"); go.type = "submit";
        form.appendChild(input); form.appendChild(go);
        form.addEventListener("submit", e => { e.preventDefault(); sendComment(c, input); });
        wrap.appendChild(form);
        item.appendChild(wrap);
      }
      if (c.review_state === "blurred") markReview(item, false, c.id);
      return item;
  }
  function renderFeed() {
    const box = $("feed-list");
    if (!box) return;
    renderPlans();
    box.innerHTML = "";
    if (feedError) box.appendChild(el("div", "msg err", feedError));
    const all = Object.values(catchesBySpot).flat().sort((a, b) => new Date(b.caught_at) - new Date(a.caught_at));
    if (!all.length) { box.appendChild(el("div", "empty", "No catches yet — log one and it shows up here.")); return; }
    all.slice(0, feedShown).forEach(c => box.appendChild(feedCard(c, {})));
    if (all.length > feedShown) {
      const more = el("button", "btn ghost small", "Show more"); more.type = "button";
      more.addEventListener("click", () => { feedShown += 30; redrawFeeds(); });
      box.appendChild(more);
    }
  }

  // ---- "Who's going?" plans (V4): post a trip, friends tap "I'm in" ----
  let plans = [], planRsvps = {}, planError = null, plansLoadedAt = 0;
  // Everyone going to a plan: the people who tapped "I'm in", plus whoever posted it (they're always going)
  function planGoing(pl) {
    const list = (planRsvps[pl.id] || []).slice();
    if (!list.some(x => x.user_id === pl.created_by)) list.unshift({ plan_id: pl.id, user_id: pl.created_by, name: pl.author });
    return list;
  }
  const planShort = pl => {
    const spot = (spots || []).find(x => x.id === pl.spot_id), n = planGoing(pl).length;
    const d = new Date(pl.plan_at), w = planWhen(d).replace(" · ", " ");
    return `${w} ${spot ? spot.name : "a spot"} (${n} going)`;
  };
  // A short reminder on every screen except the Feed (which lists plans in full), so nobody re-posts a trip that's already planned
  function renderPlanLine() {
    const b = $("plan-line");
    if (!b) return;
    const show = !$("view-feed").hidden && feedMode === "circle" ? [] : plans; // the Feed lists plans itself, but not in 🌎 Public / 🏁 Contests
    if (!show.length) { b.hidden = true; return; }
    b.hidden = false;
    b.textContent = "📅 Already planned: " + show.slice(0, 2).map(planShort).join(" · ") + (show.length > 2 ? ` · +${show.length - 2} more` : "") + " — tap to see";
  }
  $("plan-line").addEventListener("click", () => { stopPlacing(); feedMode = "circle"; ctView = "list"; showView("feed"); window.scrollTo({ top: 0, behavior: "smooth" }); });
  async function loadPlans() {
    try {
      const since = new Date(Date.now() - 3 * 3600000).toISOString(); // a plan stays up until 3 h after its start
      const [p, r] = await Promise.all([
        db.from("trip_plans").select("*").is("cancelled_at", null).gte("plan_at", since).order("plan_at", { ascending: true }).limit(100),
        db.from("trip_plan_rsvps").select("*").limit(3000)
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      plans = p.data;
      planRsvps = {}; r.data.forEach(x => (planRsvps[x.plan_id] = planRsvps[x.plan_id] || []).push(x));
      planError = null;
    } catch (e) { planError = "Couldn't load trip plans right now."; }
    plansLoadedAt = Date.now();
    renderPlans();
    refreshCtBanner();
  }
  function planWhen(d) {
    const day = new Date(); day.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - day) / 86400000);
    const dayText = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    return `${dayText} · ${clock(d)}`;
  }
  async function toggleRsvp(pl) {
    if (!me) return;
    const list = planRsvps[pl.id] || (planRsvps[pl.id] = []);
    const had = list.some(x => x.user_id === me.id);
    const mine = { plan_id: pl.id, user_id: me.id, name: me.name || null };
    if (had) planRsvps[pl.id] = list.filter(x => x.user_id !== me.id); else list.push(mine);
    renderPlans();
    try {
      const { error } = had ? await db.from("trip_plan_rsvps").delete().eq("plan_id", pl.id).eq("user_id", me.id)
                            : await db.from("trip_plan_rsvps").insert({ plan_id: pl.id, name: me.name || null });
      if (error) throw error;
    } catch (e) { await loadPlans(); alert("Couldn't save that — check your signal and try again."); }
  }
  async function cancelPlan(pl) {
    const hasContest = ctForPlan(pl.id).some(t => ctOpen(t));
    if (!confirm(hasContest ? "Cancel this plan for everyone? The contest made for this trip will be cancelled too." : "Cancel this plan for everyone?")) return;
    const { error } = await db.from("trip_plans").update({ cancelled_at: new Date().toISOString() }).eq("id", pl.id);
    if (error) return alert("Couldn't cancel: " + (error.message || error));
    plans = plans.filter(x => x !== pl);
    renderPlans();
    refreshCtBanner(); // the trip's contest is cancelled along with it
  }
  function renderPlans() {
    renderPlanLine();
    const box = $("plan-list");
    if (!box) return;
    box.innerHTML = "";
    if (planError) box.appendChild(el("div", "msg err", planError));
    else if (!plans.length) box.appendChild(el("div", "empty", "No trips planned yet."));
    plans.forEach(pl => {
      const spot = (spots || []).find(x => x.id === pl.spot_id);
      const item = el("div", "feed-item");
      const top = el("div", "feed-top");
      top.appendChild(el("span", "feed-what", planWhen(new Date(pl.plan_at))));
      top.appendChild(el("span", "feed-when", spot ? "📍 " + spot.name : ""));
      item.appendChild(top);
      item.appendChild(el("div", "spot-meta", `Planned by ${pl.author || "someone"}` + (pl.note ? ` — ${pl.note}` : "")));
      const going = planGoing(pl);
      item.appendChild(el("div", "spot-meta", `✋ Going (${going.length}): ${going.map(x => x.name || "Someone").join(", ")}`));
      const own = !!(me && pl.created_by === me.id);
      const inn = !!(me && going.some(x => x.user_id === me.id));
      const acts = el("div", "feed-actions");
      if (own) {
        acts.appendChild(el("span", "spot-meta", "✔ You're going — you posted this"));
        const x = el("button", "linkbtn danger", "Cancel plan"); x.type = "button";
        x.addEventListener("click", () => cancelPlan(pl));
        acts.appendChild(x);
      } else {
        const b = el("button", "btn ghost small" + (inn ? " on" : ""), inn ? "✔ I'm in (tap to back out)" : "✋ I'm in");
        b.type = "button"; b.setAttribute("aria-pressed", inn);
        b.addEventListener("click", () => toggleRsvp(pl));
        acts.appendChild(b);
      }
      if (onTrip(pl)) {
        const cb = el("button", "btn ghost small", openPlanChats.has(pl.id) ? "💬 Hide chat" : "💬 Chat"); cb.type = "button";
        cb.addEventListener("click", () => { if (openPlanChats.has(pl.id)) openPlanChats.delete(pl.id); else openPlanChats.add(pl.id); renderPlans(); });
        acts.appendChild(cb);
      }
      if (onTrip(pl) && Date.now() <= tripWindow(pl)[1]) {
        const linked = ctForPlan(pl.id)[0];
        const cb2 = el("button", "btn ghost small", linked ? "🏁 View contest" : "🏁 Start a contest"); cb2.type = "button"; cb2.className += " plan-contest";
        cb2.addEventListener("click", () => linked ? openContestPage(linked) : startTripContest(pl));
        acts.appendChild(cb2);
      }
      if (onTrip(pl) && Date.now() >= tripWindow(pl)[0]) {
        const rv = el("button", "btn ghost small", "📖 Review trip"); rv.type = "button"; rv.addEventListener("click", () => openTripReview(pl)); acts.appendChild(rv);
      }
      item.appendChild(acts);
      if (onTrip(pl) && openPlanChats.has(pl.id)) item.appendChild(groupChatPanel("trip", pl.id));
      box.appendChild(item);
    });
  }
  // Open the plan form. draft (optional) = {spot, date, time, note} when coming back from the map picker.
  function openPlanForm(draft) {
    const sel = $("pl-spot");
    sel.innerHTML = "";
    (spots || []).filter(x => !x.is_private).forEach(x => { const o = document.createElement("option"); o.value = x.id; o.textContent = x.name; sel.appendChild(o); });
    if (!sel.options.length) { $("pl-msg").className = "msg err"; $("pl-msg").textContent = "Add a public spot first — plans can't use private spots (friends couldn't see them)."; }
    else $("pl-msg").textContent = "";
    const t = new Date(Date.now() + 3600000); t.setMinutes(0, 0, 0);
    $("pl-date").value = draft ? draft.date : ymdDash(t);
    $("pl-time").value = draft ? draft.time : `${pad2(t.getHours())}:00`;
    $("pl-note").value = draft ? draft.note : "";
    if (draft && draft.spot && [...sel.options].some(o => o.value === draft.spot)) sel.value = draft.spot;
    $("plan-form").hidden = false; $("plan-add").hidden = true; $("pl-done").textContent = "";
    if (!sel.options.length) return;
    $("pl-msg").className = "msg"; warnSimilar(); planSuggest();
    $("plan-top").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("plan-add").addEventListener("click", () => openPlanForm());
  // "🏁 Start a contest" on a trip: opens the contest form pre-filled with the trip's spot, time window and the friends who are going
  function startTripContest(pl) {
    const spot = (spots || []).find(x => x.id === pl.spot_id);
    const [a, b] = tripWindow(pl);
    ctPrefill = { title: spot ? `${spot.name} trip contest`.slice(0, 60) : "Trip contest", start: Math.max(a, Date.now()), end: b,
      invites: planGoing(pl).map(x => x.user_id).filter(u => u && me && u !== me.id), planId: pl.id };
    ctTab = "contests"; ctView = "form"; ctId = null; feedMode = "contests";
    showView("feed"); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // "Find a spot on the map": go to the Map, tap a pin, "Use this spot" brings you back here with it chosen
  $("pl-map").addEventListener("click", () => {
    planPick = { spot: $("pl-spot").value, date: $("pl-date").value, time: $("pl-time").value, note: $("pl-note").value };
    startPlacing({ mode: "plan" });
  });
  function finishPlanPick(spotId) {
    const d = planPick; planPick = null;
    stopPlacing();
    if (!d) return;
    if (spotId) d.spot = spotId;
    if (map) map.closePopup();
    showView("feed");
    openPlanForm(d);
  }
  // Is there already a plan for this spot on this day? (so nobody posts it twice)
  function similarPlans() {
    const spot = $("pl-spot").value, day = $("pl-date").value;
    return plans.filter(x => x.spot_id === spot && ymdDash(new Date(x.plan_at)) === day);
  }
  const similarText = list => `${list.map(x => `${x.author || "Someone"} (${clock(new Date(x.plan_at))})`).join(", ")} already planned this spot that day`;
  function warnSimilar() {
    const dup = similarPlans();
    if ($("plan-form").hidden || $("pl-msg").classList.contains("err")) return;
    $("pl-msg").className = "msg";
    $("pl-msg").textContent = dup.length ? `⚠ ${similarText(dup)} — check 🎣 Feed and tap "I'm in" instead?` : "";
  }
  $("pl-spot").addEventListener("change", warnSimilar);
  $("pl-date").addEventListener("change", warnSimilar);

  // ---- 💡 Suggested spots inside "plan a trip": rank spots for the chosen day & time and say why ----
  let planSuggTok = 0;
  async function planSuggest() {
    const body = $("pl-sugg-body"); if (!body || $("plan-form").hidden) return;
    const tok = ++planSuggTok;
    const d = $("pl-date").value, tm = $("pl-time").value;
    if (!d || !tm) { body.textContent = "Pick a day and time to see suggestions."; return; }
    const t = new Date(d + "T" + tm);
    if (isNaN(t)) { body.textContent = "Pick a day and time to see suggestions."; return; }
    if (t.getTime() < Date.now() - 3600000) { body.textContent = "That time has passed — pick a time from now on."; return; }
    body.textContent = "Working out the best spots…";
    const cands = (spots || []).filter(x => !x.is_private && hasLoc(x));
    // forecast hours (about 3 days ahead) for wind & pressure
    const soon = t.getTime() - Date.now() < 74 * 3600000;
    const fcs = new Map();
    if (soon) await Promise.all(cands.map(async s => {
      try { const h = await spotForecast(s); fcs.set(s.id, h); } catch (e) { /* no forecast for this one */ }
    }));
    if (tok !== planSuggTok) return;
    const ranked = []; let noData = 0;
    cands.forEach(s => {
      const H = historyFor(s);
      if (!H) { noData++; return; }
      const fh = fcs.get(s.id) ? fcHour(fcs.get(s.id), t) : null;
      const f = factorsAt(s, t, fh);
      if (!fh) { f.wind = null; f.trend = null; }          // don't guess wind/pressure we have no forecast for
      const r = scoreMoment(f, H.hist, H.expo);
      ranked.push({ s, f, fh, reasons: r.reasons, score: r.score + H.extra.bonus, notes: H.extra.notes, hist: H.hist.reduce((n, h) => n + h.n, 0), own: (catchesBySpot[s.id] || []).reduce((n, c) => n + (c.how_many || 1), 0) });
    });
    ranked.sort((a, b) => b.score - a.score);
    body.innerHTML = "";
    if (!ranked.length) { body.textContent = "Not enough catches logged yet to rank spots — once a spot has about 3 fish (or the group has 5), suggestions appear here."; return; }
    body.appendChild(el("div", "spot-meta", `${t.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} around ${clock(t)} — top ${Math.min(3, ranked.length)} of ${ranked.length} ranked spots:`));
    ranked.slice(0, 3).forEach((r, i) => {
      const row = el("div", "best"); const top = el("div", "best-top"); const name = el("div");
      name.appendChild(el("span", "best-rank", `${i + 1}.`)); name.appendChild(el("span", "best-name", r.s.name));
      const rating = r.score > 1.2 ? ["strong", "Strong match"] : r.score > 0.4 ? ["", "Good match"] : ["", "Weak match"];
      name.appendChild(el("span", "rating " + rating[0], rating[1])); top.appendChild(name);
      const use = el("button", "btn ghost small", $("pl-spot").value === r.s.id ? "✓ Chosen" : "Use this spot"); use.type = "button";
      use.addEventListener("click", () => { $("pl-spot").value = r.s.id; warnSimilar(); planSuggest(); });
      top.appendChild(use); row.appendChild(top);
      row.appendChild(el("div", "best-why", r.reasons.length ? "✓ " + r.reasons.slice(0, 3).map(x => x.text).join(" · ") : "No strong pattern from past catches for these conditions"));
      if (r.notes.length) row.appendChild(el("div", "best-why", r.notes.join(" · ")));
      // what conditions are expected then
      const bits = [];
      if (r.f.tide) bits.push("🌊 " + r.f.tide + " tide");
      if (r.f.sol && r.f.sol !== "none") bits.push("🌙 " + r.f.sol + " solunar period");
      if (r.fh) bits.push(`💨 ${compass(r.fh.deg)} ${r.fh.mph} mph${windKindText(r.s, r.fh.deg)}` + (r.fh.trend ? ` · pressure ${r.fh.trend}` : ""));
      else bits.push("💨 wind forecast only covers the next ~3 days");
      row.appendChild(el("div", "spot-meta", "Expected then: " + bits.join(" · ")));
      row.appendChild(el("div", "spot-meta", r.own >= 3 ? `Based on ${r.own} fish caught here` : "Few catches here yet — based on everyone's catches"));
      body.appendChild(row);
    });
    if (noData) body.appendChild(el("div", "spot-meta", `${noData} spot${noData === 1 ? "" : "s"} not ranked yet (too few catches).`));
  }
  ["pl-date", "pl-time"].forEach(id => $(id).addEventListener("change", () => { clearTimeout(planSuggest.t); planSuggest.t = setTimeout(planSuggest, 250); }));
  const closePlanForm = () => { $("plan-form").hidden = true; $("plan-add").hidden = false; };
  $("pl-cancel").addEventListener("click", closePlanForm);
  $("plan-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("pl-msg");
    const at = new Date(`${$("pl-date").value}T${$("pl-time").value}`);
    if (isNaN(at) || !$("pl-spot").value) { msg.className = "msg err"; msg.textContent = "Pick a spot, day and time."; return; }
    if (at < Date.now() - 30 * 60000) { msg.className = "msg err"; msg.textContent = "That time has already passed."; return; }
    const dup = similarPlans();
    if (dup.length && !confirm(`${similarText(dup)}.\n\nPost another plan anyway?`)) return;
    msg.className = "msg"; msg.textContent = "Posting…"; $("pl-save").disabled = true;
    try {
      const note = $("pl-note").value.trim() || null;
      const { data, error } = await db.from("trip_plans").insert({ spot_id: $("pl-spot").value, plan_at: at.toISOString(), note, author: me && me.name || null }).select("*").single();
      if (error) throw error;
      await db.from("trip_plan_rsvps").insert({ plan_id: data.id, name: me && me.name || null }); // the person posting is going
      closePlanForm();
      $("pl-done").textContent = "✔ Plan posted — friends see it at the top of 🎣 Feed";
      setTimeout(() => { $("pl-done").textContent = ""; }, 8000);
      await loadPlans();
    } catch (err) { msg.className = "msg err"; msg.textContent = "Couldn't post: " + (err.message || err); }
    finally { $("pl-save").disabled = false; }
  });

  function catchLine(c) {
    const when = new Date(c.caught_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const what = `${c.how_many > 1 ? c.how_many + " " : ""}${c.species}` + sizeText(c) + (c.bait ? ` on ${c.bait}` : "");
    const extra = [
      c.tide_stage && STAGE_LABEL[c.tide_stage],
      c.pressure_inhg != null && `${Number(c.pressure_inhg).toFixed(2)} inHg${c.pressure_trend ? " " + c.pressure_trend : ""}`,
      c.wind_dir && c.wind_mph != null && `${c.wind_dir} ${c.wind_mph} mph`,
      c.moon_phase && `${MOON_EMOJI[c.moon_phase] || ""} ${c.moon_phase}`,
      c.solunar && `${c.solunar} solunar`,
      c.water_temp_f != null && `${Math.round(c.water_temp_f)}°F water`,
      c.caught_by && `by ${c.caught_by}`
    ].filter(Boolean).join(" · ");
    const li = el("li", "catch");
    li.appendChild(el("div", null, `${when} — ${what}`));
    const cphotos = (photosBySpot[c.spot_id] || []).filter(ph => ph.catch_id === c.id);
    if (cphotos.length) li.appendChild(thumbStrip(cphotos));
    if (extra) li.appendChild(el("div", "spot-meta", extra));
    if (c.notes) li.appendChild(el("div", "spot-meta", c.notes));
    if (c.review_state === "blurred") markReview(li, false, c.id);
    if (!isMine(c)) return li;
    const actions = el("div", "catch-actions");
    const shr = el("button", "linkbtn", "📤 Share"); shr.type = "button"; shr.addEventListener("click", () => shareCatchCard(c));
    actions.appendChild(shr);
    const edit = el("button", "linkbtn", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => openCatchForm(c.spot_id, c));
    const del = el("button", "linkbtn danger", "Delete");
    del.type = "button";
    del.addEventListener("click", () => deleteCatch(c));
    actions.appendChild(edit); actions.appendChild(del);
    li.appendChild(actions);
    return li;
  }

  async function loadFollows() {
    if (!me) return;
    try {
      const { data, error } = await db.from("spot_follows").select("spot_id");
      if (error) throw error;
      follows.clear(); (data || []).forEach(r => follows.add(r.spot_id));
      if (spots) renderSpots();
    } catch (e) { /* keep what we had */ }
  }
  async function toggleFollow(s) {
    const on = follows.has(s.id);
    const { error } = on ? await db.from("spot_follows").delete().eq("spot_id", s.id).eq("user_id", me.id) : await db.from("spot_follows").insert({ spot_id: s.id });
    if (error) { toast("Couldn't update: " + error.message); return; }
    if (on) follows.delete(s.id); else follows.add(s.id);
    toast(on ? `Stopped following ${s.name}` : `⭐ Following ${s.name} — your morning heads-up will include it`, 4500);
    renderSpots();
  }
  function catchSection(s) {
    const wrap = el("div", "catches");
    const list = catchesBySpot[s.id] || [];
    const row = el("div", "row");
    const total = list.reduce((n, c) => n + (c.how_many || 1), 0);
    const toggle = el("button", "btn ghost small", list.length
      ? `${total} fish logged ${expanded.has(s.id) ? "▴" : "▾"}` : "No catches yet");
    toggle.type = "button";
    toggle.disabled = !list.length;
    toggle.addEventListener("click", () => {
      expanded.has(s.id) ? expanded.delete(s.id) : expanded.add(s.id);
      renderSpots();
    });
    const logBtn = el("button", "btn small", "🐟 Log a catch");
    logBtn.type = "button";
    logBtn.hidden = openCatchSpot === s.id;
    logBtn.addEventListener("click", () => openCatchForm(s.id));
    const trip = activeSession(), here = trip && trip.spot_id === s.id;
    const tripBtn = el("button", "btn ghost small", here ? "⏹ End trip" : "▶ Start trip");
    tripBtn.type = "button";
    tripBtn.addEventListener("click", () => here ? endSession(false) : startSession(s));
    const btns = el("span"); btns.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end";
    const folBtn = el("button", "btn ghost small", follows.has(s.id) ? "⭐ Following" : "☆ Follow"); folBtn.type = "button";
    folBtn.addEventListener("click", () => toggleFollow(s));
    btns.appendChild(folBtn); btns.appendChild(tripBtn); btns.appendChild(logBtn);
    row.appendChild(toggle); row.appendChild(btns);
    const trips = (sessionsBySpot[s.id] || []).filter(x => x.ended_at);
    wrap.appendChild(row);
    if (trips.length) {
      const hrs = trips.reduce((n, x) => n + (new Date(x.ended_at) - new Date(x.started_at)) / 3600000, 0);
      const skunks = trips.filter(x => !tripFish(x)).length;
      wrap.appendChild(el("div", "spot-meta", `🕑 ${trips.length} trip${trips.length === 1 ? "" : "s"} · ${hrs.toFixed(hrs < 10 ? 1 : 0)} hrs fished` +
        (skunks ? ` · ${skunks} skunk${skunks === 1 ? "" : "s"}` : "")));
    }
    if (openCatchSpot === s.id) wrap.appendChild(catchForm);
    if (expanded.has(s.id) && list.length) {
      const ul = el("ul", "catch-list");
      list.slice(0, 15).forEach(c => ul.appendChild(catchLine(c)));
      wrap.appendChild(ul);
    }
    return wrap;
  }

  // Update just the conditions text in place (keeps any open form and keyboard intact)
