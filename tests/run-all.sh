#!/bin/sh
# Runs every check against ../index.html. Usage: cd tests && npm install (first time only) && sh run-all.sh
cd "$(dirname "$0")" || exit 1
fail=0
for t in test27 test28 test29 test30 test31 test32 test33 test35 test36 test37 test38 test39 test40 test41 test42 test43 test44 test45 test46 test47 test48 test49 test50 test51 test52 test53 test54 test55 test56 test57 test58 test59 test60 test61 test62 test63 test64 test65 test66 test67 test68 test69 test70 test71 test72 test73 test74 test75 test76 test77 test78 test79 test80 test81 test82 test83 test84 test85 test86 test87 test88 test89 test90 test91 test92 test93 test94 test95 test96 test97 test98 test99 test100 test101 test102 test103 test104 test105 test106 test107 test108 test109 test110 test112 test117 test125 test126 test127; do
  if timeout 90 node $t.js > "/tmp/$t.out" 2>&1; then echo "ok   $t"; else echo "FAIL $t (see /tmp/$t.out)"; fail=1; fi
done
if node morning-score.test.mjs > /tmp/morning-score.out 2>&1; then echo "ok   morning-score"; else echo "FAIL morning-score (see /tmp/morning-score.out)"; fail=1; fi
if node morning-tides.test.mjs > /tmp/morning-tides.out 2>&1; then echo "ok   morning-tides"; else echo "FAIL morning-tides (see /tmp/morning-tides.out)"; fail=1; fi
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
if timeout 90 node test120.js > /tmp/test120.out 2>&1; then echo "ok   test120"; else echo "FAIL test120"; fail=1; fi
if timeout 90 node test121.js > /tmp/test121.out 2>&1; then echo "ok   test121"; else echo "FAIL test121"; fail=1; fi
if timeout 90 node test122.js > /tmp/test122.out 2>&1; then echo "ok   test122"; else echo "FAIL test122"; fail=1; fi
if timeout 90 node test123.js > /tmp/test123.out 2>&1; then echo "ok   test123"; else echo "FAIL test123"; fail=1; fi
if DEL_ADMIN=1 timeout 90 node test101.js > /tmp/test101-admin.out 2>&1; then echo "ok   test101 (admin)"; else echo "FAIL test101 (admin)"; fail=1; fi
if timeout 90 node test124.js > /tmp/test124.out 2>&1; then echo "ok   test124 (admin)"; else echo "FAIL test124 (admin)"; fail=1; fi
if ST=approved timeout 90 node test124.js > /tmp/test124-member.out 2>&1; then echo "ok   test124 (member)"; else echo "FAIL test124 (member)"; fail=1; fi
if timeout 90 node test128.js > /tmp/test128.out 2>&1; then echo "ok   test128 (Eastern phone)"; else echo "FAIL test128 (Eastern phone)"; fail=1; fi
if TZ=America/Chicago timeout 90 node test128.js > /tmp/test128-central.out 2>&1; then echo "ok   test128 (Central phone)"; else echo "FAIL test128 (Central phone)"; fail=1; fi
if timeout 90 node test129.js > /tmp/test129.out 2>&1; then echo "ok   test129"; else echo "FAIL test129"; fail=1; fi
if timeout 90 node test130.js > /tmp/test130.out 2>&1; then echo "ok   test130"; else echo "FAIL test130 (see /tmp/test130.out)"; fail=1; fi
if timeout 90 node test131.js > /tmp/test131.out 2>&1; then echo "ok   test131"; else echo "FAIL test131 (see /tmp/test131.out)"; fail=1; fi
if timeout 90 node test132.js > /tmp/test132.out 2>&1; then echo "ok   test132"; else echo "FAIL test132 (see /tmp/test132.out)"; fail=1; fi
if timeout 90 node test133.js > /tmp/test133.out 2>&1; then echo "ok   test133"; else echo "FAIL test133 (see /tmp/test133.out)"; fail=1; fi
if timeout 90 node test134.js > /tmp/test134.out 2>&1; then echo "ok   test134"; else echo "FAIL test134 (see /tmp/test134.out)"; fail=1; fi
if timeout 90 node test135.js > /tmp/test135.out 2>&1; then echo "ok   test135"; else echo "FAIL test135 (see /tmp/test135.out)"; fail=1; fi
if timeout 90 node test136.js > /tmp/test136.out 2>&1; then echo "ok   test136"; else echo "FAIL test136 (see /tmp/test136.out)"; fail=1; fi
if timeout 90 node test137.js > /tmp/test137.out 2>&1; then echo "ok   test137"; else echo "FAIL test137 (see /tmp/test137.out)"; fail=1; fi
if timeout 90 node test138.js > /tmp/test138.out 2>&1; then echo "ok   test138"; else echo "FAIL test138 (see /tmp/test138.out)"; fail=1; fi
if timeout 90 node test139.js > /tmp/test139.out 2>&1; then echo "ok   test139"; else echo "FAIL test139 (see /tmp/test139.out)"; fail=1; fi
[ $fail = 0 ] && echo "ALL OK" || echo "SOME FAILED"
exit $fail
