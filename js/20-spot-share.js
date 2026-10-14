  // ---- 📩 Send a spot to one friend (Fishbrain audit item 8; setup/52). The database does the sharing (share_spot / unshare_spot):
  // the friend then sees that one spot with its exact pin and notes — even a private one — and gets a chat message.
  // On the owner's spot card: "📩 Send to a friend" (pick friends, stop sharing). On the friend's card: "Shared with you by …". ----
  let shareRows = [], shareOpen = null, shareBusy = false;
  async function shareLoad() {
    if (!me || typeof db === "undefined" || !db) return;
    try {
      const { data, error } = await db.from("spot_shares").select("id,spot_id,owner,friend,created_at,revoked_at").is("revoked_at", null);
      if (error) throw error;
      shareRows = (data || []).filter(r => !r.revoked_at);
    } catch (e) { /* offline: keep what we had */ }
    if (typeof renderSpots === "function") { try { renderSpots(); } catch (e) { /* list not ready */ } }
  }
  const shareName = id => (typeof profName === "function" && profName(id)) || "a friend";
  // what to show on a spot card
  function spotShareUi(item, s) {
    const toMe = shareRows.find(r => r.spot_id === s.id && r.friend === me.id);
    if (toMe && !isMine(s)) {
      item.appendChild(el("div", "spot-meta spot-shared", `📩 Shared with you by ${shareName(toMe.owner)} — only you can see it.`));
      return;
    }
    if (!isMine(s)) return;
    const mine = shareRows.filter(r => r.spot_id === s.id && r.owner === me.id);
    if (mine.length) item.appendChild(el("div", "spot-meta spot-shared", "📩 Shared with: " + mine.map(r => shareName(r.friend)).join(", ")));
    const open = shareOpen === s.id;
    const btn = el("button", "linkbtn", open ? "▴ Close sharing" : "📩 Send to a friend"); btn.type = "button";
    btn.addEventListener("click", () => { shareOpen = open ? null : s.id; renderSpots(); });
    item.appendChild(btn);
    if (open) item.appendChild(sharePicker(s, mine));
  }
  function sharePicker(s, mine) {
    const box = el("div", "share-box");
    const ids = [...(me.friendIds || [])];
    if (!ids.length) { box.appendChild(el("div", "spot-meta", "Add a friend first (👥 Friends), then you can send them this spot.")); return box; }
    box.appendChild(el("div", "spot-meta", `Only the friend you pick sees ${s.name}'s exact pin${s.notes ? " and notes" : ""}. Your catches there keep their own privacy.`));
    ids.map(id => ({ id, name: shareName(id) })).sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
      const row = el("div", "share-row");
      row.appendChild(el("span", null, f.name));
      const shared = mine.some(r => r.friend === f.id);
      const b = el("button", "btn small" + (shared ? " ghost" : ""), shared ? "✓ Shared · Stop" : "📩 Send"); b.type = "button";
      b.addEventListener("click", async () => {
        if (shareBusy) return;
        const ok = await askOk(shared ? `Stop sharing ${s.name} with ${f.name}? It disappears from their map.`
          : `Send ${s.name} to ${f.name}?\nThey'll see its exact pin${s.notes ? " and notes" : ""}, and get a message from you.`);
        if (!ok) return;
        shareBusy = true; b.disabled = true;
        try {
          const r = await db.rpc(shared ? "unshare_spot" : "share_spot", { p_spot: s.id, p_friend: f.id });
          if (r.error) throw r.error;
          if (typeof toast === "function") toast(shared ? `Stopped sharing with ${f.name}.` : `📩 Sent to ${f.name}.`, 3500);
        } catch (e) {
          const m = String((e && e.message) || "");
          alert(navigator.onLine === false ? "📴 You're offline — try again when you have a connection." : m && m.length < 140 ? m : "That didn't work. Try again in a moment.");
        }
        shareBusy = false;
        await shareLoad();
      });
      row.appendChild(b);
      box.appendChild(row);
    });
    return box;
  }
  // a line for the map pop-up
  function spotShareLine(s) {
    if (!me) return "";
    const toMe = shareRows.find(r => r.spot_id === s.id && r.friend === me.id);
    if (toMe && !isMine(s)) return `📩 Shared with you by ${shareName(toMe.owner)}`;
    const mine = shareRows.filter(r => r.spot_id === s.id && r.owner === me.id);
    return mine.length ? "📩 Shared with " + mine.map(r => shareName(r.friend)).join(", ") : "";
  }
