// ---- Community screen, "Clean Social" look (redesign step 4; docs/fishing-map-redesign/DESIGN-HANDOFF.md) ----
// Layout only. The sub-tab engine in js/26 (comSub / comOpen / comMark), the feeds, plans and every old id stay as they were; this file adds
// a header with icons (Search, Friends & groups, Messages, your picture) and the "Who's going" circles, which press / read the old pieces.
(function communityScreen() {
  const view = $("view-feed"); if (!view) return;
  const ic = n => (typeof iconSvg === "function" ? iconSvg(n) : "");

  // ---- header: "Community" + icons ----
  const title = view.querySelector(".page-title");
  const head = el("div", "cm-head"); head.id = "cm-head";
  view.insertBefore(head, view.firstChild);
  if (title) head.appendChild(title);
  const icons = el("div", "cm-icons"); head.appendChild(icons);
  function iconBtn(id, svg, label, fn) {
    const b = el("button", "cm-ib"); b.type = "button"; b.id = id; b.setAttribute("aria-label", label); b.innerHTML = svg;
    b.addEventListener("click", fn); icons.appendChild(b); return b;
  }
  iconBtn("cm-search", ic("search"), "Find anything — spots, fish, people, catches", () => $("find-btn").click());
  const fr = iconBtn("cm-friends", ic("users"), "Friends and groups", () => comOpen("friends"));
  const ms = iconBtn("cm-messages", ic("chat"), "Messages", () => comOpen("messages"));
  iconBtn("cm-help", ic("help"), "Help for this screen", () => $("help-btn").click());
  const me2 = iconBtn("cm-me", "", "Me — profile, settings, alerts", () => $("me-btn").click()); me2.classList.add("cm-me");
  // unread numbers: copy the badges the sub-tab bar already keeps
  [["com-b-friends", fr], ["com-b-messages", ms]].forEach(([src, btn]) => {
    const badge = el("span", "nav-badge"); badge.hidden = true; btn.appendChild(badge);
    const paint = () => { const s = $(src); badge.hidden = !s || s.hidden || !s.textContent; badge.textContent = s ? s.textContent : ""; };
    const s = $(src); if (s) new MutationObserver(paint).observe(s, { attributes: true, attributeFilter: ["hidden"], childList: true, characterData: true, subtree: true });
    paint();
  });
  // my picture: a copy of the one in the top bar, kept in step with it
  const meBox = $("me-avatar");
  const copyAvatar = () => { me2.innerHTML = ""; if (meBox) [...meBox.childNodes].forEach(n => me2.appendChild(n.cloneNode(true))); const b = $("me-badge"); if (b && !b.hidden) { const c = el("span", "nav-badge", b.textContent); me2.appendChild(c); } };
  if (meBox) new MutationObserver(copyAvatar).observe(meBox, { childList: true, subtree: true });
  copyAvatar();

  // ---- Who's going: circles (Plan a trip first, then each planned trip, then Past trips) ----
  const card = $("feed-plans-card"), list = $("plan-list"); if (!card || !list) return;
  const strip = el("div", "hn-stories cm-stories"); strip.id = "cm-stories";
  card.insertBefore(strip, list);
  function story(label, inner, onClick, cls) {
    const b = el("button", "hn-story" + (cls ? " " + cls : "")); b.type = "button";
    const ring = el("span", "hn-ring"); if (typeof inner === "string") ring.innerHTML = inner; else ring.appendChild(inner);
    b.appendChild(ring); b.appendChild(el("span", "hn-story-l", label)); b.addEventListener("click", onClick); return b;
  }
  const dayOf = d => { const t = new Date(); t.setHours(0, 0, 0, 0); const x = new Date(d); x.setHours(0, 0, 0, 0); const n = Math.round((x - t) / 86400000); return n === 0 ? "Today" : n === 1 ? "Tmrw" : x.toLocaleDateString([], { weekday: "short" }); };
  function renderStories() {
    strip.innerHTML = "";
    strip.appendChild(story("Plan a trip", ic("plus"), () => $("plan-add").click(), "hn-add"));
    const ps = (typeof plans !== "undefined" && plans) || [];
    ps.forEach((pl, i) => {
      const mineP = !!(me && pl.created_by === me.id), name = mineP ? "You" : String(pl.author || "Friend").split(" ")[0];
      const av = typeof personAvatar === "function" ? personAvatar(pl.created_by, pl.author || "?", 56) : el("span", null, "?");
      strip.appendChild(story(`${name} · ${dayOf(pl.plan_at)}`, av, () => {
        card.classList.add("cm-open");
        const item = list.children[i]; if (item) item.scrollIntoView({ behavior: "smooth", block: "center" });
      }, "hn-friend"));
    });
    strip.appendChild(story("Past trips", ic("clock"), () => comOpen("trips"), "hn-add"));
  }
  renderStories();
  new MutationObserver(renderStories).observe(list, { childList: true });
  // the full trip cards (I'm in, chat, contest, review) open under the circles when you tap a circle; tap the same row again to fold them
  const fold = el("button", "linkbtn cm-fold", "Hide trip details"); fold.type = "button";
  fold.addEventListener("click", () => card.classList.remove("cm-open"));
  card.appendChild(fold);
})();
