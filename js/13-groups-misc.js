  // ---- 👥 Groups (setup/36): teams of friends — page, members, team leaderboard and chat ----
  let grList = [], grMembers = [], grOpen = null, grPeriod = "month", grColor = null, grBlob = null, grClear = false;
  const GR_PERIODS = [["week", "7 days"], ["month", "30 days"], ["year", "Year"], ["all", "All time"]];
  const grSince = k => k === "week" ? new Date(Date.now() - 7 * 86400000).toISOString() : k === "month" ? new Date(Date.now() - 30 * 86400000).toISOString() : k === "year" ? new Date(Date.now() - 365 * 86400000).toISOString() : null;
  const grMyStatus = gid => { const m = grMembers.find(x => x.group_id === gid && x.user_id === me.id); return m ? m.status : null; };
  async function loadGroups() {
    const g = await db.from("groups").select("*").order("created_at", { ascending: false });
    if (g.error) throw g.error;
    grList = g.data || [];
    const ids = grList.map(x => x.id);
    const m = ids.length ? await db.from("group_members").select("*").in("group_id", ids) : { data: [] };
    grMembers = m.data || [];
    await ensureProfiles(grMembers.map(x => x.user_id));
  }
  async function openGroups() {
    const body = $("gr-body"); body.innerHTML = ""; body.appendChild(el("div", "spot-meta", "Loading…"));
    try { await loadGroups(); } catch (e) { body.innerHTML = ""; body.appendChild(el("div", "msg err", "Couldn't load groups right now.")); return; }
    if (grOpen && grList.some(x => x.id === grOpen)) drawGroup(grOpen); else { grOpen = null; drawGroupList(); }
  }
  async function grAvatar(g, size) {
    const url = await avatarUrl(g.avatar_path, "group-avatars");
    return avatarNode(url, g.name, size, g.accent);
  }
  function drawGroupList() {
    const body = $("gr-body"); body.innerHTML = "";
    body.appendChild(el("div", "label", "👥 Groups"));
    body.appendChild(el("div", "spot-meta", "A group is a team of friends — its own page, member list, leaderboard and chat. You can only invite friends."));
    const invites = grList.filter(g => grMyStatus(g.id) === "invited");
    invites.forEach(g => {
      const row = el("div"); row.style.cssText = "border:1px solid var(--line);border-radius:12px;padding:10px;margin:10px 0";
      row.appendChild(el("div", null, "📨 You're invited to "));
      row.firstChild.appendChild(el("b", null, g.name));
      const by = grMembers.find(x => x.group_id === g.id && x.user_id === me.id);
      if (by && by.invited_by) row.appendChild(el("div", "spot-meta", "from " + (profName(by.invited_by) || "a friend")));
      const acts = el("div"); acts.style.cssText = "display:flex;gap:8px;margin-top:8px";
      const yes = el("button", "btn small", "Join"), no = el("button", "btn ghost small", "No thanks"); yes.type = no.type = "button";
      const go = async ok => { yes.disabled = no.disabled = true; const { error } = await db.rpc("respond_group", { p_gid: g.id, p_accept: ok }); if (error) { row.appendChild(el("div", "msg err", error.message)); return; } openGroups(); };
      yes.addEventListener("click", () => go(true)); no.addEventListener("click", () => go(false));
      acts.appendChild(yes); acts.appendChild(no); row.appendChild(acts); body.appendChild(row);
    });
    const mine = grList.filter(g => grMyStatus(g.id) === "joined");
    if (!mine.length) body.appendChild(el("div", "empty", "You're not in a group yet — make one below."));
    mine.forEach(async g => {
      const row = el("div"); row.style.cssText = "display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer";
      const n = grMembers.filter(x => x.group_id === g.id && x.status === "joined").length;
      const t = el("div"); t.style.flex = "1"; t.appendChild(el("b", null, g.name)); t.appendChild(el("div", "spot-meta", n + (n === 1 ? " member" : " members") + (g.created_by === me.id ? " · you run it" : "")));
      row.appendChild(t); body.appendChild(row);
      row.insertBefore(await grAvatar(g, 44), t);
      row.addEventListener("click", () => { grOpen = g.id; drawGroup(g.id); });
    });
    const f = el("div"); f.style.cssText = "margin-top:16px;border-top:1px solid var(--line);padding-top:12px";
    f.appendChild(el("div", "label", "Start a group"));
    const nm = document.createElement("input"); nm.id = "gr-new-name"; nm.maxLength = 40; nm.placeholder = "Group name (3–40 letters)"; nm.setAttribute("aria-label", "Group name");
    const ds = document.createElement("input"); ds.id = "gr-new-desc"; ds.maxLength = 200; ds.placeholder = "What's it about? (optional)"; ds.setAttribute("aria-label", "Group description"); ds.style.marginTop = "8px";
    const mk = el("button", "btn small", "Create group"); mk.type = "button"; mk.style.marginTop = "8px"; mk.id = "gr-create";
    const msg = el("div", "msg");
    mk.addEventListener("click", async () => {
      if (nm.value.trim().length < 3) { msg.className = "msg err"; msg.textContent = "Give it a name of at least 3 letters."; return; }
      mk.disabled = true;
      const { data, error } = await db.rpc("create_group", { p_name: nm.value.trim(), p_desc: ds.value.trim() || null });
      mk.disabled = false;
      if (error) { msg.className = "msg err"; msg.textContent = error.message; return; }
      grOpen = data; await openGroups();
    });
    f.appendChild(nm); f.appendChild(ds); f.appendChild(mk); f.appendChild(msg); body.appendChild(f);
  }
  async function drawGroup(gid) {
    const g = grList.find(x => x.id === gid), body = $("gr-body");
    if (!g) { grOpen = null; drawGroupList(); return; }
    const owner = g.created_by === me.id;
    body.innerHTML = "";
    const back = el("button", "linkbtn", "← All groups"); back.type = "button"; back.addEventListener("click", () => { grOpen = null; drawGroupList(); });
    body.appendChild(back);
    const head = el("div"); head.style.cssText = "display:flex;gap:12px;align-items:center;margin:10px 0";
    const tt = el("div"); tt.appendChild(el("div", "label", g.name)); if (g.description) tt.appendChild(el("div", "spot-meta", g.description));
    head.appendChild(tt); body.appendChild(head);
    grAvatar(g, 64).then(a => head.insertBefore(a, tt));
    // members
    const joined = grMembers.filter(x => x.group_id === gid && x.status === "joined"), invited = grMembers.filter(x => x.group_id === gid && x.status === "invited");
    body.appendChild(el("div", "label", "Members (" + joined.length + ")"));
    joined.forEach(m => {
      const row = el("div"); row.style.cssText = "display:flex;gap:8px;align-items:center;padding:5px 0";
      const nameBtn = el("button", "linkbtn", (m.user_id === me.id ? "You" : (profName(m.user_id) || "Someone")) + (m.role === "owner" ? " 👑" : "")); nameBtn.type = "button"; nameBtn.style.flex = "1"; nameBtn.style.textAlign = "left";
      if (m.user_id !== me.id) nameBtn.addEventListener("click", () => showProfile(m.user_id));
      row.appendChild(nameBtn);
      if (owner && m.user_id !== me.id) {
        const x = el("button", "linkbtn", "Remove"); x.type = "button";
        x.addEventListener("click", async () => { if (!confirm("Remove " + (profName(m.user_id) || "this person") + " from the group?")) return; const { error } = await db.rpc("remove_from_group", { p_gid: gid, p_user: m.user_id }); if (error) alert(error.message); openGroups(); });
        row.appendChild(x);
      }
      body.appendChild(row);
    });
    if (invited.length) body.appendChild(el("div", "spot-meta", "Waiting to answer: " + invited.map(m => profName(m.user_id) || "someone").join(", ")));
    // invite
    if (!me.friendIds && !drawGroup.tried) { drawGroup.tried = true; await loadFriends(); }
    const taken = new Set(grMembers.filter(x => x.group_id === gid && (x.status === "joined" || x.status === "invited")).map(x => x.user_id));
    const can = [...(me.friendIds || [])].filter(id => !taken.has(id));
    const inv = el("div"); inv.style.cssText = "display:flex;gap:8px;margin:10px 0";
    if (can.length) {
      const sel = document.createElement("select"); sel.id = "gr-invite-pick"; sel.setAttribute("aria-label", "Friend to invite"); sel.style.flex = "1";
      can.forEach(id => { const o = document.createElement("option"); o.value = id; o.textContent = profName(id) || (friendProfiles[id] && friendProfiles[id].display_name) || "Friend"; sel.appendChild(o); });
      const go = el("button", "btn small", "Invite"); go.type = "button"; go.id = "gr-invite";
      const msg = el("div", "msg");
      go.addEventListener("click", async () => { go.disabled = true; const { error } = await db.rpc("invite_to_group", { p_gid: gid, p_user: sel.value }); go.disabled = false; if (error) { msg.className = "msg err"; msg.textContent = error.message; return; } openGroups(); });
      inv.appendChild(sel); inv.appendChild(go); body.appendChild(inv); body.appendChild(msg);
    } else body.appendChild(el("div", "spot-meta", "All your friends are already in (or invited). Add more friends from 👥 Friends."));
    // leaderboard
    body.appendChild(el("div", "label", "🏆 Team leaderboard"));
    const tabs = el("div"); tabs.style.cssText = "display:flex;gap:6px;margin:6px 0;flex-wrap:wrap";
    const lb = el("div"); lb.id = "gr-board";
    GR_PERIODS.forEach(([k, t]) => { const b = el("button", "btn small" + (k === grPeriod ? "" : " ghost"), t); b.type = "button"; b.addEventListener("click", () => { grPeriod = k; drawGroup(gid); }); tabs.appendChild(b); });
    body.appendChild(tabs); body.appendChild(lb);
    (async () => {
      const { data, error } = await db.rpc("group_board", { p_gid: gid, p_since: grSince(grPeriod) });
      if (error) { lb.appendChild(el("div", "msg err", "Couldn't load the leaderboard.")); return; }
      const rows = data || [];
      const tot = rows.reduce((a, r) => a + Number(r.fish), 0);
      lb.appendChild(el("div", "spot-meta", "Team total: " + tot + " fish · counts catches shared with friends or public (private catches never count)"));
      rows.forEach((r, i) => {
        const row = el("div"); row.style.cssText = "display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)";
        row.appendChild(el("span", null, (["🥇", "🥈", "🥉"][i] || (i + 1) + ".")));
        const n = el("span", null, r.user_id === me.id ? "You" : (profName(r.user_id) || "Someone")); n.style.flex = "1"; row.appendChild(n);
        row.appendChild(el("span", "spot-meta", `${r.fish} fish · ${r.species} species` + (r.longest ? ` · best ${Number(r.longest)}"` : "")));
        lb.appendChild(row);
      });
    })();
    // trophy case (hand-made by the owner)
    const trophies = Array.isArray(g.showcase) ? g.showcase : [];
    if (trophies.length || owner) {
      body.appendChild(el("div", "label", "🏆 Trophy case")); body.lastChild.style.marginTop = "14px";
      if (!trophies.length) body.appendChild(el("div", "empty", "Nothing here yet — add the group's wins and memories."));
      const saveTr = async items => { const { error } = await db.rpc("set_group_showcase", { p_gid: gid, p_items: items }); if (error) { alert(error.message); return; } openGroups(); };
      trophies.forEach((it, i) => {
        const c = el("div", "gr-trophy"); c.style.cssText = "display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)";
        c.appendChild(el("span", null, it.icon || "🏆")); c.firstChild.style.fontSize = "24px";
        const tx = el("div"); tx.style.flex = "1"; tx.appendChild(el("b", null, it.title)); if (it.detail) tx.appendChild(el("div", "spot-meta", it.detail)); c.appendChild(tx);
        if (owner) { const x = el("button", "linkbtn", "✕"); x.type = "button"; x.setAttribute("aria-label", "Remove trophy"); x.addEventListener("click", () => saveTr(trophies.filter((_, k) => k !== i))); c.appendChild(x); }
        body.appendChild(c);
      });
      if (owner && trophies.length < 8) {
        const ad = el("div"); ad.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px";
        const ic = document.createElement("select"); ic.id = "gr-tr-icon"; ic.setAttribute("aria-label", "Trophy icon");
        ["🏆", "🥇", "🐟", "🎣", "🦈", "⭐", "📸", "🔥"].forEach(e => { const o = document.createElement("option"); o.value = o.textContent = e; ic.appendChild(o); });
        const ti = document.createElement("input"); ti.id = "gr-tr-title"; ti.maxLength = 60; ti.placeholder = "Title (e.g. Sept contest winners)"; ti.style.flex = "1"; ti.setAttribute("aria-label", "Trophy title");
        const de = document.createElement("input"); de.id = "gr-tr-detail"; de.maxLength = 120; de.placeholder = "Details (optional)"; de.style.flex = "1"; de.setAttribute("aria-label", "Trophy details");
        const go = el("button", "btn small", "Add"); go.type = "button"; go.id = "gr-tr-add";
        go.addEventListener("click", () => { if (!ti.value.trim()) { alert("Give the trophy a title."); return; } saveTr([...trophies, { k: "custom", icon: ic.value, title: ti.value.trim(), detail: de.value.trim() }]); });
        ad.appendChild(ic); ad.appendChild(ti); ad.appendChild(de); ad.appendChild(go); body.appendChild(ad);
      }
    }
    // chat
    body.appendChild(groupChatPanel("team", gid));
    // edit / leave / delete
    const foot = el("div"); foot.style.cssText = "margin-top:16px;border-top:1px solid var(--line);padding-top:12px";
    if (owner) {
      foot.appendChild(el("div", "label", "Edit group"));
      grColor = g.accent || null; grBlob = null; grClear = false;
      const nm = document.createElement("input"); nm.id = "gr-edit-name"; nm.maxLength = 40; nm.value = g.name; nm.setAttribute("aria-label", "Group name");
      const ds = document.createElement("input"); ds.id = "gr-edit-desc"; ds.maxLength = 200; ds.value = g.description || ""; ds.placeholder = "Description"; ds.style.marginTop = "8px"; ds.setAttribute("aria-label", "Group description");
      const cols = el("div"); cols.style.cssText = "display:flex;gap:8px;margin:8px 0;flex-wrap:wrap";
      const drawCols = () => { cols.innerHTML = ""; PP_ACCENTS.forEach(c => { const b = el("button"); b.type = "button"; b.setAttribute("aria-label", "Colour " + c); b.style.cssText = `width:28px;height:28px;border-radius:50%;background:${c};border:3px solid ${grColor === c ? "var(--text, #000)" : "transparent"}`; b.addEventListener("click", () => { grColor = c; drawCols(); }); cols.appendChild(b); }); };
      drawCols();
      const grPrev = el("div"); grPrev.style.cssText = "display:flex;gap:8px;align-items:center;margin:6px 0";
      const pic = document.createElement("input"); pic.type = "file"; pic.accept = "image/*"; pic.id = "gr-pic"; pic.setAttribute("aria-label", "Group picture");
      pic.addEventListener("change", async () => { const f = pic.files && pic.files[0]; if (f) { try { const b = await cropPicture(f); pic.value = ""; if (b) { grBlob = b; grClear = false; grPrev.innerHTML = ""; grPrev.appendChild(avatarNode(URL.createObjectURL(b), nm.value, 56, grColor)); grPrev.appendChild(el("span", "spot-meta", " New picture — tap Save changes.")); } } catch (e) { grBlob = null; } } });
      const save = el("button", "btn small", "Save changes"); save.type = "button"; save.id = "gr-save"; save.style.marginTop = "8px";
      const msg = el("div", "msg");
      save.addEventListener("click", async () => {
        if (nm.value.trim().length < 3) { msg.className = "msg err"; msg.textContent = "The name needs at least 3 letters."; return; }
        save.disabled = true; msg.className = "msg"; msg.textContent = "Saving…";
        try {
          let path = g.avatar_path; const old = g.avatar_path;
          if (grBlob) { path = `${gid}/${newId()}.jpg`; const { error: ue } = await db.storage.from("group-avatars").upload(path, grBlob, { contentType: "image/jpeg" }); if (ue) throw ue; }
          const { error } = await db.rpc("update_group", { p_gid: gid, p_name: nm.value.trim(), p_desc: ds.value.trim() || null, p_accent: grColor, p_avatar: path });
          if (error) { if (grBlob) db.storage.from("group-avatars").remove([path]); throw error; }
          if (old && old !== path) db.storage.from("group-avatars").remove([old]);
          await openGroups();
        } catch (e) { msg.className = "msg err"; msg.textContent = "Couldn't save: " + (e.message || e); save.disabled = false; }
      });
      foot.appendChild(nm); foot.appendChild(ds); foot.appendChild(cols); foot.appendChild(el("div", "spot-meta", "Group picture:")); foot.appendChild(pic); foot.appendChild(grPrev); foot.appendChild(save); foot.appendChild(msg);
      const del = el("button", "btn ghost small", "Delete this group"); del.type = "button"; del.id = "gr-delete"; del.style.cssText = "display:block;margin-top:14px;color:#c0392b";
      del.addEventListener("click", async () => { if (!confirm("Delete \"" + g.name + "\" for everyone?")) return; const { error } = await db.rpc("delete_group", { p_gid: gid }); if (error) { alert(error.message); return; } grOpen = null; openGroups(); });
      foot.appendChild(del);
    } else {
      const lv = el("button", "btn ghost small", "Leave this group"); lv.type = "button"; lv.id = "gr-leave";
      lv.addEventListener("click", async () => { if (!confirm("Leave \"" + g.name + "\"?")) return; const { error } = await db.rpc("leave_group", { p_gid: gid }); if (error) { alert(error.message); return; } grOpen = null; openGroups(); });
      foot.appendChild(lv);
    }
    body.appendChild(foot);
  }

  // ---- 💬 Group chat: one chat per planned trip (people on the trip) and per contest (people in it) ----
  function groupChatPanel(scope, id) {
    const box = el("div"); box.className = "gchat"; box.style.cssText = "border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:12px";
    box.appendChild(el("div", "label", scope === "trip" ? "💬 Trip chat" : scope === "team" ? "💬 Group chat" : "💬 Contest chat"));
    const team = scope === "team";
    const list = el("div"); list.style.cssText = "max-height:260px;overflow:auto;margin:8px 0";
    const form = el("form"); form.style.cssText = "display:flex;gap:8px";
    const inp = document.createElement("input"); inp.maxLength = 1000; inp.placeholder = "Message the group…"; inp.style.flex = "1"; inp.setAttribute("aria-label", "Message");
    const send = el("button", "btn small", "Send"); send.type = "submit";
    form.appendChild(inp); form.appendChild(send);
    const msg = el("div", "msg");
    box.appendChild(list); box.appendChild(form); box.appendChild(msg);
    let last = null;
    async function load() {
      const { data, error } = await (team ? db.from("team_messages").select("*").eq("group_id", id) : db.from("group_messages").select("*").eq("scope", scope).eq("scope_id", id)).order("created_at", { ascending: true }).limit(200);
      if (error) { msg.className = "msg err"; msg.textContent = "Couldn't load the chat."; return; }
      msg.textContent = "";
      await ensureProfiles(data.map(m => m.sender));
      const sig = data.map(m => m.id).join(",");
      if (sig === last) return; last = sig;
      list.innerHTML = "";
      if (!data.length) list.appendChild(el("div", "empty", "No messages yet — say something."));
      data.forEach(m => {
        const mine = !!(me && m.sender === me.id);
        const row = el("div"); row.style.cssText = "padding:5px 0;border-bottom:1px solid var(--line)";
        const top = el("div", "spot-meta");
        top.appendChild(el("b", null, mine ? "You" : (profName(m.sender) || "Someone")));
        top.appendChild(document.createTextNode(" · " + new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })));
        if (mine) {
          const x = el("button", "linkbtn", " ✕"); x.type = "button"; x.title = "Delete my message"; x.style.cssText = "float:right";
          x.addEventListener("click", async () => { await db.from(team ? "team_messages" : "group_messages").delete().eq("id", m.id); last = null; load(); });
          top.appendChild(x);
        }
        row.appendChild(top); row.appendChild(el("div", null, m.body)); list.appendChild(row);
      });
      list.scrollTop = list.scrollHeight;
    }
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const body = inp.value.trim(); if (!body) return;
      send.disabled = true;
      const { error } = await db.from(team ? "team_messages" : "group_messages").insert(team ? { group_id: id, body } : { scope, scope_id: id, body });
      send.disabled = false;
      if (error) { msg.className = "msg err"; msg.textContent = "Couldn't send: " + error.message; return; }
      inp.value = ""; last = null; load();
    });
    const timer = setInterval(() => { if (!box.isConnected) { clearInterval(timer); return; } if (!document.hidden) load(); }, 10000);
    load();
    return box;
  }

  // ---- 📖 Trip review: catches by everyone on a planned trip, with exact catch pins (only people on the trip see them, only here) ----
  const TRIP_BEFORE_H = 1, TRIP_AFTER_H = 12;
  let pastTrips = [], tripMap = null, tripOpen = null;
  const openPlanChats = new Set();
  const onTrip = (pl, rs) => !!(me && (pl.created_by === me.id || (rs || planRsvps[pl.id] || []).some(x => x.user_id === me.id)));
  const tripWindow = pl => { const t = new Date(pl.plan_at).getTime(); return [t - TRIP_BEFORE_H * 3600000, t + TRIP_AFTER_H * 3600000]; };
  // the planned trip a catch made now would belong to (mine, in its window, at its spot or within a mile)
  function activeTripFor(spotId, pos) {
    const now = Date.now();
    return plans.find(pl => {
      if (!onTrip(pl)) return false;
      const [a, b] = tripWindow(pl); if (now < a || now > b) return false;
      if (spotId && spotId === pl.spot_id) return true;
      const ps = (spots || []).find(x => x.id === pl.spot_id); if (!hasLoc(ps)) return false;
      const cs = (spots || []).find(x => x.id === spotId);
      return (pos && miles(pos.lat, pos.lng, ps.lat, ps.lng) <= 1) || (hasLoc(cs) && miles(cs.lat, cs.lng, ps.lat, ps.lng) <= 1);
    }) || null;
  }
  async function loadPastTrips() {
    try {
      if (!db || !me) return;
      const since = new Date(Date.now() - 60 * 86400000).toISOString(), until = new Date(Date.now() - 3 * 3600000).toISOString();
      const p = await db.from("trip_plans").select("*").is("cancelled_at", null).gte("plan_at", since).lt("plan_at", until).order("plan_at", { ascending: false }).limit(60);
      if (p.error) throw p.error;
      const ids = (p.data || []).map(x => x.id);
      const r = ids.length ? await db.from("trip_plan_rsvps").select("*").in("plan_id", ids) : { data: [] };
      const by = {}; (r.data || []).forEach(x => (by[x.plan_id] = by[x.plan_id] || []).push(x));
      pastTrips = (p.data || []).filter(pl => onTrip(pl, by[pl.id]));
    } catch (e) { pastTrips = []; }
    renderPastTrips();
  }
  function renderPastTrips() {
    const card = $("feed-trips-card"), box = $("feed-trips-list"); if (!card) return;
    box.innerHTML = ""; card.hidden = !pastTrips.length || feedMode !== "circle" || !$("trip-review").hidden;
    pastTrips.forEach(pl => {
      const spot = (spots || []).find(x => x.id === pl.spot_id);
      const it = el("div", "feed-item"); it.style.cursor = "pointer";
      const top = el("div", "feed-top");
      top.appendChild(el("span", "feed-what", planWhen(new Date(pl.plan_at))));
      top.appendChild(el("span", "feed-when", spot ? "📍 " + spot.name : ""));
      it.appendChild(top); it.appendChild(el("div", "spot-meta", "Tap to review the catches from this trip"));
      it.addEventListener("click", () => openTripReview(pl));
      box.appendChild(it);
    });
  }
  async function openTripReview(pl) {
    tripOpen = pl; $("trip-review").hidden = false; $("feed-trips-card").hidden = true;
    const body = $("trip-review-body"); body.innerHTML = "";
    const spot = (spots || []).find(x => x.id === pl.spot_id);
    body.appendChild(el("div", "label", "📖 Trip review"));
    body.appendChild(el("b", null, `${planWhen(new Date(pl.plan_at))}${spot ? " · " + spot.name : ""}`));
    body.appendChild(el("div", "spot-meta", "📍 Exact catch locations are only visible to the people on this trip, and only here. Private catches stay private. Counts catches from 1 hour before to 12 hours after the start, at this spot or within a mile."));
    const cbox = el("div"); cbox.id = "trip-contests"; body.appendChild(cbox);
    const st = el("div", "spot-meta", "Loading…"); body.appendChild(st);
    const content = el("div"); body.appendChild(content);
    body.appendChild(groupChatPanel("trip", pl.id));
    tripContests(cbox, pl);
    $("trip-review").scrollIntoView({ behavior: "smooth", block: "start" });
    const { data, error } = await db.rpc("trip_review", { p_plan: pl.id });
    if (tripOpen !== pl) return;
    if (error) { st.className = "msg err"; st.textContent = "Couldn't load the trip: " + error.message; return; }
    const rows = data || [];
    await ensureProfiles(rows.map(r => r.user_id));
    try { await loadPubPhotos(rows.map(r => ({ id: r.catch_id }))); } catch (e) { /* photos are a bonus */ }
    if (tripOpen !== pl) return;
    if (!rows.length) { st.textContent = "No catches logged for this trip yet."; return; }
    const fish = rows.reduce((n, r) => n + (r.how_many || 1), 0), people = [...new Set(rows.map(r => r.user_id))];
    st.textContent = `${fish} fish · ${rows.length} catch${rows.length === 1 ? "" : "es"} · ${people.length} angler${people.length === 1 ? "" : "s"}`;
    const nm = id => (me && id === me.id ? "You" : (profName(id) || ((planRsvps[pl.id] || []).find(x => x.user_id === id) || {}).name || "Someone"));
    const geo = rows.filter(r => r.lat != null && r.lng != null);
    if (geo.length) {
      const mapDiv = el("div"); mapDiv.id = "trip-map"; mapDiv.style.cssText = "height:260px;border-radius:10px;margin:10px 0;border:1px solid var(--line)"; content.appendChild(mapDiv);
      try {
        if (tripMap) { tripMap.remove(); tripMap = null; }
        tripMap = L.map(mapDiv, { zoomControl: true });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(tripMap);
        const pts = [];
        if (hasLoc(spot)) { L.marker([spot.lat, spot.lng]).addTo(tripMap).bindPopup("📍 " + spot.name); pts.push([spot.lat, spot.lng]); }
        geo.forEach(r => {
          L.circleMarker([r.lat, r.lng], { radius: 8, color: "#fff", weight: 2, fillColor: me && r.user_id === me.id ? "#0e7c86" : "#e08a2c", fillOpacity: 1 })
            .addTo(tripMap).bindPopup(`🎣 ${cap(r.species || "Fish")}${r.how_many > 1 ? " ×" + r.how_many : ""} — ${nm(r.user_id)}<br>${new Date(r.caught_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
          pts.push([r.lat, r.lng]);
        });
        tripMap.fitBounds(pts, { padding: [30, 30], maxZoom: 17 });
      } catch (e) { mapDiv.textContent = "Map couldn't load."; }
    }
    const byUser = new Map(); rows.forEach(r => (byUser.get(r.user_id) || byUser.set(r.user_id, []).get(r.user_id)).push(r));
    byUser.forEach((list, uid) => {
      content.appendChild(el("div", "label", nm(uid))); content.lastChild.style.marginTop = "12px";
      list.forEach(r => {
        const it = el("div", "feed-item"); const tp = el("div", "feed-top");
        tp.appendChild(el("b", null, `${cap(r.species || "Fish")}${r.how_many > 1 ? " ×" + r.how_many : ""}${sizeText(r)}`));
        tp.appendChild(el("span", "spot-meta", new Date(r.caught_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + (r.lat != null ? " · 📍" : "")));
        it.appendChild(tp);
        const phs = (pubPhotos[r.catch_id] || []).filter(x => photoUrls[x.path]);
        if (phs.length) {
          const strip = el("div"); strip.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-top:6px";
          phs.forEach(ph => {
            const im = document.createElement("img"); im.src = photoUrls[ph.path]; im.alt = "Catch photo"; im.loading = "lazy";
            im.style.cssText = "width:84px;height:84px;object-fit:cover;border-radius:8px;cursor:pointer";
            im.addEventListener("click", () => openViewer(ph)); strip.appendChild(im);
          });
          it.appendChild(strip);
        }
        content.appendChild(it);
      });
    });
  }
  // 🏁 the contest(s) made for this trip: top 3 on every board, with a link to the full contest
  async function tripContests(box, pl) {
    try {
      if (!ctRows.length) await ctLoad();
      for (const t of ctForPlan(pl.id)) {
        const { data } = await db.rpc("tournament_standings", { p_id: t.id });
        if (tripOpen !== pl) return;
        const rows = data || [];
        await ensureProfiles(rows.map(r => r.user_id));
        const d = el("div", "feed-item"); d.style.marginTop = "10px";
        const top = el("div", "feed-top"); top.appendChild(el("b", null, "🏁 " + t.title)); top.appendChild(el("span", "spot-meta", ctState(t).label)); d.appendChild(top);
        const nm = id => (me && id === me.id ? "You" : (profName(id) || "Someone"));
        t.boards.forEach(bd => {
          const list = rows.filter(r => r.board === bd).sort((x, y) => y.value - x.value || new Date(x.caught_at) - new Date(y.caught_at)).slice(0, 3);
          d.appendChild(el("div", "spot-meta", CT_BOARDS[bd]));
          if (!list.length) d.appendChild(el("div", "spot-meta", ctState(t).k === "soon" ? "Not started yet" : "No qualifying catches yet"));
          list.forEach((r, i) => d.appendChild(el("div", null, `${MEDAL[i + 1]} ${nm(r.user_id)} — ${ctBoardLabel(bd, r.value)}${r.species ? " " + cap(r.species) : ""}`)));
        });
        const ob = el("button", "btn ghost small", "Open the contest ›"); ob.type = "button"; ob.className += " trip-open-contest"; ob.style.marginTop = "6px";
        ob.addEventListener("click", () => openContestPage(t));
        d.appendChild(ob);
        box.appendChild(d);
      }
    } catch (e) { /* the review still works without the contest box */ }
  }
  function closeTripReview() {
    tripOpen = null; $("trip-review").hidden = true;
    if (tripMap) { try { tripMap.remove(); } catch (e) {} tripMap = null; }
    renderPastTrips();
  }
  $("trip-review-back").addEventListener("click", closeTripReview);

  // ---- 🎒 Tackle box: your own gear list (private), with stats worked out from the Bait / lure on your catches ----
  let tackle = [];
  const TK_KIND = { bait: "🦐 Bait", lure: "🎣 Lure", rod: "🪝 Rod", line: "🧵 Line", other: "📦 Other" };
  async function loadTackle() {
    if (!me) return;
    try {
      const { data, error } = await db.from("tackle").select("*").is("deleted_at", null).order("created_at");
      if (error) throw error;
      tackle = data || [];
    } catch (e) { /* keep the last list */ }
    fillBaitList(); renderTackle();
  }
  // Bait suggestions while logging: tackle box first, then what you used recently
  function fillBaitList() {
    const recent = Object.values(catchesBySpot).flat().filter(c => isMine(c) && c.bait).sort((a, b) => new Date(b.caught_at) - new Date(a.caught_at)).map(c => c.bait);
    const seen = new Set(), names = tackle.filter(t => t.kind === "bait" || t.kind === "lure" || t.kind === "other").map(t => t.name).concat(recent)
      .filter(n => { const k = n.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 24);
    const dl = $("bait-list"); dl.innerHTML = "";
    names.forEach(b => { const o = document.createElement("option"); o.value = b; dl.appendChild(o); });
  }
  const tkUses = t => { const nm = t.name.toLowerCase(); return myCatches().filter(c => c.bait && c.bait.toLowerCase().includes(nm)); };
  function renderTackle() {
    const list = $("tk-list"), sug = $("tk-sugg"); if (!list) return;
    list.innerHTML = ""; sug.innerHTML = "";
    if (!tackle.length) list.appendChild(el("div", "empty", "Nothing here yet — add your usual baits and lures above."));
    const rows = tackle.map(t => ({ t, cs: tkUses(t) })).sort((a, b) => b.cs.length - a.cs.length || a.t.name.localeCompare(b.t.name));
    rows.forEach(({ t, cs }) => {
      const row = el("div", "feed-item");
      const top = el("div", "row"); top.appendChild(el("span", null, `${TK_KIND[t.kind] || ""} ${t.name}`));
      const x = el("button", "linkbtn danger", "✕"); x.type = "button"; x.setAttribute("aria-label", "Remove " + t.name);
      x.addEventListener("click", async () => {
        const { error } = await db.from("tackle").update({ deleted_at: new Date().toISOString() }).eq("id", t.id);
        if (error) { toast("Couldn't remove that."); return; } await loadTackle();
      });
      top.appendChild(x); row.appendChild(top);
      let meta;
      if (t.kind === "rod" || t.kind === "line") meta = "Gear — not counted per catch";
      else if (!cs.length) meta = "Not used on a logged catch yet";
      else {
        const fish = cs.reduce((n, c) => n + (c.how_many || 1), 0), lens = cs.filter(c => c.length_in != null).map(c => +c.length_in);
        const bySp = {}; cs.forEach(c => { const k = cap((c.species || "").trim()); bySp[k] = (bySp[k] || 0) + (c.how_many || 1); });
        const topSp = Object.entries(bySp).sort((a, b) => b[1] - a[1])[0];
        meta = `${fish} fish${lens.length ? " · avg " + (lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(1) + "″" : ""}${topSp ? " · mostly " + topSp[0].toLowerCase() : ""}`;
      }
      row.appendChild(el("div", "spot-meta", meta)); list.appendChild(row);
    });
    // baits you've used on catches that aren't in the box yet
    const have = tackle.map(t => t.name.toLowerCase());
    const used = {}; myCatches().forEach(c => { const b = (c.bait || "").trim(); if (b && !have.some(h => b.toLowerCase().includes(h) || h.includes(b.toLowerCase()))) used[b.toLowerCase()] = used[b.toLowerCase()] || b; });
    const extra = Object.values(used).slice(0, 8);
    if (extra.length) {
      sug.appendChild(el("div", "spot-meta", "Used on your catches — tap to add to the box:"));
      const chips = el("div", "fchips");
      extra.forEach(b => { const c = el("button", "fchip", "+ " + b); c.type = "button"; c.addEventListener("click", () => tkAdd(b, /jig|spoon|plug|fly|popper|bucktail|swim|crank|lure|spinner|topwater|soft/i.test(b) ? "lure" : "bait")); chips.appendChild(c); });
      sug.appendChild(chips);
    }
  }
  async function tkAdd(name, kind) {
    name = String(name || "").trim(); if (!name) return;
    if (tackle.some(t => t.name.toLowerCase() === name.toLowerCase())) { toast("Already in your tackle box"); return; }
    const { error } = await db.from("tackle").insert({ name: name.slice(0, 60), kind });
    if (error) { toast("Couldn't add that: " + error.message); return; }
    await loadTackle();
  }
  $("tk-form").addEventListener("submit", async e => { e.preventDefault(); const n = $("tk-name").value; $("tk-name").value = ""; await tkAdd(n, $("tk-kind").value); });

  // ---- ✨ What's new: a short list of changes, shown once per update (newest entry first) ----
  // To announce something: add an entry at the TOP of this list with a new id (the date works) — people who haven't seen it get the popup once.
  const WHATS_NEW = [
    { id: "2026-10-09b", title: "Contests vs Tournaments", items: [
      "🎣 Contests are for friends — anyone can start one: for a trip (new “🏁 Start a contest” button on a planned trip), or repeating every week, month or year.",
      "🏆 Tournaments are official events — only admins can create them for now (clubs and brands later). Anyone can join an open one.",
      "📅 A single run can now last up to a year. Find it all under Feed → 🏁 Compete.",
      "✋ A contest made from a trip enters everyone going automatically — and anyone who taps “I'm in” later.",
      "📍 A contest made from a trip only counts catches at the trip spot (within a mile).",
      "👥 Groups (Feed → 👥 Groups): make a team of friends with its own picture, colour, member list, team leaderboard, chat and a trophy case you fill in yourself. Invites go to friends only.",
      "🧭 New bottom bar: Home, Map, Log (the big camera button), Community and Stats. Your Profile, Alerts, Invite, Refresh and Sign out are now under your profile picture at the top right. Friends and Messages live in Community.",
      "✂️ Crop your profile or group picture before saving — drag and zoom, with a round preview.",
      "🏁 Teams can enter contests together: the group owner taps “Enter as a team” on a contest, each member taps Join, and the team board combines everyone who joined.",
      "🎣 A catch can now have several photos — tap “➕ Add more photos of this catch” (up to 30 in total).",
      "🪪 Profile pages: add a picture, a tagline, a page color, 📌 pin a catch at the top and build a ⭐ showcase of trophies, badges and achievements (Profile → Your profile page). Choose who can see it: everyone, friends only, or just you — others see a blurred page with a friend-request button.",
      "💡 Planning a trip now shows “Suggested spots” for the day and time you pick — the top 3, with why (tides, past catches, season, wind) and a button to use one.",
      "🗑 You can now delete a spot you added (Edit → Delete this spot). There's a few seconds to Undo, and it won't delete if friends have catches there.",
      "📷 Add up to 30 photos of a spot in one go — pick them all at once and watch the counter.",
      "🔍 Measure tool: tap “Find the bill / card / can / ruler for me” and it finds a dollar bill, card, soda/beer can or a ruler / measuring sticker and puts the blue dots on it (first use downloads a ~10 MB helper once). It runs by itself on later photos.",
      "💾 Photos you take with the app's camera are now kept: Android saves a copy to your phone automatically, iPhone shows a one-tap “Save to Photos”, and Profile → 📷 Photos taken in the app keeps the last 14 days.",
      "🗑 Deleting a catch now deletes its photos too (after the 8-second Undo).",
      "📷 Each spot now has two photo places: photos of the spot itself, and photos from catches logged there. Cancelling a trip also cancels its contest.",
      "🔗 Trip and contest are linked both ways: the 📖 trip review shows the contest standings, and the contest page has “📖 See the trip” so you can look back at everyone's catches.",
    ] },
    { id: "2026-10-09", title: "October 9 update", items: [
      "🗺 Plan a trip: tap “Find a spot on the map”, tap a pin, then “Use this spot” — you come right back to your plan with it chosen.",
      "🎣 Weekly summary — a Sunday-evening alert with your week's fish, species, trips and biggest catch (Profile → Phone alerts).",
      "📏 Camera measure — Quick catch and the catch form can measure from a live camera with a level guide, magnifier dots and a reference (bill, card, ruler). Pinch to zoom, nudge dots with arrows, and optionally keep the lines on the photo.",
      "🎒 Tackle box (Insights tab) — your private gear list with stats per bait/lure, and your baits pop up as suggestions when you log. After 🔍 Identify fish there's a “Next: measure it” button that leads to the keeper check.",
      "🛟 Check-in with a buddy + ⛈️ severe weather alerts for where you fish.",
      "⭐ Follow spots for morning-bite alerts, and a 📏 keeper-size checker while you log a catch.",
      "🏆 Hall of Fame, 📤 share cards, a 🔔 alerts inbox, and a year-in-review with badges.",
      "🔍 Search and sort your spots, ↶ undo a delete, ⬇ export your catches, and save a map area for offline.",
      "🚩 Posts reported 3 times are blurred with a warning (tap to view anyway) until the admin checks them."] }
  ];
  const wnSeen = () => { try { return localStorage.getItem("fm-wn"); } catch (e) { return null; } };
  function wnShow(all) {
    const seen = wnSeen(), list = all ? WHATS_NEW : WHATS_NEW.filter(e => !seen || e.id > seen);
    const box = $("wn-body"); box.innerHTML = "";
    (list.length ? list : WHATS_NEW.slice(0, 1)).forEach(e => { box.appendChild(el("h3", null, e.title)); const ul = el("ul"); e.items.forEach(t => ul.appendChild(el("li", null, t))); box.appendChild(ul); });
    $("whatsnew").hidden = false;
  }
  function wnDone() { $("whatsnew").hidden = true; try { localStorage.setItem("fm-wn", WHATS_NEW[0].id); } catch (e) { /* fine */ } }
  function wnCheck() {
    if (!me || !WHATS_NEW.length) return;
    if (!$("welcome").hidden) { wnDone(); return; }                  // brand-new people get the welcome tour instead
    if (wnSeen() && wnSeen() >= WHATS_NEW[0].id) return;
    wnShow(false);
  }
  $("wn-ok").addEventListener("click", wnDone);
  $("wn-open").addEventListener("click", () => wnShow(true));

  // ---- Refreshing (the home-screen app has no reload button) ----
  function refreshApp() {
    $("ptr").style.height = "44px"; $("ptr-text").textContent = "Refreshing…"; $("ptr-icon").textContent = "↻";
    location.reload();
  }
  $("refresh-btn").addEventListener("click", refreshApp);

  // Is the person in the middle of typing or logging something? Then never reload on them.
  function busy() {
    return !$("qc").hidden || !$("spot-form").hidden || !!openCatchSpot || !$("viewer").hidden || !!placing ||
      (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  }

  // Pull down from the top of the page to refresh (not on the map, camera or photo viewer)
  (function pullToRefresh() {
    const ptr = $("ptr"), PULL = 80;
    let startY = null, dist = 0;
    document.addEventListener("touchstart", e => {
      if (window.scrollY > 0 || busy() || e.target.closest("#map, #qc, #viewer, select, input, textarea")) { startY = null; return; }
      startY = e.touches[0].clientY; dist = 0;
    }, { passive: true });
    document.addEventListener("touchmove", e => {
      if (startY == null) return;
      dist = e.touches[0].clientY - startY;
      if (dist <= 0 || window.scrollY > 0) { ptr.style.height = "0"; return; }
      ptr.classList.add("pulling");
      ptr.style.height = Math.min(70, dist * 0.5) + "px";
      ptr.classList.toggle("ready", dist > PULL);
      $("ptr-text").textContent = dist > PULL ? "Release to refresh" : "Pull to refresh";
    }, { passive: true });
    document.addEventListener("touchend", () => {
      if (startY == null) return;
      ptr.classList.remove("pulling");
      if (dist > PULL && !busy()) refreshApp();
      else { ptr.style.height = "0"; ptr.classList.remove("ready"); }
      startY = null;
    });
  })();

  // Coming back to the app after a while: load fresh tides, weather and spots
  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 15 * 60000 && navigator.onLine && !busy()) refreshApp();
  });

  // Home water temperature on the weather card
  (function homeWater() {
    const job = waterTempNow(LAT, LNG);
    job.then(v => { $("wx-water").textContent = `🌊 Water ${Math.round(v.f)}°F (${v.label})`; }, () => {});
    // the two nearest real sensors, for comparison
    Promise.allSettled(WT_STATIONS.slice(0, 2).map(st => fetch("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&application=fishing_map" +
      `&date=latest&station=${st.id}&units=english&time_zone=lst_ldt&format=json`).then(r => r.json()).then(d => ({ st, v: parseFloat(d.data && d.data[0] && d.data[0].v) }))))
      .then(rs => {
        const ok = rs.filter(r => r.status === "fulfilled" && okTemp(r.value.v)).map(r => `${r.value.st.name} ${Math.round(r.value.v)}°F`);
        if (ok.length) job.then(() => { $("wx-water").textContent += ` · ${ok.join(" · ")}`; }, () => { $("wx-water").textContent = "🌊 Water: " + ok.join(" · "); });
      });
  })();

  // Keep a copy of the app on the phone so it opens with no signal
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
