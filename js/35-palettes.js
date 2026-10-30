  // ---- 🎨 Free color palettes (v112, setup/70) ----
  // Me → Look → Colors. 16 free palettes + "Original". Only colors change (css/app.css sets the variables for <html data-pal="key">).
  // The choice is kept on this phone (fm-palette, put on early by js/01) AND in your private row in app_prefs, so it follows you to every device.
  // Paid artist style packs (Cowboy, Southern, Florida, Northeast, Midwest) are NOT shown yet.
  const PALETTES = {"deepsea": {"name": "Deep Sea", "sw": ["#0F3B5A", "#13507A", "#1B998B", "#E3EEF4"]}, "bluefin": {"name": "Bluefin", "sw": ["#1A4FB0", "#1F5FD1", "#F2C14E", "#E3ECFB"]}, "seagrass": {"name": "Seagrass", "sw": ["#0F5E56", "#127369", "#7CB518", "#DFF2EE"]}, "mangrove": {"name": "Mangrove", "sw": ["#244F33", "#2E6B3F", "#8A9A2B", "#E4EEE2"]}, "basslake": {"name": "Bass Lake", "sw": ["#3F4F1F", "#4F6228", "#B5651D", "#ECEFDF"]}, "mahi": {"name": "Mahi", "sw": ["#16613A", "#1D7A4A", "#E3B505", "#E2F1E7"]}, "sunrise": {"name": "Sunrise", "sw": ["#C2531A", "#B44A12", "#E9A23B", "#FBEBDD"]}, "redfish": {"name": "Redfish", "sw": ["#7E2F17", "#9C3D1F", "#D9822B", "#F6E6DC"]}, "snapper": {"name": "Snapper Red", "sw": ["#A81F25", "#C0262D", "#F2A541", "#FBE4E4"]}, "reef": {"name": "Coral Reef", "sw": ["#9E2F4E", "#B23A5B", "#2BA3A0", "#F8E5EA"]}, "dusk": {"name": "Dusk Bite", "sw": ["#4A3275", "#5B3E8C", "#E07A5F", "#ECE6F5"]}, "sandbar": {"name": "Sandbar", "sw": ["#8C6A3A", "#7A5A2E", "#3E8E9E", "#F1E9DB"]}, "tarpon": {"name": "Tarpon Silver", "sw": ["#4A5966", "#3C4C5A", "#5E8CA8", "#E7EBEE"]}, "storm": {"name": "Storm Front", "sw": ["#2E3440", "#2E3440", "#E6C229", "#E6E8EC"]}, "nightbite": {"name": "Night Bite", "sw": ["#0B1014", "#182027", "#4FD1C5", "#F2B84B"], "dark": true}, "midnight": {"name": "Midnight Tide", "sw": ["#081020", "#131D33", "#7FB2FF", "#FF9F6B"], "dark": true}};
  const PAL_ORDER = ["deepsea", "bluefin", "seagrass", "mangrove", "basslake", "mahi", "sunrise", "redfish", "snapper", "reef", "dusk", "sandbar", "tarpon", "storm", "nightbite", "midnight"];
  const PAL_ORIGINAL = { name: "Original", sw: ["#0d1a1f", "#0b7079", "#4fc3cc", "#f4f7f8"] };
  let palNow = "original";
  try { const k = localStorage.getItem("fm-palette"); if (k && PALETTES[k]) palNow = k; } catch (e) { /* default */ }

  function palApply(k) {
    if (!PALETTES[k]) k = "original";
    palNow = k;
    const r = document.documentElement;
    if (k === "original") { delete r.dataset.pal; delete r.dataset.palDark; }
    else { r.dataset.pal = k; if (PALETTES[k].dark) r.dataset.palDark = "1"; else delete r.dataset.palDark; }
    try { localStorage.setItem("fm-palette", k); } catch (e) { /* this phone only forgets */ }
    const nm = $("me-pal-name"); if (nm) nm.textContent = (PALETTES[k] || PAL_ORIGINAL).name;
    palDraw();
  }
  function palDraw() {
    const g = $("pal-grid"); if (!g) return;
    g.innerHTML = "";
    ["original"].concat(PAL_ORDER).forEach(k => {
      const p = PALETTES[k] || PAL_ORIGINAL;
      const b = document.createElement("button");
      b.type = "button"; b.className = "pal-it"; b.dataset.pal = k;
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", k === palNow ? "true" : "false");
      b.tabIndex = k === palNow ? 0 : -1;
      const sw = document.createElement("span"); sw.className = "pal-sw"; sw.setAttribute("aria-hidden", "true");
      p.sw.forEach(c => { const i = document.createElement("i"); i.style.background = c; sw.appendChild(i); });
      const nm = document.createElement("span"); nm.className = "pal-nm"; nm.textContent = p.name;
      if (p.dark) { const s = document.createElement("small"); s.textContent = "dark"; nm.appendChild(s); }
      if (k === palNow) { const s = document.createElement("small"); s.textContent = "✓ in use"; nm.appendChild(s); }
      b.append(sw, nm);
      g.appendChild(b);
    });
  }
  async function palSave(k) {
    const m = $("pal-msg");
    if (!db || !me) { if (m) m.textContent = "Saved on this phone."; return; }
    try {
      const { error } = await db.from("app_prefs").upsert({ user_id: me.id, palette: k, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      if (m) m.textContent = "Saved — your other phones and computers will use " + (PALETTES[k] || PAL_ORIGINAL).name + " too.";
    } catch (e) {
      if (m) m.textContent = "Saved on this phone. Couldn't reach your account right now; it will try again next time you pick.";
    }
  }
  async function palLoadMine() {
    if (!db || !me) return;
    try {
      const { data, error } = await bootTake("app_prefs", () => db.from("app_prefs").select("palette").eq("user_id", me.id).maybeSingle());
      if (error) throw error;
      if (data && data.palette && data.palette !== palNow) palApply(data.palette);
      else if (!data && palNow !== "original") palSave(palNow);   // first time on the account: keep what this phone already had
    } catch (e) { /* this phone's choice stays */ }
  }
  (function palStart() {
    const g = $("pal-grid"); if (!g) return;
    g.addEventListener("click", e => {
      const b = e.target.closest(".pal-it"); if (!b) return;
      const k = b.dataset.pal; if (k === palNow) return;
      palApply(k); palSave(k);
      const nb = g.querySelector('[data-pal="' + k + '"]'); if (nb) nb.focus({ preventScroll: true });
    });
    g.addEventListener("keydown", e => {   // arrow keys move between choices, like any radio group
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }; if (!(e.key in keys)) return;
      const all = [...g.querySelectorAll(".pal-it")]; const i = all.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); all[(i + keys[e.key] + all.length) % all.length].focus();
    });
    palApply(palNow);
  })();
