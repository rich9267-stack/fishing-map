  // ---- 🗑 Delete my account (setup/54): Settings → offer the CSV export → "are you sure" twice → photo files, then everything else ----
  // Photo files are removed here first (Supabase blocks deleting storage files from SQL); delete_my_account('DELETE') does the rest,
  // including the sign-in account. Admins can't delete themselves from the app.
  let delCounts = null;
  const delPlural = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));
  function delSummary(c) {
    return [delPlural(c.spots || 0, "spot"), delPlural(c.catches || 0, "catch", "catches"), delPlural(c.photos || 0, "photo"),
      delPlural(c.messages || 0, "message"), delPlural(c.friends || 0, "friend")].join(", ") + (c.groups ? ", and " + delPlural(c.groups, "group") + " you made" : "");
  }
  function delReset() {
    $("del-box").hidden = true; $("del-step2").hidden = true; $("del-type").value = ""; $("del-final").disabled = true; $("del-go1").disabled = false;
  }
  async function delOpen() {
    const msg = $("del-msg"); msg.className = "msg"; msg.textContent = "";
    if (!me) return;
    if (me.isAdmin) { msg.textContent = "Admins can't delete their account from the app — it would remove the official tournaments and nobody could approve new people."; return; }
    $("del-box").hidden = false; $("del-step2").hidden = true; $("del-go1").disabled = true;
    $("del-sum").textContent = "Counting your things…";
    const { data, error } = await db.rpc("delete_my_account_preview");
    if (error) {
      $("del-sum").textContent = /function|schema cache|not find/i.test(error.message || "") ? "Deleting accounts isn't switched on yet — try again later." : "Couldn't check right now — check your connection and try again.";
      return;
    }
    delCounts = data || {};
    if (delCounts.admin) { delReset(); msg.textContent = "Admins can't delete their account from the app."; return; }
    $("del-sum").textContent = "This will delete " + delSummary(delCounts) + ".";
    $("del-go1").disabled = false;
  }
  async function delAsk() {
    const ok = await askOk("Delete your account?\n\nThis removes " + delSummary(delCounts || {}) + ", your profile, coins and tank. Friends' catches at your spots are kept.\n\nIt can't be undone.");
    if (!ok) return;
    $("del-step2").hidden = false; $("del-go1").disabled = true; $("del-type").focus();
  }
  async function delFiles() {
    const gone = async (bucket, paths) => { for (let i = 0; i < paths.length; i += 100) { try { await db.storage.from(bucket).remove(paths.slice(i, i + 100)); } catch (e) { /* leftovers are invisible to everyone */ } } };
    const listed = async (bucket, folder) => {
      try { const { data } = await db.storage.from(bucket).list(folder, { limit: 1000 }); return (data || []).filter(f => f && f.name).map(f => folder + "/" + f.name); } catch (e) { return []; }
    };
    const { data: ph } = await db.from("photos").select("path").eq("created_by", me.id);
    await gone("photos", (ph || []).map(p => p.path).filter(Boolean));
    await gone("avatars", await listed("avatars", me.id));
    const { data: gr } = await db.from("groups").select("id").eq("created_by", me.id);
    for (const g of gr || []) await gone("group-avatars", await listed("group-avatars", g.id));
  }
  async function delLocal() {
    try { Object.keys(localStorage).filter(k => /^fm-/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { /* fine */ }
    try { indexedDB.deleteDatabase("fishing-map"); indexedDB.deleteDatabase("fm-stash"); } catch (e) { /* fine */ }
    try { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); const s = r && r.pushManager && await r.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) { /* fine */ }
  }
  async function delNow() {
    if ($("del-type").value.trim().toUpperCase() !== "DELETE") return;
    const msg = $("del-msg"); msg.className = "msg"; msg.textContent = "Deleting… please keep the app open.";
    $("del-final").disabled = true; $("del-cancel").disabled = true;
    try { await delFiles(); } catch (e) { /* the database step still runs */ }
    const { error } = await db.rpc("delete_my_account", { p_confirm: "DELETE" });
    $("del-cancel").disabled = false;
    if (error) {
      msg.textContent = /function|schema cache|not find/i.test(error.message || "") ? "Deleting accounts isn't switched on yet — nothing was removed from your account." : "Couldn't finish: " + (error.message || "check your connection") + ". Try again.";
      $("del-final").disabled = false; return;
    }
    await delLocal();
    try { await signOut(); } catch (e) { /* the account is already gone */ }
    delReset(); msg.textContent = "";
    alert("Your account and everything in it has been deleted. Thanks for fishing with us. 🎣");
  }
  (function delSetup() {
    if (!$("del-btn")) return;
    $("del-btn").addEventListener("click", delOpen);
    $("del-cancel").addEventListener("click", () => { delReset(); $("del-msg").textContent = ""; });
    $("del-go1").addEventListener("click", delAsk);
    $("del-type").addEventListener("input", e => { $("del-final").disabled = e.target.value.trim().toUpperCase() !== "DELETE"; });
    $("del-final").addEventListener("click", delNow);
    const exp = (fn, what) => () => { const n = fn(); $("del-msg").className = "msg"; $("del-msg").textContent = n ? `Saved ${n} ${what}.` : `No ${what} to save.`; };
    $("del-exp-catches").addEventListener("click", exp(exportCatches, "catches"));
    $("del-exp-spots").addEventListener("click", exp(exportSpots, "spots"));
  })();
