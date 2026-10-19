// ---- Admin controls step 9: open one private spot (Me › Admin › 🔒 Private spots). Server: setup/86.
// LOCKED by a master switch in the database (gate_switches 'private_spots'), closed until the privacy page and terms say it
// and Legal has looked at the wording. While closed, nobody can use it, not even the owner.
// Every opening needs a typed reason (10+ letters) and is written to the Log (who, which spot, when, why; never the coordinates).
async function adminPrivateLoad() {
  const box = document.getElementById("private-admin"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("open_private_spots")) return;
  box.appendChild(el("div", "label", "Private spots"));
  let open = false;
  try { const { data } = await db.rpc("gate_is_open", { p_name: "private_spots" }); open = data === true; } catch (e) { /* treated as locked */ }
  if (!open) {
    box.appendChild(el("div", "spot-meta", "🔒 Locked. Private spots can't be opened by anyone until the privacy page and terms say it and the wording has been checked. Richard switches this on when that is done."));
    return;
  }
  box.appendChild(el("div", "spot-meta", "Open one private spot at a time, only to check that catches are reported correctly. You must type a reason, and every opening is written to the Log with your name, the spot and your reason."));
  const q = el("input"); q.type = "search"; q.placeholder = "Part of the spot's name"; q.setAttribute("aria-label", "Spot name");
  const go = el("button", "btn small", "Search"); go.type = "button";
  const list = el("div"), shown = el("div");
  [q, go, list, shown].forEach(x => box.appendChild(x));
  q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go.click(); } });
  go.addEventListener("click", async () => {
    list.innerHTML = ""; shown.innerHTML = "";
    const { data, error } = await db.rpc("admin_private_spot_find", { p_q: q.value });
    if (error) { list.appendChild(el("div", "msg err", error.message || String(error))); return; }
    if (!data.length) { list.appendChild(el("div", "spot-meta", "No private spot with that name.")); return; }
    data.forEach(r => {
      const card = el("div", "feed-item");
      card.appendChild(el("div", null, r.name));
      card.appendChild(el("div", "spot-meta", `Owner: ${r.owner_name || "unknown"} · ${r.spot_type} · ${r.water_type}`));
      const b = el("button", "btn small", "🔓 Open (needs a reason)"); b.type = "button";
      b.addEventListener("click", async () => {
        const reason = await askReason(`Open ${r.owner_name || "this person"}'s private spot "${r.name}"? Your name, the spot and your reason are written to the Log.`, "For example: checking a catch reported at this spot", 10, "Open spot");
        if (!reason) return;
        const { data: d, error: e2 } = await db.rpc("admin_open_private_spot", { p_spot: r.id, p_reason: reason });
        if (e2) { alert("Couldn't open it: " + (e2.message || e2)); return; }
        const s = d && d[0]; if (!s) return;
        shown.innerHTML = "";
        const out = el("div", "feed-item");
        out.appendChild(el("div", null, `🔓 ${s.name}`));
        out.appendChild(el("div", "spot-meta", `Owner: ${s.owner_name || "unknown"} · ${s.spot_type} · ${s.water_type}`));
        if (s.notes) out.appendChild(el("div", "spot-meta", s.notes));
        if (isFinite(s.lat) && isFinite(s.lng)) {
          const a = el("a", "btn ghost small", "Show on Google Maps ↗"); a.href = `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`; a.target = "_blank"; a.rel = "noopener";
          out.appendChild(a);
        }
        shown.appendChild(out);
      });
      card.appendChild(b); list.appendChild(card);
    });
  });
}
window.adminPrivateLoad = adminPrivateLoad;
