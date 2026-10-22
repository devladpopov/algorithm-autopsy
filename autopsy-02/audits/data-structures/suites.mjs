/* Model-based suites for trekhleb/javascript-algorithms src/data-structures */
import {
  randInt, pick, check, eqJSON,
} from './framework.mjs';

import MinHeap from '../../vendor/src/data-structures/heap/MinHeap.js';
import MaxHeap from '../../vendor/src/data-structures/heap/MaxHeap.js';
import MinHeapAdhoc from '../../vendor/src/data-structures/heap/MinHeapAdhoc.js';
import MaxHeapAdhoc from '../../vendor/src/data-structures/heap/MaxHeapAdhoc.js';
import PriorityQueue from '../../vendor/src/data-structures/priority-queue/PriorityQueue.js';
import HashTable from '../../vendor/src/data-structures/hash-table/HashTable.js';
import BloomFilter from '../../vendor/src/data-structures/bloom-filter/BloomFilter.js';
import LRUCache from '../../vendor/src/data-structures/lru-cache/LRUCache.js';
import LRUCacheOnMap from '../../vendor/src/data-structures/lru-cache/LRUCacheOnMap.js';
import Trie from '../../vendor/src/data-structures/trie/Trie.js';
import BinarySearchTree from '../../vendor/src/data-structures/tree/binary-search-tree/BinarySearchTree.js';
import AvlTree from '../../vendor/src/data-structures/tree/avl-tree/AvlTree.js';
import RedBlackTree from '../../vendor/src/data-structures/tree/red-black-tree/RedBlackTree.js';
import SegmentTree from '../../vendor/src/data-structures/tree/segment-tree/SegmentTree.js';
import FenwickTree from '../../vendor/src/data-structures/tree/fenwick-tree/FenwickTree.js';
import LinkedList from '../../vendor/src/data-structures/linked-list/LinkedList.js';
import DoublyLinkedList from '../../vendor/src/data-structures/doubly-linked-list/DoublyLinkedList.js';
import Deque from '../../vendor/src/data-structures/deque/Deque.js';
import Queue from '../../vendor/src/data-structures/queue/Queue.js';
import Stack from '../../vendor/src/data-structures/stack/Stack.js';

const sortNum = (a) => a.slice().sort((x, y) => x - y);
const sortStr = (a) => a.slice().sort();
const genOps = (rng, len, f) => Array.from({ length: len }, () => f(rng));

// ---------------------------------------------------------------- Heap
function heapSuite(name, Ctor, isMin, values, maxLen = 40, pAdd = 0.45) {
  const better = (a, b) => (isMin ? a <= b : a >= b);
  return {
    name,
    gen: (rng) => genOps(rng, randInt(rng, 1, maxLen), (r) => {
      const x = r();
      if (x < pAdd) return ['add', pick(r, values)];
      if (x < 0.65) return ['poll'];
      if (x < 0.85) return ['remove', pick(r, values)];
      if (x < 0.93) return ['find', pick(r, values)];
      return ['peek'];
    }),
    replay(ops) {
      const h = new Ctor();
      let model = [];
      const extreme = () => (model.length ? (isMin ? Math.min(...model) : Math.max(...model)) : null);
      ops.forEach(([op, v], step) => {
        if (op === 'add') { h.add(v); model.push(v); }
        if (op === 'poll') {
          const exp = extreme();
          const got = h.poll();
          check(got === exp, 'poll-wrong', `step ${step}: poll()=${got}, expected ${exp}`);
          if (exp !== null) model.splice(model.indexOf(exp), 1);
        }
        if (op === 'peek') {
          const exp = extreme();
          check(h.peek() === exp, 'peek-wrong', `step ${step}: peek()=${h.peek()}, expected ${exp}`);
        }
        if (op === 'remove') { h.remove(v); model = model.filter((x) => x !== v); }
        if (op === 'find') {
          const exp = model.filter((x) => x === v).length;
          check(h.find(v).length === exp, 'find-count', `step ${step}`);
        }
        const c = h.heapContainer;
        check(eqJSON(sortNum(c), sortNum(model)), 'multiset', () => `step ${step}: container ${JSON.stringify(c)} model ${JSON.stringify(sortNum(model))}`);
        for (let i = 1; i < c.length; i += 1) {
          const p = Math.floor((i - 1) / 2);
          check(better(c[p], c[i]), 'heap-property', () => `step ${step} after ${op}(${v ?? ''}): parent[${p}]=${c[p]} child[${i}]=${c[i]} in ${JSON.stringify(c)}`);
        }
        check(h.isEmpty() === (model.length === 0), 'isEmpty', `step ${step}`);
      });
    },
  };
}

function adhocSuite(name, Ctor, isMin) {
  return {
    name,
    gen: (rng) => genOps(rng, randInt(rng, 1, 40), (r) => {
      const x = r();
      if (x < 0.55) return ['add', randInt(r, -3, 6)];
      if (x < 0.9) return ['poll'];
      return ['peek'];
    }),
    replay(ops) {
      const h = new Ctor();
      const model = [];
      const extreme = () => (model.length ? (isMin ? Math.min(...model) : Math.max(...model)) : undefined);
      ops.forEach(([op, v], step) => {
        if (op === 'add') { h.add(v); model.push(v); }
        if (op === 'poll') {
          const exp = extreme();
          const got = h.poll();
          check(got === exp, 'poll-wrong', `step ${step}: poll()=${got} expected ${exp}`);
          if (exp !== undefined) model.splice(model.indexOf(exp), 1);
        }
        if (op === 'peek') check(h.peek() === extreme(), 'peek-wrong', `step ${step}`);
        check(eqJSON(sortNum(h.heap), sortNum(model)), 'multiset', `step ${step}`);
        check(h.isEmpty() === (model.length === 0), 'isEmpty', `step ${step}`);
      });
    },
  };
}

function adhocCtorSuite(name, Ctor, isMin) {
  return {
    name,
    keep: 1,
    gen: (rng) => [['ctor', genOps(rng, randInt(rng, 0, 8), (r) => randInt(r, -3, 6))]],
    replay(ops) {
      const arr = ops[0][1];
      const h = new Ctor(arr);
      const exp = sortNum(arr);
      if (!isMin) exp.reverse();
      const got = [];
      while (!h.isEmpty()) got.push(h.poll());
      check(eqJSON(got, exp), 'ctor-array', `new ${Ctor.name}(${JSON.stringify(arr)}) drained ${JSON.stringify(got)}`);
    },
  };
}

// ---------------------------------------------------------------- PriorityQueue
const PQ_ITEMS = ['a', 'b', 'c', 'd', 'e'];
function pqSuite(name, priorities) {
  return {
    name,
    gen: (rng) => genOps(rng, randInt(rng, 1, 40), (r) => {
      const x = r();
      const it = pick(r, PQ_ITEMS);
      if (x < 0.4) return ['add', it, pick(r, priorities)];
      if (x < 0.6) return ['poll'];
      if (x < 0.72) return ['changePriority', it, pick(r, priorities)];
      if (x < 0.85) return ['remove', it];
      if (x < 0.93) return ['hasValue', it];
      return ['peek'];
    }),
    replay(ops) {
      const pq = new PriorityQueue();
      const model = new Map(); // item -> priority (items unique)
      const minP = () => Math.min(...model.values());
      ops.forEach(([op, it, p], step) => {
        // Only valid usage: add new items, change/remove present items.
        if (op === 'add' && !model.has(it)) { pq.add(it, p); model.set(it, p); }
        if (op === 'changePriority' && model.has(it)) { pq.changePriority(it, p); model.set(it, p); }
        if (op === 'remove' && model.has(it)) { pq.remove(it); model.delete(it); }
        if (op === 'hasValue') check(pq.hasValue(it) === model.has(it), 'hasValue', `step ${step}: hasValue(${it})`);
        if (op === 'poll' || op === 'peek') {
          const got = op === 'poll' ? pq.poll() : pq.peek();
          if (model.size === 0) check(got === null, `${op}-empty`, `step ${step}`);
          else {
            check(model.has(got) && model.get(got) === minP(), `${op}-wrong`, () => `step ${step}: ${op}()=${got} (prio ${model.get(got)}), min prio ${minP()}`);
            if (op === 'poll') model.delete(got);
          }
        }
        const c = pq.heapContainer;
        check(eqJSON(sortStr(c), sortStr([...model.keys()])), 'contents', () => `step ${step} after ${op}(${it ?? ''}${p !== undefined ? `,${p}` : ''}): queue ${JSON.stringify(sortStr(c))}, expected ${JSON.stringify(sortStr([...model.keys()]))}`);
        for (let i = 1; i < c.length; i += 1) {
          const pi = Math.floor((i - 1) / 2);
          check(model.get(c[pi]) <= model.get(c[i]), 'heap-property', `step ${step}`);
        }
      });
    },
  };
}

// ---------------------------------------------------------------- HashTable
function hashTableSuite(name, keys) {
  return {
    name,
    keep: 1,
    gen: (rng) => {
      const size = pick(rng, [1, 2, 3, 7, 32]);
      return [['size', size], ...genOps(rng, randInt(rng, 1, 40), (r) => {
        const x = r();
        const k = pick(r, keys);
        if (x < 0.4) return ['set', k, randInt(r, 0, 99)];
        if (x < 0.6) return ['delete', k];
        if (x < 0.75) return ['get', k];
        if (x < 0.9) return ['has', k];
        return ['keys'];
      })];
    },
    replay(ops) {
      const ht = new HashTable(ops[0][1]);
      const model = new Map();
      ops.slice(1).forEach(([op, k, v], step) => {
        if (op === 'set') { ht.set(k, v); model.set(k, v); }
        if (op === 'delete') {
          const r = ht.delete(k);
          check((r !== null) === model.has(k), 'delete-return', `step ${step}`);
          model.delete(k);
        }
        if (op === 'get') check(ht.get(k) === model.get(k), 'get', `step ${step}: get(${k})=${ht.get(k)} expected ${model.get(k)}`);
        if (op === 'has') check(ht.has(k) === model.has(k), 'has', `step ${step}: has(${JSON.stringify(k)})=${ht.has(k)} expected ${model.has(k)}`);
        check(eqJSON(sortStr(ht.getKeys()), sortStr([...model.keys()])), 'getKeys', () => `step ${step} after ${op}(${JSON.stringify(k)}): getKeys()=${JSON.stringify(sortStr(ht.getKeys()))} expected ${JSON.stringify(sortStr([...model.keys()]))}`);
        check(eqJSON(sortNum(ht.getValues()), sortNum([...model.values()])), 'getValues', `step ${step}`);
      });
    },
  };
}

// ---------------------------------------------------------------- BloomFilter
const bloomSuite = {
  name: 'BloomFilter (no false negatives)',
  keep: 1,
  gen: (rng) => {
    const size = pick(rng, [1, 7, 100, 1000]);
    return [['size', size], ...genOps(rng, randInt(rng, 1, 30), (r) => {
      const len = pick(r, [0, 1, 3, 10, 50, 300, 1200]);
      let s = '';
      for (let i = 0; i < len; i += 1) s += String.fromCharCode(randInt(r, 32, 0x2FFF));
      return ['insert', s];
    })];
  },
  replay(ops) {
    const bf = new BloomFilter(ops[0][1]);
    const inserted = [];
    ops.slice(1).forEach(([, s], step) => {
      bf.insert(s);
      inserted.push(s);
      inserted.forEach((w) => check(bf.mayContain(w) === true, 'false-negative', `step ${step}: len ${w.length}`));
      bf.getHashValues(s).forEach((h) => check(Number.isInteger(h) && h >= 0 && h < bf.size, 'hash-out-of-range', `hash index ${h} for string of length ${s.length}, size ${bf.size}`));
    });
  },
};

// ---------------------------------------------------------------- LRU
function lruSuite(name, Ctor, keys, internal) {
  return {
    name,
    keep: 1,
    gen: (rng) => [['cap', randInt(rng, 1, 4)], ...genOps(rng, randInt(rng, 1, 40), (r) => (r() < 0.5 ? ['set', pick(r, keys), randInt(r, 0, 99)] : ['get', pick(r, keys)]))],
    replay(ops) {
      const cap = ops[0][1];
      const c = new Ctor(cap);
      let model = []; // [key,val], oldest first
      ops.slice(1).forEach(([op, k, v], step) => {
        const idx = model.findIndex((e) => e[0] === k);
        if (op === 'set') {
          c.set(k, v);
          if (idx >= 0) model.splice(idx, 1);
          model.push([k, v]);
          if (model.length > cap) model.shift();
        } else {
          const got = c.get(k);
          const exp = idx >= 0 ? model[idx][1] : undefined;
          check(got === exp, 'get', `step ${step}: get(${JSON.stringify(k)})=${got} expected ${exp}`);
          if (idx >= 0) { const e = model.splice(idx, 1)[0]; model.push(e); }
        }
        if (internal === 'list') {
          check(c.size === model.length, 'size', () => `step ${step}: size ${c.size} expected ${model.length}`);
          const order = [];
          let n = c.head.next;
          let prev = c.head;
          let guard = 0;
          while (n && n !== c.tail && guard < 100) {
            check(n.prev === prev, 'prev-link', `step ${step}`);
            order.push(n.key); prev = n; n = n.next; guard += 1;
          }
          if (order.length) check(c.tail.prev === prev, 'tail-link', `step ${step}`);
          check(eqJSON(order, model.map((e) => e[0])), 'order', () => `step ${step}: list ${JSON.stringify(order)} expected ${JSON.stringify(model.map((e) => e[0]))}`);
          check(eqJSON(sortStr(Object.keys(c.nodesMap)), sortStr(model.map((e) => e[0]))), 'nodesMap', `step ${step}`);
        } else {
          check(eqJSON([...c.items.keys()], model.map((e) => e[0])), 'order', `step ${step}`);
        }
      });
    },
  };
}

// ---------------------------------------------------------------- Trie
function trieSuite(name, alphabet, maxLen) {
  const word = (r) => {
    let s = '';
    const n = randInt(r, 1, maxLen);
    for (let i = 0; i < n; i += 1) s += pick(r, alphabet);
    return s;
  };
  return {
    name,
    gen: (rng) => genOps(rng, randInt(rng, 1, 40), (r) => {
      const x = r();
      if (x < 0.4) return ['add', word(r)];
      if (x < 0.65) return ['delete', word(r)];
      if (x < 0.85) return ['exists', word(r)];
      return ['suggest', r() < 0.2 ? '' : word(r)];
    }),
    replay(ops) {
      const t = new Trie();
      const model = new Set();
      ops.forEach(([op, w], step) => {
        if (op === 'add') { t.addWord(w); model.add(w); }
        if (op === 'delete') { t.deleteWord(w); model.delete(w); }
        if (op === 'exists') check(t.doesWordExist(w) === model.has(w), 'exists', `step ${step}: doesWordExist(${JSON.stringify(w)})=${t.doesWordExist(w)} expected ${model.has(w)}`);
        if (op === 'suggest') {
          const pc = Array.from(w);
          const words = [...model].map((m) => Array.from(m)).filter((m) => m.length >= pc.length && pc.every((ch, i) => m[i] === ch));
          const exp = (words.length === 0 && pc.length > 0) ? null : sortStr([...new Set(words.filter((m) => m.length > pc.length).map((m) => m[pc.length]))]);
          const got = t.suggestNextCharacters(w);
          check(eqJSON(got && sortStr(got), exp), 'suggest', () => `step ${step}: suggestNextCharacters(${JSON.stringify(w)})=${JSON.stringify(got)} expected ${JSON.stringify(exp)}`);
        }
        // Structural: set of complete words in the trie == model.
        const found = [];
        const dfs = (node, prefix) => {
          if (node.isCompleteWord) found.push(prefix);
          node.children.getKeys().forEach((ch) => dfs(node.getChild(ch), prefix + ch));
        };
        dfs(t.head, '');
        check(eqJSON(sortStr(found), sortStr([...model])), 'word-set', () => `step ${step} after ${op}(${JSON.stringify(w)}): trie words ${JSON.stringify(sortStr(found))} expected ${JSON.stringify(sortStr([...model]))}`);
      });
    },
  };
}

// ---------------------------------------------------------------- Trees
export function inspectTree(root) {
  // Returns {values, parentOk, bstOk, height}. Empty BST root has null/undefined value and no kids.
  const values = [];
  let parentOk = true;
  const walk = (n, parent) => {
    if (!n) return 0;
    if (n.parent !== parent) parentOk = false;
    const hl = walk(n.left, n);
    values.push(n.value);
    const hr = walk(n.right, n);
    return 1 + Math.max(hl, hr);
  };
  if (root.value === null || root.value === undefined) {
    if (!root.left && !root.right) return { values: [], parentOk: root.parent === null, empty: true };
  }
  walk(root, null);
  return { values, parentOk };
}

function avlCheck(root) {
  let ok = true;
  let msg = '';
  const h = (n) => {
    if (!n) return 0;
    const l = h(n.left);
    const r = h(n.right);
    if (Math.abs(l - r) > 1 && ok) { ok = false; msg = `node ${n.value}: left height ${l}, right height ${r}`; }
    return 1 + Math.max(l, r);
  };
  h(root);
  return { ok, msg };
}

function rbCheck(t) {
  const color = (n) => n.meta.get('color');
  const root = t.root;
  if ((root.value === null || root.value === undefined) && !root.left && !root.right) return null; // empty tree
  if (color(root) !== 'black') return `root ${root.value} is ${color(root)}`;
  let err = null;
  const bh = (n) => {
    if (!n) return 1;
    const c = color(n);
    if (c !== 'red' && c !== 'black' && !err) err = `node ${n.value} uncolored`;
    if (c === 'red' && ((n.left && color(n.left) === 'red') || (n.right && color(n.right) === 'red')) && !err) err = `red node ${n.value} has red child`;
    const l = bh(n.left);
    const r = bh(n.right);
    if (l !== r && !err) err = `black-height mismatch at ${n.value}: ${l} vs ${r}`;
    return l + (c === 'black' ? 1 : 0);
  };
  bh(root);
  return err;
}

function treeSuite(name, Ctor, { removes, avl, rb, dupInserts, range = 10, len = 40 }) {
  return {
    name,
    gen: (rng) => genOps(rng, randInt(rng, 1, len), (r) => {
      const x = r();
      const v = randInt(r, 0, range - 1);
      if (removes && x < 0.35) return ['remove', v];
      if (x < 0.85) return ['insert', v];
      return ['contains', v];
    }),
    replay(ops) {
      const t = new Ctor();
      const model = new Set();
      ops.forEach(([op, v], step) => {
        if (op === 'insert') {
          if (!dupInserts && model.has(v)) return;
          t.insert(v); model.add(v);
        }
        if (op === 'remove') {
          if (!model.has(v)) {
            let threw = false;
            try { t.remove(v); } catch (e) { threw = true; }
            check(threw, 'remove-absent', `step ${step}: removing absent ${v} did not throw`);
          } else {
            t.remove(v); model.delete(v);
          }
        }
        if (op === 'contains') check(t.contains(v) === model.has(v), 'contains', `step ${step}: contains(${v})=${t.contains(v)} expected ${model.has(v)}`);
        const info = inspectTree(t.root);
        const exp = sortNum([...model]);
        check(eqJSON(info.values, exp), 'inorder', () => `step ${step} after ${op}(${v}): in-order ${JSON.stringify(info.values)} expected ${JSON.stringify(exp)}`);
        exp.forEach((x) => check(t.contains(x), 'contains', `step ${step}: contains(${x}) false`));
        if (avl) {
          const a = avlCheck(t.root);
          check(a.ok, 'avl-balance', () => `step ${step} after ${op}(${v}): ${a.msg}; tree ${JSON.stringify(exp)}`);
        }
        if (rb) {
          const e = rbCheck(t);
          check(!e, 'rb-property', () => `step ${step} after ${op}(${v}): ${e}`);
        }
        check(info.parentOk, 'parent-pointer', () => `step ${step} after ${op}(${v}): a node.parent does not point to its actual parent`);
      });
    },
  };
}

// ---------------------------------------------------------------- Segment & Fenwick
const OPS = {
  sum: [(a, b) => a + b, 0],
  min: [(a, b) => Math.min(a, b), Infinity],
  max: [(a, b) => Math.max(a, b), -Infinity],
};
const segmentSuite = {
  name: 'SegmentTree (sum/min/max, n=1..33, all ranges)',
  keep: 1,
  gen: (rng) => [['build', pick(rng, Object.keys(OPS)), genOps(rng, randInt(rng, 1, 33), (r) => randInt(r, -9, 9))]],
  replay(ops) {
    const [, opName, arr] = ops[0];
    const [f, fb] = OPS[opName];
    const st = new SegmentTree(arr, f, fb);
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = i; j < arr.length; j += 1) {
        const exp = arr.slice(i, j + 1).reduce(f, fb);
        const got = st.rangeQuery(i, j);
        check(got === exp, 'range', `${opName} of ${JSON.stringify(arr)} [${i},${j}] = ${got}, expected ${exp}`);
      }
    }
  },
};

const fenwickSuite = {
  name: 'FenwickTree (increase/query/queryRange, n=1..40)',
  keep: 1,
  gen: (rng) => {
    const n = randInt(rng, 1, 40);
    return [['n', n], ...genOps(rng, randInt(rng, 1, 40), (r) => {
      const x = r();
      if (x < 0.5) return ['inc', randInt(r, 1, n), randInt(r, -9, 9)];
      if (x < 0.75) return ['q', randInt(r, 1, n)];
      const a = randInt(r, 1, n);
      return ['qr', a, randInt(r, a, n)];
    })];
  },
  replay(ops) {
    const n = ops[0][1];
    const ft = new FenwickTree(n);
    const model = Array(n + 1).fill(0);
    ops.slice(1).forEach(([op, a, b], step) => {
      if (op === 'inc') { ft.increase(a, b); model[a] += b; }
      if (op === 'q') { const e = model.slice(1, a + 1).reduce((x, y) => x + y, 0); check(ft.query(a) === e, 'query', `step ${step}`); }
      if (op === 'qr') { const e = model.slice(a, b + 1).reduce((x, y) => x + y, 0); check(ft.queryRange(a, b) === e, 'queryRange', `step ${step}`); }
    });
  },
};

// ---------------------------------------------------------------- Linked lists
function listSuite(name, Ctor, { withInsert, doubly }) {
  return {
    name,
    gen: (rng) => genOps(rng, randInt(rng, 1, 40), (r) => {
      const x = r();
      const v = randInt(r, 0, 3);
      if (x < 0.2) return ['append', v];
      if (x < 0.4) return ['prepend', v];
      if (withInsert && x < 0.55) return ['insert', v, randInt(r, -1, 8)];
      if (x < 0.68) return ['delete', v];
      if (x < 0.76) return ['deleteHead'];
      if (x < 0.84) return ['deleteTail'];
      if (x < 0.92) return ['find', v];
      return ['reverse'];
    }),
    replay(ops) {
      const l = new Ctor();
      let model = [];
      ops.forEach(([op, v, idx], step) => {
        if (op === 'append') { l.append(v); model.push(v); }
        if (op === 'prepend') { l.prepend(v); model.unshift(v); }
        if (op === 'insert') {
          l.insert(v, idx);
          const i = Math.min(Math.max(idx, 0), model.length);
          model.splice(i, 0, v);
        }
        if (op === 'delete') {
          const r = l.delete(v);
          const had = model.includes(v);
          check(had ? (r && r.value === v) : r === null, 'delete-return', `step ${step}`);
          model = model.filter((x) => x !== v);
        }
        if (op === 'deleteHead') {
          const r = l.deleteHead();
          const e = model.length ? model.shift() : null;
          check((r ? r.value : null) === e, 'deleteHead', `step ${step}`);
        }
        if (op === 'deleteTail') {
          const r = l.deleteTail();
          const e = model.length ? model.pop() : null;
          check((r ? r.value : null) === e, 'deleteTail', `step ${step}`);
        }
        if (op === 'find') {
          const r = l.find({ value: v });
          check(model.includes(v) ? (r && r.value === v) : r === null, 'find', `step ${step}`);
        }
        if (op === 'reverse') { l.reverse(); model.reverse(); }
        // invariants
        const vals = [];
        let n = l.head;
        let prev = null;
        let guard = 0;
        while (n && guard < 500) {
          if (doubly) check(n.previous === prev, 'prev-link', `step ${step}`);
          vals.push(n.value); prev = n; n = n.next; guard += 1;
        }
        check(eqJSON(vals, model), 'contents', () => `step ${step} after ${op}(${v ?? ''}${idx !== undefined ? `,${idx}` : ''}): list ${JSON.stringify(vals)} expected ${JSON.stringify(model)}`);
        check(l.tail === prev, 'tail', () => `step ${step} after ${op}(${v ?? ''}${idx !== undefined ? `,${idx}` : ''}): tail=${l.tail && l.tail.value} but last node=${prev && prev.value}, list ${JSON.stringify(vals)}`);
        check(!l.tail || l.tail.next === null, 'tail-next', `step ${step}`);
      });
    },
  };
}

// ---------------------------------------------------------------- Deque / Queue / Stack
const dequeSuite = {
  name: 'Deque',
  gen: (rng) => genOps(rng, randInt(rng, 1, 40), (r) => pick(r, [['addFront', randInt(r, 0, 9)], ['addBack', randInt(r, 0, 9)], ['removeFront'], ['removeBack'], ['peekFront'], ['peekBack']])),
  replay(ops) {
    const d = new Deque();
    const m = [];
    ops.forEach(([op, v], step) => {
      if (op === 'addFront') { d.addFront(v); m.unshift(v); }
      if (op === 'addBack') { d.addBack(v); m.push(v); }
      if (op === 'removeFront') check(d.removeFront() === (m.length ? m.shift() : null), op, `step ${step}`);
      if (op === 'removeBack') check(d.removeBack() === (m.length ? m.pop() : null), op, `step ${step}`);
      if (op === 'peekFront') check(d.peekFront() === (m.length ? m[0] : null), op, `step ${step}`);
      if (op === 'peekBack') check(d.peekBack() === (m.length ? m[m.length - 1] : null), op, `step ${step}`);
      check(d.size === m.length && d.isEmpty() === !m.length && eqJSON(d.toArray(), m), 'state', `step ${step}`);
    });
  },
};
const queueSuite = {
  name: 'Queue',
  gen: (rng) => genOps(rng, randInt(rng, 1, 40), (r) => pick(r, [['enqueue', randInt(r, 0, 9)], ['enqueue', randInt(r, 0, 9)], ['dequeue'], ['peek']])),
  replay(ops) {
    const q = new Queue();
    const m = [];
    ops.forEach(([op, v], step) => {
      if (op === 'enqueue') { q.enqueue(v); m.push(v); }
      if (op === 'dequeue') check(q.dequeue() === (m.length ? m.shift() : null), op, `step ${step}`);
      if (op === 'peek') check(q.peek() === (m.length ? m[0] : null), op, `step ${step}`);
      check(q.isEmpty() === !m.length, 'isEmpty', `step ${step}`);
    });
  },
};
const stackSuite = {
  name: 'Stack',
  gen: (rng) => genOps(rng, randInt(rng, 1, 40), (r) => pick(r, [['push', randInt(r, 0, 9)], ['push', randInt(r, 0, 9)], ['pop'], ['peek']])),
  replay(ops) {
    const s = new Stack();
    const m = [];
    ops.forEach(([op, v], step) => {
      if (op === 'push') { s.push(v); m.push(v); }
      if (op === 'pop') check(s.pop() === (m.length ? m.pop() : null), op, `step ${step}`);
      if (op === 'peek') check(s.peek() === (m.length ? m[m.length - 1] : null), op, `step ${step}`);
      check(s.isEmpty() === !m.length && eqJSON(s.toArray(), m.slice().reverse()), 'state', `step ${step}`);
    });
  },
};

export const suites = [
  heapSuite('MinHeap (values 1..6, no zero)', MinHeap, true, [1, 2, 3, 4, 5, 6]),
  heapSuite('MaxHeap (values 1..6, no zero)', MaxHeap, false, [1, 2, 3, 4, 5, 6]),
  heapSuite('MinHeap (values -3..3, incl. 0)', MinHeap, true, [-3, -2, -1, 0, 1, 2, 3]),
  heapSuite('MaxHeap (values -3..3, incl. 0)', MaxHeap, false, [-3, -2, -1, 0, 1, 2, 3]),
  heapSuite('MinHeap (values -6..6, long seqs, add-heavy)', MinHeap, true, [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 120, 0.7),
  heapSuite('MaxHeap (values -6..6, long seqs, add-heavy)', MaxHeap, false, [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 120, 0.7),
  heapSuite('MinHeap control (values 1..13, long seqs)', MinHeap, true, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 120, 0.7),
  heapSuite('MaxHeap control (values 1..13, long seqs)', MaxHeap, false, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 120, 0.7),
  adhocSuite('MinHeapAdhoc (add/poll/peek)', MinHeapAdhoc, true),
  adhocSuite('MaxHeapAdhoc (add/poll/peek)', MaxHeapAdhoc, false),
  adhocCtorSuite('MinHeapAdhoc constructor(array)', MinHeapAdhoc, true),
  adhocCtorSuite('MaxHeapAdhoc constructor(array)', MaxHeapAdhoc, false),
  pqSuite('PriorityQueue (distinct priorities, unique items)', [10, 20, 30, 40, 50, 60, 70].map((x, i) => x + i)),
  pqSuite('PriorityQueue (repeated priorities, unique items)', [0, 1, 2]),
  hashTableSuite('HashTable (colliding keys, sizes 1..32)', ['a', 'b', 'ab', 'ba', 'c', 'aa', 'bb', 'abc', 'cba', '']),
  hashTableSuite('HashTable (Object.prototype key names)', ['a', 'b', '__proto__', 'constructor', 'toString', 'hasOwnProperty']),
  bloomSuite,
  lruSuite('LRUCache (linked-list impl)', LRUCache, ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], 'list'),
  lruSuite('LRUCacheOnMap', LRUCacheOnMap, ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], 'map'),
  lruSuite('LRUCache (Object.prototype key names)', LRUCache, ['a', 'b', 'constructor', 'toString', '__proto__'], 'list'),
  trieSuite('Trie (alphabet ab, len<=4)', ['a', 'b'], 4),
  trieSuite('Trie (non-BMP chars, e.g. emoji)', ['a', '\u{1F600}', '\u{1D11E}'], 3),
  treeSuite('BinarySearchTree (insert/remove/contains)', BinarySearchTree, { removes: true, dupInserts: true }),
  treeSuite('AvlTree (insert only, unique)', AvlTree, { removes: false, avl: true }),
  treeSuite('AvlTree (insert + remove)', AvlTree, { removes: true, avl: true }),
  treeSuite('AvlTree (insert + remove, keys 0..39, long seqs)', AvlTree, { removes: true, avl: true, range: 40, len: 120 }),
  treeSuite('BinarySearchTree (keys 0..39, long seqs)', BinarySearchTree, { removes: true, range: 40, len: 120 }),
  treeSuite('RedBlackTree (insert only, keys 0..199, long seqs)', RedBlackTree, { removes: false, rb: true, range: 200, len: 120 }),
  treeSuite('RedBlackTree (insert only, unique values)', RedBlackTree, { removes: false, rb: true, range: 30 }),
  treeSuite('RedBlackTree (insert with duplicates)', RedBlackTree, { removes: false, rb: true, dupInserts: true, range: 8 }),
  segmentSuite,
  fenwickSuite,
  listSuite('LinkedList (no insert)', LinkedList, { withInsert: false }),
  listSuite('LinkedList (with insert(value, index))', LinkedList, { withInsert: true }),
  listSuite('DoublyLinkedList', DoublyLinkedList, { doubly: true }),
  dequeSuite,
  queueSuite,
  stackSuite,
];
