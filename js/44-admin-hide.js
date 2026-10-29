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
// How many photos each reported catch still shows, so "Hide photo only" appears only when it can do something. null = couldn't tell (show the button).
window.adminPhotoShown = async ids => {
  ids = [...new Set((ids || []).filter(Boolean))];
  if (!ids.length) return {};
  try {
    const { data, error } = await db.rpc("admin_photo_state", { p_ids: ids });
    if (error) return null;
    const out = {}; ids.forEach(i => { out[i] = 0; }); (data || []).forEach(r => { out[r.catch_id] = Number(r.shown) || 0; });
    return out;
  } catch (e) { return null; }
};
// ---- Admin → 👀 Sightings (v239, setup/119): recent 🌎 Public sightings; hide one with a reason (owner is told, it leaves "Seen nearby", no coins), or show it again.
window.adminSightingsLoad = async () => {
  const box = document.getElementById("sightings-admin"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("hide_spots")) return;
  box.appendChild(el("div", "spot-meta", "🌎 Public sightings from the last 14 days. Only their name shows to others (in “👀 Seen nearby”). Hide one that is rude, fake or a coin trick; its owner is told your reason."));
  const list = el("div", null, "Loading…"); box.appendChild(list);
  const { data, error } = await db.rpc("admin_public_sightings", { p_days: 14 });
  list.innerHTML = "";
  if (error) { list.appendChild(el("div", "msg err", "Couldn't load: " + error.message)); return; }
  if (!data.length) { list.appendChild(el("div", "spot-meta", "No public sightings lately.")); return; }
  try { await signPhotos(data.filter(r => !r.hidden_at).map(r => r.photo_path).filter(Boolean)); } catch (e) { /* no pictures */ }
  data.forEach(r => {
    const row = el("div", "feed-item");
    if (r.photo_path && !r.hidden_at && picUrl(r.photo_path)) { const im = document.createElement("img"); im.src = picUrl(r.photo_path); im.alt = "Photo of " + r.species; im.loading = "lazy"; im.style.cssText = "width:56px;height:56px;object-fit:cover;border-radius:8px;margin-right:10px;float:left"; row.appendChild(im); }
    row.appendChild(el("div", null, `${r.hidden_at ? "🙈 " : ""}${cap(r.species)}${r.how_many > 1 ? " ×" + r.how_many : ""}`));
    row.appendChild(el("div", "spot-meta", `${r.who || "a member"} · ${new Date(r.seen_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${r.hidden_at ? " · hidden" : ""}`));
    const b = el("button", "btn small", r.hidden_at ? "↩️ Show again" : "🙈 Hide"); b.type = "button";
    b.addEventListener("click", async () => {
      let res;
      if (r.hidden_at) res = await db.rpc("unhide_sighting", { p_id: r.id });
      else {
        const reason = await askReason(`Hide the "${r.species}" sighting from other people? Its owner is told your reason and can still see it. You can show it again later.`, "For example: rude name, not a real sighting", 5, "Hide sighting");
        if (!reason) return;
        res = await db.rpc("hide_sighting", { p_id: r.id, p_reason: reason });
      }
      if (res.error) { alert("Couldn't do that: " + (res.error.message || res.error)); return; }
      if (typeof toast === "function") toast(r.hidden_at ? "Sighting shown again ✓" : "Sighting hidden ✓");
      window.adminSightingsLoad();
    });
    row.appendChild(b);
    list.appendChild(row);
  });
};
