#!/bin/sh
# Duplicate check against trekhleb/javascript-algorithms issues+PRs.
# Optional: export GITHUB_TOKEN=... for a higher rate limit. Pacing 7s (unauth) / 2.5s (auth).
out=${1:-dupcheck_results.txt}; : > $out
AUTH=""; PACE=7
if [ -n "$GITHUB_TOKEN" ]; then AUTH="Authorization: Bearer $GITHUB_TOKEN"; PACE=2.5; fi
for q in "avl" "AvlTree" "rotateLeftLeft" "red-black" "RedBlackTree" "BinarySearchTree+remove" "parent+remove+tree" "replaceChild" "heap+remove" "MinHeap+remove" "parentItem" "PriorityQueue+remove" "changePriority" "MinHeapAdhoc" "MaxHeapAdhoc" "LinkedList+insert" "linked+list+tail" "trie+delete" "deleteWord" "emoji" "LRU" "LRUCache" "HashTable+__proto__" "hash+table" "BST+parent" "audit"; do
  echo "### $q" >> $out
  curl -s ${AUTH:+-H "$AUTH"} "https://api.github.com/search/issues?q=repo:trekhleb/javascript-algorithms+$q&per_page=50" > _q.json
  bun -e 'const j=JSON.parse(require("fs").readFileSync("_q.json","utf8")); if(!j.items){console.log("ERR",JSON.stringify(j).slice(0,200));process.exit(0)} console.log("total",j.total_count); for(const i of j.items) console.log(`#${i.number} [${i.pull_request?"PR":"issue"} ${i.state}${i.pull_request&&i.pull_request.merged_at?" merged":""}] ${i.created_at.slice(0,10)} ${i.title}`)' >> $out
  sleep $PACE
done
rm -f _q.json
