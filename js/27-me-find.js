  // ---- 🙂 UX v2 step 4: the Me page (your picture → a page of sections) + 🔍 Find anything ----
  // The old Settings blocks stay exactly as they were; each one is a <div class="me-sec" data-sec="…"> inside #settings-card.
  // The Me page opens ONE of them (settings-card gets data-show="alerts" …), or all of them when an old link/test presses ⚙️ Settings.
  // The old menu buttons (profile-btn, settings-btn, inbox-btn, invite-btn, refresh-btn, signout-btn) stay in the page as hidden hooks that this page presses.
  (function mePage() {
    const mc = $("me-card"), sc = $("settings-card"), fp = $("find-page");
    const TITLES = { alerts: "🔔 Phone alerts & quiet hours", license: "🎫 Fishing license", privacy: "🔒 Privacy & blocked people", offline: "🗺 Offline maps",
      phone: "📱 Photos & Home Screen app", data: "⬇ Download or delete my data", help: "🐞 Help & report a problem" };
    let fromProfile = false;

    function syncBody() {
      document.body.classList.toggle("me-open", !mc.hidden || (!sc.hidden && !!sc.dataset.show));
      document.body.classList.toggle("find-open", !fp.hidden);
    }
    [[mc, ["hidden"]], [fp, ["hidden"]], [sc, ["hidden", "data-show"]]].forEach(([n, a]) => new MutationObserver(syncBody).observe(n, { attributes: true, attributeFilter: a }));

    async function bigAvatar() {
      const box = $("me-big-avatar"); if (!box || !me) return;
      const name = (me.profile && me.profile.display_name) || me.name || "";
      box.innerHTML = ""; box.appendChild(avatarNode(null, name, 56, null));
      try {
        let x = ppMine;
        if (!x) { const r = await db.from("profile_extras").select("avatar_path,accent").eq("user_id", me.id).maybeSingle(); x = r && r.data; }
        if (!x || !x.avatar_path) return;
        const url = await avatarUrl(x.avatar_path);
        if (url) { box.innerHTML = ""; box.appendChild(avatarNode(url, name, 56, x.accent || null)); }
      } catch (e) { /* the letter stays */ }
    }
    function fillMe() {
      const p = (me && me.profile) || {};
      $("me-name").textContent = p.display_name || (me && me.name) || "Me";
      $("me-sub").textContent = [p.handle ? "@" + p.handle : "", p.home_area || ""].filter(Boolean).join(" · ");
      const n = +((/\((\d+)\)/.exec($("inbox-btn").textContent) || [])[1] || 0);
      $("me-inbox-n").hidden = !n; $("me-inbox-n").textContent = n; $("me-inbox-n").setAttribute("aria-label", n + " unread");
      const inv = mc.querySelector('[data-me="invite"]'); inv.hidden = !(me && me.isAdmin);
      $("me-invite-t").textContent = /\(\d+\)/.test($("invite-btn").textContent) ? $("invite-btn").textContent.replace(/^✉\s*/, "") : "Invite to app";
      bigAvatar();
    }
    function openMe() {
      if (!me) return;
      closeFind();
      sc.hidden = true;
      fillMe(); mc.hidden = false; mc.scrollTop = 0;
      const b = $("me-close"); try { b.focus({ preventScroll: true }); } catch (e) { /* fine */ }
    }
    function closeMe() { mc.hidden = true; }
    function openSection(sec) {
      if (!TITLES[sec]) return;
      closeFind(); mc.hidden = true;
      meSecWant = true;   // (declared in js/11) tells ⚙️ Settings to show just this section
      sc.dataset.show = sec; $("settings-title").textContent = TITLES[sec]; $("settings-close").textContent = "‹ Back";
      $("settings-btn").click();
      sc.scrollTop = 0;
    }
    window.openMe = openMe;
    window.meSettingsAll = () => { sc.removeAttribute("data-show"); $("settings-title").textContent = "⚙️ Settings"; $("settings-close").textContent = "Close"; };

    mc.addEventListener("click", e => {
      const b = e.target.closest("[data-me]"); if (!b) return;
      const k = b.dataset.me;
      if (k === "inbox") { closeMe(); $("inbox-btn").click(); }
      else if (k === "invite") { closeMe(); $("invite-btn").click(); }
      else if (k === "whatsnew") $("wn-open").click();
      else openSection(k);
    });
    $("me-close").addEventListener("click", closeMe);
    $("me-edit").addEventListener("click", () => { closeMe(); fromProfile = true; $("profile-btn").click(); });
    $("profile-close").addEventListener("click", () => { if (fromProfile) { fromProfile = false; openMe(); } });
    $("me-refresh").addEventListener("click", () => { closeMe(); $("refresh-btn").click(); });
    $("me-signout").addEventListener("click", () => { closeMe(); $("signout-btn").click(); });
    // inside a Settings section: "‹ Back" returns to the Me page (the old Close already hid the card)
    $("settings-close").addEventListener("click", () => { if (sc.dataset.show) { sc.removeAttribute("data-show"); openMe(); } });
    $("settings-privacy").addEventListener("click", () => { sc.removeAttribute("data-show"); });
    $("settings-blocked").addEventListener("click", () => {
      sc.hidden = true; sc.removeAttribute("data-show"); $("friends-btn").click();
      setTimeout(() => { const b = $("fr-blocked"); if (b && b.scrollIntoView) b.scrollIntoView({ behavior: "smooth", block: "center" }); }, 350);
    });
    $("push-a2hs-go").addEventListener("click", () => { if (sc.dataset.show) { sc.hidden = true; openSection("phone"); } else $("a2hs").scrollIntoView({ behavior: "smooth", block: "center" }); });
    $("me-offline-go").addEventListener("click", () => { mapLayersOpen(); });
    function mapLayersOpen() {
      sc.hidden = true; sc.removeAttribute("data-show"); closeMe(); closeFind();
      $("tab-map").click();
      setTimeout(() => { const s = $("layers-sheet"); if (s && s.hidden) $("map-layers-btn").click(); }, 300);
    }
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!fp.hidden) closeFind();
      else if (!sc.hidden && sc.dataset.show) $("settings-close").click();
      else if (!mc.hidden) closeMe();
    });

    // ---- 🔍 Find anything ----
    const q = $("find-q"), out = $("find-out");
    const F = (title, where, words, run) => ({ title, where, words: (title + " " + where + " " + words).toLowerCase(), run });
    const features = () => [
      F("Depth lines", "Map › Layers", "depth contour bathymetry water depth lines", mapLayersOpen),
      F("Map layers", "Map › Layers", "layers satellite water temperature clarity boat ramps protected zones reefs nautical chart biting now", mapLayersOpen),
      F("Find new water", "Map › Find new water", "suggestions suggested spots public lakes fish attractors new water", () => { $("tab-map").click(); setTimeout(() => { const s = $("find-sheet"); if (s && s.hidden) $("map-find-btn").click(); }, 300); }),
      F("Offline maps", "Me › Offline maps", "offline save map no signal", () => openSection("offline")),
      F("Phone alerts & quiet hours", "Me › Phone alerts", "alerts notifications push quiet hours morning bite severe weather weekly summary", () => openSection("alerts")),
      F("Fishing license", "Me › Fishing license", "license licence renew expires fwc", () => openSection("license")),
      F("Privacy & blocked people", "Me › Privacy", "privacy blocked block profile page who can see", () => openSection("privacy")),
      F("Photos & Home Screen app", "Me › Photos & Home Screen", "install home screen add to home photos save pictures iphone android", () => openSection("phone")),
      F("Download or delete my data", "Me › Your data", "export csv download delete account my data", () => openSection("data")),
      F("What's new", "Me › What's new", "new updates changes version", () => $("wn-open").click()),
      F("Report a problem", "Me › Help", "report problem bug feedback help", () => openSection("help")),
      F("Edit my profile", "Me › Edit", "profile username name bio picture avatar home waters", () => $("profile-btn").click()),
      F("Alerts inbox", "Me › Alerts inbox", "inbox alerts notifications missed", () => $("inbox-btn").click()),
      F("Friends", "Community › Friends", "friends requests add friend find people", () => handleGo("?go=friends")),
      F("Messages", "Community › Messages", "messages chat dm", () => $("chat-btn").click()),
      F("Groups", "Community › Groups", "groups teams clubs", () => $("feed-mode-groups").click()),
      F("Contests & tournaments", "Compete", "contests tournaments compete leaderboard prizes", () => $("tab-compete").click()),
      F("Fish race", "Stats", "race racing fish power class rooms", () => { statsOpen("insights"); setTimeout(() => { const r = $("race-card"); if (r && !r.hidden) r.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300); }),
      F("Records", "Stats › Records", "records biggest longest heaviest leaderboard personal best hall of fame", () => statsOpen("records")),
      F("Seasons & rules", "Stats › Seasons", "seasons bag limit size limit regulations keeper open closed", () => statsOpen("seasons")),
      F("Tackle box", "Stats › Tackle", "tackle bait lure rods gear", () => statsOpen("tackle")),
      F("My fish", "Stats › Species", "species collection my fish", () => statsOpen("species")),
      F("Insights", "Stats › Insights", "insights charts stats best time tide year in review", () => statsOpen("insights")),
      F("Fish tank", "Play", "tank aquarium play coins gems shop", () => $("tab-tank").click()),
      F("Boat mode", "Map", "boat speed heading man overboard anchor", () => { const b = document.querySelector("#boat-open"); if (b) { $("tab-map").click(); setTimeout(() => b.click(), 300); } }),
      F("Start a trip", "Home", "trip session start fishing skunk", () => { $("tab-list").click(); setTimeout(() => { const b = $("hq-start"); if (b) b.click(); }, 200); }),
      ...(me && me.isAdmin ? [F("Invite to app", "Me › Invite", "invite access requests members admin", () => $("invite-btn").click())] : [])
    ];
    const norm = s => String(s || "").toLowerCase();
    const matches = (hay, toks) => toks.every(t => hay.includes(t));
    const dateTxt = iso => { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return ""; } };
    function search(text) {
      const toks = norm(text).split(/\s+/).filter(Boolean);
      const spotName = id => { const s = (spots || []).find(x => x.id === id); return s ? s.name : ""; };
      const res = { features: [], spots: [], fish: [], people: [], catches: [] };
      if (!toks.length) return res;
      res.features = features().filter(f => matches(f.words, toks));
      (spots || []).forEach(s => {
        if (matches(norm([s.name, s.spot_type, s.water_type, s.notes, s.access_notes].filter(Boolean).join(" ")), toks))
          res.spots.push({ title: s.name, sub: (isMine(s) ? "Your spot" : "Friend's spot") + (s.spot_type ? " · " + s.spot_type : ""), run: () => goToSpot(s.id, false) });
      });
      const all = Object.values(catchesBySpot || {}).flat();
      const names = new Map();
      (typeof SEASONS !== "undefined" ? SEASONS : []).forEach(f => names.set(f.name.toLowerCase(), { name: f.name, words: (f.match || []).join(" ") }));
      all.forEach(c => { if (c.species) { const n = cap(c.species.trim()); if (!names.has(n.toLowerCase())) names.set(n.toLowerCase(), { name: n, words: "" }); } });
      names.forEach(f => {
        if (!matches(norm(f.name + " " + f.words), toks)) return;
        let n = 0; try { n = all.filter(c => isMine(c) && c.species && (cap(c.species.trim()).toLowerCase() === f.name.toLowerCase() || (typeof seasonFor === "function" && seasonFor(c.species) && seasonFor(c.species).name === f.name))).length; } catch (e) { /* fine */ }
        res.fish.push({ title: f.name, sub: "Species page" + (n ? " · you've caught " + n : ""), run: () => openSpecies(f.name) });
      });
      const people = {}; Object.assign(people, pubProfiles || {}, friendProfiles || {});
      Object.keys(people).forEach(id => {
        const p = people[id]; if (!p || (me && id === me.id)) return;
        if (matches(norm([p.display_name, p.handle, p.home_area].filter(Boolean).join(" ")), toks))
          res.people.push({ title: p.display_name || "@" + p.handle, sub: (p.handle ? "@" + p.handle + " · " : "") + (me && me.friendIds && me.friendIds.has(id) ? "Friend" : "In the app"), run: () => openProfile(id) });
      });
      all.slice().sort((a, b) => String(b.caught_at).localeCompare(String(a.caught_at))).forEach(c => {
        if (matches(norm([c.species, c.notes, c.bait, c.lure, spotName(c.spot_id)].filter(Boolean).join(" ")), toks))
          res.catches.push({ title: (c.species || "Catch") + (c.length_in ? " · " + c.length_in + " in" : ""), sub: [spotName(c.spot_id), dateTxt(c.caught_at), isMine(c) ? "you" : (typeof profName === "function" && profName(c.created_by)) || "a friend"].filter(Boolean).join(" · "), run: () => goToSpot(c.spot_id, false) });
      });
      return res;
    }
    const GROUPS = [["features", "Features", "✨"], ["spots", "Spots", "📍"], ["fish", "Fish", "🐟"], ["people", "People", "🙂"], ["catches", "Catches", "🎣"]];
    // the last few searches come back as chips next time (kept on this phone only)
    const RECENT_KEY = "fm-find-recent";
    const recents = () => { try { const a = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(a) ? a.filter(x => typeof x === "string" && x).slice(0, 5) : []; } catch (e) { return []; } };
    const setRecents = a => { try { if (a.length) localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 5))); else localStorage.removeItem(RECENT_KEY); } catch (e) { /* fine */ } };
    function rememberSearch(t) {
      t = String(t || "").trim().slice(0, 40); if (t.length < 2) return;
      setRecents([t].concat(recents().filter(x => x.toLowerCase() !== t.toLowerCase())));
    }
    function chipRow(words) {
      const row = el("div", "fp-chips");
      words.forEach(w => { const b = el("button", "fp-chip", w); b.type = "button"; b.addEventListener("click", () => { q.value = w; render(); q.focus(); }); row.appendChild(b); });
      return row;
    }
    function render() {
      const text = q.value.trim(); out.innerHTML = "";
      if (!text) {
        const rec = recents();
        if (rec.length) {
          const head = el("div", "fp-labrow"); head.appendChild(el("div", "fp-lab", "Recent"));
          const clr = el("button", "linkbtn fp-clear", "Clear"); clr.type = "button"; clr.setAttribute("aria-label", "Clear recent searches");
          clr.addEventListener("click", () => { setRecents([]); render(); });
          head.appendChild(clr); out.appendChild(head);
          out.appendChild(chipRow(rec));
        }
        out.appendChild(el("div", "fp-lab", "Try"));
        out.appendChild(chipRow(["license", "race", "quiet hours", "tank", "boat mode"]));
        out.appendChild(el("p", "spot-meta fp-hint", "Type a spot, a fish, a friend's name, or something the app does."));
        return;
      }
      const r = search(text); let any = false;
      GROUPS.forEach(([k, label, ic]) => {
        const list = r[k]; if (!list.length) return; any = true;
        out.appendChild(el("div", "fp-lab", label));
        const grp = el("div", "fp-grp");
        list.slice(0, 6).forEach(it => {
          const b = el("button", "fp-it"); b.type = "button";
          b.appendChild(el("span", "fp-ic", ic));
          const d = el("div"); d.appendChild(el("b", null, it.title)); d.appendChild(el("small", null, it.sub || it.where || "")); b.appendChild(d);
          b.addEventListener("click", () => { rememberSearch(q.value); closeFind(); setTimeout(it.run, 0); });
          grp.appendChild(b);
        });
        out.appendChild(grp);
        if (list.length > 6) out.appendChild(el("div", "spot-meta fp-more", `+ ${list.length - 6} more — type a little more to narrow it down.`));
      });
      if (!any) {
        const box = el("div", "empty fp-empty"); box.appendChild(el("div", null, `Nothing found for “${text}”. Try a fish name, a spot, or a friend's name — or one of these:`));
        box.appendChild(chipRow(["license", "race", "tank", "records"]));
        const clr = el("button", "btn small", "Clear search"); clr.type = "button"; clr.addEventListener("click", () => { q.value = ""; render(); q.focus(); });
        box.appendChild(clr); out.appendChild(box);
      }
    }
    function openFind() {
      if (!me) return;
      mc.hidden = true;
      fp.hidden = false; q.value = ""; render();
      try { q.focus(); } catch (e) { /* fine */ }
    }
    function closeFind() { fp.hidden = true; }
    window.openFind = openFind;
    $("find-btn").addEventListener("click", openFind);
    $("find-cancel").addEventListener("click", closeFind);
    q.addEventListener("input", render);
    q.addEventListener("keydown", e => { if (e.key === "Enter") { const first = out.querySelector(".fp-it"); if (first) first.click(); } });
  })();
