// Admin controls step 2: the admin log (js/39-admin-log.js, setup/80).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/80-admin-log.sql");
ok(/create policy "read admin log"[^;]*has_power\('read_log'\)/.test(sql), "only people with the read_log power can read the log");
ok(/revoke all on public\.admin_log from anon, authenticated;\s*grant select on public\.admin_log to authenticated/.test(sql), "signed-in users get read-only access");
ok(/before update or delete on public\.admin_log/.test(sql) && /cannot be changed/.test(sql), "lines cannot be edited or deleted from the app");
ok(!/lat|lng|coord/i.test(sql.replace(/--.*$/gm, "")), "the log never stores coordinates");
const tables = ["members", "reports", "catches", "catch_comments", "spots", "official_spots", "host_pages", "host_page_renames", "host_limits", "fish_rules", "problem_reports", "auto_hidden", "tournaments", "tournament_series"];
ok(tables.every(t => sql.split("\n").some(l => /^create trigger \w+ after [a-z ]+ on public\.(\w+) /.test(l) && l.includes(" on public." + t + " "))), "all 14 admin tables have a log trigger");

const js = read("js/39-admin-log.js");
const calls = [];
const ctx = { adminCan: () => true, window: {}, document: { getElementById: () => null }, el: () => ({}), db: {} };
vm.createContext(ctx); vm.runInContext(js + "\nthis.out = { line: adminLogLine, words: ADMIN_LOG_WORDS };", ctx);
const line = ctx.out.line({ at: "2026-10-18T12:00:00Z", actor_email: "rich9267@gmail.com", action: "banned", target_type: "member", target_id: "a@b.com", detail: "approved -> blocked" });
ok(/rich9267@gmail.com banned: a@b.com/.test(line), "log line reads in plain words: " + line);
ok(["invite_added", "removed_from_list", "content_removed", "spot_deleted", "tournament_created"].every(a => ctx.out.words[a]), "main actions have plain-word labels");

ok(read("index.html").includes('id="admin-log"') && read("index.html").includes("js/39-admin-log.js") && read("sw.js").includes("./js/39-admin-log.js"), "viewer is in index.html and the offline list");
ok(/adminLogLoad/.test(read("js/11-accounts-social.js")), "Invite screen loads the log");
ok(/if \(!adminCan\("read_log"\)\) return;/.test(js), "the viewer only shows for people with the read_log power");
console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
