#!/bin/sh
# Runs every check against ../index.html. Usage: cd tests && npm install (first time only) && sh run-all.sh
cd "$(dirname "$0")" || exit 1
fail=0
for t in test27 test28 test29 test30 test31 test32 test33 test35 test36 test37 test38 test39 test40 test41 test42 test43 test44 test45 test46 test47 test48 test49 test50 test51 test52 test53 test54 test55 test56 test57 test58 test59 test60 test61 test62 test63; do
  if timeout 90 node $t.js > "/tmp/$t.out" 2>&1; then echo "ok   $t"; else echo "FAIL $t (see /tmp/$t.out)"; fail=1; fi
done
if node morning-score.test.mjs > /tmp/morning-score.out 2>&1; then echo "ok   morning-score"; else echo "FAIL morning-score (see /tmp/morning-score.out)"; fail=1; fi
for st in admin none pending blocked error; do
  if ST=$st timeout 90 node test34.js > "/tmp/test34-$st.out" 2>&1; then echo "ok   test34 ($st)"; else echo "FAIL test34 ($st)"; fail=1; fi
done
[ $fail = 0 ] && echo "ALL OK" || echo "SOME FAILED"
exit $fail
