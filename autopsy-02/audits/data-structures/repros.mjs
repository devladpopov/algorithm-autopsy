// Minimal deterministic reproductions for every finding in REPORT.md.
// Usage: bun repros.mjs   (vendor code is used as-is, unmodified)
import MinHeap from '../../vendor/src/data-structures/heap/MinHeap.js';
import MaxHeap from '../../vendor/src/data-structures/heap/MaxHeap.js';
import MinHeapAdhoc from '../../vendor/src/data-structures/heap/MinHeapAdhoc.js';
import MaxHeapAdhoc from '../../vendor/src/data-structures/heap/MaxHeapAdhoc.js';
import PriorityQueue from '../../vendor/src/data-structures/priority-queue/PriorityQueue.js';
import HashTable from '../../vendor/src/data-structures/hash-table/HashTable.js';
import LRUCache from '../../vendor/src/data-structures/lru-cache/LRUCache.js';
import Trie from '../../vendor/src/data-structures/trie/Trie.js';
import BinarySearchTree from '../../vendor/src/data-structures/tree/binary-search-tree/BinarySearchTree.js';
import AvlTree from '../../vendor/src/data-structures/tree/avl-tree/AvlTree.js';
import RedBlackTree from '../../vendor/src/data-structures/tree/red-black-tree/RedBlackTree.js';
import LinkedList from '../../vendor/src/data-structures/linked-list/LinkedList.js';
import { complexityProbes } from './complexity.mjs';

const inorder = (n) => (n ? [...inorder(n.left), n.value, ...inorder(n.right)] : []);
const height = (n) => (n ? 1 + Math.max(height(n.left), height(n.right)) : 0);
const rbViolation = (t) => {
  const c = (n) => n.meta.get('color');
  if (c(t.root) !== 'black') return 'root not black';
  let err = null;
  const bh = (n) => {
    if (!n) return 1;
    if (c(n) === 'red' && [n.left, n.right].some((x) => x && c(x) === 'red') && !err) err = `red ${n.value} has red child`;
    const l = bh(n.left); const r = bh(n.right);
    if (l !== r && !err) err = `black-height ${l} != ${r} under ${n.value}`;
    return l + (c(n) === 'black' ? 1 : 0);
  };
  bh(t.root);
  return err || 'none';
};
const show = (n) => (n ? `${n.value}${n.meta.get('color') === 'red' ? 'R' : n.meta.get('color') === 'black' ? 'B' : ''}(${show(n.left)},${show(n.right)})` : '.');
let id = 0;
function repro(title, fn) {
  id += 1;
  let out;
  try { out = fn(); } catch (e) { out = { actual: `THROWS ${e.constructor.name}: ${e.message}` }; }
  console.log(`\n[${id}] ${title}`);
  console.log(`    actual:   ${out.actual}`);
  if (out.expected !== undefined) console.log(`    expected: ${out.expected}`);
}

repro('AvlTree.insert loses/duplicates nodes: insert 1,2,5,3,4', () => {
  const t = new AvlTree(); [1, 2, 5, 3, 4].forEach((v) => t.insert(v));
  return { actual: `in-order ${JSON.stringify(inorder(t.root))}, contains(1)=${t.contains(1)}`, expected: 'in-order [1,2,3,4,5], contains(1)=true' };
});

repro('AvlTree.insert parent pointer corruption: insert 8,6,3,1,4,5 then 5.parent', () => {
  const t = new AvlTree(); [8, 6, 3, 1, 4, 5].forEach((v) => t.insert(v));
  const n5 = t.root.find(5);
  return { actual: `tree ${show(t.root)}; node(5).parent = ${n5.parent && n5.parent.value}`, expected: 'node(5).parent = 6 (its actual parent)' };
});

repro('RedBlackTree.insert unique keys 1,3,2,4,5 loses nodes 1 and 2', () => {
  const t = new RedBlackTree(); [1, 3, 2, 4, 5].forEach((v) => t.insert(v));
  return { actual: `in-order ${JSON.stringify(inorder(t.root))}; contains(1)=${t.contains(1)}, contains(2)=${t.contains(2)}; tree ${show(t.root)}`, expected: 'in-order [1,2,3,4,5]' };
});

repro('RedBlackTree.insert unique keys 1,3,2,4 -> red-red violation', () => {
  const t = new RedBlackTree(); [1, 3, 2, 4].forEach((v) => t.insert(v));
  return { actual: `${show(t.root)}; violation: ${rbViolation(t)}`, expected: '2B(1B(.,.),3B(.,4R)) and no violation' };
});

repro('RedBlackTree.insert unique keys 1,4,2,3,5,6 -> crash', () => {
  const t = new RedBlackTree(); [1, 4, 2, 3, 5, 6].forEach((v) => t.insert(v));
  return { actual: show(t.root), expected: 'no exception' };
});

repro('RedBlackTree.balance re-balances a BLACK node: insert 6,2,1,3,7,4,5 (parent pointers fine here)', () => {
  const t = new RedBlackTree(); [6, 2, 1, 3, 7, 4, 5].forEach((v) => t.insert(v));
  return { actual: `${show(t.root)}; violation: ${rbViolation(t)}`, expected: 'no red-black violation' };
});

repro('RedBlackTree.insert of a duplicate recolours existing node: insert 5,7,3,2,7', () => {
  const t = new RedBlackTree(); [5, 7, 3, 2].forEach((v) => t.insert(v));
  const before = show(t.root); t.insert(7);
  return { actual: `before dup ${before}, after insert(7) ${show(t.root)}; violation: ${rbViolation(t)}`, expected: 'tree unchanged, no violation' };
});

repro('AvlTree.remove leaves tree unbalanced (child bf==0 case): insert 8,9,7,4,2; remove 8', () => {
  const t = new AvlTree(); [8, 9, 7, 4, 2].forEach((v) => t.insert(v)); t.remove(8);
  return { actual: `${show(t.root)}; root balance factor = ${height(t.root.left) - height(t.root.right)}`, expected: '|balance factor| <= 1 everywhere (e.g. 4(2,9(7,.)))' };
});

repro('AvlTree.remove only re-balances the root: insert 4,2,6,1,3,5,7,8; remove 5', () => {
  const t = new AvlTree(); [4, 2, 6, 1, 3, 5, 7, 8].forEach((v) => t.insert(v));
  const before = show(t.root); t.remove(5);
  const n6 = t.root.find(6);
  return { actual: `before ${before}; after ${show(t.root)}; bf(node ${n6.value}) = ${height(n6.left) - height(n6.right)}`, expected: 'subtree at 6 rotated to 7(6,8), all |bf| <= 1' };
});

repro('BinarySearchTree.remove of a one-child node leaves stale parent; later remove() is a silent no-op: insert 5,6,8; remove 6; remove 8', () => {
  const t = new BinarySearchTree(); [5, 6, 8].forEach((v) => t.insert(v));
  t.remove(6); const r = t.remove(8);
  return { actual: `remove(8) returned ${r}; contains(8)=${t.contains(8)}; toString()="${t.toString()}"`, expected: 'contains(8)=false; toString()="5"' };
});

repro('BinarySearchTree.remove of a two-child node nulls the parent of a node that stays in the tree: insert 5,3,8,7,9; remove 8,7,9', () => {
  const t = new BinarySearchTree(); [5, 3, 8, 7, 9].forEach((v) => t.insert(v));
  t.remove(8); t.remove(7); t.remove(9);
  return { actual: `in-order ${JSON.stringify(inorder(t.root))}; toString()="${t.toString()}"`, expected: 'in-order [3,5]; toString()="3,5"' };
});

repro('BinarySearchTree: removing the last value leaves an `undefined` phantom root: insert 0; remove 0; insert 6', () => {
  const t = new BinarySearchTree(); t.insert(0); t.remove(0); t.insert(6);
  return { actual: `toString()="${t.toString()}", root.value=${t.root.value}, root.right=${t.root.right && t.root.right.value}`, expected: 'toString()="6", root.value=6' };
});

repro('Heap.remove treats a falsy parent (0) as "no parent": MaxHeap add 10,0,9,-1,-2,8,7,-3,-4,-5,-6,6; remove(-1)', () => {
  const h = new MaxHeap(); [10, 0, 9, -1, -2, 8, 7, -3, -4, -5, -6, 6].forEach((v) => h.add(v));
  h.remove(-1);
  const c = JSON.stringify(h.heapContainer);
  const polled = []; while (!h.isEmpty()) polled.push(h.poll());
  return { actual: `container ${c} (6 is child of 0); poll order ${JSON.stringify(polled)}`, expected: 'poll order [10,9,8,7,6,0,-2,-3,-4,-5,-6]' };
});

repro('Heap.remove, MinHeap mirror: add -10,0,-9,1,2,-8,-7,3,4,5,6,-6; remove(1)', () => {
  const h = new MinHeap(); [-10, 0, -9, 1, 2, -8, -7, 3, 4, 5, 6, -6].forEach((v) => h.add(v));
  h.remove(1);
  const polled = []; while (!h.isEmpty()) polled.push(h.poll());
  return { actual: `poll order ${JSON.stringify(polled)}`, expected: 'poll order [-10,-9,-8,-7,-6,0,2,3,4,5,6]' };
});

repro('PriorityQueue.remove(item) removes every item with the same PRIORITY', () => {
  const pq = new PriorityQueue(); pq.add('a', 1); pq.add('b', 1); pq.add('c', 2);
  pq.remove('a');
  return { actual: `after remove('a'): hasValue('b')=${pq.hasValue('b')}, contents ${JSON.stringify(pq.heapContainer)}`, expected: "hasValue('b')=true, contents ['b','c']" };
});

repro('MinHeapAdhoc / MaxHeapAdhoc constructor(array) crashes', () => {
  let a; let b;
  try { new MinHeapAdhoc([3, 1, 2]); a = 'ok'; } catch (e) { a = `${e.constructor.name}: ${e.message}`; }
  try { new MaxHeapAdhoc([3, 1, 2]); b = 'ok'; } catch (e) { b = `${e.constructor.name}: ${e.message}`; }
  return { actual: `new MinHeapAdhoc([3,1,2]) -> ${a}; new MaxHeapAdhoc([3,1,2]) -> ${b}`, expected: 'heaps containing 1,2,3' };
});

repro('LinkedList.insert(value, length) does not update tail; next append() drops a node', () => {
  const l = new LinkedList(); l.append(1); l.insert(2, 1); l.append(3);
  return { actual: `toString()="${l.toString()}", tail=${l.tail.value}`, expected: 'toString()="1,2,3", tail=3' };
});

repro('Trie.deleteWord does not delete words with non-BMP characters (emoji)', () => {
  const t = new Trie(); t.addWord('\u{1F600}'); t.deleteWord('\u{1F600}');
  return { actual: `doesWordExist('\u{1F600}') after delete = ${t.doesWordExist('\u{1F600}')}`, expected: 'false' };
});

repro("LRUCache.get('toString') on an empty cache (key named like an Object.prototype member)", () => {
  const c = new LRUCache(2);
  return { actual: String(c.get('toString')), expected: 'undefined' };
});

repro("HashTable.set('__proto__', 1): has()/getKeys() disagree with get()", () => {
  const h = new HashTable(); h.set('__proto__', 1);
  return { actual: `get=${h.get('__proto__')}, has=${h.has('__proto__')}, getKeys=${JSON.stringify(h.getKeys())}`, expected: 'get=1, has=true, getKeys=["__proto__"]' };
});

repro('PriorityQueue README: equal priorities "are served according to their order in the queue" - not true for a binary heap', () => {
  const pq = new PriorityQueue(); ['a', 'b', 'c', 'd'].forEach((x) => pq.add(x, 0));
  const out = []; while (!pq.isEmpty()) out.push(pq.poll());
  return { actual: JSON.stringify(out), expected: '["a","b","c","d"] per README' };
});

console.log('\n[complexity] AvlTree.insert');
complexityProbes().forEach((l) => console.log(`    ${l}`));
