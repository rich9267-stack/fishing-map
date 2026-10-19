// ---- Admin controls step 5: "Removed" section (bring things back) + safer bans (written reason, second confirm). Server: setup/82.
// In-app box that asks for a typed reason. Resolves to the text, or null if cancelled.
function askReason(title, hint, minLen, goLabel) {
  return new Promise(done => {
    const prev = document.activeElement;
    const bg = el("div", "ask-bg"), box = el("div", "ask-box");
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    const msg = el("div", "ask-text", title), ta = document.createElement("textarea");
    ta.maxLength = 150; ta.rows = 3; ta.placeholder = hint || ""; ta.setAttribute("aria-label", "Reason"); ta.style.width = "100%"; ta.style.marginTop = "8px";
    const err = el("div", "msg err");
    const row = el("div", "ask-btns"), bNo = el("button", "btn ghost", "Cancel"), bYes = el("button", "btn danger", goLabel || "Continue");
    bNo.type = bYes.type = "button";
    row.appendChild(bNo); row.appendChild(bYes);
    [msg, ta, err, row].forEach(n => box.appendChild(n)); bg.appendChild(box);
    const end = v => { bg.remove(); if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* fine */ } } done(v); };
    bNo.addEventListener("click", () => end(null));
    bYes.addEventListener("click", () => {
      const v = ta.value.trim();
      if (v.length < (minLen || 5)) { err.textContent = "Please write a reason (at least " + (minLen || 5) + " letters)."; return; }
      end(v);
    });
    document.body.appendChild(bg); ta.focus();
  });
}
// Ban: written reason first, then a second "are you sure" that repeats the reason. The reason goes in the admin log.
async function adminBan(userId, who) {
  const reason = await askReason(`Ban ${who || "this person"}? Write why. This goes in the admin log.`, "For example: posting spam in comments");
  if (!reason) return false;
  let warned = ""; try { const wc = await adminWarnCounts([userId]); warned = adminWarnText(wc[userId]); } catch (e) { /* fine */ }
  if (!await askOk(`Ban ${who || "this person"} from the app?\n\nReason: ${reason}${warned ? "\n" + warned : "\nNo earlier warnings. Consider a warning first."}\n\nThey lose all access. You can approve them again later from the member list.`)) return false;
  const { error } = await db.rpc("ban_user", { p_user: userId, p_reason: reason });
  if (error) { alert("Couldn't ban: " + (error.message || error)); return false; }
  return true;
}
const REMOVED_KIND = { catch: "🎣 Catch", comment: "💬 Comment", spot: "📍 Spot", page: "📄 Page" };
const REMOVED_RPC = { catch: ["restore_content", id => ({ p_type: "catch", p_id: id })], comment: ["restore_content", id => ({ p_type: "comment", p_id: id })],
  spot: ["restore_spot", id => ({ p_id: id })], page: ["restore_host_page", id => ({ p_id: id })] };
async function adminUndoLoad() {
  const box = document.getElementById("removed-admin"); if (!box) return;
  box.innerHTML = "";
  if (!(adminCan("reports") || adminCan("delete_spot") || adminCan("pages"))) return;
  box.appendChild(el("div", "spot-meta", "Things an admin removed in the last 30 days. “Bring back” puts them back as they were."));
  const list = el("div", null, "Loading…"); box.appendChild(list);
  const { data, error } = await db.rpc("removed_items", { p_days: 30 });
  list.innerHTML = "";
  if (error) { list.appendChild(el("div", "msg err", "Couldn't load: " + error.message)); return; }
  if (!data.length) { list.appendChild(el("div", "spot-meta", "Nothing removed lately.")); return; }
  data.forEach(r => {
    const row = el("div", "feed-item");
    row.appendChild(el("div", null, `${REMOVED_KIND[r.kind] || r.kind}: ${r.label || "(no text)"}`));
    row.appendChild(el("div", "spot-meta", `${r.who ? "From " + r.who + " · " : ""}removed ${new Date(r.removed_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${r.removed_by ? " by " + r.removed_by : ""}`));
    const b = el("button", "btn small", "↩️ Bring back"); b.type = "button";
    b.addEventListener("click", async () => {
      const m = REMOVED_RPC[r.kind]; if (!m) return;
      b.disabled = true;
      const { error: e2 } = await db.rpc(m[0], m[1](r.id));
      if (e2) { alert("Couldn't bring it back: " + (e2.message || e2)); b.disabled = false; return; }
      try { if (r.kind === "spot" && typeof loadSpots === "function") { await loadSpots(); if (typeof loadCatches === "function") loadCatches(); } } catch (e) { /* the list reloads next time */ }
      adminUndoLoad();
    });
    row.appendChild(b); box.appendChild(row);
  });
}
window.adminUndoLoad = adminUndoLoad;
window.adminBan = adminBan;
