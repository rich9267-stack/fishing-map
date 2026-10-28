  // ---- 🏪 Business pages (v238, setup/118): details, pin + Directions, Fishing near here, posts, photos, services, stats, place link, report ----
  // js/28 draws the page; it calls bpPageTop (what everyone sees), bpOwner (the owner's tools) and bpAdmin / bpAdminRow (admin screen).
  // Booking requests and reviews are built but the database keeps them OFF until the lawyer review (host_pages_list → extras_on).
  // No deals / discounts on purpose (Richard, Oct 28): reaching people who don't follow a page is kept for paid ads later.
  const BP_POST = { report: { icon: "🎣", label: "Fishing report" }, stock: { icon: "🦐", label: "Bait & stock" }, news: { icon: "📣", label: "News" } };
  const BP_REASONS = [["fake", "Not a real business / pretending to be someone"], ["spam", "Spam or ads"], ["wrong_info", "Wrong address, hours or phone"], ["rude", "Rude or harmful posts"], ["other", "Something else"]];
  const bpNice = e => (e && e.message) || String(e || "");
  const bpBiz = p => p.kind === "business";
  function bpAgo(iso) {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return m <= 1 ? "just now" : m + " min ago";
    if (m < 1440) return Math.round(m / 60) + " h ago";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function bpSection(id, title) {
    const box = el("div", "bp-sec"); box.id = id;
    if (title) box.appendChild(el("div", "label", title));
    return box;
  }
  function bpLink(text, href) { const a = el("a", null, text); a.href = href; a.target = "_blank"; a.rel = "noopener nofollow"; return a; }
  function bpShowOnMap(lat, lng) {
    const pg = $("hp-page"); if (pg) pg.hidden = true;
    if (typeof showView === "function") showView("map");
    if (typeof map !== "undefined" && map) map.setView([lat, lng], 15);
  }
  function bpMiles(aLat, aLng, bLat, bLng) {
    const r = Math.PI / 180, x = (bLng - aLng) * r * Math.cos((aLat + bLat) / 2 * r), y = (bLat - aLat) * r;
    return Math.sqrt(x * x + y * y) * 3959;
  }

  // ===== what everyone sees =====
  function bpPageTop(p, body, extrasOn) {
    if (p.paused && (p.is_mine || adminCan("pages"))) body.appendChild(el("div", "msg err", "⏸ The admin has paused this page: it can't post or send alerts for now."));
    if (bpBiz(p)) bpInfo(p, body);
    else if (p.lat != null) { const s = bpSection("bp-info"); bpPinButtons(p, s); body.appendChild(s); }
    if (bpBiz(p) && (p.photos || []).length) bpPhotos(p, body);
    if (bpBiz(p) && (p.services || []).length) bpServices(p, body);
    if (p.status !== "approved") return;
    bpPosts(p, body);
    if (p.lat != null) bpNear(p, body);
    if (bpBiz(p) && extrasOn) { bpReviews(p, body); if (!p.is_mine) bpBooking(p, body); }
    if (!p.is_mine) bpReport(p, body);
  }
  function bpInfo(p, body) {
    const s = bpSection("bp-info");
    const line = (icon, node) => { const d = el("div", "bp-line"); d.appendChild(el("span", "bp-ic", icon)); d.appendChild(typeof node === "string" ? el("span", null, node) : node); s.appendChild(d); };
    if (p.hours) line("🕒", p.hours);
    if (p.address) line("📍", p.address);
    if (p.phone) line("📞", bpLink(p.phone, "tel:" + p.phone.replace(/[^\d+]/g, "")));
    if (p.website) line("🌐", bpLink(p.website.replace(/^https?:\/\//i, ""), p.website));
    if (p.place) line("⚓", "Runs " + p.place.name);
    if (p.lat != null) bpPinButtons(p, s);
    if (s.childNodes.length) body.appendChild(s);
  }
  function bpPinButtons(p, s) {
    const row = el("div", "sugg-btns");
    const dir = el("a", "btn ghost small", "Directions ↗"); dir.id = "bp-dir";
    dir.href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`; dir.target = "_blank"; dir.rel = "noopener";
    const mp = el("button", "btn ghost small", "🗺 Show on map"); mp.type = "button"; mp.addEventListener("click", () => bpShowOnMap(p.lat, p.lng));
    row.appendChild(dir); row.appendChild(mp); s.appendChild(row);
  }
  function bpPhotos(p, body) {
    const s = bpSection("bp-photos"), strip = el("div", "bp-strip"); s.appendChild(strip); body.appendChild(s);
    p.photos.forEach(path => {
      const im = document.createElement("img"); im.alt = p.name + " photo"; im.className = "bp-photo"; strip.appendChild(im);
      avatarUrl(path, "host-avatars").then(u => { if (u) im.src = u; else im.remove(); });
    });
  }
  function bpServices(p, body) {
    const s = bpSection("bp-services", "What we offer");
    p.services.forEach(x => { const r = el("div", "bp-svc"); r.appendChild(el("span", null, x.name)); if (x.price) r.appendChild(el("b", null, x.price)); s.appendChild(r); });
    s.appendChild(el("div", "spot-meta", "Prices are set by the business. Nothing is paid in this app."));
    body.appendChild(s);
  }

  // ---- posts: fishing reports, bait in stock, news ----
  function bpPosts(p, body) {
    const s = bpSection("bp-posts", "📰 Posts"); body.appendChild(s);
    if (p.is_mine && !p.paused) bpComposer(p, s);
    const list = el("div"); list.appendChild(el("div", "spot-meta", "Loading…")); s.appendChild(list);
    const fill = async () => {
      const { data, error } = await db.rpc("host_page_posts_list", { p_page: p.id });
      if (!s.isConnected) return;
      list.innerHTML = "";
      if (error) { list.appendChild(el("div", "spot-meta", "Couldn't load posts right now.")); return; }
      if (!(data || []).length) { list.appendChild(el("div", "empty", p.is_mine ? "No posts yet. Share what's biting or what's in stock." : "No posts yet.")); return; }
      data.forEach(x => {
        const card = el("div", "bp-post" + (x.hidden ? " bp-hidden" : ""));
        const k = BP_POST[x.kind] || BP_POST.news;
        card.appendChild(el("div", "spot-meta", `${k.icon} ${k.label} · ${bpAgo(x.created_at)}` + (x.alerted ? " · 🔔 sent to followers" : "") + (x.hidden ? " · hidden by the admin" : "")));
        card.appendChild(el("div", "bp-post-t", x.body));
        const btns = el("div", "sugg-btns");
        if (p.is_mine) {
          const del = el("button", "linkbtn danger", "Delete"); del.type = "button";
          del.addEventListener("click", async () => {
            if (!await askOk("Delete this post?")) return;
            const { error: e } = await db.rpc("delete_host_page_post", { p_id: x.id });
            if (e) toast("Couldn't delete: " + bpNice(e), 5000); else fill();
          });
          btns.appendChild(del);
        }
        if (!p.is_mine && adminCan("pages")) {
          const hide = el("button", "linkbtn", x.hidden ? "Show again (admin)" : "Hide post (admin)"); hide.type = "button";
          hide.addEventListener("click", async () => {
            const { error: e } = await db.rpc("hide_host_page_post", { p_id: x.id, p_hide: !x.hidden });
            if (e) toast(bpNice(e), 5000); else fill();
          });
          btns.appendChild(hide);
        }
        if (btns.childNodes.length) card.appendChild(btns);
        list.appendChild(card);
      });
    };
    fill();
    s.bpRefresh = fill;
  }
  function bpComposer(p, s) {
    const box = el("div", "bp-compose");
    let kind = "report";
    const kinds = el("div", "bp-kinds");
    const drawKinds = () => {
      kinds.innerHTML = "";
      Object.keys(BP_POST).forEach(k => {
        const b = el("button", "bp-chip-btn" + (k === kind ? " on" : ""), BP_POST[k].icon + " " + BP_POST[k].label); b.type = "button";
        b.setAttribute("aria-pressed", String(k === kind)); b.addEventListener("click", () => { kind = k; drawKinds(); });
        kinds.appendChild(b);
      });
    };
    drawKinds();
    const ta = document.createElement("textarea"); ta.id = "bp-post-text"; ta.rows = 3; ta.maxLength = 500;
    ta.placeholder = "Share what's biting and what's in stock"; ta.setAttribute("aria-label", "Post text");
    const lab = document.createElement("label"); lab.className = "bp-alert";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "bp-post-alert"; cb.disabled = !p.verified;
    lab.appendChild(cb); lab.appendChild(document.createTextNode(" 🔔 Also send a phone alert to my followers"));
    const hint = el("div", "spot-meta", p.verified ? "1 alert a day. Up to 3 posts a day. Posts go to your followers and your page only." : "Phone alerts are for ✔ verified pages. Up to 3 posts a day.");
    const send = el("button", "btn small", "Post"); send.type = "button"; send.id = "bp-post-send";
    const msg = el("div", "msg");
    send.addEventListener("click", async () => {
      const t = ta.value.trim();
      if (!t) { msg.className = "msg err"; msg.textContent = "Write something first."; return; }
      send.disabled = true; msg.className = "msg"; msg.textContent = "Posting…";
      const { data, error } = await db.rpc("post_host_page", { p_page: p.id, p_kind: kind, p_body: t, p_alert: cb.checked });
      send.disabled = false;
      if (error) { msg.className = "msg err"; msg.textContent = bpNice(error); return; }
      ta.value = ""; cb.checked = false; msg.textContent = "";
      toast(data && data.note ? data.note : data && data.alerted ? `Posted ✓ — alert sent to ${data.alerted} follower${data.alerted === 1 ? "" : "s"}.` : "Posted ✓", 4500);
      if (s.bpRefresh) s.bpRefresh();
    });
    [kinds, ta, lab, hint, send, msg].forEach(n => box.appendChild(n));
    s.appendChild(box);
  }

  // ---- Fishing near here: official public ramps, piers and parks within ~10 miles of the pin ----
  async function bpNear(p, body) {
    const s = bpSection("bp-near", "🎣 Fishing near here"); body.appendChild(s);
    const list = el("div"); list.appendChild(el("div", "spot-meta", "Looking…")); s.appendChild(list);
    const d = 0.15, dl = d / Math.cos(p.lat * Math.PI / 180);
    const { data, error } = await db.from("official_spots").select("id,name,kind,lat,lng")
      .gte("lat", p.lat - d).lte("lat", p.lat + d).gte("lng", p.lng - dl).lte("lng", p.lng + dl).limit(300);
    if (!s.isConnected) return;
    list.innerHTML = "";
    if (error) { list.appendChild(el("div", "spot-meta", "Couldn't look right now.")); return; }
    const rows = (data || []).map(o => Object.assign(o, { mi: bpMiles(p.lat, p.lng, o.lat, o.lng) })).filter(o => o.mi <= 10).sort((a, b) => a.mi - b.mi).slice(0, 8);
    if (!rows.length) { list.appendChild(el("div", "empty", "No official public spots within 10 miles.")); return; }
    rows.forEach(o => {
      const r = el("button", "hp-row"); r.type = "button";
      const label = (typeof OFFICIAL_LABEL !== "undefined" && OFFICIAL_LABEL[o.kind]) || o.kind;
      r.setAttribute("aria-label", `${o.name}, ${label}, ${o.mi.toFixed(1)} miles, show on map`);
      const t = el("div", "hp-row-t"); t.appendChild(el("b", null, o.name || "Public spot")); t.appendChild(el("div", "spot-meta", `${label} · ${o.mi.toFixed(1)} mi`));
      r.appendChild(t); r.addEventListener("click", () => bpShowOnMap(o.lat, o.lng));
      list.appendChild(r);
    });
    s.appendChild(el("div", "spot-meta", "Official public places only. Check the rules before you fish."));
  }

  // ---- report a page ----
  function bpReport(p, body) {
    const s = bpSection("bp-report");
    const open = el("button", "linkbtn", "⚑ Report this page"); open.type = "button"; open.id = "bp-report-open";
    const form = el("div"); form.hidden = true;
    const sel = document.createElement("select"); sel.id = "bp-report-why"; sel.setAttribute("aria-label", "Why are you reporting this page?");
    BP_REASONS.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); });
    const det = document.createElement("textarea"); det.rows = 2; det.maxLength = 300; det.placeholder = "Anything the admin should know? (optional)"; det.setAttribute("aria-label", "Details");
    const send = el("button", "btn small", "Send report"); send.type = "button"; send.id = "bp-report-send";
    const msg = el("div", "msg");
    send.addEventListener("click", async () => {
      send.disabled = true;
      const { error } = await db.rpc("report_host_page", { p_page: p.id, p_reason: sel.value, p_details: det.value.trim() || null });
      send.disabled = false;
      if (error) { msg.className = "msg err"; msg.textContent = bpNice(error); return; }
      form.hidden = true; open.hidden = true; s.appendChild(el("div", "spot-meta", "Thanks — the admin will look at it."));
    });
    open.addEventListener("click", () => { form.hidden = !form.hidden; });
    [sel, det, send, msg].forEach(n => form.appendChild(n));
    s.appendChild(open); s.appendChild(form); body.appendChild(s);
  }

  // ---- reviews + booking requests (only drawn when the database switch is on) ----
  async function bpReviews(p, body) {
    const s = bpSection("bp-reviews", "⭐ Reviews"); body.appendChild(s);
    const { data, error } = await db.rpc("host_page_reviews_list", { p_page: p.id });
    if (!s.isConnected) return;
    if (error || !data) { s.appendChild(el("div", "spot-meta", "Couldn't load reviews.")); return; }
    s.appendChild(el("div", "spot-meta", data.n ? `${data.avg} ★ from ${data.n} review${data.n === 1 ? "" : "s"}` : "No reviews yet."));
    (data.reviews || []).forEach(r => { const c = el("div", "bp-post"); c.appendChild(el("div", "spot-meta", "★".repeat(r.stars) + "☆".repeat(5 - r.stars) + " · " + (r.author_name || "a member"))); if (r.body) c.appendChild(el("div", "bp-post-t", r.body)); s.appendChild(c); });
    if (p.is_mine) return;
    if (data.mine && data.mine.status === "pending") s.appendChild(el("div", "spot-meta", "Your review is waiting for the admin."));
    let stars = data.mine ? data.mine.stars : 5;
    const row = el("div", "bp-kinds");
    const drawStars = () => { row.innerHTML = ""; [1, 2, 3, 4, 5].forEach(n => { const b = el("button", "bp-chip-btn" + (n <= stars ? " on" : ""), "★"); b.type = "button"; b.setAttribute("aria-label", n + " stars"); b.addEventListener("click", () => { stars = n; drawStars(); }); row.appendChild(b); }); };
    drawStars();
    const ta = document.createElement("textarea"); ta.rows = 2; ta.maxLength = 300; ta.value = data.mine && data.mine.body || ""; ta.placeholder = "Your review (optional)"; ta.setAttribute("aria-label", "Your review");
    const send = el("button", "btn small", data.mine ? "Update my review" : "Send review"); send.type = "button";
    send.addEventListener("click", async () => {
      const { error: e } = await db.rpc("review_host_page_write", { p_page: p.id, p_stars: stars, p_body: ta.value.trim() || null });
      if (e) toast(bpNice(e), 5000); else toast("Thanks ✓ — the admin checks every review before it shows.", 5000);
    });
    [row, ta, send, el("div", "spot-meta", "Be fair and stick to your own visit. The admin checks every review.")].forEach(n => s.appendChild(n));
  }
  async function bpBooking(p, body) {
    const s = bpSection("bp-book", "📅 Ask for a trip"); body.appendChild(s);
    const { data } = await db.rpc("host_page_bookings_list", { p_page: p.id });
    (data || []).forEach(b => s.appendChild(el("div", "spot-meta", `${b.trip_date} · ${b.party} people · ` + ({ new: "⏳ waiting", yes: "✅ yes", no: "❌ no" }[b.status] || b.status) + (b.reply ? " — “" + b.reply + "”" : ""))));
    const d = document.createElement("input"); d.type = "date"; d.setAttribute("aria-label", "Trip day");
    const n = document.createElement("input"); n.type = "number"; n.min = 1; n.max = 20; n.value = 2; n.setAttribute("aria-label", "How many people");
    const note = document.createElement("textarea"); note.rows = 2; note.maxLength = 300; note.placeholder = "What would you like to fish for? (optional)"; note.setAttribute("aria-label", "Note");
    const send = el("button", "btn small", "Send request"); send.type = "button";
    send.addEventListener("click", async () => {
      const { error } = await db.rpc("request_host_page_booking", { p_page: p.id, p_date: d.value || null, p_party: +n.value || 0, p_note: note.value.trim() || null });
      if (error) toast(bpNice(error), 5000); else toast("Request sent ✓ — the business answers in the app. Nothing is paid here.", 5000);
    });
    [d, n, note, send, el("div", "spot-meta", "This only asks. Prices and payment are between you and the business.")].forEach(x => s.appendChild(x));
  }

  // ===== the owner's tools =====
  function bpOwner(p, body, reload, extrasOn) {
    if (p.status === "approved") bpStats(p, body);
    bpEditDetails(p, body, reload);
    if (bpBiz(p) && p.status === "approved") bpClaim(p, body, reload);
    if (bpBiz(p) && p.status === "approved") {
      if (extrasOn) bpBookingsInbox(p, body);
      else body.appendChild(el("div", "spot-meta bp-soon", "🔒 Coming later: trip booking requests and reviews (after the app's legal check)."));
    }
  }
  async function bpStats(p, body) {
    const s = bpSection("bp-stats", "📊 Your page"); body.appendChild(s);
    const { data, error } = await db.rpc("host_page_stats", { p_page: p.id });
    if (!s.isConnected || error || !data) return;
    const grid = el("div", "bp-stats");
    [["Followers", data.followers], ["New this week", data.new_7], ["New in 30 days", data.new_30], ["Posts in 30 days", data.posts_30], ["Alerts in 30 days", data.alerts_30]]
      .forEach(([k, v]) => { const c = el("div", "bp-stat"); c.appendChild(el("b", null, String(v))); c.appendChild(el("span", null, k)); grid.appendChild(c); });
    s.appendChild(grid);
    s.appendChild(el("div", "spot-meta", "We don't count page visits — only followers and posts."));
  }
  function bpEditDetails(p, body, reload) {
    const s = bpSection("bp-edit", bpBiz(p) ? "🏪 Business details" : "📍 Where you meet"); body.appendChild(s);
    const inp = (id, val, ph, max, type) => { const i = document.createElement("input"); i.id = id; i.value = val || ""; i.placeholder = ph; i.maxLength = max; i.type = type || "text"; i.setAttribute("aria-label", ph); i.style.marginTop = "8px"; return i; };
    const hours = inp("bp-hours", p.hours, "Hours, e.g. Mon–Sat 5am–6pm", 200), addr = inp("bp-address", p.address, "Street address", 120),
      phone = inp("bp-phone", p.phone, "Phone", 30, "tel"), web = inp("bp-website", p.website, "Website (optional)", 120, "url");
    if (bpBiz(p)) [hours, addr, phone, web].forEach(i => s.appendChild(i));
    // services & prices (text only)
    let svc = (p.services || []).map(x => ({ name: x.name, price: x.price || "" }));
    const svcBox = el("div");
    const drawSvc = () => {
      svcBox.innerHTML = ""; svcBox.appendChild(el("div", "spot-meta", "Services & prices (up to 12, shown as text — nobody pays in the app):"));
      svc.forEach((x, i) => {
        const r = el("div", "bp-svc-edit");
        const n = document.createElement("input"); n.value = x.name; n.maxLength = 60; n.placeholder = "e.g. Half-day charter"; n.setAttribute("aria-label", "Service " + (i + 1)); n.addEventListener("input", () => { x.name = n.value; });
        const pr = document.createElement("input"); pr.value = x.price; pr.maxLength = 30; pr.placeholder = "$450"; pr.setAttribute("aria-label", "Price " + (i + 1)); pr.addEventListener("input", () => { x.price = pr.value; });
        const rm = el("button", "linkbtn danger", "✕"); rm.type = "button"; rm.setAttribute("aria-label", "Remove service " + (i + 1)); rm.addEventListener("click", () => { svc.splice(i, 1); drawSvc(); });
        [n, pr, rm].forEach(q => r.appendChild(q)); svcBox.appendChild(r);
      });
      if (svc.length < 12) { const add = el("button", "linkbtn", "+ Add a service"); add.type = "button"; add.id = "bp-svc-add"; add.addEventListener("click", () => { svc.push({ name: "", price: "" }); drawSvc(); }); svcBox.appendChild(add); }
    };
    if (bpBiz(p)) { drawSvc(); s.appendChild(svcBox); }
    // map pin: a small map with a marker you drag, or "use where I am"
    let pin = p.lat != null ? [p.lat, p.lng] : null;
    s.appendChild(el("div", "spot-meta", "Map pin — drag it to your door, or stand there and tap “Use where I am”:"));
    const mapBox = el("div", "bp-pinmap"); mapBox.id = "bp-pinmap"; s.appendChild(mapBox);
    const pinMsg = el("div", "spot-meta", pin ? "" : "No pin yet."); s.appendChild(pinMsg);
    const pinBtns = el("div", "sugg-btns");
    const here = el("button", "btn ghost small", "📍 Use where I am"); here.type = "button"; here.id = "bp-pin-here";
    const clr = el("button", "linkbtn", "Remove pin"); clr.type = "button";
    pinBtns.appendChild(here); pinBtns.appendChild(clr); s.appendChild(pinBtns);
    let mini = null, mk = null;
    const setPin = ll => {
      pin = ll; pinMsg.textContent = ll ? "" : "No pin yet — it will be removed when you save.";
      if (!mini) return;
      if (!ll) { if (mk) { mini.removeLayer(mk); mk = null; } return; }
      if (!mk) { mk = L.marker(ll, { draggable: true, keyboard: true, title: "Page pin" }).addTo(mini); mk.on("dragend", () => { const g = mk.getLatLng(); pin = [g.lat, g.lng]; }); }
      else mk.setLatLng(ll);
      mini.setView(ll, Math.max(mini.getZoom(), 15));
    };
    if (typeof L !== "undefined") {
      setTimeout(() => {
        if (!mapBox.isConnected) return;
        const c = pin || (typeof map !== "undefined" && map ? [map.getCenter().lat, map.getCenter().lng] : [26.23, -80.1]);
        mini = L.map(mapBox, { zoomControl: true, attributionControl: true }).setView(c, pin ? 16 : 12);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mini);
        mini.on("click", e => setPin([e.latlng.lat, e.latlng.lng]));
        if (pin) setPin(pin);
      }, 0);
    }
    here.addEventListener("click", () => {
      if (!navigator.geolocation) { toast("This phone can't share its location.", 4000); return; }
      here.disabled = true;
      navigator.geolocation.getCurrentPosition(g => { here.disabled = false; setPin([g.coords.latitude, g.coords.longitude]); },
        () => { here.disabled = false; toast("Couldn't get your location. Drag the pin instead.", 4500); }, { enableHighAccuracy: true, timeout: 15000 });
    });
    clr.addEventListener("click", () => setPin(null));
    // photos (business): up to 4
    let photos = (p.photos || []).slice(); const added = [];
    const phBox = el("div");
    const drawPh = () => {
      phBox.innerHTML = ""; phBox.appendChild(el("div", "spot-meta", `Photos (${photos.length} of 4): shop front, boat, catch board…`));
      const strip = el("div", "bp-strip");
      photos.forEach((path, i) => {
        const w = el("div", "bp-ph-edit"); const im = document.createElement("img"); im.alt = "Photo " + (i + 1); im.className = "bp-photo";
        const local = added.find(a => a.path === path);
        if (local) im.src = local.url; else avatarUrl(path, "host-avatars").then(u => { if (u) im.src = u; });
        const rm = el("button", "linkbtn danger", "Remove"); rm.type = "button"; rm.addEventListener("click", () => { photos.splice(i, 1); drawPh(); });
        w.appendChild(im); w.appendChild(rm); strip.appendChild(w);
      });
      phBox.appendChild(strip);
      if (photos.length < 4) {
        const f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.id = "bp-photo-pick"; f.setAttribute("aria-label", "Add a photo");
        f.addEventListener("change", async () => {
          const file = f.files && f.files[0]; if (!file) return;
          try {
            const blob = await compressImage(file, 1200, 0.78);
            if (blob.size > 1048576) { toast("That photo is too big even after shrinking. Try another.", 5000); return; }
            const path = `${p.id}/${newId()}.jpg`;
            const { error } = await db.storage.from("host-avatars").upload(path, blob, { contentType: "image/jpeg" });
            if (error) throw error;
            added.push({ path, url: URL.createObjectURL(blob) }); photos.push(path); drawPh();
          } catch (e) { toast("Couldn't add the photo: " + bpNice(e), 5000); }
        });
        phBox.appendChild(f);
      }
    };
    if (bpBiz(p)) { drawPh(); s.appendChild(phBox); }
    const save = el("button", "btn small", "Save details"); save.type = "button"; save.id = "bp-save";
    const msg = el("div", "msg");
    save.addEventListener("click", async () => {
      save.disabled = true; msg.className = "msg"; msg.textContent = "Saving…";
      try {
        const { error } = await db.rpc("update_host_page_details", { p_id: p.id, p_hours: hours.value.trim() || null, p_address: addr.value.trim() || null,
          p_phone: phone.value.trim() || null, p_website: web.value.trim() || null, p_lat: pin ? pin[0] : null, p_lng: pin ? pin[1] : null,
          p_services: svc.filter(x => x.name.trim()).map(x => ({ name: x.name.trim(), price: x.price.trim() || null })) });
        if (error) throw error;
        if (bpBiz(p)) {
          const before = p.photos || [];
          const { error: e2 } = await db.rpc("update_host_page_photos", { p_id: p.id, p_paths: photos });
          if (e2) throw e2;
          const gone = before.filter(x => !photos.includes(x)); if (gone.length) db.storage.from("host-avatars").remove(gone);
        }
        toast("Saved ✓"); await reload();
      } catch (e) { msg.className = "msg err"; msg.textContent = "Couldn't save: " + bpNice(e); save.disabled = false; }
    });
    s.appendChild(save); s.appendChild(msg);
  }
  // link my business to an official place on the map (ramp, pier, park) — the admin approves
  function bpClaim(p, body, reload) {
    const s = bpSection("bp-claim", "⚓ Your place on the map"); body.appendChild(s);
    if (p.place) {
      s.appendChild(el("div", "spot-meta", "Linked to " + p.place.name + ". Its map card shows your page."));
      const un = el("button", "linkbtn", "Unlink this place"); un.type = "button";
      un.addEventListener("click", async () => { if (!await askOk("Unlink " + p.place.name + " from your page?")) return; const { error } = await db.rpc("unlink_host_page_place", { p_page: p.id }); if (error) toast(bpNice(error), 5000); else reload(); });
      s.appendChild(un); return;
    }
    if (p.claim_waiting) {
      s.appendChild(el("div", "msg", "⏳ Waiting for the admin: link to " + p.claim_waiting.name + "."));
      const c = el("button", "linkbtn", "Cancel this request"); c.type = "button";
      c.addEventListener("click", async () => { const { error } = await db.rpc("cancel_host_page_claim", { p_page: p.id }); if (error) toast(bpNice(error), 5000); else reload(); });
      s.appendChild(c); return;
    }
    if (p.lat == null) { s.appendChild(el("div", "spot-meta", "Do you run a marina or ramp that's on our map? Save a map pin first, then pick it here.")); return; }
    const go = el("button", "btn ghost small", "Find places near my pin"); go.type = "button"; go.id = "bp-claim-find";
    const list = el("div");
    go.addEventListener("click", async () => {
      go.disabled = true; list.innerHTML = "";
      const d = 0.01, dl = d / Math.cos(p.lat * Math.PI / 180);
      const { data, error } = await db.from("official_spots").select("id,name,kind,lat,lng").gte("lat", p.lat - d).lte("lat", p.lat + d).gte("lng", p.lng - dl).lte("lng", p.lng + dl).limit(20);
      go.disabled = false;
      if (error) { list.appendChild(el("div", "spot-meta", "Couldn't look right now.")); return; }
      if (!(data || []).length) { list.appendChild(el("div", "empty", "No official places within about half a mile of your pin.")); return; }
      data.forEach(o => {
        const r = el("button", "hp-row"); r.type = "button";
        const t = el("div", "hp-row-t"); t.appendChild(el("b", null, o.name)); t.appendChild(el("div", "spot-meta", ((typeof OFFICIAL_LABEL !== "undefined" && OFFICIAL_LABEL[o.kind]) || o.kind) + " · " + bpMiles(p.lat, p.lng, o.lat, o.lng).toFixed(2) + " mi"));
        r.appendChild(t);
        r.addEventListener("click", async () => {
          if (!await askOk("Ask the admin to link " + o.name + " to your page? Only do this if your business runs it.")) return;
          const { error: e } = await db.rpc("request_host_page_claim", { p_page: p.id, p_spot: o.id, p_note: null });
          if (e) toast(bpNice(e), 5000); else { toast("Request sent ✓", 4000); reload(); }
        });
        list.appendChild(r);
      });
    });
    s.appendChild(el("div", "spot-meta", "Run a marina or ramp that's on our map? Link it so its card shows your page."));
    s.appendChild(go); s.appendChild(list);
  }
  async function bpBookingsInbox(p, body) {
    const s = bpSection("bp-inbox", "📅 Trip requests"); body.appendChild(s);
    const { data, error } = await db.rpc("host_page_bookings_list", { p_page: p.id });
    if (!s.isConnected) return;
    if (error || !(data || []).length) { s.appendChild(el("div", "empty", "No requests yet.")); return; }
    data.forEach(b => {
      const c = el("div", "bp-post");
      c.appendChild(el("b", null, `${b.trip_date} · ${b.party} people · ${b.member_name || b.member_handle || "a member"}`));
      if (b.note) c.appendChild(el("div", "bp-post-t", b.note));
      if (b.status !== "new") { c.appendChild(el("div", "spot-meta", (b.status === "yes" ? "✅ You said yes" : "❌ You said no") + (b.reply ? " — “" + b.reply + "”" : ""))); s.appendChild(c); return; }
      const rep = document.createElement("input"); rep.maxLength = 300; rep.placeholder = "Short reply (optional)"; rep.setAttribute("aria-label", "Reply");
      const btns = el("div", "sugg-btns");
      [[true, "Yes, I can"], [false, "Sorry, no"]].forEach(([yes, t]) => {
        const b2 = el("button", yes ? "btn small" : "linkbtn danger", t); b2.type = "button";
        b2.addEventListener("click", async () => { const { error: e } = await db.rpc("answer_host_page_booking", { p_id: b.id, p_yes: yes, p_reply: rep.value.trim() || null }); if (e) toast(bpNice(e), 5000); else { s.remove(); bpBookingsInbox(p, body); } });
        btns.appendChild(b2);
      });
      c.appendChild(rep); c.appendChild(btns); s.appendChild(c);
    });
  }

  // ===== admin (the 📄 Pages part of the admin screen) =====
  // extra buttons on each live page row: ✔ verify (after phoning the listed number) and ⏸ pause
  function bpAdminRow(r, row, btns, refresh) {
    const facts = [r.phone && "📞 " + r.phone, r.address && "📍 " + r.address, r.website && "🌐 " + r.website].filter(Boolean).join(" · ");
    if (facts) row.appendChild(el("div", "spot-meta", facts));
    const flags = [r.verified && "✔ verified", r.paused && "⏸ paused", r.open_reports && `⚑ ${r.open_reports} report${r.open_reports === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
    if (flags) row.appendChild(el("div", "spot-meta", flags));
    if (r.status !== "approved") return;
    const v = el("button", "btn small", r.verified ? "Remove ✔" : "✔ Verify"); v.type = "button";
    v.addEventListener("click", async () => {
      if (!r.verified && !await askOk("Verify \"" + r.name + "\"? Only after you phoned the number the business lists" + (r.phone ? " (" + r.phone + ")" : "") + " and they confirmed they made this page.")) return;
      const { error } = await db.rpc("set_host_page_verified", { p_id: r.id, p_on: !r.verified }); if (error) toast(bpNice(error), 5000); else refresh();
    });
    const pz = el("button", "linkbtn", r.paused ? "▶ Unpause" : "⏸ Pause"); pz.type = "button";
    pz.addEventListener("click", async () => {
      if (!r.paused && !await askOk("Pause \"" + r.name + "\"? It stays visible but can't post or send alerts until you unpause it.")) return;
      const { error } = await db.rpc("set_host_page_paused", { p_id: r.id, p_on: !r.paused }); if (error) toast(bpNice(error), 5000); else refresh();
    });
    btns.insertBefore(pz, btns.firstChild); btns.insertBefore(v, btns.firstChild);
  }
  // reports, place links and reviews waiting for the admin; returns how many things wait
  async function bpAdmin(box, refresh) {
    const call = async fn => { try { const q = await db.rpc(fn); return q && !q.error && Array.isArray(q.data) ? q.data : []; } catch (e) { return []; } };
    const [reps, claims, revs] = await Promise.all([call("host_page_reports_admin"), call("host_page_claims_admin"), call("host_page_reviews_admin")]);
    const act = (label, fn, args, cls) => { const b = el("button", cls || "btn small", label); b.type = "button"; b.addEventListener("click", async () => { const { error } = await db.rpc(fn, args); if (error) toast(bpNice(error), 5000); else refresh(); }); return b; };
    const open = id => { const b = el("button", "linkbtn", "Open the page"); b.type = "button"; b.addEventListener("click", () => window.openHostPages(id)); return b; };
    if (reps.length) {
      box.appendChild(el("div", "label", `⚑ Page reports (${reps.length})`));
      reps.forEach(r => {
        const row = el("div", "hp-admin-row");
        row.appendChild(el("b", null, r.page_name));
        row.appendChild(el("div", "spot-meta", (BP_REASONS.find(x => x[0] === r.reason) || [, r.reason])[1] + " · from " + (r.reporter_name || r.reporter_handle || "a member") + " · " + bpAgo(r.created_at)));
        if (r.details) row.appendChild(el("div", "spot-meta", "“" + r.details + "”"));
        const btns = el("div", "sugg-btns"); btns.appendChild(act("Done", "resolve_host_page_report", { p_id: r.id })); btns.appendChild(open(r.page_id));
        row.appendChild(btns); box.appendChild(row);
      });
    }
    if (claims.length) {
      box.appendChild(el("div", "label", `⚓ Place link requests (${claims.length})`));
      claims.forEach(c => {
        const row = el("div", "hp-admin-row");
        row.appendChild(el("b", null, c.page_name + " → " + c.spot_name));
        row.appendChild(el("div", "spot-meta", [c.spot_kind, c.spot_county, c.page_address && "page address: " + c.page_address].filter(Boolean).join(" · ")));
        if (c.note) row.appendChild(el("div", "spot-meta", "“" + c.note + "”"));
        const btns = el("div", "sugg-btns"); btns.appendChild(act("Approve", "review_host_page_claim", { p_id: c.id, p_approve: true })); btns.appendChild(act("Decline", "review_host_page_claim", { p_id: c.id, p_approve: false }, "linkbtn danger"));
        row.appendChild(btns); box.appendChild(row);
      });
    }
    if (revs.length) {
      box.appendChild(el("div", "label", `⭐ Reviews waiting (${revs.length})`));
      revs.forEach(v => {
        const row = el("div", "hp-admin-row");
        row.appendChild(el("b", null, v.page_name + " · " + "★".repeat(v.stars)));
        row.appendChild(el("div", "spot-meta", (v.body ? "“" + v.body + "” · " : "") + "by " + (v.author_name || "a member")));
        const btns = el("div", "sugg-btns"); btns.appendChild(act("Show it", "decide_host_page_review", { p_id: v.id, p_show: true })); btns.appendChild(act("Don't show", "decide_host_page_review", { p_id: v.id, p_show: false }, "linkbtn danger"));
        row.appendChild(btns); box.appendChild(row);
      });
    }
    return reps.length + claims.length + revs.length;
  }

  // the official place card asks whether a business runs it (setup/118 host_page_for_spot)
  function bpPlaceLine(o, box) {
    if (!db || !me || o.id == null || o.source === "osm") return;
    db.rpc("host_page_for_spot", { p_spot: o.id }).then(r => {
      const d = r && !r.error && r.data; if (!d || !d.id || !box.isConnected) return;
      const b = el("button", "linkbtn", "🏪 Run by " + d.name + (d.verified ? " ✔" : "")); b.type = "button";
      b.addEventListener("click", () => { if (typeof map !== "undefined" && map) map.closePopup(); window.openHostPages(d.id); });
      box.appendChild(b);
    }, () => {});
  }
