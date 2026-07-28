#!/data/data/com.termux/files/usr/bin/bash

BASE="en/worker"

echo "==============================="
echo " LEVEL.CASINO WORKER WIRING AUDIT"
echo "==============================="

echo
echo "1) Checking imports..."
echo "----------------------"

grep -R "^import" $BASE/*.js | sed 's/^/ /'

echo
echo "2) Checking undefined imports usage..."
echo "--------------------------------------"

for file in $BASE/*.js; do
    while read -r imp; do
        name=$(echo "$imp" | sed -E 's/.*\{([^}]*)\}.*/\1/' | tr ',' '\n' | sed 's/^ *//')
        if [ -n "$name" ]; then
            grep -q "$name" "$file" || echo "Possible unused import: $file -> $name"
        fi
    done < <(grep "^import" "$file")
done


echo
echo "3) Checking route types vs index switch cases..."
echo "-----------------------------------------------"

grep "type:" $BASE/routes.js \
 | sed -E 's/.*type: *"([^"]+)".*/\1/' \
 | while read type; do
      if grep -q "case \"$type\"" $BASE/index.js; then
          echo "OK route -> $type"
      else
          echo "MISSING index case -> $type"
      fi
   done


echo
echo "4) Checking index cases without routes..."
echo "------------------------------------------"

grep "case \"" $BASE/index.js \
 | sed -E 's/.*case "([^"]+)".*/\1/' \
 | while read type; do
      if grep -q "type: \"$type\"" $BASE/routes.js; then
          echo "OK case -> $type"
      else
          echo "NO ROUTE FOUND -> $type"
      fi
   done


echo
echo "5) Checking API handler wiring..."
echo "--------------------------------"

grep -R "handleAPI" $BASE

echo
echo "6) Checking media wiring..."
echo "---------------------------"

grep -R "serveMedia" $BASE

echo
echo "7) Checking database imports..."
echo "-------------------------------"

for file in $BASE/api.js $BASE/controllers.js; do
 echo "--- $file"
 grep "database/" "$file"
done


echo
echo "8) Checking permission system..."
echo "-------------------------------"

grep -R "checkPermission\|hasPermission" $BASE


echo
echo "9) Checking syntax with node..."
echo "-------------------------------"

for file in $BASE/*.js; do
    node --check "$file" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "OK syntax $file"
    else
        echo "ERROR syntax $file"
    fi
done


echo
echo "==============================="
echo " AUDIT COMPLETE"
echo "==============================="
