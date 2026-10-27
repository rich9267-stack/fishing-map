  // ---- 👀 Log a sighting (v223, setup/113): something you SAW, not caught — spot, what, how many, who sees it, optional photo. No map pins. ----
  // Public / friends' sightings (rounded to the spot's area by the database) are counted in the "👀 Seen nearby" lines next to the iNaturalist ones (js/05 memberSights).
  // 🪙 1 coin for a 🌎 Public sighting with a photo, 10 a day at most; the photo checks are in the database (claim_sighting_coins).
  let mySightings = [];
  async function sgLoad() {
    try {
      if (!db || !me) return;
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data, error } = await db.from("sightings").select("*").gte("seen_at", since).order("seen_at", { ascending: false }).limit(500);
      if (error) throw error;
      const rows = data || [];
      mySightings = rows.filter(r => r.created_by === me.id);
      memberSights = rows.filter(r => r.area_lat != null && r.area_lng != null && (r.visibility !== "private" || r.created_by === me.id))
        .map(r => ({ id: r.id, name: cap(r.species), lat: r.area_lat, lng: r.area_lng, date: ymdDash(new Date(r.seen_at)), member: true }));
      sightingsChanged();
    } catch (e) { /* offline or table not there yet: the iNaturalist sightings still work */ }
  }
  async function sgClaim() {
    try {
      const r = await db.rpc("claim_sighting_coins");
      if (!r.error && r.data && (r.data.added || []).length) { walletToast(r.data.added); if (typeof tankClaim === "function") tankClaim(true); }
    } catch (e) { /* coins are claimed next time */ }
  }
  const sgSha = async blob => { const h = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join(""); };
  async function sgUpload(file) {
    const info = await photoInfo(file), blob = await compressImage(file), fp = await sgSha(blob), path = `${me.id}/${newId()}.jpg`;
    const { error } = await db.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    try { await db.storage.from("photos").upload(thumbPath(path), await compressImage(blob, THUMB_MAX, THUMB_Q), { contentType: "image/jpeg" }); } catch (e) { /* no small copy */ }
    return { path, fp: fp.slice(0, 64), taken: info.when ? info.when.toISOString() : null };
  }

  (function sheet() {
    const box = $("sg-sheet"), form = $("sg-form"); if (!box || !form) return;
    const sel = $("sg-spot"), msg = $("sg-msg");
    const VIS = "fm-sg-vis";
    let pos = null;
    function fill(spotId) {
      const list = (spots || []).filter(s => s && s.id);
      sel.innerHTML = "";
      list.map(s => ({ s, d: pos && hasLoc(s) ? miles(pos.lat, pos.lng, s.lat, s.lng) : null }))
        .sort((a, b) => (a.d == null) - (b.d == null) || (a.d != null ? a.d - b.d : String(a.s.name).localeCompare(String(b.s.name))))
        .forEach(x => { const o = document.createElement("option"); o.value = x.s.id; o.textContent = x.s.name + (x.d != null ? ` · ${fmtDist(x.d)}` : ""); sel.appendChild(o); });
      if (spotId && [...sel.options].some(o => o.value === spotId)) sel.value = spotId;
      $("sg-save").disabled = !list.length;
      $("sg-spot-note").textContent = list.length ? "" : "Add a spot first (Home → My spots → + New spot), then log what you saw there.";
    }
    async function open(spotId) {
      if (!me) return;
      pos = null; form.reset(); msg.textContent = ""; msg.className = "msg"; $("sg-photo-note").textContent = "";
      try { $("sg-vis").value = localStorage.getItem(VIS) || "friends"; } catch (e) { /* default */ }
      fill(spotId); box.hidden = false; $("sg-species").focus();
      if (!spotId) { // closest spot first — only if this phone already allowed location, so this never pops a permission question
        try {
          if (navigator.geolocation && navigator.permissions) {
            const p = await navigator.permissions.query({ name: "geolocation" });
            if (p.state === "granted") navigator.geolocation.getCurrentPosition(g => { pos = { lat: g.coords.latitude, lng: g.coords.longitude }; if (!box.hidden) fill(); }, () => {}, { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 });
          }
        } catch (e) { /* fine */ }
      }
    }
    const close = () => { box.hidden = true; };
    window.openSighting = open;
    $("sg-cancel").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !box.hidden) close(); });
    const coinNote = () => {
      const pub = $("sg-vis").value === "public", has = !!$("sg-photo").files.length;
      $("sg-coin-note").textContent = pub && has ? "🪙 You'll get 1 coin if the photo was taken in the last 24 hours (10 a day at most)."
        : "🪙 A 🌎 Public sighting with a photo taken in the last 24 hours earns 1 coin (10 a day at most).";
    };
    $("sg-vis").addEventListener("change", coinNote);
    $("sg-photo").addEventListener("change", async () => {
      const f = $("sg-photo").files[0]; coinNote();
      if (!f) { $("sg-photo-note").textContent = ""; return; }
      const info = await photoInfo(f), age = info.when ? Date.now() - info.when.getTime() : null;
      $("sg-photo-note").textContent = !info.when ? "This photo has no time saved in it, so it can't earn a coin (you can still post it)."
        : age > 24 * 3600000 ? "This photo is older than 24 hours, so it can't earn a coin (you can still post it)." : "📷 Photo time looks good.";
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const species = $("sg-species").value.trim();
      if (species.length < 2) { msg.className = "msg err"; msg.textContent = "Tell us what you saw."; return; }
      msg.className = "msg"; msg.textContent = "Saving…"; $("sg-save").disabled = true;
      let up = null;
      try {
        const f = $("sg-photo").files[0]; if (f) up = await sgUpload(f);
        const vis = $("sg-vis").value;
        const { error } = await db.from("sightings").insert({
          spot_id: sel.value, species, how_many: Math.max(1, Math.min(5000, parseInt($("sg-count").value, 10) || 1)), notes: $("sg-note").value.trim() || null, visibility: vis,
          photo_path: up ? up.path : null, photo_taken_at: up ? up.taken : null, photo_fp: up ? up.fp : null
        });
        if (error) throw error;
        try { localStorage.setItem(VIS, vis); } catch (e2) { /* fine */ }
        close(); toast("👀 Sighting saved ✓", 3000);
        await sgLoad(); sgClaim();
      } catch (err) {
        if (up) { try { await db.storage.from("photos").remove([up.path, thumbPath(up.path)]); } catch (e3) { /* leftover file */ } }
        msg.className = "msg err"; msg.textContent = "Couldn't save that — check your signal and try again." + (err && err.message ? " (" + err.message + ")" : "");
      }
      $("sg-save").disabled = false;
    });
    // the camera screen's "👀 Sighting" button: leave Quick catch and open this form
    const qb = $("qc-sighting");
    if (qb) qb.addEventListener("click", () => { if (typeof closeQuickCatch === "function") closeQuickCatch(); open(); });
  })();

  // My sightings (Profile → Sightings tab): newest first, with photo, who can see it, and a delete button
  async function sgDelete(r) {
    if (!await askOk("Delete this sighting?")) return;
    try {
      if (r.photo_path) await db.storage.from("photos").remove([r.photo_path, thumbPath(r.photo_path)]);
      const { error } = await db.from("sightings").delete().eq("id", r.id);
      if (error) throw error;
      await sgLoad(); if (typeof renderMyProfile === "function" && !$("view-profile").hidden) renderMyProfile();
    } catch (e) { alert("Couldn't delete that — try again."); }
  }
  async function sgDraw(pane) {
    pane.innerHTML = "";
    if (!mySightings.length) { pane.appendChild(el("div", "pf-empty", "No sightings yet. Tap 👀 Log a sighting on a spot or in Quick catch.")); return; }
    await signPhotos(mySightings.map(r => r.photo_path).filter(Boolean));
    const vis = { private: "🔒 private", friends: "👥 friends", public: "🌎 public" };
    mySightings.slice(0, 60).forEach(r => {
      const sp = (spots || []).find(s => s.id === r.spot_id), row = el("div", "pf-row");
      if (r.photo_path && picUrl(r.photo_path)) { const im = document.createElement("img"); im.src = picUrl(r.photo_path); im.alt = "Photo of " + r.species; im.loading = "lazy"; im.style.cssText = "width:56px;height:56px;object-fit:cover;border-radius:8px;margin-right:10px;float:left"; row.appendChild(im); }
      row.appendChild(el("b", null, `${cap(r.species)}${r.how_many > 1 ? " ×" + r.how_many : ""}`));
      row.appendChild(el("span", "pf-sub", `${sp ? sp.name : "a spot"} · ${new Date(r.seen_at).toLocaleDateString([], { month: "short", day: "numeric" })} · ${vis[r.visibility] || r.visibility}`));
      const x = el("button", "linkbtn danger", "Delete"); x.type = "button"; x.addEventListener("click", () => sgDelete(r)); row.appendChild(x);
      pane.appendChild(row);
    });
  }
