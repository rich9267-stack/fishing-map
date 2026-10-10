#!/bin/sh
# Ships a new version to phones: bumps the cache name in sw.js AND the ?v= number on every css/js file in index.html.
# Usage: sh bump.sh
cd "$(dirname "$0")" || exit 1
cur=$(sed -n 's/.*fishing-map-v\([0-9][0-9]*\).*/\1/p' sw.js | head -1)
new=$((cur + 1))
sed -i "s/fishing-map-v$cur\"/fishing-map-v$new\"/" sw.js
sed -i "s/\(\(css\|js\)\/[^\"?]*\)?v=[0-9]*/\1?v=$new/g" index.html
echo "bumped v$cur -> v$new"; grep -c "?v=$new" index.html
