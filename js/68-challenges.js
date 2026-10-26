// ---- 🎯 Weekly challenges (v212, setup/110): a card at the top of Compete ----
// The same 3 challenges for everyone each week (Monday to Sunday night, New York time). The database picks them, counts your
// photographed catches and trips, and pays: coins for each one done, gems for finishing all of them before the week ends.
// The app only asks "claim_challenges" and shows the answer (same idea as the catch coins in js/14).
let chState = null, chBusy = false, chAt = 0;
window.chWeeksDone = 0;
async function chClaim(force) {
  if (chBusy || !me || !db || !db.rpc) return;
  if (!force && Date.now() - chAt < 30000) return;
  chBusy = true;
  try {
    const r = await db.rpc("claim_challenges");
    if (r.error || !r.data || !Array.isArray(r.data.items)) throw (r.error || new Error("no challenges"));
    chState = r.data; chAt = Date.now(); window.chWeeksDone = +r.data.weeks_done || 0;
    if (r.data.wallet && typeof r.data.wallet.coins === "number" && typeof walletDraw === "function") { wallet = Object.assign({}, wallet || {}, r.data.wallet); walletDraw(); }
    if ((r.data.added || []).length && typeof walletToast === "function") walletToast(r.data.added);
  } catch (e) { /* offline, or the database step isn't there yet: the card stays hidden, nothing is lost */ }
  chBusy = false;
  chDraw();
}
function chLeft(ends) {
  const ms = new Date(ends) - Date.now(); if (!(ms > 0)) return "Ended";
  const h = Math.floor(ms / 3600000), d = Math.floor(h / 24);
  return d >= 1 ? `${d}d ${h % 24}h left` : h >= 1 ? `${h}h left` : `${Math.max(1, Math.round(ms / 60000))}m left`;
}
function chDraw() {
  const card = $("ch-card"); if (!card) return;
  card.hidden = !chState;
  if (!chState) return;
  const items = chState.items, done = items.filter(x => x.done).length, all = done === items.length;
  $("ch-left").textContent = chLeft(chState.ends_at);
  const list = $("ch-list"); list.innerHTML = "";
  items.forEach(x => {
    const row = el("div", "ch-row" + (x.done ? " done" : ""));
    row.appendChild(el("span", "ch-tick", x.done ? "✓" : `${x.progress}/${x.goal}`));
    const mid = el("div", "ch-mid");
    mid.appendChild(el("div", "ch-title", x.title));
    const bar = el("div", "ch-bar"), fill = el("span"); fill.style.width = Math.round(100 * x.progress / x.goal) + "%"; bar.appendChild(fill); mid.appendChild(bar);
    row.appendChild(mid);
    row.appendChild(el("span", "ch-pay", x.done ? "Paid" : `🪙 ${x.coins}`));
    list.appendChild(row);
  });
  const bonus = $("ch-bonus");
  bonus.className = "ch-bonus" + (all ? " done" : "");
  bonus.textContent = all ? `💎 ${chState.week_gems} earned — all ${items.length} done this week!` : `Finish all ${items.length} before Sunday night: 💎 ${chState.week_gems}  (${done} of ${items.length} done)`;
  $("ch-note").textContent = "Only catches with a photo count, logged before the week ends." + (window.chWeeksDone ? ` Full weeks so far: ${window.chWeeksDone}.` : "");
}
(function chCard() {
  const view = $("view-compete"), contests = $("contests"); if (!view || !contests) return;
  const card = el("div", "card ch-card"); card.id = "ch-card"; card.hidden = true;
  card.innerHTML = '<div class="ch-head"><div class="label">🎯 This week\'s challenges</div><span class="ch-left" id="ch-left"></span></div>' +
    '<div id="ch-list"></div><div class="ch-bonus" id="ch-bonus"></div><div class="spot-meta" id="ch-note"></div>';
  view.insertBefore(card, contests);
  new MutationObserver(() => { if (!view.hidden) chClaim(); }).observe(view, { attributes: true, attributeFilter: ["hidden"] });
  setInterval(() => { if (chState) $("ch-left").textContent = chLeft(chState.ends_at); }, 60000);
})();
