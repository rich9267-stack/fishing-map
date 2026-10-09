#!/bin/sh
# Runs every check against ../index.html. Usage: cd tests && npm install (first time only) && sh run-all.sh
cd "$(dirname "$0")" || exit 1
fail=0
for t in test27 test28 test29 test30 test31 test32 test33 test35 test36 test37; do
  if timeout 90 node $t.js > "/tmp/$t.out" 2>&1; then echo "ok   $t"; else echo "FAIL $t (see /tmp/$t.out)"; fail=1; fi
done
for st in admin none pending blocked error; do
  if ST=$st timeout 90 node test34.js > "/tmp/test34-$st.out" 2>&1; then echo "ok   test34 ($st)"; else echo "FAIL test34 ($st)"; fail=1; fi
done
[ $fail = 0 ] && echo "ALL OK" || echo "SOME FAILED"
exit $fail
