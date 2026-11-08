// ---- 🧩 Code loaded only when it is opened (speed plan step 2, v260) ----
// Admin, games, Learn, business pages and the tank screen are not read when the app starts. The first time one is opened its files
// are added to the page (sw.js keeps them on the phone like every other file, so this works offline too). Nothing changes on screen.
// needCode("games") → a promise; codeThen("games", fn) runs fn straight away when the code is already there, else once it has loaded.
const LAZY_CODE = {
  admin: ["js/39-admin-log.js", "js/40-admin-page.js", "js/41-admin-people.js", "js/42-admin-undo.js", "js/43-admin-warn.js",
    "js/44-admin-hide.js", "js/45-admin-official.js", "js/47-admin-gated.js", "js/57-fishid-review.js"],
  games: ["js/51-games.js", "js/52-games-more.js"],
  learn: ["js/62-learn.js"],
  biz: ["js/71-business-pages.js"],
  tank: ["js/72-tank-art.js", "js/73-tank-screen.js"],
  wx: ["js/75-weather-screen.js"]
};
const lazyDone = {}, lazyWait = {}, lazyFileDone = {};
function lazyVer() {   // the same ?v= number as the files loaded at start (bump.sh changes it), so a new version gets the new code
  const s = document.querySelector('script[src*="js/01-core.js"]'), m = s && /[?&]v=(\d+)/.exec(s.getAttribute("src") || "");
  return m ? m[1] : "";
}
function lazyAdd(f) {
  if (lazyFileDone[f]) return Promise.resolve();
  return new Promise((ok, no) => {
    const s = document.createElement("script");
    const text = window.__lazySrc && window.__lazySrc[f];   // the checks (tests/load.js) hand the code over directly instead of a file
    if (typeof text === "string") { s.textContent = text; document.head.appendChild(s); lazyFileDone[f] = true; ok(); return; }
    const v = lazyVer();
    s.src = f + (v ? "?v=" + v : ""); s.async = false;
    s.onload = () => { lazyFileDone[f] = true; ok(); };
    s.onerror = () => { s.remove(); no(new Error("Couldn't load " + f)); };
    document.head.appendChild(s);
  });
}
function needCode(part) {
  if (lazyDone[part]) return Promise.resolve();
  if (!lazyWait[part]) {
    lazyWait[part] = (LAZY_CODE[part] || []).reduce((p, f) => p.then(() => lazyAdd(f)), Promise.resolve())
      .then(() => { lazyDone[part] = true; }, e => { lazyWait[part] = null; throw e; });   // failed (no signal, never saved): the next tap tries again
  }
  return lazyWait[part];
}
function codeThen(part, fn) {
  if (lazyDone[part]) return fn();
  needCode(part).then(fn, () => { if (typeof toast === "function") toast("Couldn't open that — check your signal and try again."); });
}

// The buttons that open these parts (their old listeners lived inside the files that now load later)
(function lazyOpeners() {
  // 📚 Learn: the Home card + its back button (were in js/62)
  const lc = $("learn-card"), lb = $("learn-back");
  if (lc) lc.addEventListener("click", () => codeThen("learn", () => openLearn()));
  if (lb) lb.addEventListener("click", () => showView("list"));
  // 🎮 the Fish race screen's "‹ Games" goes back to the Games list (was in js/51)
  const rb = $("race-back");
  if (rb) rb.addEventListener("click", () => codeThen("games", () => { gamesScreen = "list"; showPlay("games"); window.scrollTo({ top: 0 }); }));
  // 🛡 Admin page: Me › Admin and links like ?go=admin&sec=reports (were in js/40); js/11's listener on the same button runs first
  const ib = $("invite-btn");
  let want = null;
  if (ib) ib.addEventListener("click", () => { const sec = want || "people"; codeThen("admin", () => adminPageShow(sec)); });
  window.adminPageOpen = sec => { want = sec || null; if (ib) ib.click(); want = null; };
})();
