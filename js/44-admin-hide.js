// ---- Admin controls step 7: hide a public spot. Server: setup/84 (hide_spot, unhide_spot, hide_catch_photos, remove_content 'message').
// A hidden spot disappears for everyone except its owner, who gets an alert with the reason. Hide is reversible (Removed section).
async function adminHideSpot(spotId, name) {
  if (!adminCan("hide_spots")) return false;
  const reason = await askReason(`Hide "${name || "this spot"}" from other people? Its owner is told your reason and can still see it. You can bring it back later.`, "For example: not a real fishing place", 5, "Hide spot");
  if (!reason) return false;
  const { error } = await db.rpc("hide_spot", { p_id: spotId, p_reason: reason });
  if (error) { alert("Couldn't hide the spot: " + (error.message || error)); return false; }
  if (typeof toast === "function") toast("Spot hidden ✓");
  try { if (typeof map !== "undefined" && map && map.closePopup) map.closePopup(); if (typeof loadSpots === "function") await loadSpots(); if (typeof loadPublic === "function") loadPublic(); } catch (e) { /* lists refresh next time */ }
  return true;
}
window.adminHideSpot = adminHideSpot;
