// ---- Admin controls step 8: fix an official place (Me › Admin › 📍 Places). Server: setup/85.
// Find a place by name or near the map, then rename it, change its kind, move it, switch it off (or on), or put the original back.
// Fixes are kept by the database, so a later data reload doesn't undo them.
const OFFA_KINDS = { ramp: "🚤 Boat ramp", park: "🌳 Park", pier: "🎣 Pier", jetty: "🪨 Jetty", bridge: "🌉 Bridge", dock: "⚓ Dock" };
const OFFA_SOURCE = { "fwc-ramp": "FWC ramp list", "fl-fori": "State parks list", admin: "Added by an admin" };
async function offaAfterChange(points) {   // make this phone forget its copy of the areas touched, so the change shows right away
  try {
    points.forEach(p => { if (p && isFinite(p.lat) && isFinite(p.lng)) delete officialCells[officialCellKey(p.lat, p.lng)]; });
    officialRebuild();
    for (const p of points) if (p && isFinite(p.lat) && isFinite(p.lng)) await loadOfficialSpots({ lat: p.lat, lng: p.lng }, 0.01, 0.01);
  } catch (e) { /* the layer refreshes within a day anyway */ }
}
function offaEditor(row, after) {
  const box = el("div", "feed-item"); box.style.marginTop = "6px";
  const name = el("input"); name.type = "text"; name.value = row.name; name.maxLength = 120; name.setAttribute("aria-label", "Name");
  const kind = el("select"); kind.setAttribute("aria-label", "Kind of place");
  Object.keys(OFFA_KINDS).forEach(k => { const o = el("option", "", OFFA_KINDS[k]); o.value = k; kind.appendChild(o); });
  kind.value = row.kind;
  const lat = el("input"); lat.type = "text"; lat.inputMode = "decimal"; lat.value = row.lat; lat.setAttribute("aria-label", "Latitude");
  const lng = el("input"); lng.type = "text"; lng.inputMode = "decimal"; lng.value = row.lng; lng.setAttribute("aria-label", "Longitude");
  const on = el("input"); on.type = "checkbox"; on.checked = row.active;
  const onLab = el("label", "spot-meta"); onLab.appendChild(on); onLab.appendChild(document.createTextNode(" Show this place to everyone (untick to switch it off)"));
  const centre = el("button", "btn ghost small", "📌 Use the map's centre"); centre.type = "button";
  centre.addEventListener("click", () => {
    if (typeof map === "undefined" || !map) { msg.textContent = "Open the Map once first, then come back."; return; }
    const c = map.getCenter(); lat.value = c.lat.toFixed(6); lng.value = c.lng.toFixed(6); msg.textContent = "Position set to the middle of your map.";
  });
  const save = el("button", "btn small", "Save"); save.type = "button";
  const msg = el("div", "msg");
  [name, kind].forEach(x => box.appendChild(x));
  box.appendChild(el("div", "spot-meta", "Position (latitude, longitude). Pan the map to the right spot, then use the button."));
  [lat, lng, centre, onLab].forEach(x => box.appendChild(x));
  const acts = el("div", "feed-actions"); acts.appendChild(save);
  if (row.edited) {
    const rv = el("button", "btn ghost small", "↩️ Put back the original"); rv.type = "button";
    rv.addEventListener("click", async () => {
      if (!(await askOk("Put back the original name, kind, position and on/off setting of " + row.name + "?"))) return;
      rv.disabled = true;
      const { error } = await db.rpc("admin_official_revert", { p_id: row.id });
      if (error) { rv.disabled = false; msg.textContent = "Couldn't do that: " + (error.message || error); return; }
      await offaAfter([row], after);
    });
    acts.appendChild(rv);
  }
  box.appendChild(acts); box.appendChild(msg);
  save.addEventListener("click", async () => {
    const la = parseFloat(lat.value), ln = parseFloat(lng.value);
    if (!isFinite(la) || !isFinite(ln)) { msg.textContent = "Type the position as numbers, like 26.1234 and -80.1234."; return; }
    save.disabled = true; msg.textContent = "Saving…";
    const { error } = await db.rpc("admin_official_edit", { p_id: row.id, p_name: name.value, p_kind: kind.value, p_lat: la, p_lng: ln, p_active: on.checked });
    save.disabled = false;
    if (error) { msg.textContent = "Couldn't save: " + (error.message || error); return; }
    if (typeof toast === "function") toast("Saved ✓");
    await offaAfter([row, { lat: la, lng: ln }], after);
  });
  return box;
}
async function offaAfter(points, after) { await offaAfterChange(points); if (after) after(); }
function offaCard(row, after, open) {
  const card = el("div", "feed-item");
  card.appendChild(el("div", null, `${OFFA_KINDS[row.kind] || row.kind} — ${row.name}`));
  card.appendChild(el("div", "spot-meta", `${OFFA_SOURCE[row.source] || row.source}${row.county ? " · " + row.county : ""}${row.active ? "" : " · 🚫 switched off"}${row.edited ? " · ✏️ fixed by an admin" : ""}`));
  const fix = el("button", "btn small", "🛠 Fix this place"); fix.type = "button";
  let ed = null;
  const toggle = () => { if (ed) { ed.remove(); ed = null; } else { ed = offaEditor(row, after); card.appendChild(ed); } };
  fix.addEventListener("click", toggle);
  card.appendChild(fix);
  if (open) toggle();
  return card;
}
function offaRun(list, q, lat, lng, openId) {
  list.innerHTML = ""; list.appendChild(el("div", "spot-meta", "Searching…"));
  return db.rpc("admin_official_find", { p_q: q || null, p_lat: lat == null ? null : lat, p_lng: lng == null ? null : lng }).then(({ data, error }) => {
    list.innerHTML = "";
    if (error) { list.appendChild(el("div", "msg err", "Couldn't search: " + (error.message || error))); return; }
    if (!data.length) { list.appendChild(el("div", "spot-meta", "Nothing found.")); return; }
    const again = () => offaRun(list, q, lat, lng);
    data.forEach(r => list.appendChild(offaCard(r, again, openId != null && r.id === openId)));
  });
}
function adminOfficialLoad(openPlace) {
  const box = document.getElementById("official-admin"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("official_places")) return;
  box.appendChild(el("div", "label", "Fix an official place"));
  box.appendChild(el("div", "spot-meta", "Official places are the boat ramps, parks and piers everyone sees with a ✅. Fix a wrong name, kind or position, or switch one off. Your fixes stay even if the state lists are loaded again."));
  const q = el("input"); q.type = "search"; q.placeholder = "Name, for example “Hillsboro”"; q.setAttribute("aria-label", "Search by name");
  const go = el("button", "btn small", "Search"); go.type = "button";
  const near = el("button", "btn ghost small", "📌 Near my map"); near.type = "button";
  const list = el("div");
  go.addEventListener("click", () => { if (!q.value.trim()) { list.innerHTML = ""; list.appendChild(el("div", "spot-meta", "Type part of a name, or use “Near my map”.")); return; } offaRun(list, q.value.trim()); });
  q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go.click(); } });
  near.addEventListener("click", () => {
    const c = typeof map !== "undefined" && map ? map.getCenter() : { lat: LAT, lng: LNG };
    offaRun(list, "", c.lat, c.lng);
  });
  [q, go, near, list].forEach(x => box.appendChild(x));
  if (openPlace) offaRun(list, "", openPlace.lat, openPlace.lng, openPlace.id);
}
// The tap card on the map has a "Fix this place" button for admins: it opens this section on that place.
window.adminOfficialFix = o => { window.adminPageOpen("official"); adminOfficialLoad(o); };
window.adminOfficialLoad = adminOfficialLoad;
