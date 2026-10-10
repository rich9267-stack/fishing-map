  // ---- Sign-in (Supabase Auth) and the invite list ----
  const SITE = location.origin + location.pathname;
  // Arriving from a password-reset email: show "choose a new password" first
  let authMode = /type=recovery/.test(location.hash) ? "newpw" : "signin", appStarted = false;

  function showAuth(mode) {
    authMode = mode;
    $("qc-fab").hidden = true;
    $("auth-card").hidden = false; $("app").hidden = true; $("userbar").hidden = true; $("not-member").hidden = true;
    const titles = { signin: "Sign in", signup: "Create an account", reset: "Reset your password", newpw: "Choose a new password", name: "One more thing" };
    const buttons = { signin: "Sign in", signup: "Create account", reset: "Send reset link", newpw: "Save new password", name: "Continue" };
    $("auth-title").textContent = titles[mode];
    $("auth-submit").textContent = buttons[mode];
    $("auth-help").textContent = {
      signin: "Sign in, or tap “Create an account” — new people ask for access and Richard approves them.",
      signup: "Create your account, then request access — Richard approves new people. Passwords need at least 8 characters.",
      reset: "We'll email you a link to set a new password.",
      newpw: "Type a new password (at least 8 characters).",
      name: "What should your friends see as your name on spots and catches?"
    }[mode];
    $("auth-email-row").hidden = mode === "newpw" || mode === "name";
    $("a-email").required = !$("auth-email-row").hidden;
    $("auth-pw-row").hidden = mode === "reset" || mode === "name";
    $("a-pw").required = !$("auth-pw-row").hidden;
    $("a-pw").autocomplete = mode === "signin" ? "current-password" : "new-password";
    $("a-pw-label").textContent = mode === "newpw" ? "New password" : "Password";
    $("auth-name-row").hidden = !(mode === "signup" || mode === "name");
    $("auth-links").hidden = mode === "newpw" || mode === "name";
    $("google-row").hidden = !(mode === "signin" || mode === "signup");
    document.querySelectorAll("#auth-links [data-mode]").forEach(b => { b.hidden = b.dataset.mode === mode || (mode !== "signin" && b.dataset.mode !== "signin"); });
    $("auth-msg").textContent = ""; $("auth-msg").className = "msg";
  }
  document.querySelectorAll("#auth-links [data-mode]").forEach(b => b.addEventListener("click", () => showAuth(b.dataset.mode)));

  // Google sign-in: Google sends the person back here, already signed in
  $("google-btn").addEventListener("click", async () => {
    if (!db) return authMsg("Couldn't reach the database — check your connection and refresh.", true);
    $("google-btn").disabled = true;
    const { error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: SITE, queryParams: { prompt: "select_account" } } });
    if (error) {
      $("google-btn").disabled = false;
      authMsg(/provider is not enabled|Unsupported provider/i.test(error.message) ? "Google sign-in isn't switched on yet — use email for now." : error.message, true);
    }
  });

  function authMsg(text, isErr) { $("auth-msg").className = "msg" + (isErr ? " err" : ""); $("auth-msg").textContent = text; }

  $("auth-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!db) return authMsg("Couldn't reach the database — check your connection and refresh.", true);
    const email = $("a-email").value.trim().toLowerCase(), pw = $("a-pw").value, name = $("a-name").value.trim();
    $("auth-submit").disabled = true;
    try {
      if (authMode === "signin") {
        const { error } = await db.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        await gate();
      } else if (authMode === "signup") {
        const { data, error } = await db.auth.signUp({ email, password: pw, options: { emailRedirectTo: SITE, data: { name } } });
        if (error) throw error;
        if (data.session) { await gate(); }
        else { showAuth("signin"); $("a-email").value = email; authMsg("Check your email and tap the confirmation link, then sign in here."); }
      } else if (authMode === "reset") {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: SITE });
        if (error) throw error;
        authMsg("If that email is on the list, a reset link is on its way. Check your inbox (and spam).");
      } else if (authMode === "newpw") {
        const { error } = await db.auth.updateUser({ password: pw });
        if (error) throw error;
        history.replaceState(null, "", SITE);
        authMode = "signin";
        await gate();
      } else if (authMode === "name") {
        if (!name) throw new Error("Please type a name.");
        const { error } = await db.rpc("set_my_name", { new_name: name });
        if (error) throw error;
        await gate();
      }
    } catch (err) {
      const m = String(err.message || err);
      authMsg(/Invalid login credentials/i.test(m) ? "Wrong email or password." :
              /Email not confirmed/i.test(m) ? "Please tap the confirmation link we emailed you first." :
              /rate limit/i.test(m) ? "Too many emails sent — wait a few minutes and try again." : m, true);
    } finally {
      $("auth-submit").disabled = false;
    }
  });

  async function gate() {
    if (!db) { showAuth("signin"); authMsg("Couldn't reach the database — check your connection and refresh.", true); return; }
    const { data: { session } } = await db.auth.getSession();
    if (!session) { me = null; showAuth("signin"); return; }
    if (authMode === "newpw") { showAuth("newpw"); return; } // finish choosing a new password first
    const email = (session.user.email || "").toLowerCase();
    let { data: member, error } = await db.from("members").select("email,display_name,is_admin,status").eq("email", email).maybeSingle();
    if (error && isNetErr(error)) {
      // No signal: trust the membership saved on this phone last time
      try { const saved = JSON.parse(localStorage.getItem("fm-member") || "null"); if (saved && saved.email === email && saved.status === "approved") { member = saved; error = null; setOffline(true); } } catch (e) {}
    } else if (member && member.status === "approved") { try { localStorage.setItem("fm-member", JSON.stringify(member)); } catch (e) {} }
    if (error || !member || member.status !== "approved") {
      $("auth-card").hidden = true; $("app").hidden = true; $("userbar").hidden = true; $("qc-fab").hidden = true;
      $("not-member").hidden = false;
      const st = error ? "error" : member ? member.status : "none";
      const md = session.user.user_metadata || {};
      $("nm-title").textContent = { none: "Request access", pending: "Request sent ✓", blocked: "Not approved", error: "Something went wrong" }[st] || "Request access";
      $("not-member-text").textContent = {
        none: `You're signed in as ${email}. Tap below and Richard will review your request.`,
        pending: `Thanks${member && member.display_name ? ", " + member.display_name : ""}! Richard will review your request. Come back later and tap “Check again”.`,
        blocked: "Your request wasn't approved. If you think that's a mistake, ask Richard directly.",
        error: "Couldn't check your access right now — check your connection and try again."
      }[st] || "";
      $("nm-form").hidden = st !== "none";
      $("nm-check").hidden = !(st === "pending" || st === "error");
      if (st === "none") $("nm-name").value = ($("nm-name").value || (md.name || md.full_name || "")).trim();
      return;
    }
    // First sign-in: save the name typed at sign-up, or ask for one
    if (!member.display_name) {
      const md = session.user.user_metadata || {};
      const typed = (md.name || md.full_name || "").trim();
      if (typed) { await db.rpc("set_my_name", { new_name: typed }); member.display_name = typed; }
      else { showAuth("name"); return; }
    }
    me = { id: session.user.id, email, name: member.display_name, isAdmin: !!member.is_admin };
    if (/access_token=|code=/.test(location.hash + location.search)) history.replaceState(null, "", SITE);
    $("auth-card").hidden = true; $("not-member").hidden = true;
    $("userbar").hidden = false; $("app").hidden = false; $("qc-fab").hidden = false; meAvatarRefresh();
    $("who").textContent = `Signed in as ${me.name}`;
    ensureProfile().then(maybeWelcome).then(wnCheck);
    $("invite-btn").hidden = !me.isAdmin;
    checkRequests();
    startChat();
    loadBlocks();
    safetyStart(); loadFollows(); loadRules(); loadHof(); inboxLoad(); loadTackle();
    setTimeout(() => { updatePendingBar(); flushQueue(); }, 1500);
    if (!appStarted) {
      appStarted = true;
      loadSpots();
    } else {
      loadSpots();
    }
    setTimeout(runPendingGo, 700);
  }

  async function signOut() {
    await db.auth.signOut();
    me = null; spots = null; catchesBySpot = {}; safetyStop();
    $("invite-card").hidden = true;
    showAuth("signin");
  }
  $("signout-btn").addEventListener("click", signOut);

  // ---- 🪪 Profile pages (setup/35): privacy, picture, accent, pinned catch and a hand-picked showcase ----
  const PP_ACCENTS = ["#1f7a3f", "#0b6e99", "#6a3fb5", "#c0392b", "#d4880f", "#0e8a7d", "#a8326d", "#444444"];
  const PP_MAX = 8;
  let ppMine = null, ppShow = [], ppColor = null, ppAvatarPath = null, ppAvatarBlob = null, ppAvatarClear = false;
  const avatarUrls = {};
  async function avatarUrl(path, bucket) {
    if (!path) return null;
    bucket = bucket || "avatars";
    if (avatarUrls[bucket + path]) return avatarUrls[bucket + path];
    try { const { data } = await db.storage.from(bucket).createSignedUrl(path, 3600); if (data && data.signedUrl) return (avatarUrls[bucket + path] = data.signedUrl); } catch (e) { /* initials instead */ }
    return null;
  }
  // a round picture, or the first letter of the name when there is none
  function avatarNode(url, name, size, ring) {
    const d = el("div"); d.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;flex:none;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--line);font-weight:700;font-size:${Math.round(size / 2.2)}px;${ring ? "border:3px solid " + ring : ""}`;
    if (url) { const im = document.createElement("img"); im.src = url; im.alt = ""; im.style.cssText = "width:100%;height:100%;object-fit:cover"; d.appendChild(im); }
    else d.textContent = ((name || "?").trim()[0] || "?").toUpperCase();
    return d;
  }
  // pick, drag and zoom a square crop (shown through a round window) — resolves a 320 px JPEG, or null if cancelled
  async function cropPicture(file) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
    const W = src.width, H = src.height, V = 260, base = V / Math.min(W, H);
    let zoom = 1, cx = W / 2, cy = H / 2;
    return await new Promise(resolve => {
      const ov = el("div"); ov.id = "crop-ov"; ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px";
      const box = el("div"); box.style.cssText = "background:var(--card);color:var(--text);border-radius:16px;padding:16px;max-width:340px;width:100%;text-align:center";
      box.appendChild(el("div", "label", "Crop your picture"));
      box.appendChild(el("div", "spot-meta", "Drag to move it, slide to zoom. The circle is what people will see."));
      const wrap = el("div"); wrap.style.cssText = `position:relative;width:${V}px;height:${V}px;margin:12px auto;touch-action:none;overflow:hidden;border-radius:8px`;
      const cv = document.createElement("canvas"); cv.width = cv.height = V; cv.style.cssText = "display:block;width:100%;height:100%";
      const mask = el("div"); mask.style.cssText = `position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 400px rgba(0,0,0,.55);border:2px solid #fff;pointer-events:none`;
      wrap.appendChild(cv); wrap.appendChild(mask); box.appendChild(wrap);
      const zr = document.createElement("input"); zr.type = "range"; zr.id = "crop-zoom"; zr.min = "1"; zr.max = "4"; zr.step = "0.01"; zr.value = "1"; zr.style.width = "100%"; zr.setAttribute("aria-label", "Zoom");
      box.appendChild(zr);
      const pv = document.createElement("canvas"); pv.width = pv.height = 64; pv.style.cssText = "width:64px;height:64px;border-radius:50%;margin:10px auto 0;display:block;border:1px solid var(--line)";
      box.appendChild(pv);
      const row = el("div"); row.style.cssText = "display:flex;gap:8px;justify-content:center;margin-top:12px";
      const ok = el("button", "btn small", "Use this picture"), no = el("button", "btn ghost small", "Cancel"); ok.type = no.type = "button"; ok.id = "crop-ok"; no.id = "crop-cancel";
      row.appendChild(ok); row.appendChild(no); box.appendChild(row); ov.appendChild(box); document.body.appendChild(ov);
      const rect = () => { const size = V / (base * zoom); cx = Math.min(Math.max(cx, size / 2), W - size / 2); cy = Math.min(Math.max(cy, size / 2), H - size / 2); return [cx - size / 2, cy - size / 2, size]; };
      const paint = (c, n) => { const [sx, sy, size] = rect(); const g = c.getContext("2d"); g.clearRect(0, 0, n, n); g.drawImage(src, sx, sy, size, size, 0, 0, n, n); };
      const draw = () => { paint(cv, V); paint(pv, 64); };
      let last = null;
      wrap.addEventListener("pointerdown", e => { last = [e.clientX, e.clientY]; try { wrap.setPointerCapture(e.pointerId); } catch (x) {} });
      wrap.addEventListener("pointermove", e => { if (!last) return; cx -= (e.clientX - last[0]) / (base * zoom); cy -= (e.clientY - last[1]) / (base * zoom); last = [e.clientX, e.clientY]; draw(); });
      const up = () => { last = null; }; wrap.addEventListener("pointerup", up); wrap.addEventListener("pointercancel", up);
      zr.addEventListener("input", () => { zoom = +zr.value; draw(); });
      const done = v => { ov.remove(); resolve(v); };
      no.addEventListener("click", () => done(null));
      ok.addEventListener("click", () => {
        const c = document.createElement("canvas"); c.width = c.height = 320; paint(c, 320);
        c.toBlob(b => done(b), "image/jpeg", 0.85);
      });
      draw();
    });
  }
  async function ppLoadMine() {
    try { const { data } = await db.from("profile_extras").select("*").eq("user_id", me.id).maybeSingle(); ppMine = data || null; } catch (e) { ppMine = null; }
    const x = ppMine || {};
    ppShow = Array.isArray(x.showcase) ? x.showcase.slice() : []; ppColor = x.accent || null; ppAvatarPath = x.avatar_path || null; ppAvatarBlob = null; ppAvatarClear = false;
    $("pp-vis").value = x.visibility || "public"; $("pp-tag").value = x.tagline || ""; $("pp-fav").value = x.fav_species || "";
    ppDrawAvatar(); ppDrawColors(); ppDrawPin(x.pinned_catch_id || ""); ppDrawShow(); $("pp-msg").textContent = "";
  }
  async function ppDrawAvatar() {
    const box = $("pp-avatar"); box.innerHTML = "";
    let url = null;
    if (ppAvatarBlob) url = URL.createObjectURL(ppAvatarBlob); else if (ppAvatarPath && !ppAvatarClear) url = await avatarUrl(ppAvatarPath);
    box.appendChild(avatarNode(url, (me && me.name) || "", 64, ppColor));
    $("pp-avatar-rm").hidden = !(ppAvatarBlob || (ppAvatarPath && !ppAvatarClear));
  }
  function ppDrawColors() {
    const box = $("pp-colors"); box.innerHTML = "";
    [null].concat(PP_ACCENTS).forEach(c => {
      const b = el("button", null, c ? "" : "none"); b.type = "button"; b.setAttribute("aria-label", c || "no color");
      b.style.cssText = `width:30px;height:30px;border-radius:50%;border:3px solid ${ppColor === c ? "var(--fg, #000)" : "transparent"};background:${c || "var(--line)"};font-size:.6rem;padding:0;cursor:pointer`;
      b.addEventListener("click", () => { ppColor = c; ppDrawColors(); ppDrawAvatar(); });
      box.appendChild(b);
    });
  }
  function ppDrawPin(sel) {
    const s = $("pp-pin"); s.innerHTML = "";
    const o0 = el("option", null, "— none —"); o0.value = ""; s.appendChild(o0);
    myCatches().filter(c => c.visibility !== "private").sort((a, b) => new Date(b.caught_at) - new Date(a.caught_at)).slice(0, 60).forEach(c => {
      const o = el("option", null, `${new Date(c.caught_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} · ${cap(c.species || "Fish")}${c.length_in ? " " + +Number(c.length_in).toFixed(1) + "″" : ""}`);
      o.value = c.id; s.appendChild(o);
    });
    s.value = sel; if (s.value !== sel) s.value = "";
  }
  function showcaseCard(it) {
    const d = el("div"); d.style.cssText = "border:1px solid var(--line);border-radius:12px;padding:8px;text-align:center";
    const i = el("div", "badge-i", it.icon || "🏆"); d.appendChild(i);
    d.appendChild(el("b", null, it.title || "")); if (it.detail) d.appendChild(el("div", "spot-meta", it.detail));
    return d;
  }
  function ppDrawShow() {
    const box = $("pp-show"); box.innerHTML = "";
    if (!ppShow.length) box.appendChild(el("div", "spot-meta", "Nothing here yet — add trophies, badges, a catch or your own achievement."));
    ppShow.forEach((it, i) => {
      const row = el("div"); row.style.cssText = "display:flex;gap:8px;align-items:center;padding:4px 0";
      row.appendChild(el("span", null, it.icon || "🏆")); const t = el("span", null, it.title + (it.detail ? " — " + it.detail : "")); t.style.flex = "1"; row.appendChild(t);
      const mk = (txt, fn, dis) => { const b = el("button", "linkbtn", txt); b.type = "button"; b.disabled = !!dis; b.addEventListener("click", fn); return b; };
      row.appendChild(mk("↑", () => { [ppShow[i - 1], ppShow[i]] = [ppShow[i], ppShow[i - 1]]; ppDrawShow(); }, i === 0));
      row.appendChild(mk("↓", () => { [ppShow[i + 1], ppShow[i]] = [ppShow[i], ppShow[i + 1]]; ppDrawShow(); }, i === ppShow.length - 1));
      row.appendChild(mk("✕", () => { ppShow.splice(i, 1); ppDrawShow(); }));
      row.dataset.item = i; box.appendChild(row);
    });
    const add = $("pp-add-box"); add.innerHTML = "";
    if (ppShow.length >= PP_MAX) { add.appendChild(el("div", "spot-meta", `That's the maximum (${PP_MAX}).`)); return; }
    const kinds = el("select"); kinds.id = "pp-add-kind";
    [["", "➕ Add to showcase…"], ["trophy", "🏆 A tournament trophy"], ["badge", "🏅 A badge I earned"], ["catch", "🎣 One of my catches"], ["custom", "✍️ Something I write myself"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; kinds.appendChild(o); });
    const detail = el("div"); detail.style.marginTop = "6px";
    kinds.addEventListener("change", () => ppAddForm(kinds.value, detail));
    add.appendChild(kinds); add.appendChild(detail);
  }
  function ppAddForm(kind, box) {
    box.innerHTML = "";
    const push = it => { ppShow.push(it); ppDrawShow(); };
    const pick = (opts, make, none) => {
      if (!opts.length) { box.appendChild(el("div", "spot-meta", none)); return; }
      const sel = el("select"); sel.id = "pp-add-pick"; opts.forEach(([v, t]) => { const o = el("option", null, t); o.value = v; sel.appendChild(o); });
      const b = el("button", "btn small", "Add"); b.type = "button"; b.id = "pp-add-go"; b.style.marginTop = "6px"; b.addEventListener("click", () => push(make(sel.value)));
      box.appendChild(sel); box.appendChild(b);
    };
    if (kind === "trophy") {
      const mineH = hof.filter(r => me && r.user_id === me.id && !ppShow.some(i => i.k === "trophy" && i.tid === r.tournament_id && i.board === r.board));
      pick(mineH.map((r, i) => [String(i), `${MEDAL[r.rank]} ${r.title} — ${CT_BOARDS[r.board]}`]), v => { const r = mineH[+v]; return { k: "trophy", tid: r.tournament_id, board: r.board, rank: r.rank, icon: MEDAL[r.rank], title: r.title.slice(0, 60), detail: `${CT_BOARDS[r.board]}: ${hofVal(r)}`.slice(0, 120) }; }, "No tournament trophies yet — they appear here after you finish top 3 in an official tournament.");
    } else if (kind === "badge") {
      const ctx = badgeCtx(), have = BADGES.filter(b => b.n(ctx) >= b.goal && !ppShow.some(i => i.k === "badge" && i.key === b.id));
      pick(have.map(b => [b.id, `${b.icon} ${b.name}`]), v => { const b = BADGES.find(x => x.id === v); return { k: "badge", key: b.id, icon: b.icon, title: b.name, detail: b.desc.slice(0, 120) }; }, "No new badges to add yet.");
    } else if (kind === "catch") {
      const cs = myCatches().filter(c => c.visibility !== "private" && !ppShow.some(i => i.k === "catch" && i.id === c.id)).sort((a, b) => new Date(b.caught_at) - new Date(a.caught_at)).slice(0, 60);
      pick(cs.map(c => [c.id, `${new Date(c.caught_at).toLocaleDateString([], { month: "short", day: "numeric" })} · ${cap(c.species || "Fish")}${c.length_in ? " " + +Number(c.length_in).toFixed(1) + "″" : ""}`]), v => {
        const c = cs.find(x => x.id === v); return { k: "catch", id: c.id, icon: "🎣", title: `${cap(c.species || "Fish")}${c.length_in ? " " + +Number(c.length_in).toFixed(1) + "″" : ""}`.slice(0, 60), detail: new Date(c.caught_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) }; }, "No catches to add (private ones can't be shown).");
    } else if (kind === "custom") {
      const ic = el("input"); ic.id = "pp-c-icon"; ic.maxLength = 4; ic.value = "🏆"; ic.style.width = "70px";
      const ti = el("input"); ti.id = "pp-c-title"; ti.maxLength = 60; ti.placeholder = "e.g., 40″ snook, 2025";
      const de = el("input"); de.id = "pp-c-detail"; de.maxLength = 120; de.placeholder = "A few words about it (optional)";
      const b = el("button", "btn small", "Add"); b.type = "button"; b.id = "pp-add-go"; b.style.marginTop = "6px";
      b.addEventListener("click", () => { if (!ti.value.trim()) { ti.focus(); return; } push({ k: "custom", icon: ic.value.trim() || "🏆", title: ti.value.trim(), detail: de.value.trim() || undefined }); });
      [ic, ti, de, b].forEach(n => { n.style.marginTop = "4px"; box.appendChild(n); });
      box.appendChild(el("div", "spot-meta", "Things you write yourself are on the honor system — trophies from official tournaments are checked."));
    }
  }
  $("pp-avatar-btn").addEventListener("click", () => $("pp-avatar-file").click());
  $("pp-avatar-file").addEventListener("change", async () => {
    const f = $("pp-avatar-file").files && $("pp-avatar-file").files[0]; $("pp-avatar-file").value = ""; if (!f) return;
    try { const b = await cropPicture(f); if (b) { ppAvatarBlob = b; ppAvatarClear = false; ppDrawAvatar(); } } catch (e) { $("pp-msg").className = "msg err"; $("pp-msg").textContent = "Couldn't read that picture."; }
  });
  $("pp-avatar-rm").addEventListener("click", () => { ppAvatarBlob = null; ppAvatarClear = true; ppDrawAvatar(); });
  $("pp-save").addEventListener("click", async () => {
    const msg = $("pp-msg"); msg.className = "msg"; msg.textContent = "Saving…"; $("pp-save").disabled = true;
    try {
      let path = ppAvatarClear ? null : ppAvatarPath; const old = ppAvatarPath;
      if (ppAvatarBlob) {
        path = `${me.id}/${newId()}.jpg`;
        const { error: ue } = await db.storage.from("avatars").upload(path, ppAvatarBlob, { contentType: "image/jpeg" });
        if (ue) throw ue;
      }
      const row = { user_id: me.id, visibility: $("pp-vis").value, avatar_path: path, accent: ppColor, tagline: $("pp-tag").value.trim() || null,
        fav_species: $("pp-fav").value.trim() || null, pinned_catch_id: $("pp-pin").value || null, showcase: ppShow };
      const { error } = await db.from("profile_extras").upsert(row, { onConflict: "user_id" });
      if (error) { if (ppAvatarBlob) db.storage.from("avatars").remove([path]); throw error; }
      if (old && old !== path) db.storage.from("avatars").remove([old]);   // tidy up the old picture
      ppMine = row; ppAvatarPath = path; ppAvatarBlob = null; ppAvatarClear = false; delete avatarUrls["avatars" + old];
      msg.textContent = "Saved ✓"; ppDrawAvatar(); meAvatarRefresh();
    } catch (e) { msg.className = "msg err"; msg.textContent = "Couldn't save: " + (e.message || e); }
    $("pp-save").disabled = false;
  });
  $("pp-view").addEventListener("click", () => { $("profile-card").hidden = true; showProfile(me.id); });

  // ---- 🌎 Public (V4.5 step D): public catches, a map of public spots, and profile pages ----
  let pubCatches = [], pubShown = 30, pubMore = false, pubProfiles = {}, pubPhotos = {}, pubError = null;
  let pubProfileId = null, profView = null, feedMode = "circle", mapPublic = false, pubMarkers = {}, pubFocus = null;
  try { mapPublic = localStorage.getItem("fm-map-public") === "1"; } catch (e) {}
  function pubOpen() { return !!$("view-feed") && !$("view-feed").hidden && feedMode === "public"; }
  function setFeedMode(m) {
    feedMode = m;
    renderPlanLine();
    const pub = m === "public";
    $("feed-mode-circle").className = "btn small" + (pub ? " ghost" : "");
    $("feed-mode-public").className = "btn small" + (pub ? "" : " ghost");
    const ct = m === "contests";
    $("feed-mode-contests").className = "btn small" + (ct ? "" : " ghost");
    const gr = m === "groups";
    $("feed-mode-groups").className = "btn small" + (gr ? "" : " ghost");
    if (ct || gr) $("feed-mode-circle").className = "btn small ghost";
    $("contests").hidden = !ct; $("groups").hidden = !gr;
    $("feed-plans-card").hidden = pub || ct || gr; $("feed-circle-card").hidden = pub || ct || gr;
    if (m !== "circle") { closeTripReview(); $("feed-trips-card").hidden = true; } else loadPastTrips();
    if (ct) { $("pub-feed").hidden = true; $("pub-profile").hidden = true; openContests(); return; }
    if (gr) { $("pub-feed").hidden = true; $("pub-profile").hidden = true; openGroups(); return; }
    if (pub) { loadPublic(); renderPublic(); } else { $("pub-feed").hidden = true; $("pub-profile").hidden = true; renderFeed(); }
  }
  const profOf = id => pubProfiles[id] || friendProfiles[id] || (me && id === me.id && me.profile) || null;
  const profName = id => { const p = profOf(id); return p ? (p.display_name || "@" + p.handle) : null; };
  async function ensureProfiles(ids) {
    const need = [...new Set(ids.filter(Boolean))].filter(id => !profOf(id));
    if (!need.length) return;
    const { data } = await db.from("profiles").select("user_id,handle,display_name,home_area,bio").in("user_id", need);
    (data || []).forEach(x => { pubProfiles[x.user_id] = x; });
  }
  async function loadPubPhotos(list) {
    const ids = list.map(c => c.id);
    if (!ids.length) return;
    const { data } = await db.from("photos").select("*").in("catch_id", ids).order("created_at", { ascending: false });
    (data || []).forEach(ph => { (pubPhotos[ph.catch_id] = (pubPhotos[ph.catch_id] || []).filter(x => x.id !== ph.id)).push(ph); });
    const need = (data || []).map(x => x.path).filter(path => !photoUrls[path]);
    if (need.length) {
      const { data: links } = await db.storage.from("photos").createSignedUrls(need, 3600);
      (links || []).forEach(l => { if (l.signedUrl) photoUrls[l.path] = l.signedUrl; });
    }
  }
  async function loadPublic() {
    try {
      const { data, error } = await db.from("catches").select("*").eq("visibility", "public").is("deleted_at", null).order("caught_at", { ascending: false }).limit(pubShown + 1);
      if (error) throw error;
      pubMore = data.length > pubShown; pubCatches = data.slice(0, pubShown);
      await ensureProfiles(pubCatches.map(c => c.created_by));
      await loadPubPhotos(pubCatches);
      pubError = null;
    } catch (e) { pubError = "Couldn't load the public feed right now."; }
    renderPublic();
  }
  const pubPlace = c => { const sp = spotsAll.find(x => x.id === c.spot_id); return sp ? "📍 " + sp.name : "📍 Location kept private"; };
  function pubCard(c) {
    return feedCard(c, { who: profName(c.created_by) || c.caught_by || "Someone", onWho: () => openProfile(c.created_by),
      place: pubPlace(c), report: true, photos: (pubPhotos[c.id] || []).filter(x => photoUrls[x.path]) });
  }
  function renderPublic() {
    if (!pubOpen()) return;
    const prof = !!pubProfileId;
    $("pub-feed").hidden = prof;
    $("pub-profile").hidden = !prof;
    if (prof) renderProfilePage(); else renderPubFeed();
  }
  function renderPubFeed() {
    const box = $("pub-feed-list"); box.innerHTML = "";
    if (pubError) box.appendChild(el("div", "msg err", pubError));
    if (!pubCatches.length && !pubError) { box.appendChild(el("div", "empty", "No public catches yet. Set one of your catches to 🌎 Public and it shows up here.")); return; }
    pubCatches.forEach(c => box.appendChild(pubCard(c)));
    if (pubMore) {
      const more = el("button", "btn ghost small", "Show more"); more.type = "button";
      more.addEventListener("click", () => { pubShown += 30; loadPublic(); });
      box.appendChild(more);
    }
  }
  function pubPopup(x) {
    const box = document.createElement("div");
    box.appendChild(el("div", "pop-name", "🌎 " + x.name));
    box.appendChild(el("div", "pop-meta", `${cap(x.spot_type)} · ${WATER_LABEL[x.water_type] || x.water_type}`));
    box.appendChild(el("div", "pop-meta", x.is_exact === false ? "Approximate pin — within about ¼ mile" : "Exact pin (yours or a friend's)"));
    if (me && x.created_by !== me.id) {
      const rb = el("button", "linkbtn", "⚑ Report this spot"); rb.type = "button";
      rb.addEventListener("click", () => { map.closePopup(); openReport({ type: "spot", id: x.id, userId: x.created_by, snippet: x.name, label: `the spot "${x.name}"` }); });
      box.appendChild(rb);
    }
    const who = profName(x.created_by);
    if (who) {
      const b = el("button", "linkbtn", "Shared by " + who); b.type = "button";
      b.addEventListener("click", () => { map.closePopup(); showProfile(x.created_by); });
      box.appendChild(b);
    }
    return box;
  }
  function showProfile(id) { stopPlacing(); feedMode = "public"; showView("feed"); openProfile(id); }
  async function openProfile(id) {
    loadHof().then(() => { if (pubProfileId === id && profView && !profView.loading) renderProfilePage(); });
    pubProfileId = id; profView = { loading: true, catches: [] };
    renderPublic();
    try {
      // May this person's page be opened by me? (their privacy setting; friends-only / private pages show blurred)
      let access = { can_view: true, visibility: "public" };
      try { const a = await db.rpc("profile_access", { u: id }); if (a && a.data && typeof a.data === "object") access = a.data; } catch (e) { /* older database: show it */ }
      const pr = await db.from("profiles").select("user_id,handle,display_name,home_area,bio").eq("user_id", id).maybeSingle();
      if (pr.data && pr.data.user_id) pubProfiles[id] = pr.data;
      if (!access.can_view) { profView = { catches: [], locked: true, access }; if (pubProfileId === id) renderPublic(); return; }
      const [ex, ct] = await Promise.all([
        db.from("profile_extras").select("*").eq("user_id", id).maybeSingle(),
        db.from("catches").select("*").eq("created_by", id).eq("visibility", "public").is("deleted_at", null).order("caught_at", { ascending: false }).limit(30)
      ]);
      if (ct.error) throw ct.error;
      const extras = (ex && ex.data) || null;
      let pinned = null;
      if (extras && extras.pinned_catch_id) {
        try { const pc = await db.from("catches").select("*").eq("id", extras.pinned_catch_id).is("deleted_at", null).maybeSingle(); pinned = pc && pc.data && pc.data.id ? pc.data : null; } catch (e) { pinned = null; }
      }
      const avatar = extras && extras.avatar_path ? await avatarUrl(extras.avatar_path) : null;
      profView = { catches: ct.data || [], extras, pinned, avatar, access };
      await loadPubPhotos(pinned ? profView.catches.concat([pinned]) : profView.catches);
    } catch (e) { profView = { catches: [], error: true }; }
    if (pubProfileId === id) renderPublic();
  }
  function renderProfilePage() {
    const id = pubProfileId, box = $("pub-profile-body"); box.innerHTML = "";
    const p = profOf(id), mine = !!(me && id === me.id);
    const ex = (profView && profView.extras) || {}, accent = ex.accent || null, locked = !!(profView && profView.locked);
    const head = el("div"); head.style.cssText = "margin-top:10px;display:flex;gap:12px;align-items:center" + (accent ? `;border-left:5px solid ${accent};padding-left:10px` : "");
    head.appendChild(avatarNode(locked ? null : profView && profView.avatar, p ? (p.display_name || p.handle) : "?", 64, accent));
    const hb = el("div");
    hb.appendChild(el("div", "label", p ? (p.display_name || "@" + p.handle) : "Someone"));
    if (p) hb.appendChild(el("div", "spot-meta", `@${p.handle}` + (!locked && p.home_area ? ` · ${p.home_area}` : "")));
    if (!locked && ex.tagline) hb.appendChild(el("div", null, ex.tagline));
    if (!locked && ex.fav_species) hb.appendChild(el("div", "spot-meta", "⭐ Favorite fish: " + ex.fav_species));
    head.appendChild(hb); box.appendChild(head);
    if (!locked && p && p.bio) box.appendChild(el("p", null, p.bio));
    if (!mine && p && !locked) {
      const r = friendRows.find(x => otherOf(x) === id);
      const done = ok => { if (ok !== false) renderPublic(); };
      let act;
      if (!r) act = frBtn("Add friend", async () => { friendProfiles[id] = p; done(await sendRequest(id)); }, "btn small");
      else if (r.status === "accepted") { act = el("span"); act.style.cssText = "display:flex;gap:10px;align-items:center"; act.appendChild(el("span", "spot-meta", "✓ Friends")); act.appendChild(frBtn("💬 Message", () => openChatWith(id), "btn small")); }
      else if (r.requested_by === me.id) act = el("span", "spot-meta", "Friend request sent");
      else act = frBtn("Accept friend request", async () => { done(await acceptRequest(r)); }, "btn small");
      act.style.marginTop = "8px"; box.appendChild(act);
    }
    if (!mine && p) {
      const tools = el("div"); tools.style.cssText = "display:flex;gap:14px;margin-top:6px";
      const rb = el("button", "linkbtn", "⚑ Report"); rb.type = "button";
      rb.addEventListener("click", () => openReport({ type: "profile", id: null, userId: id, snippet: `${p.display_name || ""} @${p.handle}`, label: `${p.display_name || "this person"}'s profile` }));
      const bb = el("button", "linkbtn danger", blockedIds.has(id) ? "Unblock" : "🚫 Block"); bb.type = "button";
      bb.addEventListener("click", () => (blockedIds.has(id) ? unblockUser(id) : blockUser(id)));
      tools.appendChild(rb); tools.appendChild(bb); box.appendChild(tools);
    }
    if (locked) {
      const priv = profView.access && profView.access.visibility === "private";
      const wrap = el("div"); wrap.id = "prof-locked"; wrap.style.cssText = "position:relative;margin-top:14px;border:1px solid var(--line);border-radius:12px;overflow:hidden;min-height:170px";
      const fake = el("div"); fake.style.cssText = "filter:blur(7px);opacity:.55;padding:14px;pointer-events:none;user-select:none";
      ["📌 ■■■■■■■■■■■■", "⭐ ■■■■■ ■■■■■■ ■■■■", "🏆 ■■■■■■■■ ■■■■■", "🎣 ■■■■■■■■■■■■■■■■", "🎣 ■■■■■■■■■"].forEach(t => fake.appendChild(el("div", null, t)));
      const msgBox = el("div"); msgBox.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center;font-weight:700";
      msgBox.appendChild(el("div", null, priv ? "🔒 This profile is private" : "🔒 You need to be friends to see this profile"));
      wrap.appendChild(fake); wrap.appendChild(msgBox); box.appendChild(wrap);
      if (!mine && p) {   // the friend-request button (same one as above) also sits on the blurred card
        const r2 = friendRows.find(x => otherOf(x) === id);
        if (!r2) msgBox.appendChild(frBtn("Add friend", async () => { friendProfiles[id] = p; const ok = await sendRequest(id); if (ok !== false) renderPublic(); }, "btn small"));
        else if (r2.status !== "accepted") msgBox.appendChild(el("span", "spot-meta", r2.requested_by === me.id ? "Friend request sent" : "They sent you a friend request — accept it above"));
      }
      return;
    }
    if (profView && profView.pinned) {
      box.appendChild(el("div", "label", "📌 Pinned catch")); box.lastChild.style.marginTop = "12px";
      box.appendChild(pubCard(profView.pinned));
    }
    if (ex.showcase && ex.showcase.length) {
      box.appendChild(el("div", "label", "⭐ Showcase")); box.lastChild.style.marginTop = "12px"; box.lastChild.id = "prof-showcase";
      const grid = el("div", "badges"); grid.style.marginTop = "6px";
      ex.showcase.forEach(it => { const c = showcaseCard(it); c.className = "badge on"; c.style.opacity = 1; grid.appendChild(c); });
      box.appendChild(grid);
    }
    const won = hof.filter(r => r.user_id === id);
    if (won.length) {
      box.appendChild(el("div", "label", `🏆 Trophies (${won.length})`)); box.lastChild.id = "prof-trophies";
      won.forEach(r => box.appendChild(el("div", null, `${MEDAL[r.rank]} ${r.title} — ${CT_BOARDS[r.board]}: ${hofVal(r)}`)));
    }
    const sp = spotsAll.filter(x => x.created_by === id && x.visibility === "public");
    box.appendChild(el("div", "label", `Public spots (${sp.length})`));
    if (!sp.length) box.appendChild(el("div", "spot-meta", "None shared yet."));
    sp.forEach(x => {
      const row = el("div", "feed-top"); row.style.cssText = "padding:6px 0;align-items:center";
      row.appendChild(el("span", null, "🌎 " + x.name));
      const b = frBtn("Show on map", () => { pubFocus = x.id; mapPublic = true; try { localStorage.setItem("fm-map-public", "1"); } catch (e) {} $("map-pub").classList.add("on"); showView("map"); }); row.appendChild(b);
      box.appendChild(row);
    });
    box.appendChild(el("div", "label", "Public catches"));
    if (profView && profView.loading) box.appendChild(el("div", "spot-meta", "Loading…"));
    else if (profView && profView.error) box.appendChild(el("div", "msg err", "Couldn't load their catches right now."));
    else if (!profView || !profView.catches.length) box.appendChild(el("div", "spot-meta", "No public catches yet."));
    else profView.catches.forEach(c => box.appendChild(pubCard(c)));
  }
  $("pub-back").addEventListener("click", () => { pubProfileId = null; profView = null; renderPublic(); });
  $("feed-mode-circle").addEventListener("click", () => setFeedMode("circle"));
  $("feed-mode-public").addEventListener("click", () => setFeedMode("public"));
  $("feed-mode-contests").addEventListener("click", () => setFeedMode("contests"));
  $("feed-mode-groups").addEventListener("click", () => { grOpen = null; setFeedMode("groups"); });
  // Strangers' public spots on the regular map (a toggle; your circle's spots are always shown)
  function strangerSpots() { return spotsAll.filter(x => x.visibility === "public" && x.lat != null && x.lng != null && !(spots || []).some(sp => sp.id === x.id)); }
  async function setMapPublic(on) {
    mapPublic = on;
    try { localStorage.setItem("fm-map-public", on ? "1" : "0"); } catch (e) {}
    $("map-pub").classList.toggle("on", on);
    if (on) { try { await ensureProfiles(strangerSpots().map(x => x.created_by)); } catch (e) { /* names are optional */ } }
    renderPins();
  }
  function renderPublicPins() {
    pubMarkers = {};
    if (!mapPublic) return;
    strangerSpots().forEach(x => {
      const col = WATER_COLOR[x.water_type] || "#555";
      L.circle([x.lat, x.lng], { radius: 400, color: col, weight: 1, dashArray: "4 4", fillColor: col, fillOpacity: 0.08, interactive: false }).addTo(pinLayer);
      pubMarkers[x.id] = L.circleMarker([x.lat, x.lng], { radius: 8, weight: 3, color: "#ffffff", fillColor: col, fillOpacity: 0.85 }).bindPopup(() => pubPopup(x)).addTo(pinLayer);
    });
    if (pubFocus && pubMarkers[pubFocus]) { const mk = pubMarkers[pubFocus]; pubFocus = null; map.setView(mk.getLatLng(), 15); mk.openPopup(); }
  }
  $("map-pub").addEventListener("click", () => { initMap(); setMapPublic(!mapPublic); });
  $("map-pub").classList.toggle("on", mapPublic);

  // ---- Messages (V4.5 step E): one-to-one chat between friends ----
  let chatMsgsAll = [], chatWith = null, chatTimer = null, chatBadgeTimer = null;
  const chatOpen = () => !$("chat-card").hidden;
  const chatTime = iso => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const chatOther = m => (m.sender === me.id ? m.recipient : m.sender);
  const unreadFor = id => chatMsgsAll.filter(m => m.recipient === me.id && !m.read_at && (id == null || m.sender === id)).length;
  function updateChatBadge(n) {
    const c = n != null ? n : unreadFor();
    $("chat-btn").textContent = c ? `💬 Messages (${c})` : "💬 Messages";
  }
  async function checkUnread() {
    if (!me) return;
    try {
      const { count, error } = await db.from("messages").select("id", { count: "exact", head: true }).eq("recipient", me.id).is("read_at", null);
      if (!error && count != null) { updateChatBadge(count); if (count > unreadFor() && !chatOpen()) loadChat(); }
    } catch (e) { /* offline — try again later */ }
  }
  function startChat() {
    clearInterval(chatBadgeTimer);
    checkUnread();
    chatBadgeTimer = setInterval(() => { if (!document.hidden) checkUnread(); }, 60000);
  }
  async function loadChat() {
    if (!me) return;
    try {
      const { data, error } = await db.from("messages").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      chatMsgsAll = data.slice().reverse();
      await ensureProfiles(chatMsgsAll.map(chatOther));
      $("chat-msg").textContent = "";
    } catch (e) { $("chat-msg").className = "msg err"; $("chat-msg").textContent = "Couldn't load messages right now."; }
    updateChatBadge();
    if (chatOpen()) renderChat();
  }
  function chatPartnerIds() {
    const ids = new Set(me.friendIds || []);
    chatMsgsAll.forEach(m => ids.add(chatOther(m)));
    const last = id => { const l = chatMsgsAll.filter(m => chatOther(m) === id).pop(); return l ? new Date(l.created_at).getTime() : 0; };
    return [...ids].sort((a, b) => last(b) - last(a) || String(profName(a) || "").localeCompare(String(profName(b) || "")));
  }
  function renderChat() {
    const thread = chatWith != null;
    $("chat-list").hidden = thread; $("chat-thread").hidden = !thread;
    $("chat-title").textContent = thread ? (profName(chatWith) || "Messages") : "Messages";
    if (thread) return renderThread();
    const box = $("chat-list"); box.innerHTML = "";
    const ids = chatPartnerIds();
    if (!ids.length) { box.appendChild(el("div", "empty", "No friends to message yet — add friends first (👥 Friends).")); return; }
    ids.forEach(id => {
      const msgs = chatMsgsAll.filter(m => chatOther(m) === id), l = msgs[msgs.length - 1], un = unreadFor(id);
      const row = el("div", "feed-top"); row.style.cssText = "padding:10px 0;border-bottom:1px solid var(--line);align-items:center;cursor:pointer";
      const left = el("div"); left.style.minWidth = "0";
      left.appendChild(el("b", null, profName(id) || "Someone"));
      left.appendChild(el("div", "spot-meta", l ? (l.sender === me.id ? "You: " : "") + (l.body.length > 44 ? l.body.slice(0, 44) + "…" : l.body) : "No messages yet — say hi"));
      row.appendChild(left);
      const right = el("span", "spot-meta");
      if (un) right.appendChild(el("span", "pill", String(un)));
      else if (l) right.textContent = chatTime(l.created_at);
      row.appendChild(right);
      row.addEventListener("click", () => openThread(id));
      box.appendChild(row);
    });
  }
  function renderThread() {
    const box = $("chat-msgs"); box.innerHTML = "";
    const msgs = chatMsgsAll.filter(m => chatOther(m) === chatWith);
    if (!msgs.length) box.appendChild(el("div", "spot-meta", "No messages yet — say hi."));
    msgs.forEach(m => {
      const b = el("div", "bub " + (m.sender === me.id ? "me" : "them"));
      b.appendChild(document.createTextNode(m.body));
      const sm = el("small", null, chatTime(m.created_at) + (m.sender === me.id && m.read_at ? " · seen" : ""));
      if (m.sender === me.id) {
        const x = el("button", "linkbtn", "Delete"); x.type = "button"; x.style.cssText = "color:inherit;font-size:.68rem;opacity:.9;margin-left:8px;padding:0";
        x.addEventListener("click", () => deleteMessage(m));
        sm.appendChild(x);
      }
      b.appendChild(sm);
      box.appendChild(b);
    });
    const friend = !!(me.friendIds && me.friendIds.has(chatWith));
    $("chat-form").hidden = !friend;
    if (!friend) box.appendChild(el("div", "spot-meta", "You're not friends right now, so you can't send new messages."));
    box.scrollTop = box.scrollHeight;
  }
  async function deleteMessage(m) {
    if (!confirm("Delete this message for both of you?")) return;
    const { error } = await db.from("messages").delete().eq("id", m.id);
    if (error) { $("chat-msg").className = "msg err"; $("chat-msg").textContent = "Couldn't delete that."; return; }
    chatMsgsAll = chatMsgsAll.filter(x => x.id !== m.id); renderChat(); updateChatBadge();
  }
  async function openThread(id) {
    chatWith = id; $("chat-msg").textContent = "";
    renderChat();
    if (unreadFor(id)) {
      chatMsgsAll.forEach(m => { if (m.sender === id && m.recipient === me.id && !m.read_at) m.read_at = new Date().toISOString(); });
      updateChatBadge();
      try { await db.rpc("mark_read", { p_other: id }); } catch (e) { /* will show unread again next time */ }
    }
  }
  async function openChatWith(id) {
    $("friends-card").hidden = true;
    $("chat-card").hidden = false; chatWith = id;
    renderChat(); $("chat-card").scrollIntoView({ behavior: "smooth", block: "start" });
    await loadChat(); if (chatWith === id) openThread(id);
    startChatPolling();
  }
  function startChatPolling() { clearInterval(chatTimer); chatTimer = setInterval(() => { if (chatOpen() && !document.hidden) loadChat().then(() => { if (chatWith != null && unreadFor(chatWith)) openThread(chatWith); }); }, 10000); }
  $("chat-btn").addEventListener("click", async () => {
    $("chat-card").hidden = false; chatWith = null; $("chat-msg").textContent = "";
    renderChat(); $("chat-card").scrollIntoView({ behavior: "smooth", block: "start" });
    startChatPolling();
    await Promise.all([loadChat(), loadFriends()]);
    renderChat();
  });
  $("chat-close").addEventListener("click", () => { $("chat-card").hidden = true; clearInterval(chatTimer); chatWith = null; });
  $("chat-back").addEventListener("click", () => { chatWith = null; renderChat(); });
  $("chat-form").addEventListener("submit", async e => {
    e.preventDefault();
    const body = $("chat-input").value.trim().slice(0, 1000);
    if (!body || chatWith == null) return;
    $("chat-send").disabled = true;
    try {
      const { data, error } = await db.from("messages").insert({ recipient: chatWith, body }).select("*").single();
      if (error) throw error;
      chatMsgsAll.push({ id: "tmp" + Date.now(), created_at: new Date().toISOString(), sender: me.id, recipient: chatWith, body, read_at: null, ...data });
      $("chat-input").value = ""; $("chat-msg").textContent = "";
      renderThread();
    } catch (err) { $("chat-msg").className = "msg err"; $("chat-msg").textContent = "Couldn't send — check your signal (and that you're still friends)."; }
    finally { $("chat-send").disabled = false; }
  });

  // ---- Safety (V4.5 step F): reports and blocks ----
  let blockedIds = new Set();
  const REASON_LABEL = { spam: "Spam or fake", harassment: "Harassment or abuse", inappropriate: "Inappropriate or offensive", private_info: "Shows private info", other: "Something else" };
  async function loadBlocks() {
    if (!me) return;
    try {
      const { data, error } = await db.from("blocks").select("blocked");
      if (error) throw error;
      blockedIds = new Set((data || []).map(r => r.blocked));
      await ensureProfiles([...blockedIds]);
    } catch (e) { /* keep the last list */ }
    if (!$("friends-card").hidden) renderFriends();
  }
  // After a block/unblock, refresh everything that depends on who can see what
  async function refreshAfterBlock(id) {
    await loadBlocks(); await loadFriends(); getCircle(true);
    loadSpots(); loadPublic();
    if (chatWith === id) { chatWith = null; }
    if (!$("chat-card").hidden) loadChat();
    if (pubProfileId === id) renderPublic();
  }
  async function blockUser(id) {
    const name = profName(id) || "this person";
    if (!confirm(`Block ${name}?\n\nYou won't see each other's public posts, comments or messages, neither of you can message the other, and you'll stop being friends. You can unblock later in 👥 Friends.`)) return;
    try {
      const { error } = await db.rpc("block_user", { p_user: id });
      if (error) throw error;
      const r = friendRows.find(x => otherOf(x) === id);
      if (r) await db.from("friendships").delete().eq("user_a", r.user_a).eq("user_b", r.user_b);
      $("chat-msg").textContent = "";
    } catch (e) { alert("Couldn't block right now — check your signal and try again."); return; }
    await refreshAfterBlock(id);
  }
  async function unblockUser(id) {
    const { error } = await db.from("blocks").delete().eq("blocked", id);
    if (error) { alert("Couldn't unblock right now."); return; }
    await refreshAfterBlock(id);
  }
  let reporting = null;
  function openReport(t) {
    reporting = t;
    $("rp-title").textContent = "Report";
    $("rp-what").textContent = `You're reporting ${t.label}. Only Richard sees reports.`;
    $("rp-reason").value = "spam"; $("rp-details").value = ""; $("rp-msg").textContent = ""; $("rp-send").disabled = false;
    $("report-card").hidden = false; $("report-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("rp-close").addEventListener("click", () => { $("report-card").hidden = true; reporting = null; });
  $("rp-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!reporting) return;
    const t = reporting, msg = $("rp-msg"); msg.className = "msg"; msg.textContent = "Sending…"; $("rp-send").disabled = true;
    const { error } = await db.from("reports").insert({ target_user: t.userId || null, target_type: t.type, target_id: t.id || null, reason: $("rp-reason").value,
      details: $("rp-details").value.trim().slice(0, 300) || null, snippet: (t.snippet || "").slice(0, 200) || null });
    if (error && error.code !== "23505") { msg.className = "msg err"; msg.textContent = "Couldn't send the report — check your signal and try again."; $("rp-send").disabled = false; return; }
    msg.textContent = error ? "You've already reported this — thanks, Richard will take a look." : "Thanks — Richard will take a look.";
    setTimeout(() => { if (reporting === t) { $("report-card").hidden = true; reporting = null; } }, 1800);
  });
  $("chat-report").addEventListener("click", () => {
    if (chatWith == null) return;
    const last = chatMsgsAll.filter(m => m.sender === chatWith && !String(m.id).startsWith("tmp")).pop();
    openReport(last ? { type: "message", id: last.id, userId: chatWith, snippet: last.body, label: `${profName(chatWith) || "this person"}'s message` }
                    : { type: "profile", id: null, userId: chatWith, snippet: profName(chatWith) || "", label: `${profName(chatWith) || "this person"}` });
  });
  $("chat-block").addEventListener("click", () => { if (chatWith != null) blockUser(chatWith); });
  // Admin: open reports (inside the Invite card)
  async function loadReports() {
    const box = $("report-admin"); if (!box) return;
    box.innerHTML = "";
    if (!me || !me.isAdmin) return;
    const { data, error } = await db.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50);
    if (error) { box.appendChild(el("div", "msg err", "Couldn't load reports.")); return; }
    updateRequestBadge(null, data.length);
    if (!data.length) return;
    try { await ensureProfiles(data.flatMap(r => [r.reporter, r.target_user])); } catch (e) { /* names optional */ }
    box.appendChild(el("div", "label", `Reports (${data.length})`));
    data.forEach(r => {
      const row = el("div", "feed-item");
      row.appendChild(el("div", null, `⚑ ${REASON_LABEL[r.reason] || r.reason} — ${r.target_type}`));
      const who = profName(r.target_user), by = profName(r.reporter);
      row.appendChild(el("div", "spot-meta", `About: ${who || "unknown"}${profOf(r.target_user) ? " (@" + profOf(r.target_user).handle + ")" : ""} · reported by ${by || "someone"} · ${new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}`));
      if (r.snippet) row.appendChild(el("div", "spot-meta", "“" + r.snippet + "”"));
      if (r.details) row.appendChild(el("div", "spot-meta", r.details));
      const acts = el("div", "feed-actions");
      const act = async (fn, ask) => { if (ask && !confirm(ask)) return; const { error: e2 } = await fn(); if (e2) { alert("Couldn't do that: " + (e2.message || e2)); return; } loadReports(); };
      if ((r.target_type === "catch" || r.target_type === "comment") && r.target_id) {
        const rm = frBtn("Remove " + r.target_type, () => act(() => db.rpc("remove_content", { p_type: r.target_type, p_id: r.target_id }), `Remove this ${r.target_type} for everyone?`));
        acts.appendChild(rm);
      }
      if (r.target_user) acts.appendChild(frBtn("Ban user", () => act(() => db.rpc("ban_user", { p_user: r.target_user }), `Ban ${who || "this person"} from the app? They lose all access (you can approve them again later from the member list).`)));
      acts.appendChild(frBtn("Resolve", () => act(() => db.rpc("resolve_report", { p_id: r.id }))));
      row.appendChild(acts);
      box.appendChild(row);
    });
  }

  // ---- Friends (V4 social) ----
  let friendRows = [], friendProfiles = {};
  const otherOf = r => (r.user_a === me.id ? r.user_b : r.user_a);
  const pairOf = other => me.id < other ? { user_a: me.id, user_b: other } : { user_a: other, user_b: me.id };
  const incomingReqs = () => friendRows.filter(r => r.status === "pending" && r.requested_by !== me.id);
  function friendBadge() {
    const n = me ? incomingReqs().length : 0;
    $("friends-btn").textContent = n ? `👥 Friends (${n})` : "👥 Friends";
  }
  async function loadFriends() {
    if (!me) return;
    try {
      const { data, error } = await db.from("friendships").select("*");
      if (error) throw error;
      friendRows = data;
      me.friendIds = new Set(data.filter(r => r.status === "accepted").map(otherOf));
      const sig = [...me.friendIds].sort().join();
      if (friendSig !== null && sig !== friendSig) { getCircle(true); loadSpots(); }
      friendSig = sig;
      const ids = [...new Set(data.map(otherOf))];
      if (ids.length) {
        const { data: ps, error: e2 } = await db.from("profiles").select("user_id,handle,display_name,home_area").in("user_id", ids);
        if (e2) throw e2;
        ps.forEach(x => { friendProfiles[x.user_id] = x; });
      }
      $("fr-msg").textContent = "";
    } catch (e) { $("fr-msg").className = "msg err"; $("fr-msg").textContent = "Couldn't load friends right now."; }
    friendBadge();
    if (!$("friends-card").hidden) renderFriends();
  }
  const personLine = (p, extra) => {
    const row = el("div", "feed-top"); row.style.cssText = "padding:8px 0;border-bottom:1px solid var(--line);align-items:center";
    const who = el("span"); who.appendChild(el("b", null, p ? p.display_name : "Someone"));
    if (p) who.appendChild(el("span", "spot-meta", `  @${p.handle}` + (p.home_area ? ` · ${p.home_area}` : "")));
    row.appendChild(who); row.appendChild(extra);
    return row;
  };
  const frBtn = (label, fn, cls) => { const b = el("button", cls || "btn ghost small", label); b.type = "button"; b.addEventListener("click", fn); return b; };
  async function friendAction(fn, failText) {
    const { error } = await fn();
    if (error) { $("fr-msg").className = "msg err"; $("fr-msg").textContent = failText + (error.message ? " (" + error.message + ")" : ""); return false; }
    await loadFriends(); return true;
  }
  const sendRequest = id => friendAction(() => db.from("friendships").insert({ ...pairOf(id), requested_by: me.id, status: "pending" }), "Couldn't send the request.");
  const acceptRequest = r => friendAction(() => db.from("friendships").update({ status: "accepted" }).eq("user_a", r.user_a).eq("user_b", r.user_b), "Couldn't accept.");
  const removeRow = (r, ask) => { if (ask && !confirm(ask)) return; return friendAction(() => db.from("friendships").delete().eq("user_a", r.user_a).eq("user_b", r.user_b), "Couldn't do that."); };
  function renderFriends() {
    const reqBox = $("fr-requests"), list = $("fr-list");
    reqBox.innerHTML = ""; list.innerHTML = "";
    const inc = incomingReqs();
    if (inc.length) {
      reqBox.appendChild(el("div", "label", "Friend requests"));
      inc.forEach(r => {
        const act = el("span"); act.style.cssText = "display:flex;gap:6px";
        act.appendChild(frBtn("Accept", () => acceptRequest(r), "btn small"));
        act.appendChild(frBtn("Decline", () => removeRow(r)));
        reqBox.appendChild(personLine(friendProfiles[otherOf(r)], act));
      });
    }
    const sent = friendRows.filter(r => r.status === "pending" && r.requested_by === me.id);
    const friends = friendRows.filter(r => r.status === "accepted");
    friends.forEach(r => {
      const act = el("span"); act.style.cssText = "display:flex;gap:6px";
      act.appendChild(frBtn("💬 Message", () => openChatWith(otherOf(r)), "btn small"));
      act.appendChild(frBtn("Remove", () => removeRow(r, "Remove this friend? You'll stop seeing each other's Friends-only spots and catches.")));
      list.appendChild(personLine(friendProfiles[otherOf(r)], act));
    });
    sent.forEach(r => list.appendChild(personLine(friendProfiles[otherOf(r)], frBtn("Cancel request", () => removeRow(r)))));
    if (!friends.length && !sent.length) list.appendChild(el("div", "empty", "No friends yet — search for someone above."));
    const bl = $("fr-blocked"); bl.innerHTML = "";
    if (blockedIds.size) {
      bl.appendChild(el("div", "label", "Blocked people"));
      [...blockedIds].forEach(id => bl.appendChild(personLine(profOf(id), frBtn("Unblock", () => unblockUser(id)))));
    }
  }
  $("fr-search-form").addEventListener("submit", async e => {
    e.preventDefault();
    const q = $("fr-q").value.trim().replace(/^@/, "").replace(/[%,()*\\]/g, "");
    const box = $("fr-results"); box.innerHTML = "";
    if (q.length < 2) { box.appendChild(el("div", "spot-meta", "Type at least 2 letters.")); return; }
    box.appendChild(el("div", "spot-meta", "Searching…"));
    const { data, error } = await db.from("profiles").select("user_id,handle,display_name,home_area").or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`).limit(20);
    box.innerHTML = "";
    if (error) { box.appendChild(el("div", "msg err", "Couldn't search right now.")); return; }
    const found = (data || []).filter(x => x.user_id !== me.id);
    if (!found.length) { box.appendChild(el("div", "spot-meta", "Nobody found with that username or name.")); return; }
    found.forEach(pr => {
      friendProfiles[pr.user_id] = pr;
      const r = friendRows.find(x => otherOf(x) === pr.user_id);
      let act;
      if (!r) act = frBtn("Add friend", () => sendRequest(pr.user_id).then(ok => ok && $("fr-search-form").dispatchEvent(new Event("submit", { cancelable: true }))), "btn small");
      else if (r.status === "accepted") act = el("span", "spot-meta", "✓ Friends");
      else if (r.requested_by === me.id) act = el("span", "spot-meta", "Request sent");
      else act = frBtn("Accept", () => acceptRequest(r).then(ok => ok && $("fr-search-form").dispatchEvent(new Event("submit", { cancelable: true }))), "btn small");
      box.appendChild(personLine(pr, act));
    });
  });
  $("friends-btn").addEventListener("click", async () => {
    $("friends-card").hidden = false; $("fr-msg").textContent = ""; $("fr-results").innerHTML = ""; $("fr-q").value = "";
    renderFriends(); $("friends-card").scrollIntoView({ behavior: "smooth", block: "start" });
    await loadFriends();
  });
  $("friends-close").addEventListener("click", () => { $("friends-card").hidden = true; });

  // ---- Profile (V4 social): a username, home waters and a short bio ----
  async function ensureProfile() {
    try {
      const { data, error } = await db.rpc("ensure_profile");
      if (error || !data) return;
      me.profile = data; me.handle = data.handle;
      $("who").textContent = `Signed in as ${me.name} (@${data.handle})`;
      loadFriends(); meAvatarRefresh();
    } catch (e) { /* offline — try again next time */ }
  }
  // the top-right menu button is your own profile picture (or your first letter until you add one)
  async function meAvatarRefresh() {
    const box = $("me-avatar"); if (!box || !me) return;
    const name = (me.profile && me.profile.display_name) || me.name || "";
    box.innerHTML = ""; box.appendChild(avatarNode(null, name, 36, null));
    try {
      let x = ppMine;
      if (!x) { const r = await db.from("profile_extras").select("avatar_path,accent").eq("user_id", me.id).maybeSingle(); x = r && r.data; }
      if (!x || !x.avatar_path) return;
      const url = await avatarUrl(x.avatar_path);
      if (url) { box.innerHTML = ""; box.appendChild(avatarNode(url, name, 36, x.accent || null)); }
    } catch (e) { /* the letter stays */ }
  }
  $("profile-btn").addEventListener("click", async () => {
    $("profile-card").hidden = false; $("pf-msg").textContent = "";
    if (!me.profile) await ensureProfile();
    const p = me.profile || {};
    $("pf-name").value = p.display_name || me.name || ""; $("pf-handle").value = p.handle || "";
    $("pf-area").value = p.home_area || ""; $("pf-bio").value = p.bio || "";
    $("profile-card").scrollIntoView({ behavior: "smooth", block: "start" });
    ppLoadMine();
    pushRefresh();
  });
  $("profile-close").addEventListener("click", () => { $("profile-card").hidden = true; });
  $("profile-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("pf-msg");
    const name = $("pf-name").value.trim(), handle = $("pf-handle").value.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) { msg.className = "msg err"; msg.textContent = "Username: 3–20 letters, numbers or _ (no spaces)."; return; }
    msg.className = "msg"; msg.textContent = "Saving…"; $("pf-save").disabled = true;
    try {
      const { data, error } = await db.from("profiles").update({
        display_name: name, handle, home_area: $("pf-area").value.trim() || null, bio: $("pf-bio").value.trim() || null
      }).eq("user_id", me.id).select("*").single();
      if (error) throw error;
      if (name !== me.name) { await db.rpc("set_my_name", { new_name: name }); me.name = name; }
      me.profile = { ...(me.profile || {}), ...(data || {}), display_name: name, handle, home_area: $("pf-area").value.trim() || null, bio: $("pf-bio").value.trim() || null };
      me.handle = handle;
      $("who").textContent = `Signed in as ${me.name} (@${handle})`;
      msg.textContent = "Saved ✓";
    } catch (err) {
      msg.className = "msg err";
      msg.textContent = err && err.code === "23505" ? "That username is taken — try another." : "Couldn't save: " + (err.message || err);
    } finally { $("pf-save").disabled = false; }
  });
  $("not-member-out").addEventListener("click", signOut);
  $("nm-check").addEventListener("click", () => gate());
  $("nm-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("nm-msg"); msg.className = "msg"; msg.textContent = "Sending…"; $("nm-send").disabled = true;
    try {
      const { data, error } = await db.rpc("request_access", { p_name: $("nm-name").value.trim(), p_note: $("nm-note").value.trim() });
      if (error) throw error;
      msg.textContent = "";
      await gate();
    } catch (err) { msg.className = "msg err"; msg.textContent = "Couldn't send: " + (err.message || err); }
    finally { $("nm-send").disabled = false; }
  });

  // Invite list (admins only)
  let reqCount = 0, repCount = 0;
  function updateRequestBadge(n, r) {
    if (n != null) reqCount = n;
    if (r != null) repCount = r;
    const t = reqCount + repCount;
    $("invite-btn").textContent = t ? `✉ Invite / requests (${t})` : "✉ Invite to app";
  }
  async function checkRequests() {
    if (!me || !me.isAdmin) return;
    try {
      const { data } = await db.from("members").select("email").eq("status", "pending");
      const rp = await db.from("reports").select("id").eq("status", "open");
      updateRequestBadge((data || []).length, (rp.data || []).length);
    } catch (e) {}
  }
  async function loadMembers() {
    const ul = $("member-list"); ul.innerHTML = "";
    const { data, error } = await db.from("members").select("email,display_name,is_admin,status,note,requested_at").order("added_at");
    if (error) { ul.appendChild(el("li", "empty", "Couldn't load the list: " + error.message)); return; }
    const pending = data.filter(m => m.status === "pending");
    updateRequestBadge(pending.length);
    loadReports(); loadAdminDash();
    const review = async (m, ok) => {
      if (!ok && !confirm(`Decline ${m.display_name || m.email}? They won't get in (you can approve them later).`)) return;
      const { error: e2 } = await db.rpc("review_access", { p_email: m.email, p_approve: ok });
      if (e2) alert("Couldn't do that: " + e2.message);
      loadMembers();
    };
    if (pending.length) {
      const h = el("li"); h.appendChild(el("div", "label", `Access requests (${pending.length})`)); ul.appendChild(h);
      pending.forEach(m => {
        const li = el("li"), left = el("div");
        left.appendChild(el("div", "sugg-name", m.display_name || m.email));
        left.appendChild(el("div", "spot-meta", m.email + (m.requested_at ? " · " + new Date(m.requested_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "")));
        if (m.note) left.appendChild(el("div", "spot-meta", "“" + m.note + "”"));
        li.appendChild(left);
        const btns = el("div", "sugg-btns");
        const yes = el("button", "btn small", "Approve"); yes.type = "button"; yes.addEventListener("click", () => review(m, true));
        const no = el("button", "linkbtn danger", "Decline"); no.type = "button"; no.addEventListener("click", () => review(m, false));
        btns.appendChild(yes); btns.appendChild(no); li.appendChild(btns); ul.appendChild(li);
      });
      const h2 = el("li"); h2.appendChild(el("div", "label", "Members")); ul.appendChild(h2);
    }
    data.filter(m => m.status !== "pending").forEach(m => {
      const li = el("li");
      const left = el("div");
      left.appendChild(el("div", "sugg-name", m.display_name || "(hasn't signed in yet)"));
      left.appendChild(el("div", "spot-meta", m.email + (m.is_admin ? " · admin" : "") + (m.status === "blocked" ? " · declined" : "")));
      li.appendChild(left);
      const btns = el("div", "sugg-btns");
      li.appendChild(btns);
      if (m.status === "blocked") {
        const re = el("button", "btn small", "Approve"); re.type = "button"; re.addEventListener("click", () => review(m, true));
        btns.appendChild(re);
      }
      if (!m.display_name && m.status !== "blocked") {
        const share = el("button", "btn small", "📤 Send invite"); share.type = "button";
        share.addEventListener("click", () => shareInvite(m.email));
        btns.appendChild(share);
      }
      if (m.email !== me.email) {
        const rm = el("button", "linkbtn danger", "Remove"); rm.type = "button";
        rm.addEventListener("click", async () => {
          if (!confirm(`Remove ${m.email} from the invite list? They won't be able to see the map anymore.`)) return;
          const { error: e2 } = await db.from("members").delete().eq("email", m.email);
          if (e2) alert("Couldn't remove: " + e2.message);
          loadMembers();
        });
        btns.appendChild(rm);
      }
      ul.appendChild(li);
    });
  }
  // The app doesn't email invites itself — this opens the phone's share sheet (Messages, WhatsApp, email…)
  async function shareInvite(email) {
    const text = `You're invited to our Fishing Map! Open ${SITE} , tap "Create an account", and use this email: ${email}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Fishing Map invite", text }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text); alert("Invite message copied — paste it into a text or email to your friend."); }
    catch (e) { prompt("Copy this and send it to your friend:", text); }
  }

  $("invite-btn").addEventListener("click", () => { $("invite-card").hidden = false; loadMembers(); renderRulesAdmin(); $("invite-card").scrollIntoView({ behavior: "smooth" }); });
  $("invite-close").addEventListener("click", () => { $("invite-card").hidden = true; });
  $("invite-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("i-email").value.trim().toLowerCase();
    const { error } = await db.from("members").insert({ email, invited_by: me && me.id || null });
    $("invite-msg").className = "msg" + (error ? " err" : "");
    $("invite-msg").textContent = error
      ? (/duplicate/i.test(error.message) ? "That email is already on the list." : "Couldn't add: " + error.message)
      : `Added ${email}. Now tap "📤 Send invite" next to them to text or email the link.`;
    if (!error) $("i-email").value = "";
    loadMembers();
  });

  if (db) {
    db.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") showAuth("newpw");
    });
  }

  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
