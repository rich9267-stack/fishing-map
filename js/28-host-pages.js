  // ---- 🏷 Clubs & businesses (setup/56): Host pages, step 1 — ask for a page, browse, edit your own; the admin approves ----
  // A page is a club or a business owned by one regular account. Everything is written by database functions
  // (request_host_page, update_host_page, close_host_page, review_host_page, set_business_allowance); this file is only the screens.
  // Reached from Me → "Clubs & businesses". Step 2 (run tournaments as a page) and step 3 (follow a page) build on this.
  (function hostPages() {
    const pg = $("hp-page"), body = $("hp-body");
    let data = { pages: [], business_allowed: 1, business_used: 0 }, view = "list", openId = null, pickBlob = null, pickColor = null, pickClear = false;
    const KIND = { club: { icon: "🎣", label: "Club", plural: "Clubs" }, business: { icon: "🏪", label: "Business", plural: "Businesses" } };
    const STATUS = { pending: "⏳ Waiting for approval", approved: "✅ Live", declined: "Not approved" };
    const nice = e => (e && e.message) || String(e || "");

    // ---- step 2: act as one of my approved pages (used by 🏁 Compete → 🏆 Tournaments, see js/12) ----
    // "Switching into a page" only decides who a new tournament is run by; the account stays the same. The choice is remembered per account.
    let mine = [], actingId = null, openedFrom = "me";
    const asKey = () => "fm-host-as:" + (me ? me.id : "");
    function savedAs() { try { return localStorage.getItem(asKey()) || null; } catch (e) { return null; } }
    function saveAs(id) { actingId = id || null; try { if (id) localStorage.setItem(asKey(), id); else localStorage.removeItem(asKey()); } catch (e) { /* private mode: lasts until the app reloads */ } }
    function active() { const id = actingId || savedAs(); return mine.find(p => p.id === id) || null; }
    async function refreshMine() { // true when my list of approved pages changed
      if (!db || !me) return false;
      const before = mine.map(p => p.id).join();
      try { await load(); } catch (e) { return false; }
      return before !== mine.map(p => p.id).join();
    }
    window.hostMyPages = () => mine;
    window.hostActive = active;
    window.hostSwitch = id => saveAs(id);
    window.hostRefreshMine = refreshMine;

    function syncBody() { document.body.classList.toggle("hp-open", !pg.hidden); }
    new MutationObserver(syncBody).observe(pg, { attributes: true, attributeFilter: ["hidden"] });

    function pageAvatar(p, size) {
      const box = el("span"); box.style.cssText = "display:inline-flex;flex:none";
      box.appendChild(avatarNode(null, p.name, size, p.accent));
      if (p.avatar_path) avatarUrl(p.avatar_path, "host-avatars").then(u => { if (u) { box.innerHTML = ""; box.appendChild(avatarNode(u, p.name, size, p.accent)); } });
      return box;
    }
    const chip = (text, cls) => { const s = el("span", "hp-chip" + (cls ? " " + cls : ""), text); return s; };
    function backBar(label, fn) {
      const top = el("div", "me-top"); const b = el("button", "linkbtn me-back", label); b.type = "button"; b.id = "hp-back"; b.addEventListener("click", fn); top.appendChild(b); return top;
    }

    async function load() {
      const r = await db.rpc("host_pages_list");
      if (r.error) throw r.error;
      data = r.data || data;
      mine = data.pages.filter(p => p.is_mine && p.status === "approved");
    }
    async function open(startId) { // startId (optional): jump straight to that page, e.g. from "Run by" on a tournament
      if (!me) return;
      const direct = typeof startId === "string" ? startId : null;
      openedFrom = direct ? "outside" : "me";
      view = "list"; openId = null;
      pg.hidden = false; pg.scrollTop = 0;
      body.innerHTML = ""; body.appendChild(backBar("‹ Back", close)); body.appendChild(el("div", "spot-meta", "Loading…"));
      try { await load(); } catch (e) {
        body.innerHTML = ""; body.appendChild(backBar("‹ Back", close));
        body.appendChild(el("div", "msg err", /function|schema cache|not find/i.test(nice(e)) ? "Clubs & businesses aren't switched on yet." : "Couldn't load right now — check your connection and try again."));
        return;
      }
      if (direct && data.pages.some(p => p.id === direct)) { openId = direct; view = "detail"; const p = data.pages.find(x => x.id === direct); pickBlob = null; pickClear = false; pickColor = p.accent || null; }
      else if (direct) toast("That page isn't available any more.", 4000);
      draw();
    }
    function close() { pg.hidden = true; if (openedFrom === "me" && typeof window.openMe === "function") window.openMe(); }
    function draw() { if (view === "new") drawNew(); else if (view === "detail" && data.pages.some(p => p.id === openId)) drawDetail(); else { view = "list"; drawList(); } }

    function rowFor(p) {
      const row = el("button", "hp-row"); row.type = "button";
      row.setAttribute("aria-label", `${p.name}, ${KIND[p.kind].label}` + (p.is_mine ? ", " + STATUS[p.status] : ""));
      row.appendChild(pageAvatar(p, 44));
      const t = el("div", "hp-row-t"); t.appendChild(el("b", null, p.name));
      t.appendChild(el("div", "spot-meta", KIND[p.kind].icon + " " + KIND[p.kind].label + (p.area ? " · " + p.area : "") + (p.is_mine && p.status !== "approved" ? " · " + STATUS[p.status] : "")));
      row.appendChild(t);
      row.addEventListener("click", () => { openId = p.id; view = "detail"; pickBlob = null; pickClear = false; pickColor = p.accent || null; draw(); pg.scrollTop = 0; });
      return row;
    }

    function drawList() {
      body.innerHTML = ""; body.appendChild(backBar("‹ Back", close));
      body.appendChild(el("h2", "hp-h", "🏷 Clubs & businesses"));
      body.appendChild(el("div", "spot-meta", "Fishing clubs, tackle shops, charters and guides. A page is run by one member and approved by the admin first."));
      const mine = data.pages.filter(p => p.is_mine);
      body.appendChild(el("div", "me-lab", "My pages"));
      const g1 = el("div", "me-grp hp-grp");
      if (!mine.length) g1.appendChild(el("div", "empty", "You don't run a page yet."));
      mine.forEach(p => g1.appendChild(rowFor(p)));
      body.appendChild(g1);
      const ask = el("button", "btn", "+ Ask for a page"); ask.type = "button"; ask.id = "hp-ask"; ask.style.marginTop = "10px";
      ask.addEventListener("click", () => { view = "new"; draw(); pg.scrollTop = 0; });
      body.appendChild(ask);
      const others = data.pages.filter(p => !p.is_mine && p.status === "approved");
      ["club", "business"].forEach(k => {
        const list = others.filter(p => p.kind === k);
        body.appendChild(el("div", "me-lab", KIND[k].plural));
        const g = el("div", "me-grp hp-grp");
        if (!list.length) g.appendChild(el("div", "empty", "No " + KIND[k].plural.toLowerCase() + " yet."));
        list.forEach(p => g.appendChild(rowFor(p)));
        body.appendChild(g);
      });
    }

    function drawNew() {
      body.innerHTML = ""; body.appendChild(backBar("‹ Pages", () => { view = "list"; draw(); }));
      body.appendChild(el("h2", "hp-h", "Ask for a page"));
      body.appendChild(el("div", "spot-meta", "The admin looks at every request. You can have as many clubs as you like. Business pages: you're allowed " + data.business_allowed + " (you have " + data.business_used + ")."));
      const fs = document.createElement("fieldset"); fs.className = "hp-kinds";
      const lg = document.createElement("legend"); lg.textContent = "What kind of page?"; fs.appendChild(lg);
      const bizFull = data.business_used >= data.business_allowed;
      let kind = "club";
      [["club", "🎣 Club — a fishing club or group"], ["business", "🏪 Business — a shop, charter or guide"]].forEach(([k, label]) => {
        const l = document.createElement("label"); l.className = "hp-kind";
        const r = document.createElement("input"); r.type = "radio"; r.name = "hp-kind"; r.value = k; r.checked = k === "club";
        if (k === "business" && bizFull) r.disabled = true;
        r.addEventListener("change", () => { kind = k; });
        l.appendChild(r); l.appendChild(document.createTextNode(" " + label));
        if (k === "business" && bizFull) l.appendChild(el("div", "spot-meta", "You've used your business pages. Ask the admin if you need another."));
        fs.appendChild(l);
      });
      body.appendChild(fs);
      const mk = (id, ph, max, aria, tag) => { const i = document.createElement(tag || "input"); i.id = id; i.maxLength = max; i.placeholder = ph; i.setAttribute("aria-label", aria); i.style.marginTop = "8px"; if (tag === "textarea") i.rows = 3; return i; };
      const nm = mk("hp-name", "Page name (3–40 letters)", 40, "Page name"), ab = mk("hp-about", "What's it about? (optional)", 300, "About this page", "textarea"),
        ar = mk("hp-area", "Where? e.g. Pompano Beach (optional)", 60, "Area"), nt = mk("hp-note", "Anything the admin should know? (optional)", 300, "Note to the admin", "textarea");
      [nm, ab, ar, nt].forEach(i => body.appendChild(i));
      const send = el("button", "btn", "Send request"); send.type = "button"; send.id = "hp-send"; send.style.marginTop = "12px";
      const msg = el("div", "msg"); msg.id = "hp-msg";
      send.addEventListener("click", async () => {
        if (nm.value.trim().length < 3) { msg.className = "msg err"; msg.textContent = "Give the page a name of at least 3 letters."; return; }
        send.disabled = true; msg.className = "msg"; msg.textContent = "Sending…";
        const { error } = await db.rpc("request_host_page", { p_kind: kind, p_name: nm.value.trim(), p_about: ab.value.trim() || null, p_area: ar.value.trim() || null, p_note: nt.value.trim() || null });
        if (error) { msg.className = "msg err"; msg.textContent = nice(error); send.disabled = false; return; }
        toast("Request sent ✓ — you'll see it here once it's approved.", 5000);
        try { await load(); } catch (e) { /* the list reloads next time */ }
        view = "list"; draw(); pg.scrollTop = 0;
      });
      body.appendChild(send); body.appendChild(msg);
    }

    function drawDetail() {
      const p = data.pages.find(x => x.id === openId);
      body.innerHTML = ""; body.appendChild(backBar("‹ Pages", () => { view = "list"; draw(); }));
      const head = el("div", "hp-head"); head.appendChild(pageAvatar(p, 64));
      const t = el("div"); t.appendChild(el("h2", "hp-h", p.name));
      const chips = el("div", "hp-chips"); chips.appendChild(chip(KIND[p.kind].icon + " " + KIND[p.kind].label));
      if (p.area) chips.appendChild(chip("📍 " + p.area));
      if (p.is_mine) chips.appendChild(chip(STATUS[p.status], p.status));
      t.appendChild(chips); head.appendChild(t); body.appendChild(head);
      if (p.about) { const a = el("p", "hp-about", p.about); body.appendChild(a); }
      const by = el("div", "spot-meta"); by.appendChild(document.createTextNode("Run by "));
      by.appendChild(personLink(p.owner, p.owner_name || p.owner_handle || "a member", null, () => { pg.hidden = true; }));
      body.appendChild(by);
      if (p.is_mine && p.status === "approved") {
        const run = el("button", "btn", "🏁 Run tournaments as this page"); run.type = "button"; run.id = "hp-run-as"; run.style.marginTop = "12px";
        run.addEventListener("click", () => { saveAs(p.id); pg.hidden = true; if (typeof openTournamentsTab === "function") openTournamentsTab(); });
        body.appendChild(run);
        body.appendChild(el("div", "spot-meta", "Opens 🏁 Compete → 🏆 Tournaments with this page switched on."));
      }
      if (p.is_mine && p.status === "pending") body.appendChild(el("div", "msg", "The admin hasn't looked at this yet. Nobody else can see it until it's approved."));
      if (p.is_mine && p.status === "declined") body.appendChild(el("div", "msg err", "This request wasn't approved. You can remove it and ask again with a different name or more detail."));
      if (p.is_mine && p.status !== "declined") drawEdit(p);
      if (p.is_mine) {
        const rm = el("button", "btn ghost small", "Remove this page"); rm.type = "button"; rm.id = "hp-remove"; rm.style.cssText = "display:block;margin-top:18px;color:#c0392b";
        rm.addEventListener("click", async () => {
          if (!await askOk("Remove \"" + p.name + "\"? It disappears for everyone.")) return;
          const { error } = await db.rpc("close_host_page", { p_id: p.id });
          if (error) { toast("Couldn't remove: " + nice(error), 5000); return; }
          if (p.avatar_path) { try { await db.storage.from("host-avatars").remove([p.avatar_path]); } catch (e) { /* invisible leftovers */ } }
          try { await load(); } catch (e) { /* fine */ }
          view = "list"; draw();
        });
        body.appendChild(rm);
      }
    }

    function drawEdit(p) {
      const box = el("div"); box.style.cssText = "margin-top:16px;border-top:1px solid var(--line);padding-top:12px";
      box.appendChild(el("div", "label", "Edit page"));
      box.appendChild(el("div", "spot-meta", "The name and kind are fixed once asked for."));
      const ab = document.createElement("textarea"); ab.id = "hp-edit-about"; ab.rows = 3; ab.maxLength = 300; ab.value = p.about || ""; ab.placeholder = "About this page"; ab.setAttribute("aria-label", "About this page"); ab.style.marginTop = "8px";
      const ar = document.createElement("input"); ar.id = "hp-edit-area"; ar.maxLength = 60; ar.value = p.area || ""; ar.placeholder = "Area"; ar.setAttribute("aria-label", "Area"); ar.style.marginTop = "8px";
      const cols = el("div"); cols.style.cssText = "display:flex;gap:8px;margin:10px 0;flex-wrap:wrap";
      const drawCols = () => { cols.innerHTML = ""; PP_ACCENTS.forEach(c => { const b = el("button"); b.type = "button"; b.setAttribute("aria-label", "Colour " + c); b.setAttribute("aria-pressed", String(pickColor === c)); b.style.cssText = `width:32px;height:32px;border-radius:50%;background:${c};border:3px solid ${pickColor === c ? "var(--text, #000)" : "transparent"}`; b.addEventListener("click", () => { pickColor = c; drawCols(); }); cols.appendChild(b); }); };
      drawCols();
      const prev = el("div"); prev.style.cssText = "display:flex;gap:8px;align-items:center;margin:6px 0";
      const pic = document.createElement("input"); pic.type = "file"; pic.accept = "image/*"; pic.id = "hp-pic"; pic.setAttribute("aria-label", "Page picture or logo");
      pic.addEventListener("change", async () => {
        const f = pic.files && pic.files[0]; if (!f) return;
        try { const b = await cropPicture(f); pic.value = ""; if (b) { pickBlob = b; pickClear = false; prev.innerHTML = ""; prev.appendChild(avatarNode(URL.createObjectURL(b), p.name, 56, pickColor)); prev.appendChild(el("span", "spot-meta", " New picture — tap Save changes.")); } }
        catch (e) { pickBlob = null; }
      });
      const save = el("button", "btn small", "Save changes"); save.type = "button"; save.id = "hp-save"; save.style.marginTop = "8px";
      const msg = el("div", "msg");
      save.addEventListener("click", async () => {
        save.disabled = true; msg.className = "msg"; msg.textContent = "Saving…";
        try {
          const old = p.avatar_path; let path = pickClear ? null : old;
          if (pickBlob) { path = `${p.id}/${newId()}.jpg`; const { error: ue } = await db.storage.from("host-avatars").upload(path, pickBlob, { contentType: "image/jpeg" }); if (ue) throw ue; }
          const { error } = await db.rpc("update_host_page", { p_id: p.id, p_about: ab.value.trim() || null, p_area: ar.value.trim() || null, p_accent: pickColor, p_avatar: path });
          if (error) { if (pickBlob) db.storage.from("host-avatars").remove([path]); throw error; }
          if (old && old !== path) db.storage.from("host-avatars").remove([old]);
          delete avatarUrls["host-avatars" + old];
          await load(); pickBlob = null; pickClear = false; draw(); toast("Saved ✓");
        } catch (e) { msg.className = "msg err"; msg.textContent = "Couldn't save: " + nice(e); save.disabled = false; }
      });
      box.appendChild(ab); box.appendChild(ar); box.appendChild(el("div", "spot-meta", "Page colour:")); box.appendChild(cols);
      box.appendChild(el("div", "spot-meta", "Picture or logo:")); box.appendChild(pic); box.appendChild(prev);
      if (p.avatar_path) {
        const clr = el("button", "linkbtn", "Remove the picture"); clr.type = "button";
        clr.addEventListener("click", () => { pickClear = true; pickBlob = null; prev.innerHTML = ""; prev.appendChild(el("span", "spot-meta", "The picture will be removed when you tap Save changes.")); });
        box.appendChild(clr);
      }
      box.appendChild(save); box.appendChild(msg);
      body.appendChild(box);
    }

    // ---- admin: page requests + live pages + business allowance, inside the ✉ Invite / requests screen ----
    async function adminLoad() {
      const box = $("hp-admin"); if (!box || !me || !me.isAdmin) return;
      let rows;
      try { const r = await db.rpc("host_pages_admin"); if (r.error) throw r.error; rows = r.data || []; } catch (e) { box.innerHTML = ""; return; }
      box.innerHTML = "";
      const pending = rows.filter(r => r.status === "pending"), live = rows.filter(r => r.status === "approved");
      updateRequestBadge(null, null, pending.length);
      if (!rows.length) return;
      const who = r => (r.owner_name || "?") + (r.owner_handle ? " (@" + r.owner_handle + ")" : "");
      const review = async (r, ok) => {
        if (!ok && !await askOk("Decline \"" + r.name + "\"? The owner can ask again with another name.")) return;
        const { error } = await db.rpc("review_host_page", { p_id: r.id, p_approve: ok });
        if (error) { toast("Couldn't do that: " + nice(error), 5000); return; }
        adminLoad();
      };
      if (pending.length) {
        box.appendChild(el("div", "label", `🏷 Page requests (${pending.length})`));
        pending.forEach(r => {
          const row = el("div", "hp-admin-row");
          row.appendChild(el("b", null, (KIND[r.kind] ? KIND[r.kind].icon + " " : "") + r.name));
          row.appendChild(el("div", "spot-meta", `${KIND[r.kind] ? KIND[r.kind].label : r.kind} · from ${who(r)}` + (r.area ? " · " + r.area : "")));
          if (r.about) row.appendChild(el("div", "spot-meta", r.about));
          if (r.note) row.appendChild(el("div", "spot-meta", "“" + r.note + "”"));
          const btns = el("div", "sugg-btns");
          const yes = el("button", "btn small", "Approve"); yes.type = "button"; yes.addEventListener("click", () => review(r, true));
          const no = el("button", "linkbtn danger", "Decline"); no.type = "button"; no.addEventListener("click", () => review(r, false));
          btns.appendChild(yes); btns.appendChild(no); row.appendChild(btns); box.appendChild(row);
        });
      }
      if (live.length) {
        const d = document.createElement("details"); d.className = "hp-admin-live";
        const s = document.createElement("summary"); s.textContent = `Live pages (${live.length}) — business allowance & removing`; d.appendChild(s);
        live.forEach(r => {
          const row = el("div", "hp-admin-row");
          row.appendChild(el("b", null, (KIND[r.kind] ? KIND[r.kind].icon + " " : "") + r.name));
          row.appendChild(el("div", "spot-meta", `${KIND[r.kind] ? KIND[r.kind].label : r.kind} · ${who(r)} · business pages ${r.business_used} of ${r.business_allowed} allowed`));
          const btns = el("div", "sugg-btns");
          const more = el("button", "btn small", "Allow +1 business page"); more.type = "button";
          more.addEventListener("click", async () => { const { error } = await db.rpc("set_business_allowance", { p_user: r.owner, p_n: Math.min(10, r.business_allowed + 1) }); if (error) toast(nice(error), 5000); else adminLoad(); });
          btns.appendChild(more);
          if (r.business_allowed > Math.max(r.business_used, 0)) {
            const less = el("button", "linkbtn", "−1"); less.type = "button"; less.setAttribute("aria-label", "Allow one fewer business page");
            less.addEventListener("click", async () => { const { error } = await db.rpc("set_business_allowance", { p_user: r.owner, p_n: Math.max(0, r.business_allowed - 1) }); if (error) toast(nice(error), 5000); else adminLoad(); });
            btns.appendChild(less);
          }
          const rm = el("button", "linkbtn danger", "Remove page"); rm.type = "button";
          rm.addEventListener("click", async () => {
            if (!await askOk("Remove \"" + r.name + "\" for everyone?")) return;
            const { error } = await db.rpc("close_host_page", { p_id: r.id }); if (error) toast(nice(error), 5000); else adminLoad();
          });
          btns.appendChild(rm); row.appendChild(btns); d.appendChild(row);
        });
        box.appendChild(d);
      }
    }

    document.addEventListener("keydown", e => { if (e.key === "Escape" && !pg.hidden && !document.querySelector(".ask-bg")) { if (view !== "list") { view = "list"; draw(); } else close(); } });
    window.openHostPages = open;
    window.hpAdminLoad = adminLoad;
  })();
