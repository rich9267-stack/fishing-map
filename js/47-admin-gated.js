// ---- Admin controls step 10 (first part): correct coins/gems, review a reported chat. Server: setup/87.
// Both are LOCKED by master switches in the database (gate_switches 'coin_corrections' and 'chat_review'), closed until the
// privacy page and terms say so and Legal has looked at the wording. While closed nobody can use them, not even the owner.
// Every use needs a typed reason (10+ letters) and is written to the Log (never message text).
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

async function adminChatLoad() {
  const box = document.getElementById("chat-admin"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("review_chat")) return;
  box.appendChild(el("div", "label", "Review a reported chat"));
  if (!(await adminGateOpen("chat_review"))) { box.appendChild(adminLockedNote("Chat review")); return; }
  box.appendChild(el("div", "spot-meta", "Only a chat tied to an open report about a message. You read it yourself (never AI), you must type a reason, and the opening is written to the Log without the message text."));
  const list = el("div"), shown = el("div"); box.appendChild(list); box.appendChild(shown);
  const { data, error } = await db.rpc("admin_reported_chats");
  if (error) { list.appendChild(el("div", "msg err", error.message || String(error))); return; }
  if (!data.length) { list.appendChild(el("div", "spot-meta", "No open reports about chat messages.")); return; }
  data.forEach(r => {
    const card = el("div", "feed-item");
    card.appendChild(el("div", null, `⚑ ${r.reason} — about ${r.about_name || "someone"}`));
    card.appendChild(el("div", "spot-meta", `Reported by ${r.reporter_name || "someone"} · ${new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}`));
    const b = el("button", "btn small", "🔓 Read this chat (needs a reason)"); b.type = "button";
    b.addEventListener("click", async () => {
      const reason = await askReason("Read the chat between these two people? Your name, the report and your reason are written to the Log.", "For example: checking a harassment report", 10, "Open chat");
      if (!reason) return;
      const { data: msgs, error: e2 } = await db.rpc("admin_open_reported_chat", { p_report: r.report_id, p_reason: reason });
      if (e2) { alert("Couldn't open it: " + (e2.message || e2)); return; }
      shown.innerHTML = "";
      const out = el("div", "feed-item");
      out.appendChild(el("div", "label", "Latest messages (newest first)"));
      msgs.forEach(m => out.appendChild(el("div", "spot-meta", `${m.is_reported ? "⚑ " : ""}${m.sender_name || "someone"} · ${new Date(m.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${m.removed ? " (removed)" : ""}: ${m.body}`)));
      shown.appendChild(out);
    });
    card.appendChild(b); list.appendChild(card);
  });
}
window.adminCoinsLoad = adminCoinsLoad;
window.adminChatLoad = adminChatLoad;
