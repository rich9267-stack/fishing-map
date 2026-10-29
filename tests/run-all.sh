#!/bin/sh
# Runs every check against ../index.html. Usage: cd tests && npm install (first time only) && sh run-all.sh
# Runs 8 checks at a time (JOBS=1 sh run-all.sh = one at a time). Output of each check: /tmp/<name>.out
# New check = add one line to the list at the bottom:   test186
#   or with a label, settings and a time limit:          test34|test34 (admin)|ST=admin|150
cd "$(dirname "$0")" || exit 1

if [ "$1" = "--one" ]; then   # runs one line of the list (called by xargs below)
  IFS='|' read -r f label env to <<LINE
$2
LINE
  case $f in *.*) ;; *) f="$f.js";; esac
  [ -n "$label" ] || label="${f%%.*}"
  out="/tmp/$(printf '%s' "$label" | sed 's/ (/-/; s/)//; s/ /-/g').out"
  if env $env timeout "${to:-90}" node "$f" > "$out" 2>&1; then echo "ok   $label"; else echo "FAIL $label (see $out)"; fi > "$3"
  exit 0
fi

res=$(mktemp -d)
sed -n '/^__LIST__$/,$p' "$0" | sed '1d; /^$/d' | awk '{ printf "%04d\t%s\n", NR, $0 }' |
  xargs -d '\n' -P "${JOBS:-8}" -I{} sh -c 'n="${1%%	*}"; sh "$0" --one "${1#*	}" "$2/$n"' "$0" {} "$res"
cat "$res"/*
if grep -q '^FAIL' "$res"/*; then rm -rf "$res"; echo "SOME FAILED"; exit 1; fi
rm -rf "$res"; echo "ALL OK"; exit 0

__LIST__
test27
test28
test29
test30
test31
test32
test33
test35
test36
test37
test38
test39
test40
test41
test42
test43
test44
test45
test46
test47
test48
test49
test50
test51
test52
test53
test54
test55
test56
test57
test58
test59
test60
test61
test62
test63
test64
test65
test66
test67
test68
test69
test70
test71
test72
test73
test74
test75
test76
test77
test78
test79
test80
test81
test82
test83
test84
test85
test86
test87
test88
test89
test90
test91
test92
test93
test94
test95
test96
test97
test98
test99
test100
test101
test102
test103
test104
test105
test106
test107
test108
test109
test110
test112
test117
test125
test126
test127
morning-score.test.mjs|morning-score
morning-tides.test.mjs|morning-tides
evening-score.test.mjs|evening-score
test34|test34 (admin)|ST=admin
test34|test34 (none)|ST=none
test34|test34 (pending)|ST=pending
test34|test34 (blocked)|ST=blocked
test34|test34 (error)|ST=error
test111|test111 (admin)|ST=admin
test111|test111 (approved)|ST=approved
test113|test113 (fresh)|X=1
test113|test113 (home)|HOME_SET=1
test113|test113 (away)|HOME_SET=1 GPS=tampa
test114|test114 (fresh)|X=1
test114|test114 (home)|HOME_SET=1
test114|test114 (away)|HOME_SET=1 GPS=tampa
test115|test115 (fresh)|X=1
test115|test115 (away)|HOME_SET=1 GPS=tampa
test115|test115 (tampa)|HOME_AT=tampa
test115|test115 (fortmyers)|HOME_AT=fortmyers
test116|test116 (fresh)|X=1
test116|test116 (home)|HOME_SET=1
test116|test116 (away)|HOME_SET=1 GPS=tampa
test118|test118 (pompano)|X=1
test118|test118 (tampa)|HOME_SET=1 GPS=tampa
test118|test118 (clear)|FWC_MODE=clear
test118|test118 (down)|FWC_DOWN=1
test119
test120
test121
test122
test123
test101|test101 (admin)|DEL_ADMIN=1
test124|test124 (admin)|
test124|test124 (member)|ST=approved
test128|test128 (Eastern phone)|
test128|test128 (Central phone)|TZ=America/Chicago
test129
test130
test131
test132
test133
test134
test135
test136
test137
test138
test139
test140
test141
test142
test143
test144
test145
test146
test147
test149
test151
test152
test153
test154
test155
test156
test157
test158
test159
test160
test161
test162
test163|test163||150
test164|test164||150
test165|test165||150
test166
test167
test168
test169
test170
test171
test172
test173
test175
test176
test177
test178
test179
test180
test181
test182
test183
test184
test185
test186
test187
test188
test189
test190
test191
test192
test193
test194
test195
test196
test197
test198
test199
test200
test201
test202
test203
test204
test205
test206
test207
test208
test209
test210
test211
test212
test213
test214
test215
test216
test217
test218
test219
test220
test221
test222
test223
