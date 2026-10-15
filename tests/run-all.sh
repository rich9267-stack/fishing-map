#!/bin/sh
# Runs every check against ../index.html. Usage: cd tests && npm install (first time only) && sh run-all.sh
cd "$(dirname "$0")" || exit 1
fail=0
for t in test27 test28 test29 test30 test31 test32 test33 test35 test36 test37 test38 test39 test40 test41 test42 test43 test44 test45 test46 test47 test48 test49 test50 test51 test52 test53 test54 test55 test56 test57 test58 test59 test60 test61 test62 test63 test64 test65 test66 test67 test68 test69 test70 test71 test72 test73 test74 test75 test76 test77 test78 test79 test80 test81 test82 test83 test84 test85 test86 test87 test88 test89 test90 test91 test92 test93 test94 test95 test96 test97 test98 test99 test100 test101 test102 test103 test104 test105 test106 test107 test108 test109 test110 test112 test117; do
  if timeout 90 node $t.js > "/tmp/$t.out" 2>&1; then echo "ok   $t"; else echo "FAIL $t (see /tmp/$t.out)"; fail=1; fi
done
if node morning-score.test.mjs > /tmp/morning-score.out 2>&1; then echo "ok   morning-score"; else echo "FAIL morning-score (see /tmp/morning-score.out)"; fail=1; fi
for st in admin none pending blocked error; do
  if ST=$st timeout 90 node test34.js > "/tmp/test34-$st.out" 2>&1; then echo "ok   test34 ($st)"; else echo "FAIL test34 ($st)"; fail=1; fi
done
for st in admin approved; do
  if ST=$st timeout 90 node test111.js > "/tmp/test111-$st.out" 2>&1; then echo "ok   test111 ($st)"; else echo "FAIL test111 ($st)"; fail=1; fi
done
for m in fresh home away; do
  case $m in fresh) e="X=1";; home) e="HOME_SET=1";; away) e="HOME_SET=1 GPS=tampa";; esac
  if env $e timeout 90 node test113.js > "/tmp/test113-$m.out" 2>&1; then echo "ok   test113 ($m)"; else echo "FAIL test113 ($m)"; fail=1; fi
done
for m in fresh home away; do
  case $m in fresh) e="X=1";; home) e="HOME_SET=1";; away) e="HOME_SET=1 GPS=tampa";; esac
  if env $e timeout 90 node test114.js > "/tmp/test114-$m.out" 2>&1; then echo "ok   test114 ($m)"; else echo "FAIL test114 ($m)"; fail=1; fi
done
for m in fresh away tampa fortmyers; do
  case $m in fresh) e="X=1";; away) e="HOME_SET=1 GPS=tampa";; tampa) e="HOME_AT=tampa";; fortmyers) e="HOME_AT=fortmyers";; esac
  if env $e timeout 90 node test115.js > "/tmp/test115-$m.out" 2>&1; then echo "ok   test115 ($m)"; else echo "FAIL test115 ($m)"; fail=1; fi
done
for m in fresh home away; do
  case $m in fresh) e="X=1";; home) e="HOME_SET=1";; away) e="HOME_SET=1 GPS=tampa";; esac
  if env $e timeout 90 node test116.js > "/tmp/test116-$m.out" 2>&1; then echo "ok   test116 ($m)"; else echo "FAIL test116 ($m)"; fail=1; fi
done
for m in pompano tampa clear down; do
  case $m in pompano) e="X=1";; tampa) e="HOME_SET=1 GPS=tampa";; clear) e="FWC_MODE=clear";; down) e="FWC_DOWN=1";; esac
  if env $e timeout 90 node test118.js > "/tmp/test118-$m.out" 2>&1; then echo "ok   test118 ($m)"; else echo "FAIL test118 ($m)"; fail=1; fi
done
if timeout 90 node test119.js > /tmp/test119.out 2>&1; then echo "ok   test119"; else echo "FAIL test119"; fail=1; fi
if DEL_ADMIN=1 timeout 90 node test101.js > /tmp/test101-admin.out 2>&1; then echo "ok   test101 (admin)"; else echo "FAIL test101 (admin)"; fail=1; fi
[ $fail = 0 ] && echo "ALL OK" || echo "SOME FAILED"
exit $fail
