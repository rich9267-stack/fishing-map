// ---- 🧠 Fish ID training review (own Fish ID model, steps 2–3; setup/101, setup/104): owner-only section on the Admin page ----
// Shows what training data there would be: members who opted in, photo count, photos per fish (biggest first), fish under 30 photos,
// and a "Preview 12" button per fish. Photos are shown from the existing storage links only; nothing is downloaded, exported or kept.
// Step 3: the owner can flag a catch's photos "wrong fish" / "can't tell" (stores only catch id + flag) and merge name spellings
// for training counts only (members' catches are never changed). Counts "after flags" leave flagged photos out.
const FIR_MIN = 30;   // fewer photos than this = too few to train on
const FIR_FLAGS = { wrong: "❌ Wrong fish", unsure: "❓ Can't tell" };
let fir = { rows: [], flags: {}, names: {} };   // flags: catch_id → 'wrong'/'unsure'; names: lowercase name → name it counts as
// Follow the owner's merges ("snok" → "Snook"). Returns { key, name, merged }.
function firResolve(species, names) {
  let name = String(species || "").trim(), k = name.toLowerCase(), merged = false;
  for (let i = 0; i < 5 && names && names[k]; i++) {
    const to = String(names[k]).trim(), k2 = to.toLowerCase();
    name = to; merged = true; if (k2 === k) break; k = k2;
  }
  return { key: k, name, merged };
}
// Group the list by fish name (trimmed, any capitals, after merges); the name shown is the merge target or the spelling used most.
// n = all photos, ok = photos not flagged. Biggest first (by photos after flags).
function firGroup(rows, names, flags) {
  const by = {};
  flags = flags || {};
  (rows || []).forEach(r => {
    if (!String(r.species || "").trim() || !r.path) return;
    const res = firResolve(r.species, names), g = by[res.key] || (by[res.key] = { key: res.key, spell: {}, raw: {}, items: [] });
    const shown = res.merged ? res.name : String(r.species).trim();
    g.spell[shown] = (g.spell[shown] || 0) + (res.merged ? 1e6 : 1);   // a merge target always wins
    g.raw[String(r.species).trim()] = 1;
    g.items.push({ catch_id: r.catch_id, path: r.path });
  });
  return Object.values(by).map(g => {
    const ok = g.items.filter(it => !flags[it.catch_id]);
    return { key: g.key, name: Object.keys(g.spell).sort((a, b) => g.spell[b] - g.spell[a])[0], spellings: Object.keys(g.raw).length,
      items: g.items, okItems: ok, paths: g.items.map(it => it.path), n: g.items.length, ok: ok.length };
  }).sort((a, b) => b.ok - a.ok || b.n - a.n || a.name.localeCompare(b.name));
}
function firPick(list, k) {   // k random items, no repeats
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}
// Save a flag (or take it off), then redraw the counts. Only the catch id + flag are stored.
async function firSetFlag(catchId, flag, box) {
  const { error } = await db.rpc("fishid_training_set_flag", { p_catch: catchId, p_flag: flag || null });
  if (error) { if (typeof toast === "function") toast("Couldn't save — check your signal."); return false; }
  if (flag) fir.flags[catchId] = flag; else delete fir.flags[catchId];
  (box || document).querySelectorAll(`.fir-card[data-catch="${catchId}"]`).forEach(firCardState);
  if (fir.redraw) fir.redraw();
  return true;
}
function firCardState(card) {
  const f = fir.flags[card.dataset.catch] || "";
  card.classList.toggle("fir-flagged", !!f);
  card.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.flag === f)));
  const tag = card.querySelector(".fir-tag"); if (tag) tag.textContent = f ? FIR_FLAGS[f] : "";
}
async function firShowPhotos(items, box, title, g) {
  box.innerHTML = "";
  box.appendChild(el("div", "spot-meta", `Loading ${items.length} photo${items.length === 1 ? "" : "s"} of ${g.name}…`));
  const { data, error } = await db.storage.from("photos").createSignedUrls(items.map(it => it.path), 600);
  box.innerHTML = "";
  if (error) { box.appendChild(el("div", "msg err", "Couldn't open the photos — check your signal.")); return; }
  const byPath = {}; (data || []).forEach(l => { if (l.signedUrl) byPath[l.path] = l.signedUrl; });
  const shown = items.filter(it => byPath[it.path]);
  box.appendChild(el("div", "spot-meta", title(shown.length) + (g.spellings > 1 ? ` (This name was typed ${g.spellings} different ways.)` : "")));
  const grid = el("div", "fir-grid");
  shown.forEach(it => {
    const card = el("div", "fir-card"); card.dataset.catch = it.catch_id;
    const img = el("img"); img.src = byPath[it.path]; img.alt = "Catch photo saved as " + g.name; img.loading = "lazy"; card.appendChild(img);
    card.appendChild(el("div", "fir-tag"));
    const bar = el("div", "fir-flagbar");
    [["", "✅", "Looks right"], ["wrong", "❌", "Wrong fish"], ["unsure", "❓", "Can't tell"]].forEach(([f, icon, words]) => {
      const b = el("button", "btn ghost small", icon); b.type = "button"; b.dataset.flag = f; b.title = words;
      b.setAttribute("aria-label", words + " — photo saved as " + g.name);
      b.addEventListener("click", () => firSetFlag(it.catch_id, f, box));
      bar.appendChild(b);
    });
    card.appendChild(bar); grid.appendChild(card); firCardState(card);
  });
  box.appendChild(grid);
  if (shown.length < items.length) box.appendChild(el("div", "spot-meta", `${items.length - shown.length} couldn't be opened (maybe just deleted).`));
}
async function firPreview(g, box) {
  const flagged = g.items.filter(it => fir.flags[it.catch_id]);
  await firShowPhotos(firPick(g.okItems, 12), box, k => `${k} random photo${k === 1 ? "" : "s"} saved as "${g.name}". Does each one look like that fish? Tap ❌ wrong fish or ❓ can't tell to leave it out of training (✅ undoes).`, g);
  if (flagged.length) {
    const b = el("button", "btn ghost small", `See the ${flagged.length} flagged`); b.type = "button";
    b.addEventListener("click", () => firShowPhotos(flagged.slice(0, 24), box, k => `${k} flagged photo${k === 1 ? "" : "s"} of "${g.name}" (left out of training). Tap ✅ to put one back.`, g));
    box.appendChild(b);
  }
}
// Merge: count this fish's name as another name (training counts only).
function firMergeForm(g, groups, box) {
  box.innerHTML = "";
  box.appendChild(el("div", "label", `Count "${g.name}" as…`));
  box.appendChild(el("div", "spot-meta", "Only changes how training photos are counted. Members' catches keep the name they typed."));
  const inp = el("input"); inp.type = "text"; inp.maxLength = 80; inp.placeholder = "e.g. Snook"; inp.setAttribute("aria-label", "Name to count it as");
  const listId = "fir-names"; inp.setAttribute("list", listId);
  const dl = el("datalist"); dl.id = listId;
  groups.filter(o => o.key !== g.key).forEach(o => { const op = el("option"); op.value = o.name; dl.appendChild(op); });
  const save = el("button", "btn small", "Save"); save.type = "button";
  const msg = el("div", "spot-meta");
  save.addEventListener("click", async () => {
    const to = inp.value.trim(); if (!to) { msg.textContent = "Type the name to count it as."; return; }
    save.disabled = true;
    const { error } = await db.rpc("fishid_training_set_name", { p_from: g.key, p_to: to });
    save.disabled = false;
    if (error) { msg.textContent = "Couldn't save — check your signal."; return; }
    fir.names[g.key] = to; box.innerHTML = "";
    box.appendChild(el("div", "spot-meta", `✅ "${g.name}" now counts as "${to}".`));
    if (fir.redraw) fir.redraw();
  });
  box.appendChild(inp); box.appendChild(dl); box.appendChild(save); box.appendChild(msg);
  inp.focus();
}
async function adminFishIdLoad() {
  const box = document.getElementById("fishid-admin"); if (!box) return;
  box.innerHTML = "";
  if (!me || !me.isOwner) return;
  box.appendChild(el("div", "label", "🧠 Fish ID training photos (owner only)"));
  box.appendChild(el("div", "spot-meta", "What our own Fish ID could learn from today: Friends and Public catch photos of members who ticked \"Help improve Fish ID\". Never Private. Nothing is copied — if someone deletes a photo or unticks the box, it drops out of here too."));
  const out = el("div"); box.appendChild(out);
  out.appendChild(el("div", "spot-meta", "Counting…"));
  const [mem, list, marks] = await Promise.all([db.rpc("fishid_training_members"), db.rpc("fishid_training_list"), db.rpc("fishid_training_marks")]);
  out.innerHTML = "";
  if (mem.error || list.error || marks.error) { out.appendChild(el("div", "msg err", "Couldn't load it — check your signal and try again.")); return; }
  fir = { rows: list.data || [], flags: {}, names: {} };
  ((marks.data && marks.data.flags) || []).forEach(f => { fir.flags[f.catch_id] = f.flag; });
  ((marks.data && marks.data.names) || []).forEach(m => { fir.names[m.from_name] = m.to_name; });
  const counts = el("div"), prev = el("div", "fir-preview");
  out.appendChild(counts); out.appendChild(prev);
  fir.redraw = () => firCounts(counts, prev, mem.data || 0);
  fir.redraw();
}
function firCounts(out, prev, members) {
  out.innerHTML = "";
  const groups = firGroup(fir.rows, fir.names, fir.flags), photos = groups.reduce((s, g) => s + g.n, 0), ok = groups.reduce((s, g) => s + g.ok, 0);
  const few = groups.filter(g => g.ok < FIR_MIN);
  out.appendChild(el("div", "fir-stats", `👥 ${members} member${members === 1 ? "" : "s"} opted in · 📷 ${photos} photo${photos === 1 ? "" : "s"}` +
    (ok < photos ? ` (${ok} after flags)` : "") + ` · 🐟 ${groups.length} fish`));
  if (!groups.length) { out.appendChild(el("div", "spot-meta", "No training photos yet.")); return; }
  out.appendChild(el("div", "spot-meta", few.length
    ? `⚠️ ${few.length} of ${groups.length} fish have fewer than ${FIR_MIN} photos after flags (too few to train on): ${few.map(g => g.name).join(", ")}.`
    : `✅ Every fish has at least ${FIR_MIN} photos after flags.`));
  const tbl = el("table", "fir-table"), head = el("tr");
  ["Fish", "Photos", "After flags", ""].forEach(t => head.appendChild(el("th", null, t)));
  tbl.appendChild(head);
  groups.forEach(g => {
    const tr = el("tr");
    tr.appendChild(el("td", null, g.name));
    tr.appendChild(el("td", null, String(g.n)));
    tr.appendChild(el("td", g.ok < FIR_MIN ? "fir-few" : null, g.ok < FIR_MIN ? `${g.ok} ⚠️` : String(g.ok)));
    const td = el("td", "fir-acts"), b = el("button", "btn ghost small", "Preview 12"); b.type = "button";
    b.setAttribute("aria-label", "Preview 12 random photos of " + g.name);
    b.addEventListener("click", () => { firPreview(g, prev); prev.scrollIntoView({ behavior: "smooth", block: "start" }); });
    const m = el("button", "btn ghost small", "Merge"); m.type = "button";
    m.setAttribute("aria-label", "Count " + g.name + " as another name");
    m.addEventListener("click", () => { firMergeForm(g, groups, prev); prev.scrollIntoView({ behavior: "smooth", block: "start" }); });
    td.appendChild(b); td.appendChild(m); tr.appendChild(td); tbl.appendChild(tr);
  });
  out.appendChild(tbl);
  const merges = Object.keys(fir.names).sort();
  if (merges.length) {
    out.appendChild(el("div", "label", "Merged names (training counts only)"));
    merges.forEach(k => {
      const row = el("div", "fir-merge", `"${k}" counts as "${fir.names[k]}" `), u = el("button", "btn ghost small", "Undo"); u.type = "button";
      u.addEventListener("click", async () => {
        u.disabled = true;
        const { error } = await db.rpc("fishid_training_set_name", { p_from: k, p_to: null });
        u.disabled = false;
        if (error) { if (typeof toast === "function") toast("Couldn't save — check your signal."); return; }
        delete fir.names[k]; firCounts(out, prev, members);
      });
      row.appendChild(u); out.appendChild(row);
    });
  }
  const nf = new Set(fir.rows.filter(r => fir.flags[r.catch_id]).map(r => r.catch_id)).size;
  if (nf) out.appendChild(el("div", "spot-meta", `🚩 ${nf} catch${nf === 1 ? "" : "es"} flagged and left out of training (open a fish's Preview to see or undo them).`));
}
window.adminFishIdLoad = adminFishIdLoad;
