// Root-cause isolation for RedBlackTree.insert on UNIQUE keys.
// Applies candidate fixes cumulatively (in memory only, vendor untouched) and measures
// 3000 random sequences x 60 unique inserts (keys 0..199) + a fixed minimal repro per stage.
// Usage: bun rb_rootcause.mjs <stage>   stage = 0 | 1 | 2 | 3   (run without arg -> all, via subprocesses)
import RedBlackTree from '../../vendor/src/data-structures/tree/red-black-tree/RedBlackTree.js';
import { inspectTree } from './suites.mjs';
import { mulberry32, randInt } from './framework.mjs';

const stage = process.argv[2];
if (stage === undefined) {
  for (const s of ['0', '1', '2', '3']) {
    const p = Bun.spawnSync(['bun', import.meta.path, s]);
    process.stdout.write(p.stdout.toString());
  }
  process.exit(0);
}
const P = RedBlackTree.prototype;
const S = Number(stage);
if (S >= 1) {
  // Stage 1 = in-memory replica of open PR #561: restore parentNode.parent after the inner re-link.
  P.leftRightRotation = function lr(g) { const p = g.left; const c = p.right; const cl = c.left; c.setLeft(p); p.setRight(cl); g.setLeft(c); p.parent = c; return this.leftLeftRotation(g); };
  P.rightLeftRotation = function rl(g) { const p = g.right; const c = p.left; const cr = c.right; c.setRight(p); p.setLeft(cr); g.setRight(c); p.parent = c; return this.rightRightRotation(g); };
}
if (S >= 2) {
  // Stage 2: LL/RR rotations — grandGrandParent.setLeft/setRight(parentNode) nulls grandParentNode.parent
  // (grandParentNode had just become parentNode's child). Restore it.
  const ll = P.leftLeftRotation; const rr = P.rightRightRotation;
  P.leftLeftRotation = function llr(g) { const r = ll.call(this, g); g.parent = r; return r; };
  P.rightRightRotation = function rrr(g) { const r = rr.call(this, g); g.parent = r; return r; };
}
if (S >= 3) {
  // Stage 3: balance() must only fix a RED node; after a rotation newGrandParent is BLACK.
  const b = P.balance;
  P.balance = function bal(n) { if (n !== this.root && !this.isNodeRed(n)) return; b.call(this, n); };
}
const names = ['original', '+ PR #561 (LR/RL parent fix)', '+ LL/RR parent fix', '+ balance() only on red nodes'];

const rbErr = (t) => {
  const c = (n) => n.meta.get('color');
  if (c(t.root) !== 'black') return 'root-not-black';
  let e = null;
  const bh = (n) => {
    if (!n) return 1;
    if (c(n) === 'red' && [n.left, n.right].some((x) => x && c(x) === 'red')) e = e || 'red-red';
    const l = bh(n.left); const r = bh(n.right);
    if (l !== r) e = e || 'black-height';
    return l + (c(n) === 'black' ? 1 : 0);
  };
  bh(t.root);
  return e;
};
const kinds = {};
for (let s = 0; s < 3000; s += 1) {
  const r = mulberry32(s + 5); const t = new RedBlackTree(); const set = new Set(); let k = null;
  try {
    for (let i = 0; i < 60 && !k; i += 1) {
      const v = randInt(r, 0, 199);
      if (!set.has(v)) {
        set.add(v); t.insert(v);
        const info = inspectTree(t.root);
        if (JSON.stringify(info.values) !== JSON.stringify([...set].sort((a, b) => a - b))) k = 'lost-nodes';
        else k = rbErr(t) || (info.parentOk ? null : 'parent-ptr');
      }
    }
  } catch (e) { k = 'crash'; }
  if (k) kinds[k] = (kinds[k] || 0) + 1;
}
const fixed = { 0: [1, 3, 2, 4, 5], 1: [1, 2, 3, 6, 7, 4, 5], 2: [1, 2, 3, 6, 7, 4, 5], 3: [1, 2, 3, 6, 7, 4, 5] }[S];
const t = new RedBlackTree(); let res;
try { fixed.forEach((v) => t.insert(v)); const io = inspectTree(t.root).values; res = `in-order ${JSON.stringify(io)}, rb-violation: ${rbErr(t) || 'none'}`; } catch (e) { res = `CRASH ${e.message}`; }
const bad = Object.values(kinds).reduce((a, b) => a + b, 0);
console.log(`stage ${S} ${names[S]}: ${bad}/3000 sequences broken ${JSON.stringify(kinds)}; insert ${JSON.stringify(fixed)} -> ${res}`);
