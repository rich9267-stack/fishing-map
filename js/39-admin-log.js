// ---- Admin log viewer (admin controls step 2, setup/80). Read-only: lines are written by database triggers.
const ADMIN_LOG_WORDS = {
  invite_added: "added to the invite list", removed_from_list: "removed from the list", access_approved: "approved access",
  access_declined: "declined access", banned: "banned", status_changed: "changed status", admin_made: "made an admin",
  admin_removed: "removed as admin", person_warned: "warned", content_restored: "brought back a removed item", spot_restored: "brought back a spot", page_closed: "closed a page", admin_boxes_changed: "changed an admin's boxes", report_resolved: "resolved a report", content_removed: "removed",
  spot_deleted: "deleted a spot", official_place_made: "made an official place", official_place_changed: "changed an official place",
  official_place_removed: "removed an official place", page_removed: "removed a page", page_approved: "approved a page",
  page_declined: "declined a page", rename_approved: "approved a page rename", rename_declined: "declined a page rename",
  business_allowance_set: "set a business-page allowance", rule_added: "added a size & bag rule", rule_changed: "changed a size & bag rule",
  problem_done: "marked a problem done", flagged_kept: "kept a flagged item", flagged_removed: "removed a flagged item",
  tournament_created: "created a tournament", tournament_cancelled: "cancelled a tournament",
  series_created: "created a monthly series", series_stopped: "stopped a monthly series"
};
function adminLogLine(r) {
  const what = ADMIN_LOG_WORDS[r.action] || r.action.replace(/_/g, " ");
  const who = r.actor_email || "an admin";
  const about = r.target_type === "member" && r.target_id && r.target_id.includes("@") ? r.target_id : (r.detail && r.action !== "banned" && r.action !== "access_approved" && r.action !== "access_declined" ? r.detail : "");
  const extra = r.detail && r.target_type === "member" ? " (" + r.detail + ")" : "";
  return `${new Date(r.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · ${who} ${what}${about ? ": " + about : ""}${extra}`;
}
async function adminLogLoad() {
  const box = document.getElementById("admin-log"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("read_log")) return;
  const det = el("details", "card-sub");
  det.appendChild(el("summary", "label", "📜 Admin log (last 50)"));
  const list = el("div", "spot-meta", "Loading…");
  det.appendChild(list);
  box.appendChild(det);
  det.addEventListener("toggle", async () => {
    if (!det.open) return;
    const { data, error } = await db.from("admin_log").select("at,actor_email,action,target_type,target_id,detail").order("at", { ascending: false }).limit(50);
    list.innerHTML = "";
    if (error) { list.textContent = "Couldn't load the log."; return; }
    if (!data.length) { list.textContent = "Nothing logged yet. Actions you and other admins take will show up here."; return; }
    data.forEach(r => list.appendChild(el("div", "feed-item", adminLogLine(r))));
  });
}
window.adminLogLoad = adminLogLoad;
