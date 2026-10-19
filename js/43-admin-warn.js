// ---- Admin controls step 6: warn someone. Server: setup/83 (warn_user, table admin_warnings).
// The person gets the warning in their Alerts list and as a phone alert. Warnings are counted on report lines and shown before a ban.
async function adminWarnCounts(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))], out = {};
  if (!ids.length || !(adminCan("warn") || adminCan("ban") || adminCan("reports"))) return out;
  try {
    const { data } = await db.from("admin_warnings").select("user_id").in("user_id", ids);
    (data || []).forEach(r => { out[r.user_id] = (out[r.user_id] || 0) + 1; });
  } catch (e) { /* counts are a nicety */ }
  return out;
}
const adminWarnText = n => n ? `⚠️ ${n} earlier warning${n === 1 ? "" : "s"}` : "";
async function adminWarn(userId, who, reportId) {
  const reason = await askReason(`Warn ${who || "this person"}? They get your reason as an alert on their phone and in their Alerts list. Write it plainly and kindly.`, "For example: please keep comments friendly", 5, "Send warning");
  if (!reason) return false;
  const { error } = await db.rpc("warn_user", { p_user: userId, p_reason: reason, p_report: reportId || null });
  if (error) { alert("Couldn't send the warning: " + (error.message || error)); return false; }
  if (typeof toast === "function") toast("Warning sent ✓");
  return true;
}
window.adminWarn = adminWarn;
window.adminWarnCounts = adminWarnCounts;
