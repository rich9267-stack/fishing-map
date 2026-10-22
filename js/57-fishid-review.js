// ---- 🧠 Fish ID training review (own Fish ID model, step 2; setup/101): owner-only section on the Admin page ----
// Shows what training data there would be: members who opted in, photo count, photos per fish (biggest first), fish under 30 photos,
// and a "Preview 12" button per fish. Photos are shown from the existing storage links only; nothing is downloaded, exported or kept.
const FIR_MIN = 30;   // fewer photos than this = too few to train on
// Group the list by fish name (trimmed, any capitals); the name shown is the spelling used most. Biggest first.
function firGroup(rows) {
  const by = {};
  (rows || []).forEach(r => {
    const name = String(r.species || "").trim(); if (!name || !r.path) return;
    const k = name.toLowerCase(), g = by[k] || (by[k] = { key: k, spell: {}, paths: [] });
    g.spell[name] = (g.spell[name] || 0) + 1; g.paths.push(r.path);
  });
  return Object.values(by).map(g => ({ name: Object.keys(g.spell).sort((a, b) => g.spell[b] - g.spell[a])[0],
    spellings: Object.keys(g.spell).length, paths: g.paths, n: g.paths.length }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
function firPick(list, k) {   // k random items, no repeats
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}
async function firPreview(g, box) {
  box.innerHTML = "";
  const paths = firPick(g.paths, 12);
  box.appendChild(el("div", "spot-meta", `Loading ${paths.length} photo${paths.length === 1 ? "" : "s"} of ${g.name}…`));
  const { data, error } = await db.storage.from("photos").createSignedUrls(paths, 600);
  box.innerHTML = "";
  if (error) { box.appendChild(el("div", "msg err", "Couldn't open the photos — check your signal.")); return; }
  const links = (data || []).filter(l => l.signedUrl);
  box.appendChild(el("div", "spot-meta", `${links.length} random photo${links.length === 1 ? "" : "s"} saved as "${g.name}". Does each one look like that fish?` +
    (g.spellings > 1 ? ` (This name was typed ${g.spellings} different ways.)` : "")));
  const grid = el("div", "fir-grid");
  links.forEach(l => { const img = el("img"); img.src = l.signedUrl; img.alt = "Catch photo saved as " + g.name; img.loading = "lazy"; grid.appendChild(img); });
  box.appendChild(grid);
  if (links.length < paths.length) box.appendChild(el("div", "spot-meta", `${paths.length - links.length} couldn't be opened (maybe just deleted).`));
}
async function adminFishIdLoad() {
  const box = document.getElementById("fishid-admin"); if (!box) return;
  box.innerHTML = "";
  if (!me || !me.isOwner) return;
  box.appendChild(el("div", "label", "🧠 Fish ID training photos (owner only)"));
  box.appendChild(el("div", "spot-meta", "What our own Fish ID could learn from today: Friends and Public catch photos of members who ticked \"Help improve Fish ID\". Never Private. Nothing is copied — if someone deletes a photo or unticks the box, it drops out of here too."));
  const out = el("div"); box.appendChild(out);
  out.appendChild(el("div", "spot-meta", "Counting…"));
  const [mem, list] = await Promise.all([db.rpc("fishid_training_members"), db.rpc("fishid_training_list")]);
  out.innerHTML = "";
  if (mem.error || list.error) { out.appendChild(el("div", "msg err", "Couldn't load it — check your signal and try again.")); return; }
  const groups = firGroup(list.data), photos = groups.reduce((s, g) => s + g.n, 0), few = groups.filter(g => g.n < FIR_MIN);
  out.appendChild(el("div", "fir-stats", `👥 ${mem.data || 0} member${mem.data === 1 ? "" : "s"} opted in · 📷 ${photos} photo${photos === 1 ? "" : "s"} · 🐟 ${groups.length} fish`));
  if (!groups.length) { out.appendChild(el("div", "spot-meta", "No training photos yet.")); return; }
  out.appendChild(el("div", "spot-meta", few.length
    ? `⚠️ ${few.length} of ${groups.length} fish have fewer than ${FIR_MIN} photos (too few to train on): ${few.map(g => g.name).join(", ")}.`
    : `✅ Every fish has at least ${FIR_MIN} photos.`));
  const tbl = el("table", "fir-table"), head = el("tr");
  ["Fish", "Photos", ""].forEach(t => head.appendChild(el("th", null, t)));
  tbl.appendChild(head);
  const prev = el("div", "fir-preview");
  groups.forEach(g => {
    const tr = el("tr");
    tr.appendChild(el("td", null, g.name));
    tr.appendChild(el("td", g.n < FIR_MIN ? "fir-few" : null, g.n < FIR_MIN ? `${g.n} ⚠️` : String(g.n)));
    const td = el("td"), b = el("button", "btn ghost small", "Preview 12"); b.type = "button";
    b.setAttribute("aria-label", "Preview 12 random photos of " + g.name);
    b.addEventListener("click", () => { firPreview(g, prev); prev.scrollIntoView({ behavior: "smooth", block: "start" }); });
    td.appendChild(b); tr.appendChild(td); tbl.appendChild(tr);
  });
  out.appendChild(tbl);
  out.appendChild(prev);
}
window.adminFishIdLoad = adminFishIdLoad;
