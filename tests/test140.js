// Admin controls step 1: Owner + named powers (js/38-admin-powers.js, js/11 sign-in, setup/79).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const js = read("js/38-admin-powers.js");
const run = me => { const ctx = { me }; vm.createContext(ctx); vm.runInContext(js + "\nthis.out = { can: adminCan, P: ADMIN_POWERS, G: ADMIN_GATED_POWERS };", ctx); return ctx.out; };
const owner = run({ isAdmin: true, isOwner: true }), admin = run({ isAdmin: true, isOwner: false }), nobody = run(null), member = run({ isAdmin: false, isOwner: false });
ok(owner.P.length === 16 && owner.G.length === 4, "16 normal powers and 4 gated powers are named");
ok(owner.P.every(p => owner.can(p)) && owner.G.every(p => owner.can(p)), "the owner has every power, gated ones too");
ok(admin.P.every(p => admin.can(p)), "an admin keeps every normal power (same as today)");
ok(admin.G.every(p => !admin.can(p)), "an admin does not get the gated powers");
ok(!admin.can("nonsense"), "an unknown power name is refused for an admin");
ok(!nobody.can("ban") && !member.can("ban"), "signed-out people and ordinary members have no powers");

const s11 = read("js/11-accounts-social.js");
ok(/select\("email,display_name,is_admin,is_owner,status"\)/.test(s11) && /isOwner: !!member\.is_owner && !!member\.is_admin/.test(s11), "sign-in reads the owner flag");
ok(read("index.html").includes("js/38-admin-powers.js") && read("sw.js").includes("./js/38-admin-powers.js"), "new file is in index.html and the offline list");
const names = [...read("setup/79-owner-and-powers.sql").match(/array\[([^\]]+)\]/)[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
ok(JSON.stringify(names) === JSON.stringify([...owner.P, ...owner.G]), "app power names match the database list exactly");
ok(/create unique index[^;]*is_owner/.test(read("setup/79-owner-and-powers.sql")) && /cannot be removed/.test(read("setup/79-owner-and-powers.sql")), "setup/79 has the one-owner rule and the owner guard");
console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
