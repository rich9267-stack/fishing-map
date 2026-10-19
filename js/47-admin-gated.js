// ---- Admin controls step 10: correct coins/gems (and so race results, whose coins are ledger lines). Server: setup/87.
// LOCKED by the master switch 'coin_corrections' in gate_switches, closed until Richard opens it. While closed nobody can use it, not even the owner.
// Needs a typed reason (10+ letters) and is written to the Log.
// (Reading a reported chat was built and then DROPPED on Oct 18: it would break the private-chat promise.)
async function adminGateOpen(name) {
  try { const { data } = await db.rpc("gate_is_open", { p_name: name }); return data === true; } catch (e) { return false; }
}
const adminLockedNote = what => el("div", "spot-meta", `🔒 Locked. ${what} can't be used by anyone until the privacy page and terms say it and the wording has been checked. Richard switches this on when that is done.`);

async function adminCoinsLoad() {
  const box = document.getElementById("coins-admin"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("correct_coins")) return;
  box.appendChild(el("div", "label", "Correct coins or gems"));
  if (!(await adminGateOpen("coin_corrections"))) { box.appendChild(adminLockedNote("Coin corrections")); return; }
  box.appendChild(el("div", "spot-meta", "Nothing is edited. A correction adds a new line to the person's coin history with your reason, so the history stays honest. Use it when cheating or a bug is noticed."));
  const q = el("input"); q.type = "search"; q.placeholder = "Name or email"; q.setAttribute("aria-label", "Find a person");
  const go = el("button", "btn small", "Find"); go.type = "button";
  const list = el("div"); [q, go, list].forEach(x => box.appendChild(x));
  q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go.click(); } });
  go.addEventListener("click", async () => {
    list.innerHTML = "";
    const { data, error } = await db.rpc("admin_coin_person", { p_q: q.value });
    if (error) { list.appendChild(el("div", "msg err", error.message || String(error))); return; }
    if (!data.length) { list.appendChild(el("div", "spot-meta", "Nobody found.")); return; }
    data.forEach(p => list.appendChild(adminCoinCard(p, () => go.click())));
  });
}
function adminCoinCard(p, after) {
  const card = el("div", "feed-item");
  card.appendChild(el("div", null, p.name));
  card.appendChild(el("div", "spot-meta", `${p.email} · 🪙 ${p.coins} coins · 💎 ${p.gems} gems`));
  const hist = el("div"), acts = el("div", "feed-actions");
  const showH = el("button", "btn ghost small", "History"); showH.type = "button";
  showH.addEventListener("click", async () => {
    hist.innerHTML = "";
    const { data, error } = await db.rpc("admin_coin_history", { p_user: p.user_id });
    if (error) { hist.appendChild(el("div", "msg err", error.message || String(error))); return; }
    (data || []).forEach(h => hist.appendChild(el("div", "spot-meta", `${new Date(h.at).toLocaleDateString([], { month: "short", day: "numeric" })} · ${h.currency} ${h.amount > 0 ? "+" : ""}${h.amount} · ${h.reason}${h.note ? " — " + h.note : ""}`)));
    if (!data || !data.length) hist.appendChild(el("div", "spot-meta", "No history yet."));
  });
  const cur = el("select"); cur.setAttribute("aria-label", "Coins or gems");
  ["coins", "gems"].forEach(c => { const o = el("option", "", c); o.value = c; cur.appendChild(o); });
  const num = el("input"); num.type = "text"; num.inputMode = "numeric"; num.placeholder = "+50 or -20"; num.setAttribute("aria-label", "Amount to add or take away");
  const fix = el("button", "btn small", "Apply…"); fix.type = "button";
  fix.addEventListener("click", async () => {
    const amt = parseInt(num.value, 10);
    if (!isFinite(amt) || amt === 0) { alert("Type how many to add (like 50) or take away (like -20)."); return; }
    const reason = await askReason(`${amt > 0 ? "Add" : "Take away"} ${Math.abs(amt)} ${cur.value} ${amt > 0 ? "to" : "from"} ${p.name}? Your name and reason are written to the Log.`, "For example: refund for a race that glitched", 10, "Apply correction");
    if (!reason) return;
    const { data, error } = await db.rpc("admin_coin_correct", { p_user: p.user_id, p_currency: cur.value, p_amount: amt, p_reason: reason });
    if (error) { alert("Couldn't correct it: " + (error.message || error)); return; }
    if (typeof toast === "function") toast(`Done ✓ New balance: ${data}`);
    after();
  });
  const frm = el("div"); [cur, num, fix].forEach(x => frm.appendChild(x));
  acts.appendChild(showH);
  [acts, frm, hist].forEach(x => card.appendChild(x));
  return card;
}
window.adminCoinsLoad = adminCoinsLoad;
