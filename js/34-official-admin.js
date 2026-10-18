  // ---- ⭐ Admin: make one of the app's Public spots an official place (setup/69) ----
  // Shown at the bottom of "Edit spot" for admins only. The official row sits at the spot's exact position, so Quick catch
  // names new spots after it, Find new water lists it as ✅ Official and strangers get its real place + Directions (setup/68).
  // Only Public spots can be made official (the database refuses the others too).
  const OFF_KIND_NAMES = { park: "🌳 Park", pier: "🎣 Pier", jetty: "🪨 Jetty", ramp: "🚤 Boat ramp", bridge: "🌉 Bridge", dock: "⚓ Dock" };
  function offGuessKind(s) {
    const n = (s.name || "").toLowerCase();
    if (/ramp|launch/.test(n)) return "ramp";
    if (/pier|catwalk/.test(n)) return "pier";
    if (/jetty|inlet/.test(n)) return "jetty";
    if (/bridge|causeway/.test(n)) return "bridge";
    if (/park|beach|preserve|greenway/.test(n)) return "park";
    return OFF_KIND_NAMES[s.spot_type] ? s.spot_type : "park";
  }
  const offFor = s => (officialSpots || []).find(o => o.source === "admin" && String(o.source_id) === String(s.id));
  async function offRefresh(s) {   // forget this phone's copy of the spot's area so the change shows right away
    delete officialCells[officialCellKey(s.lat, s.lng)];
    officialRebuild();
    await loadOfficialSpots({ lat: s.lat, lng: s.lng }, 0.01, 0.01);
  }
  function offAdminRender(s) {
    const box = $("off-admin"); if (!box) return;
    box.innerHTML = "";
    box.hidden = !(s && me && adminCan("official_places") && s.id && isFinite(s.lat) && isFinite(s.lng));
    if (box.hidden) return;
    box.appendChild(el("div", "off-admin-title", "⭐ Official place (admin only)"));
    if (s.visibility !== "public") {
      box.appendChild(el("div", "spot-meta", "Only Public spots can be made official. Set “Who can see it” to Public and save first."));
      return;
    }
    const cur = offFor(s);
    box.appendChild(el("div", "spot-meta", cur
      ? "✅ This is an official place. Everyone sees it as ✅ Official, Quick catch uses its name, and strangers get its real location with Directions."
      : "Make this a ✅ Official place for everyone: Quick catch will use its name, Find new water lists it, and strangers see its real location with Directions (not a blurred pin)."));
    const row = el("div", "row");
    const sel = el("select"); sel.id = "off-kind"; sel.setAttribute("aria-label", "Kind of place");
    Object.keys(OFF_KIND_NAMES).forEach(k => { const o = el("option", "", OFF_KIND_NAMES[k]); o.value = k; sel.appendChild(o); });
    sel.value = cur ? cur.kind : offGuessKind(s);
    const go = el("button", "btn small", cur ? "Save kind" : "⭐ Make official"); go.type = "button"; go.id = "off-go";
    row.appendChild(sel); row.appendChild(go);
    box.appendChild(row);
    const msg = el("div", "msg"); msg.id = "off-msg"; box.appendChild(msg);
    go.addEventListener("click", async () => {
      go.disabled = true; msg.textContent = "Saving…";
      const { error } = await db.rpc("admin_official_set", { p_spot: s.id, p_kind: sel.value });
      if (error) { go.disabled = false; msg.textContent = "Couldn't save: " + (error.message || error); return; }
      await offRefresh(s);
      toast("✅ " + s.name + " is now an official place");
      offAdminRender(s);
    });
    if (cur) {
      const rm = el("button", "btn ghost small danger", "Remove from official"); rm.type = "button"; rm.id = "off-rm";
      rm.style.marginTop = "8px";
      box.appendChild(rm);
      rm.addEventListener("click", async () => {
        if (!(await askOk("Remove " + s.name + " from the official places? The spot itself stays."))) return;
        rm.disabled = true; msg.textContent = "Saving…";
        const { error } = await db.rpc("admin_official_unset", { p_spot: s.id });
        if (error) { rm.disabled = false; msg.textContent = "Couldn't save: " + (error.message || error); return; }
        await offRefresh(s);
        toast(s.name + " is no longer official");
        offAdminRender(s);
      });
    }
    if (!(officialSpots || []).some(o => miles(o.lat, o.lng, s.lat, s.lng) < 0.05) && !offAdminRender.asked) {
      offAdminRender.asked = true;   // make sure this area's official places are known, then draw again once
      officialEnsure({ lat: s.lat, lng: s.lng }).then(n => { offAdminRender.asked = false; if (n && editingSpot && editingSpot.id === s.id) offAdminRender(s); });
    }
  }
