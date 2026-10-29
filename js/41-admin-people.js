// ---- Admins section of the Admin page (admin controls step 4): make admins, tick their boxes. Server: setup/81 set_admin().
const ADMIN_BOX_WORDS = {
  people: "Approve or decline access requests", invite: "Add people to the invite list", remove_from_list: "Remove people from the list",
  reports: "Reports and removing content", warn: "Warn people", ban: "Ban people", pages: "Club & business pages",
  rules: "Size & bag rules", tournaments: "Official tournaments", official_places: "Official places", delete_spot: "Delete anyone's spot",
  hide_spots: "Hide public spots & sightings", problems: "Problem reports", dashboard: "Dashboard", read_log: "Read the admin log",
  manage_admins: "Manage admins"
};
const ADMIN_GATED_WORDS = {
  correct_coins: "Correct coins & race results"
};
async function adminsLoad() {
  const box = document.getElementById("admins-admin"); if (!box) return;
  box.innerHTML = "";
  if (!adminCan("manage_admins")) return;
  const { data, error } = await db.from("members").select("email,display_name,is_admin,is_owner,powers,status").order("added_at");
  if (error) { box.appendChild(el("div", "msg err", "Couldn't load the list: " + error.message)); return; }
  box.appendChild(el("div", "spot-meta", "Admins start with nothing ticked. Tick only what each person needs. “Full powers” ticks every normal box. The four locked boxes stay with the owner until the privacy page and terms say otherwise."));
  const msg = el("div", "msg"); box.appendChild(msg);
  const say = (t, bad) => { msg.className = "msg" + (bad ? " err" : ""); msg.textContent = t; };
  const save = async (m, make, powers) => {
    const { error: e } = await db.rpc("set_admin", { p_email: m.email, p_make: make, p_powers: powers });
    if (e) { say("Couldn't do that: " + e.message, true); return false; }
    await adminsLoad(); return true;
  };
  data.filter(m => m.is_admin).forEach(m => {
    const card = el("details", "card-sub");
    card.appendChild(el("summary", "sugg-name", (m.display_name || m.email) + (m.is_owner ? " · owner" : " · admin")));
    card.appendChild(el("div", "spot-meta", m.email + (m.is_owner ? " — the owner has every power and cannot be changed." : "")));
    if (m.is_owner) { box.appendChild(card); return; }
    const checks = {};
    Object.keys(ADMIN_BOX_WORDS).forEach(k => {
      const row = el("label", "check-row"), cb = document.createElement("input"); cb.type = "checkbox";
      cb.checked = (m.powers || []).includes(k); cb.disabled = !adminCan(k);   // you can only hand out boxes you hold (the owner holds all)
      checks[k] = cb; row.appendChild(cb); row.appendChild(el("span", null, ADMIN_BOX_WORDS[k]));
      card.appendChild(row);
    });
    Object.keys(ADMIN_GATED_WORDS).forEach(k => {
      const row = el("label", "check-row"), cb = document.createElement("input"); cb.type = "checkbox"; cb.disabled = true;
      row.appendChild(cb); row.appendChild(el("span", "spot-meta", "🔒 " + ADMIN_GATED_WORDS[k] + " (locked)")); card.appendChild(row);
    });
    const btns = el("div", "sugg-btns"); btns.style.marginTop = "8px";
    const full = el("button", "btn ghost small", "Full powers"); full.type = "button";
    full.addEventListener("click", () => Object.keys(checks).forEach(k => { if (!checks[k].disabled) checks[k].checked = true; }));
    const none = el("button", "btn ghost small", "Clear all"); none.type = "button";
    none.addEventListener("click", () => Object.keys(checks).forEach(k => { if (!checks[k].disabled) checks[k].checked = false; }));
    const sv = el("button", "btn small", "Save boxes"); sv.type = "button";
    sv.addEventListener("click", async () => { sv.disabled = true; const ok = await save(m, true, Object.keys(checks).filter(k => checks[k].checked)); if (ok) say("Saved ✓ " + (m.display_name || m.email)); sv.disabled = false; });
    const rm = el("button", "linkbtn danger", "Remove as admin"); rm.type = "button";
    rm.addEventListener("click", async () => { if (!await askOk(`Remove ${m.display_name || m.email} as an admin? They stay a normal member.`)) return; await save(m, false, []); });
    [full, none, sv, rm].forEach(b => btns.appendChild(b)); card.appendChild(btns);
    box.appendChild(card);
  });
  // make a new admin
  const cands = data.filter(m => !m.is_admin && m.status === "approved" && m.display_name);
  box.appendChild(el("div", "label", "Make someone an admin"));
  if (!cands.length) { box.appendChild(el("div", "spot-meta", "No other approved members yet.")); return; }
  const row = el("div", "row"); row.style.gap = "8px";
  const sel = document.createElement("select"); sel.id = "admin-new-pick"; sel.setAttribute("aria-label", "Member to make an admin"); sel.style.flex = "1";
  cands.forEach(m => { const o = document.createElement("option"); o.value = m.email; o.textContent = m.display_name + " — " + m.email; sel.appendChild(o); });
  const go = el("button", "btn small", "Make admin"); go.type = "button"; go.id = "admin-new-go";
  go.addEventListener("click", async () => {
    const m = cands.find(x => x.email === sel.value); if (!m) return;
    if (!await askOk(`Make ${m.display_name} an admin? They start with no boxes ticked.`)) return;
    go.disabled = true; await save(m, true, []); go.disabled = false;
  });
  row.appendChild(sel); row.appendChild(go); box.appendChild(row);
}
window.adminsLoad = adminsLoad;
