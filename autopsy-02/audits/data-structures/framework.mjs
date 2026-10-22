// Minimal model-based / stateful property testing framework with shrinking.
// Each suite: gen(rng) -> op list; replay(ops) throws Fail on mismatch.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export class Fail extends Error {
  constructor(kind, detail) {
    super(`${kind}: ${detail}`);
    this.kind = kind;
  }
}

export function check(cond, kind, detail) {
  if (!cond) throw new Fail(kind, typeof detail === 'function' ? detail() : detail);
}

export const eqJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function runOnce(replay, ops) {
  try {
    replay(ops);
    return null;
  } catch (e) {
    if (e instanceof Fail) return { kind: e.kind, msg: e.message };
    return { kind: `crash:${e && e.constructor ? e.constructor.name : 'unknown'}`, msg: `crash: ${e && e.message}` };
  }
}

// Greedy delta-debugging shrink: keep failure of the same kind.
export function shrink(replay, ops, kind, keep = 0) {
  const head = ops.slice(0, keep); // header ops (e.g. constructor args) are never removed
  const full = (c) => head.concat(c);
  let cur = ops.slice(keep);
  let changed = true;
  while (changed) {
    changed = false;
    for (let chunk = Math.max(1, cur.length >> 1); chunk >= 1; chunk >>= 1) {
      for (let i = 0; i + chunk <= cur.length;) {
        const cand = cur.slice(0, i).concat(cur.slice(i + chunk));
        const r = runOnce(replay, full(cand));
        if (r && r.kind === kind) {
          cur = cand;
          changed = true;
        } else {
          i += 1;
        }
      }
    }
  }
  return full(cur);
}

export function runSuite({ name, gen, replay, sequences = 2000, seed = 12345, keep = 0 }) {
  let ops = 0;
  let failing = 0;
  const kinds = new Map(); // kind -> {count, firstOps, msg}
  for (let s = 0; s < sequences; s += 1) {
    const rng = mulberry32(seed + s * 7919);
    const seq = gen(rng);
    ops += seq.length;
    const r = runOnce(replay, seq);
    if (r) {
      failing += 1;
      if (!kinds.has(r.kind)) kinds.set(r.kind, { count: 0, ops: seq, msg: r.msg });
      kinds.get(r.kind).count += 1;
    }
  }
  const failures = [];
  for (const [kind, info] of kinds) {
    const minimal = shrink(replay, info.ops, kind, keep);
    const r = runOnce(replay, minimal);
    failures.push({ kind, count: info.count, minimal, msg: r ? r.msg : info.msg });
  }
  return { name, sequences, ops, failing, failures };
}
