// ---- Monthly totals for wildlife agencies (opt-in). Server: setup/88. LOCKED by the 'monthly_totals' switch in gate_switches.
// People: Settings › "Include my catches in the monthly totals" (off by default; only shown once the switch is open).
// Admins (Dashboard box): Me › Admin › 📊 Totals shows counts by state, species and month. No names, photos, exact spots or per-person numbers;
// a line needs at least 3 different people. Only VERIFIED catches count: a photo + a GPS stamp (100 m or better, taken within 30 minutes of the catch).
let shareTotalsCache = null;   // true/false once known
async function shareTotalsOn() {
  if (shareTotalsCache !== null) return shareTotalsCache;
  try { if (!db || !me) return false; const { data } = await db.rpc("my_share_totals"); shareTotalsCache = data === true; } catch (e) { return false; }
  return shareTotalsCache;
}
async function shareTotalsRender() {
  const box = document.getElementById("share-totals-box"); if (!box) return;
  box.innerHTML = ""; box.hidden = true;
  if (!db || !me) return;
  let open = false;
  try { const { data } = await db.rpc("gate_is_open", { p_name: "monthly_totals" }); open = data === true; } catch (e) { /* hidden */ }
  if (!open) return;
  shareTotalsCache = null;
  const on = await shareTotalsOn();
  box.hidden = false;
  box.appendChild(el("div", "label", "📊 Help wildlife agencies"));
  box.appendChild(el("div", "spot-meta", "Include my catches in the monthly totals. Only totals by month, species and state are shared with state wildlife agencies, like FWC in Florida. Never your name, photos or exact spots. It counts only catches with a photo and a GPS stamp, from the moment you turn it on. Turn it off any time."));
  const lab = el("label", "check-row"), cb = el("input"); cb.type = "checkbox"; cb.checked = on;
  lab.appendChild(cb); lab.appendChild(el("span", "", "Include my catches in the monthly totals"));
  const msg = el("div", "msg");
  cb.addEventListener("change", async () => {
    cb.disabled = true; msg.textContent = "Saving…";
    const { data, error } = await db.rpc("set_share_totals", { p_on: cb.checked });
    cb.disabled = false;
    if (error) { cb.checked = !cb.checked; msg.textContent = "Couldn't save: " + (error.message || error); return; }
    shareTotalsCache = data === true; msg.textContent = data ? "Thank you — turned on." : "Turned off.";
  });
  box.appendChild(lab); box.appendChild(msg);
}
document.getElementById("settings-btn").addEventListener("click", shareTotalsRender);

// ---- Admin: the totals themselves
async function adminTotalsLoad() {
  const box = document.getElementById("totals-admin"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("dashboard")) return;
  box.appendChild(el("div", "label", "Monthly totals for wildlife agencies"));
  let open = false;
  try { const { data } = await db.rpc("gate_is_open", { p_name: "monthly_totals" }); open = data === true; } catch (e) { /* locked */ }
  if (!open) { box.appendChild(el("div", "spot-meta", "🔒 Locked. Monthly totals can't be used until the privacy page and terms say it and the wording has been checked. Richard switches this on when that is done.")); return; }
  box.appendChild(el("div", "spot-meta", "Only people who turned this on, only catches with a photo and a GPS stamp taken at the catch. A line shows only when at least 3 different people are in it. “Other” means outside Florida until more states are added."));
  const now = new Date(), yr = el("select"), mo = el("select"), go = el("button", "btn small", "Show"); go.type = "button";
  yr.setAttribute("aria-label", "Year"); mo.setAttribute("aria-label", "Month");
  for (let y = now.getFullYear(); y >= 2025; y--) { const o = el("option", "", String(y)); o.value = y; yr.appendChild(o); }
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].forEach((n, i) => { const o = el("option", "", n); o.value = i + 1; mo.appendChild(o); });
  yr.value = now.getFullYear(); mo.value = now.getMonth() + 1;
  const out = el("div"); [yr, mo, go, out].forEach(x => box.appendChild(x));
  try { const { data } = await db.rpc("monthly_totals_optins"); if (data != null) box.insertBefore(el("div", "spot-meta", `${data} ${data === 1 ? "person has" : "people have"} turned this on.`), yr); } catch (e) { /* nicety */ }
  go.addEventListener("click", async () => {
    out.innerHTML = "";
    const { data, error } = await db.rpc("monthly_totals", { p_year: parseInt(yr.value, 10), p_month: parseInt(mo.value, 10) });
    if (error) { out.appendChild(el("div", "msg err", error.message || String(error))); return; }
    if (!data.length) { out.appendChild(el("div", "spot-meta", "Nothing to show for that month yet (or fewer than 3 people in each line).")); return; }
    data.forEach(r => out.appendChild(el("div", "spot-meta", `${r.area} · ${r.species}: ${r.catches} ${r.catches === 1 ? "catch" : "catches"}, ${r.fish} fish`)));
    const csv = ["state,species,catches,fish"].concat(data.map(r => [r.area, r.species, r.catches, r.fish].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(","))).join("\n");
    const cp = el("button", "btn ghost small", "📋 Copy as CSV"); cp.type = "button";
    cp.addEventListener("click", async () => { try { await navigator.clipboard.writeText(csv); cp.textContent = "Copied ✓"; } catch (e) { cp.textContent = "Couldn't copy"; } });
    out.appendChild(cp);
  });
}
window.adminTotalsLoad = adminTotalsLoad;
window.shareTotalsOn = shareTotalsOn;
