// Operation-count probes for README complexity claims (no timing noise).
import BinaryTreeNode from '../../vendor/src/data-structures/tree/BinaryTreeNode.js';
import AvlTree from '../../vendor/src/data-structures/tree/avl-tree/AvlTree.js';

function countHeightCalls(fn) {
  const desc = Object.getOwnPropertyDescriptor(BinaryTreeNode.prototype, 'height');
  let calls = 0;
  Object.defineProperty(BinaryTreeNode.prototype, 'height', {
    configurable: true,
    get() { calls += 1; return desc.get.call(this); },
  });
  try { fn(); } finally { Object.defineProperty(BinaryTreeNode.prototype, 'height', desc); }
  return calls;
}

export function complexityProbes() {
  const out = [];
  // AVL insert: README claims O(log n). Measure node visits (height getter calls)
  // spent on the LAST 100 inserts into a tree of size n (ascending keys).
  const rows = [];
  for (const n of [500, 1000, 2000, 4000]) {
    const t = new AvlTree();
    for (let i = 0; i < n; i += 1) t.insert(i);
    const calls = countHeightCalls(() => { for (let i = n; i < n + 100; i += 1) t.insert(i); });
    rows.push([n, calls / 100]);
  }
  out.push(`AvlTree.insert, height-getter calls per insert (n -> calls): ${rows.map(([n, c]) => `${n}->${c.toFixed(0)}`).join(', ')}`);
  const ratio = rows[rows.length - 1][1] / rows[0][1];
  out.push(`  growth for 8x n: ${ratio.toFixed(2)}x (O(log n) would be ~1.3x, O(n) ~8x)`);
  return out;
}
