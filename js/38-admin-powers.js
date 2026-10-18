// ---- Admin powers (admin controls step 1: the Owner and the names of every admin power)
// Owner = Richard (members.is_owner, set only in the database). Each admin has tick boxes (members.powers -> me.powers at sign-in);
// ask adminCan("ban") etc. instead of me.isAdmin.
const ADMIN_POWERS = ["people", "invite", "remove_from_list", "reports", "warn", "ban", "pages", "rules", "tournaments", "official_places",
  "delete_spot", "hide_spots", "problems", "dashboard", "read_log", "manage_admins"];
const ADMIN_GATED_POWERS = ["open_private_spots", "review_chat", "correct_coins", "delete_person_data"]; // owner only until Legal has checked the wording
function adminCan(power) {
  if (!me || !me.isAdmin) return false;
  if (me.isOwner) return true;
  if (ADMIN_GATED_POWERS.includes(power)) return false;
  if (!ADMIN_POWERS.includes(power)) return false;
  return Array.isArray(me.powers) ? me.powers.includes(power) : true; // same as the database's has_power(); boxes not loaded = show it, the server still refuses
}
function adminAny() { return !!me && me.isAdmin && (me.isOwner || ADMIN_POWERS.some(adminCan)); }   // any box at all => show the Admin page
