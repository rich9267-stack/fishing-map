  // ---- 🧠 Help improve Fish ID (own Fish ID model, step 1; setup/97): Settings → Your data checkbox ----
  // Opted in = one row in fishid_training_optin (own row only). Off by default. Only Friends + Public catches are ever used, never Private;
  // deleting a catch or the account takes its photos out (nothing is copied). The owner-only list is the database function fishid_training_list().
  let fitBusy = false;
  function fitSay(t, bad) { const m = $("fit-msg"); if (m) { m.className = bad ? "msg err" : "msg"; m.textContent = t || ""; } }
  const fitMissing = e => /relation|schema cache|not find|does not exist/i.test((e && e.message) || "");
  // Show the saved state (called whenever Settings opens)
  async function fitLoad() {
    const box = $("fit-on"); if (!box) return;
    box.checked = false; fitSay("");
    if (!me) { box.disabled = true; return; }
    box.disabled = true;
    const { data, error } = await db.from("fishid_training_optin").select("user_id").eq("user_id", me.id).maybeSingle();
    if (error) { fitSay(fitMissing(error) ? "This isn't switched on yet — try again later." : "Couldn't check right now — check your signal.", true); return; }
    box.checked = !!data; box.disabled = false;
  }
  async function fitChange() {
    const box = $("fit-on"); if (!box || !me || fitBusy) return;
    const want = box.checked; fitBusy = true; box.disabled = true; fitSay("");
    const { error } = want ? await db.from("fishid_training_optin").insert({ user_id: me.id })
      : await db.from("fishid_training_optin").delete().eq("user_id", me.id);
    fitBusy = false; box.disabled = false;
    if (error && !(want && /duplicate|unique/i.test(error.message || ""))) {
      box.checked = !want;   // it did not save, so show the real state
      fitSay(fitMissing(error) ? "This isn't switched on yet — nothing was changed." : "Couldn't save that — check your signal and try again.", true);
      return;
    }
    fitSay(want ? "Thanks! Your Friends and Public catch photos can help train Fish ID. Turn it off any time." : "Turned off. Your photos are no longer used.");
  }
  (function fitSetup() {
    if (!$("fit-on")) return;
    $("fit-on").addEventListener("change", fitChange);
    $("settings-btn").addEventListener("click", fitLoad);
  })();
