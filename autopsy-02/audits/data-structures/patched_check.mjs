// Validates the fixes proposed in REPORT.md: monkey-patches the vendor classes IN MEMORY
// (vendor files are not modified) and re-runs every suite. Expected: 0 failing suites.
// Usage: bun patched_check.mjs [sequencesPerSuite]
import BinaryTreeNode from '../../vendor/src/data-structures/tree/BinaryTreeNode.js';
import BinarySearchTreeNode from '../../vendor/src/data-structures/tree/binary-search-tree/BinarySearchTreeNode.js';
import AvlTree from '../../vendor/src/data-structures/tree/avl-tree/AvlTree.js';
import RedBlackTree from '../../vendor/src/data-structures/tree/red-black-tree/RedBlackTree.js';
import Heap from '../../vendor/src/data-structures/heap/Heap.js';
import MinHeapAdhoc from '../../vendor/src/data-structures/heap/MinHeapAdhoc.js';
import MaxHeapAdhoc from '../../vendor/src/data-structures/heap/MaxHeapAdhoc.js';
import PriorityQueue from '../../vendor/src/data-structures/priority-queue/PriorityQueue.js';
import Comparator from '../../vendor/src/utils/comparator/Comparator.js';
import LinkedList from '../../vendor/src/data-structures/linked-list/LinkedList.js';
import LinkedListNode from '../../vendor/src/data-structures/linked-list/LinkedListNode.js';
import Trie from '../../vendor/src/data-structures/trie/Trie.js';
import LRUCache from '../../vendor/src/data-structures/lru-cache/LRUCache.js';
import HashTable from '../../vendor/src/data-structures/hash-table/HashTable.js';
import { runSuite } from './framework.mjs';
import { suites } from './suites.mjs';

// Fix A: setLeft/setRight only orphan the old child if it still points back to us.
BinaryTreeNode.prototype.setLeft = function setLeft(node) {
  if (this.left && this.left.parent === this) this.left.parent = null;
  this.left = node;
  if (node) node.parent = this;
  return this;
};
BinaryTreeNode.prototype.setRight = function setRight(node) {
  if (this.right && this.right.parent === this) this.right.parent = null;
  this.right = node;
  if (node) node.parent = this;
  return this;
};
// Fix B: replaceChild must re-parent the replacement node.
BinaryTreeNode.prototype.replaceChild = function replaceChild(a, b) {
  if (!a || !b) return false;
  if (this.left === a) { this.setLeft(b); return true; }
  if (this.right === a) { this.setRight(b); return true; }
  return false;
};
// Fix C: BST remove — keep parent of a node that stays in the tree; empty root value = null.
const origRemove = BinarySearchTreeNode.prototype.remove;
BinarySearchTreeNode.prototype.remove = function remove(value) {
  const node = this.find(value);
  if (!node) throw new Error('Item not found in the tree');
  const twoChildren = node.left && node.right;
  const savedParent = node.parent;
  const res = origRemove.call(this, value);
  if (twoChildren) node.parent = savedParent; // node was NOT detached
  if (!node.left && !node.right && !node.parent && node.value === undefined) node.value = null;
  return res;
};
// Fix D: AVL rotations attach to the correct side of the parent.
function reattach(tree, oldSub, newSub) {
  const p = oldSub.parent;
  if (p) { if (p.left === oldSub) p.setLeft(newSub); else p.setRight(newSub); } else if (oldSub === tree.root) { tree.root = newSub; newSub.parent = null; }
}
AvlTree.prototype.rotateLeftLeft = function rotateLeftLeft(rootNode) {
  const leftNode = rootNode.left;
  rootNode.setLeft(null);
  reattach(this, rootNode, leftNode);
  if (leftNode.right) rootNode.setLeft(leftNode.right);
  leftNode.setRight(rootNode);
};
AvlTree.prototype.rotateRightRight = function rotateRightRight(rootNode) {
  const rightNode = rootNode.right;
  rootNode.setRight(null);
  reattach(this, rootNode, rightNode);
  if (rightNode.left) rootNode.setRight(rightNode.left);
  rightNode.setLeft(rootNode);
};
// Fix E: AVL balance handles child bf == 0 (possible after deletion) ...
AvlTree.prototype.balance = function balance(node) {
  if (node.balanceFactor > 1) {
    if (node.left.balanceFactor >= 0) this.rotateLeftLeft(node); else this.rotateLeftRight(node);
  } else if (node.balanceFactor < -1) {
    if (node.right.balanceFactor <= 0) this.rotateRightRight(node); else this.rotateRightLeft(node);
  }
};
// ... and remove re-balances from the physically removed position up to the root.
AvlTree.prototype.remove = function remove(value) {
  const node = this.root.find(value);
  if (!node) throw new Error('Item not found in the tree');
  let start;
  if (node.left && node.right) {
    const succ = node.right.findMin();
    start = succ === node.right ? node : succ.parent;
  } else {
    start = node.parent || node;
  }
  this.root.remove(value);
  for (let cur = start; cur; cur = cur.parent) this.balance(cur);
  return true;
};
// Fix F: RB — don't recolour an existing node on duplicate insert; only re-balance RED nodes.
const rbInsert = RedBlackTree.prototype.insert;
RedBlackTree.prototype.insert = function insert(value) {
  const existing = this.root.find(value);
  if (existing && existing.value !== null && existing.value !== undefined) return existing;
  return rbInsert.call(this, value);
};
const rbBalance = RedBlackTree.prototype.balance;
RedBlackTree.prototype.balance = function balance(node) {
  if (node !== this.root && !this.isNodeRed(node)) return;
  rbBalance.call(this, node);
};
// Fix G: Heap.remove — test parent existence by index, not by value truthiness.
Heap.prototype.remove = function remove(item, comparator = this.compare) {
  const n = this.find(item, comparator).length;
  for (let k = 0; k < n; k += 1) {
    const i = this.find(item, comparator).pop();
    if (i === this.heapContainer.length - 1) { this.heapContainer.pop(); continue; }
    this.heapContainer[i] = this.heapContainer.pop();
    if (this.hasLeftChild(i) && (!this.hasParent(i) || this.pairIsInCorrectOrder(this.parent(i), this.heapContainer[i]))) this.heapifyDown(i);
    else this.heapifyUp(i);
  }
  return this;
};
// Fix H: PriorityQueue.remove finds the item by VALUE by default.
PriorityQueue.prototype.remove = function remove(item, customFindingComparator = new Comparator(this.compareValue)) {
  Heap.prototype.remove.call(this, item, customFindingComparator);
  this.priorities.delete(item);
  return this;
};
// Fix I: LinkedList.insert updates tail when inserting after the last node.
LinkedList.prototype.insert = function insert(value, rawIndex) {
  const index = rawIndex < 0 ? 0 : rawIndex;
  if (index === 0) return this.prepend(value);
  let count = 1; let cur = this.head;
  while (cur && count !== index) { cur = cur.next; count += 1; }
  if (!cur) return this.append(value);
  cur.next = new LinkedListNode(value, cur.next);
  if (cur === this.tail) this.tail = cur.next;
  return this;
};
// Fix J: Trie.deleteWord iterates code points like addWord does.
const trieDelete = Trie.prototype.deleteWord;
Trie.prototype.deleteWord = function deleteWord(word) {
  const chars = Array.from(word);
  const dfs = (node, i = 0) => {
    if (i >= chars.length) return;
    const next = node.getChild(chars[i]);
    if (next == null) return;
    dfs(next, i + 1);
    if (i === chars.length - 1) next.isCompleteWord = false;
    node.removeChild(chars[i]);
  };
  dfs(this.head);
  return this;
};
void trieDelete;
// Fix K: LRUCache / HashTable use prototype-less dictionaries (Object.create(null)).
for (const m of ['get', 'set']) {
  const orig = LRUCache.prototype[m];
  LRUCache.prototype[m] = function patched(...args) {
    if (Object.getPrototypeOf(this.nodesMap) !== null) this.nodesMap = Object.assign(Object.create(null), this.nodesMap);
    return orig.apply(this, args);
  };
}
for (const m of ['set', 'delete', 'has', 'getKeys']) {
  const orig = HashTable.prototype[m];
  HashTable.prototype[m] = function patched(...args) {
    if (Object.getPrototypeOf(this.keys) !== null) this.keys = Object.assign(Object.create(null), this.keys);
    return orig.apply(this, args);
  };
}
// Fix L: Adhoc heaps bind `this` in the constructor (forEach(this.add) loses it).
function patchedAdhoc(Base) {
  return class extends Base {
    constructor(heap = []) { super(); heap.forEach((x) => this.add(x)); }
  };
}
const AdhocMap = new Map([[MinHeapAdhoc, patchedAdhoc(MinHeapAdhoc)], [MaxHeapAdhoc, patchedAdhoc(MaxHeapAdhoc)]]);

const N = Number(process.argv[2]) || 2000;
let failingSuites = 0; let ops = 0; let seqs = 0;
for (const s of suites) {
  let suite = s;
  if (/HeapAdhoc constructor/.test(s.name)) {
    // re-route the ctor suite to the patched class
    const Patched = AdhocMap.get(s.name.startsWith('Min') ? MinHeapAdhoc : MaxHeapAdhoc);
    const isMin = s.name.startsWith('Min');
    suite = {
      ...s,
      replay(o) {
        const arr = o[0][1]; const h = new Patched(arr); const exp = arr.slice().sort((a, b) => a - b); if (!isMin) exp.reverse();
        const got = []; while (!h.isEmpty()) got.push(h.poll());
        if (JSON.stringify(got) !== JSON.stringify(exp)) throw new Error('ctor-array');
      },
    };
  }
  const r = runSuite({ ...suite, sequences: N });
  ops += r.ops; seqs += r.sequences;
  if (r.failing) { failingSuites += 1; console.log(`STILL FAILING: ${r.name}`, r.failures.map((f) => `${f.kind} ${JSON.stringify(f.minimal)} ${f.msg}`)); }
}
console.log(`patched run: ${suites.length} suites, ${seqs} sequences, ${ops} ops, failing suites: ${failingSuites}`);
