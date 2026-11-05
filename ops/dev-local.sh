#!/usr/bin/env bash
# লোকালে দেখা — Power7 ফোল্ডার থেকে:  bash ops/dev-local.sh      (Ctrl+C দিলে সব বন্ধ)
# server/.env লাইভ DB তে যায়, তাই এখানে লাইভের কপিতে চলে (ops/local-db.mjs); লাইভে কিছু লেখা হয় না।
# পোর্ট .env আর vite.config এর মতোই: server 5000, client 5173, affiliate 5174, admin 5175
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

cd server
cp ../ops/local-db.mjs ./_local-db.mjs
trap 'rm -f "$ROOT/server/_local-db.mjs"' EXIT
node _local-db.mjs
rm -f _local-db.mjs
LOCAL_URI="$(node -e "require('dotenv').config({quiet:true});process.stdout.write(process.env.MONGO_URI.replace(/\/([^/?]+)(\?|$)/,'/power7_local\$2'))")"

trap 'kill 0' INT TERM EXIT
MONGO_URI="$LOCAL_URI" node index.js &
(cd ../client && npx vite) &
(cd ../affiliate && npx vite) &
(cd ../admin && npx vite) &

echo "সাইট       http://localhost:5173"
echo "অ্যাফিলিয়েট  http://localhost:5174"
echo "admin      http://localhost:5175"
wait
