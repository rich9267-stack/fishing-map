// ---- Own small header on Play, Compete and Stats (redesign step 6; docs/fishing-map-redesign/DESIGN-HANDOFF.md) ----
// Same header as Community (js/64): the page title on the left; Search, Help and my picture on the right. They press the buttons in the old shared
// top bar (which is hidden on these pages by body.on-page), so every old link and handler still works.
(function pageHeads() {
  const ic = n => (typeof iconSvg === "function" ? iconSvg(n) : "");
  const meBox = $("me-avatar");
  const pickers = [];
  function addIcons(head) {
    const icons = el("div", "cm-icons"); head.appendChild(icons);
    const mk = (label, svg, fn) => { const b = el("button", "cm-ib"); b.type = "button"; b.setAttribute("aria-label", label); b.innerHTML = svg; b.addEventListener("click", fn); icons.appendChild(b); return b; };
    mk("Find anything — spots, fish, people, catches", ic("search"), () => $("find-btn").click());
    mk("Help for this screen", ic("help"), () => $("help-btn").click());
    icons.appendChild(bellBtn());
    mk("Settings", ic("gear"), () => $("gear-btn").click());
    const me2 = mk("Me — profile, settings, alerts", "", () => $("me-btn").click()); me2.classList.add("cm-me");
    pickers.push(me2);
  }
  const copyAvatar = () => pickers.forEach(b => {
    b.innerHTML = ""; if (meBox) [...meBox.childNodes].forEach(n => b.appendChild(n.cloneNode(true)));
    const mb = $("me-badge"); if (mb && !mb.hidden) b.appendChild(el("span", "nav-badge", mb.textContent));
  });
  ["view-tank", "view-compete", "view-insights", "view-seasons"].forEach(id => {
    const view = $(id), title = view && view.querySelector(".page-title"); if (!title) return;
    let head = title.parentElement;
    if (!head.classList.contains("play-head")) {   // Play already has a row for its title and coin wallet; the others get a new one
      head = el("div", "cm-head"); title.parentNode.insertBefore(head, title); head.appendChild(title);
    } else head.classList.add("cm-head");
    addIcons(head);
  });
  if (meBox) new MutationObserver(copyAvatar).observe(meBox, { childList: true, subtree: true });
  copyAvatar();
})();
