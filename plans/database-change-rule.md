# Rule: changing database tables without breaking the backup (Oct 18)

_Set by Richard after the Oct 18 weekly backup stopped because two new tables (`host_page_renames`, `tutorials_seen`) appeared and the backup was hard-wired to exactly 51 tables._

## What changed in the backup
The weekly backup no longer counts on a fixed number of tables. It backs up **every table in the public schema except five**: `app_secrets`, `push_config`, `push_subscriptions`, `official_spots`, `protected_zones`. New tables are picked up automatically and named in the Sunday message ("New table added to the backup: ..."). Table count on Oct 18: 53.

## Rule for every database change (Engineer, and anyone writing a `setup/NN` file)
1. **Adding a normal table (user data):** do nothing for the backup. It is included next Sunday. In the progress log, note "new table X" so Richard sees it in the backup message.
2. **Adding a table that holds secrets** (keys, tokens, passwords, push credentials): tell Richard in plain words and ask IT to add it to the left-out list **before** the next Sunday run. The backup also guards itself: a new table with secret-looking columns (secret, token, password, private_key, api_key, auth, p256dh, endpoint) is left out and reported by name.
3. **Adding big public reference data** (like `official_spots`): ask IT whether to leave it out of the backup (it can be re-imported).
4. **Renaming or deleting a table:** nothing to change in the backup, but say so in the progress log so a table "disappearing" from the next backup is not mistaken for lost data.
5. After any change that adds or removes tables, **Tester/IT can run "IT: run the weekly backup now"** to confirm it still ends with "BACKUP OK".
6. Only the five left-out tables are ever changed in the exclusion list, and only by IT, never by editing the live database.

## Where the list lives
The left-out list is written inside the scheduled task "Fishing Map weekly database backup" (Sunday 8:47 AM Eastern). Changing it = tell IT.
