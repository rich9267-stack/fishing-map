// ---- Admin page (admin controls step 3): the old Invite screen, now with a row of section buttons (Me › Admin).
// The sections themselves are the same blocks as before (filled by js/11, js/10, js/28, js/39); this file only shows one at a time.
const ADMIN_SECTIONS = [
  { id: "people", label: "👥 People", power: "people" },
  { id: "reports", label: "🚩 Reports", power: "reports" },
  { id: "pages", label: "📄 Pages", power: "pages" },
  { id: "rules", label: "🐟 Rules", power: "rules" },
  { id: "problems", label: "🛠 Problems", power: "problems" },
  { id: "dashboard", label: "📊 Dashboard", power: "dashboard" },
  { id: "official", label: "📍 Places", power: "official_places" },
  { id: "coins", label: "💰 Coins", power: "correct_coins" },
  { id: "removed", label: "↩️ Removed", any: ["reports", "delete_spot", "pages"] },
  { id: "admins", label: "🔑 Admins", power: "manage_admins" },
  { id: "log", label: "📜 Log", power: "read_log" },
  { id: "fishid", label: "🧠 Fish ID", power: "fishid_training" }   // owner only (not an admin power, so adminCan is true only for the Owner)
];
let adminSec = "people";
function adminPageShow(sec) {
  const card = document.getElementById("invite-card"), nav = document.getElementById("admin-nav"); if (!card || !nav) return;
  const allowed = ADMIN_SECTIONS.filter(s => s.any ? s.any.some(adminCan) : adminCan(s.power));
  if (sec === "problems" && allowed.some(s => s.id === "problems")) { if (typeof goProblems === "function") goProblems(); return; }
  if (!allowed.some(s => s.id === sec)) sec = allowed.length ? allowed[0].id : "people";
  adminSec = sec;
  nav.innerHTML = "";
  allowed.forEach(s => {
    const b = el("button", "fchip" + (s.id === sec ? " on" : ""), s.label); b.type = "button"; b.dataset.asec = s.id;
    b.setAttribute("role", "tab"); b.setAttribute("aria-selected", s.id === sec ? "true" : "false");
    b.addEventListener("click", () => adminPageShow(s.id));
    nav.appendChild(b);
  });
  card.querySelectorAll("div[data-asec]").forEach(d => { d.hidden = d.dataset.asec !== sec; });
  if (sec === "removed" && typeof window.adminUndoLoad === "function") window.adminUndoLoad();
  if (sec === "official" && typeof window.adminOfficialLoad === "function") window.adminOfficialLoad();
  if (sec === "coins" && typeof window.adminCoinsLoad === "function") window.adminCoinsLoad();
  if (sec === "fishid" && typeof window.adminFishIdLoad === "function") window.adminFishIdLoad();
  if (sec === "admins" && typeof window.adminsLoad === "function") window.adminsLoad();
  if (sec === "log") { const det = document.querySelector("#admin-log details"); if (det && !det.open) det.open = true; }
}
// The Me row and the old Invite button both open the page on People; a link like ?go=admin&sec=reports opens that section.
document.getElementById("invite-btn").addEventListener("click", () => adminPageShow(adminSecWant || "people"));
let adminSecWant = null;
window.adminPageOpen = sec => { adminSecWant = sec || null; document.getElementById("invite-btn").click(); adminSecWant = null; };
window.adminPageShow = adminPageShow;
