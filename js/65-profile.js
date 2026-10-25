// ---- My Profile screen, "Clean Social" look (redesign step 5; docs/fishing-map-redesign/DESIGN-HANDOFF.md) ----
// Opens from the top-right picture (js/09 calls openMyProfile). "Settings & edit" opens the Me page that the picture used to open (openMe, js/27).
// Everything here is read from what the app already holds about ME (my catches, spots, trips, badges, friends); nothing new is stored or sent.
let pfTab = "catches", pfPrev = "list", pfCoverPath = null;
// Make the picked photo a 1200×480 header (centre crop, under 1 MB), upload it, remember its path; null = remove the header image
async function pfSetCover(file) {
  let path = null, blob = null;
  if (file) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
    const W = 1200, H = 480, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const sw = src.width, sh = src.height, k = Math.max(W / sw, H / sh), dw = sw * k, dh = sh * k;
    cv.getContext("2d").drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    for (const q of [0.85, 0.75, 0.65, 0.5]) { blob = await new Promise(r => cv.toBlob(r, "image/jpeg", q)); if (blob && blob.size < 900000) break; }
    if (!blob) throw new Error("couldn't read that picture");
    path = `${me.id}/cover-${newId()}.jpg`;
    const { error: ue } = await db.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
    if (ue) throw ue;
  }
  const { error } = await db.from("profile_extras").upsert({ user_id: me.id, cover_path: path }, { onConflict: "user_id" });
  if (error) { if (path) db.storage.from("avatars").remove([path]); throw error; }
  const old = pfCoverPath; pfCoverPath = path;
  if (old && old !== path) { db.storage.from("avatars").remove([old]); delete avatarUrls["avatars" + old]; }   // tidy up the old header image
  if (typeof ppMine !== "undefined" && ppMine) ppMine.cover_path = path;
}
function openMyProfile() {
  if (!me) return;
  const was = ["list", "map", "insights", "seasons", "tank", "feed", "compete", "learn"].find(k => { const v = $("view-" + k); return v && !v.hidden; });
  if (was) pfPrev = was;
  showView("profile"); window.scrollTo({ top: 0 });
}
function renderMyProfile() {
  const root = $("view-profile"); if (!root || !me) return;
  const ic = n => (typeof iconSvg === "function" ? iconSvg(n) : "");
  const p = me.profile || {}, x = (typeof ppMine !== "undefined" && ppMine) || {};
  const name = p.display_name || me.name || "Me";
  root.innerHTML = "";

  const cover = el("div", "pf-cover");
  if (x.accent) cover.style.setProperty("--pf-cover", x.accent);
  const back = el("button", "pf-back"); back.type = "button"; back.setAttribute("aria-label", "Back"); back.innerHTML = ic("arrowl");
  back.addEventListener("click", () => showView(pfPrev || "list"));
  cover.appendChild(back);
  // header image: stored in the same private "avatars" bucket as my picture (file name starts with cover-), so it is seen by exactly the people who may see my profile
  const cam = el("button", "pf-cover-btn"); cam.type = "button"; cam.id = "pf-cover-btn"; cam.setAttribute("aria-label", "Change header image"); cam.innerHTML = ic("camera");
  const rm = el("button", "pf-cover-btn pf-cover-rm"); rm.type = "button"; rm.id = "pf-cover-rm"; rm.setAttribute("aria-label", "Remove header image"); rm.innerHTML = ic("trash"); rm.hidden = true;
  const file = document.createElement("input"); file.type = "file"; file.accept = "image/*"; file.hidden = true; file.id = "pf-cover-file";
  cam.addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files && file.files[0]; file.value = ""; if (!f) return;
    cam.disabled = true;
    try { await pfSetCover(f); renderMyProfile(); toast("Header image saved ✓"); }
    catch (e) { toast("Couldn't save that image: " + (e && e.message ? e.message : "try another one")); }
    cam.disabled = false;
  });
  rm.addEventListener("click", async () => {
    try { await pfSetCover(null); renderMyProfile(); } catch (e) { toast("Couldn't remove it: " + (e && e.message ? e.message : "try again")); }
  });
  cover.appendChild(rm); cover.appendChild(cam); cover.appendChild(file); root.appendChild(cover);

  const top = el("div", "pf-top");
  const av = el("div", "pf-av"); av.appendChild(avatarNode(null, name, 84, null)); top.appendChild(av);
  const btns = el("div", "pf-btns");
  const set = el("button", "pf-set"); set.type = "button"; set.id = "pf-settings"; set.innerHTML = ic("gear") + "<span>Settings &amp; edit</span>";
  set.addEventListener("click", () => { if (typeof openMe === "function") openMe(); });
  const sh = el("button", "pf-share"); sh.type = "button"; sh.setAttribute("aria-label", "Share the app"); sh.innerHTML = ic("upload");
  sh.addEventListener("click", async () => {   // shares only the app's web address, nothing about you
    const url = location.origin + location.pathname;
    try { if (navigator.share) await navigator.share({ title: "Fishing Map", text: "Fishing Map", url }); else if (navigator.clipboard) { await navigator.clipboard.writeText(url); toast("Link copied ✓"); } } catch (e) { /* cancelled */ }
  });
  btns.appendChild(set); btns.appendChild(sh); top.appendChild(btns); root.appendChild(top);
  // my real picture, if I have one (the letter shows until it arrives)
  (async () => {
    try {
      let e = (typeof ppMine !== "undefined" && ppMine) || null;
      if (!e) { const r = await db.from("profile_extras").select("avatar_path,accent,cover_path").eq("user_id", me.id).maybeSingle(); e = r && r.data; }
      if (e && e.cover_path === undefined) { const r2 = await db.from("profile_extras").select("cover_path").eq("user_id", me.id).maybeSingle(); if (r2 && r2.data) e = Object.assign({}, e, r2.data); }
      if (!e) return;
      if (e.cover_path) {
        pfCoverPath = e.cover_path; rm.hidden = false;
        const cu = await avatarUrl(e.cover_path);
        if (cu && cover.isConnected) { cover.style.backgroundImage = "url(\"" + cu + "\")"; cover.classList.add("has-img"); }
      }
      if (e.accent && !cover.style.getPropertyValue("--pf-cover")) cover.style.setProperty("--pf-cover", e.accent);
      if (!e.avatar_path) return;
      const url = await avatarUrl(e.avatar_path);
      if (url && av.isConnected) { av.innerHTML = ""; av.appendChild(avatarNode(url, name, 84, null)); }
    } catch (err) { /* the letter stays */ }
  })();

  const cs = typeof myCatches === "function" ? myCatches() : [], trips = typeof myTrips === "function" ? myTrips() : [];
  const fish = cs.reduce((n, c) => n + (c.how_many || 1), 0);
  const kinds = {}; cs.forEach(c => { const k = (c.species || "").trim(); if (k) kinds[k.toLowerCase()] = kinds[k.toLowerCase()] || { n: 0, label: k }; if (k) kinds[k.toLowerCase()].n += c.how_many || 1; });
  const most = Object.values(kinds).sort((a, b) => b.n - a.n)[0];
  const hw = typeof hwHome === "function" ? hwHome() : null;
  root.appendChild(el("div", "pf-name", name));
  root.appendChild(el("div", "pf-handle", [p.handle ? "@" + p.handle : "", ""].join("")));
  const bio = p.bio || x.tagline; if (bio) root.appendChild(el("div", "pf-bio", bio));
  const lines = el("div", "pf-lines");
  if (hw && hw.name) lines.appendChild(el("div", null, "Home waters: " + hw.name));
  if (most) lines.appendChild(el("div", null, "Mostly: " + most.label));
  root.appendChild(lines);
  const friends = me.friendIds ? me.friendIds.size : null;
  if (friends === null && typeof loadFriends === "function" && !renderMyProfile.asked) { renderMyProfile.asked = true; Promise.resolve(loadFriends()).then(() => { if (!$("view-profile").hidden) renderMyProfile(); }).catch(() => {}); }
  const counts = el("div", "pf-counts");
  [[fish, "fish"], [trips.length, trips.length === 1 ? "trip" : "trips"], [friends === null ? "–" : friends, friends === 1 ? "friend" : "friends"]].forEach(([n, l]) => { const s = el("span"); s.appendChild(el("b", null, String(n))); s.appendChild(document.createTextNode(" " + l)); counts.appendChild(s); });
  root.appendChild(counts);

  // photo of each catch, when I have one
  const photo = {};
  Object.values(photosBySpot).flat().forEach(ph => { if (ph && ph.catch_id && photoUrls[ph.path] && !photo[ph.catch_id]) photo[ph.catch_id] = ph; });

  // best catches: the longest of each kind, then My tank
  const best = {};
  cs.forEach(c => { const L = +c.length_in || 0, k = (c.species || "").toLowerCase().trim(); if (L > 0 && k && (!best[k] || L > best[k].L)) best[k] = { L, c }; });
  const row = el("div", "hn-stories pf-best");
  Object.values(best).sort((a, b) => b.L - a.L).slice(0, 6).forEach(b => {
    const ph = photo[b.c.id], ring = el("span", "hn-ring");
    if (ph) { const im = document.createElement("img"); im.src = picUrl(ph.path); im.alt = ""; ring.appendChild(im); } else ring.innerHTML = ic("fish");
    const s = el("button", "hn-story"); s.type = "button"; s.appendChild(ring);
    s.appendChild(el("span", "hn-story-l pf-bl", `${+b.L.toFixed(1)}″`)); s.appendChild(el("span", "pf-bs", b.c.species));
    if (ph) s.addEventListener("click", () => openViewer(ph));
    row.appendChild(s);
  });
  const tk = el("button", "hn-story hn-add"); tk.type = "button";
  const tr = el("span", "hn-ring"); tr.innerHTML = ic("fish"); tk.appendChild(tr); tk.appendChild(el("span", "hn-story-l", "My tank"));
  tk.addEventListener("click", () => { const b = document.querySelector('#bnav [data-nav="play"]'); if (b) b.click(); });
  row.appendChild(tk);
  const bestSec = el("div", "pf-sec"); bestSec.appendChild(el("div", "pf-sec-t", "Best catches")); bestSec.appendChild(row); root.appendChild(bestSec);

  // tabs
  const tabs = el("div", "pf-tabs"); tabs.setAttribute("role", "tablist");
  const pane = el("div", "pf-pane");
  const draw = () => {
    tabs.querySelectorAll("button").forEach(b => { const on = b.dataset.t === pfTab; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    pane.innerHTML = "";
    if (pfTab === "catches") {
      const list = cs.slice().sort((a, b) => new Date(b.caught_at) - new Date(a.caught_at)).slice(0, 90);
      if (!list.length) { pane.appendChild(el("div", "pf-empty", "No catches yet. Tap + to log your first fish.")); return; }
      const grid = el("div", "pf-grid");
      list.forEach(c => {
        const t = el("button", "pf-tile"); t.type = "button"; const ph = photo[c.id];
        if (ph) { const im = document.createElement("img"); im.src = picUrl(ph.path); im.alt = "Photo of your " + (c.species || "catch"); im.loading = "lazy"; t.appendChild(im); t.addEventListener("click", () => openViewer(ph)); }
        else t.classList.add("nophoto");
        t.appendChild(el("span", "pf-tile-l", c.species || "Fish"));
        grid.appendChild(t);
      });
      pane.appendChild(grid);
    } else if (pfTab === "spots") {
      const mine = (spots || []).filter(s => isMine(s));
      if (!mine.length) { pane.appendChild(el("div", "pf-empty", "No spots saved yet.")); return; }
      mine.forEach(s => {
        const n = (catchesBySpot[s.id] || []).filter(isMine).length;
        const r = el("div", "pf-row"); r.appendChild(el("b", null, s.name));
        r.appendChild(el("span", "pf-sub", [s.spot_type, s.water_type, s.is_private ? "private" : ""].filter(Boolean).join(" · ") + ` · ${n} catch${n === 1 ? "" : "es"}`));
        pane.appendChild(r);
      });
    } else if (pfTab === "trips") {
      const list = trips.slice().sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 60);
      if (!list.length) { pane.appendChild(el("div", "pf-empty", "No trips yet. Tap Start trip on Home.")); return; }
      list.forEach(t => {
        const sp = (spots || []).find(s => s.id === t.spot_id), f = typeof tripFish === "function" ? tripFish(t) : 0;
        const r = el("div", "pf-row"); r.appendChild(el("b", null, sp ? sp.name : "A spot"));
        r.appendChild(el("span", "pf-sub", `${new Date(t.started_at).toLocaleDateString([], { month: "short", day: "numeric" })} · ${f} fish`));
        pane.appendChild(r);
      });
    } else {
      const ctx = badgeCtx(), earned = BADGES.filter(b => b.n(ctx) >= b.goal);
      pane.appendChild(el("div", "pf-sub", `${earned.length} of ${BADGES.length} earned`));
      const grid = el("div", "badges");
      BADGES.forEach(b => {
        const have = b.n(ctx) >= b.goal, d = el("div", "badge" + (have ? " on" : "")); d.title = b.desc;
        d.appendChild(el("div", "badge-i", b.icon)); d.appendChild(el("b", null, b.name));
        d.appendChild(el("div", "spot-meta", have ? "Earned" : `${Math.floor(Math.min(b.n(ctx), b.goal))}/${b.goal} · ${b.desc}`));
        grid.appendChild(d);
      });
      pane.appendChild(grid);
    }
  };
  [["catches", "Catches"], ["spots", "Spots"], ["trips", "Trips"], ["badges", "Badges"]].forEach(([k, t]) => {
    const b = el("button", null, t); b.type = "button"; b.dataset.t = k; b.setAttribute("role", "tab");
    b.addEventListener("click", () => { pfTab = k; draw(); }); tabs.appendChild(b);
  });
  root.appendChild(tabs); root.appendChild(pane); draw();
}
