// Shared helpers: seeded RNG, random graph generation, and simple brute-force oracles.
// Oracles deliberately use plain adjacency arrays (never the vendor Graph class).
import Graph from '../../vendor/src/data-structures/graph/Graph';
import GraphVertex from '../../vendor/src/data-structures/graph/GraphVertex';
import GraphEdge from '../../vendor/src/data-structures/graph/GraphEdge';

export { Graph, GraphVertex, GraphEdge };

// ---------------------------------------------------------------- RNG
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- spec
// A graph "spec" is { n, directed, edges: [[u, v, w], ...] } over vertices 0..n-1.
// Vertex i gets key `v${i}`. Vertices are added in order `order` (default 0..n-1),
// so getAllVertices()[0] is the vertex order[0].

/**
 * Random simple graph. opts: n, p (edge prob), directed, minW, maxW, selfLoops (prob)
 */
export function randomSpec(rng, {
  n, p = 0.4, directed = false, minW = 0, maxW = 9, selfLoops = 0,
}) {
  const edges = [];
  for (let u = 0; u < n; u += 1) {
    for (let v = 0; v < n; v += 1) {
      if (u === v) {
        if (selfLoops > 0 && rng() < selfLoops) edges.push([u, u, randInt(rng, minW, maxW)]);
        continue;
      }
      if (!directed && v < u) continue;
      if (rng() < p) {
        // For undirected graphs randomise the stored orientation.
        const [a, b] = (!directed && rng() < 0.5) ? [v, u] : [u, v];
        edges.push([a, b, randInt(rng, minW, maxW)]);
      }
    }
  }
  return { n, directed, edges: shuffle(rng, edges) };
}

export function buildGraph(spec, order = null) {
  const g = new Graph(spec.directed);
  const vs = Array.from({ length: spec.n }, (_, i) => new GraphVertex(`v${i}`));
  (order || vs.map((_, i) => i)).forEach((i) => g.addVertex(vs[i]));
  spec.edges.forEach(([u, v, w]) => g.addEdge(new GraphEdge(vs[u], vs[v], w)));
  return { g, vs };
}

export const idx = (vertex) => Number(vertex.getKey().slice(1));

// ---------------------------------------------------------------- oracles
export function adjList(spec, skipVertex = -1, skipEdge = -1) {
  const adj = Array.from({ length: spec.n }, () => []);
  spec.edges.forEach(([u, v, w], ei) => {
    if (ei === skipEdge || u === skipVertex || v === skipVertex) return;
    adj[u].push([v, w]);
    if (!spec.directed && u !== v) adj[v].push([u, w]);
  });
  return adj;
}

export function reachableFrom(spec, s) {
  const adj = adjList(spec);
  const seen = new Set([s]);
  const st = [s];
  while (st.length) {
    const u = st.pop();
    adj[u].forEach(([v]) => { if (!seen.has(v)) { seen.add(v); st.push(v); } });
  }
  return seen;
}

export function countComponents(spec, skipVertex = -1, skipEdge = -1) {
  const adj = adjList(spec, skipVertex, skipEdge);
  const seen = new Array(spec.n).fill(false);
  let c = 0;
  for (let s = 0; s < spec.n; s += 1) {
    if (s === skipVertex || seen[s]) continue;
    c += 1;
    const st = [s];
    seen[s] = true;
    while (st.length) {
      const u = st.pop();
      adj[u].forEach(([v]) => { if (!seen[v]) { seen[v] = true; st.push(v); } });
    }
  }
  return c;
}

// Reference all-pairs shortest paths: plain triple loop (taking min over parallel edges).
export function apsp(spec) {
  const { n } = spec;
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 0 : Infinity)));
  spec.edges.forEach(([u, v, w]) => {
    d[u][v] = Math.min(d[u][v], w);
    if (!spec.directed) d[v][u] = Math.min(d[v][u], w);
  });
  for (let k = 0; k < n; k += 1) for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
    if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  }
  return d;
}

export function hasNegativeCycle(spec) {
  const d = apsp(spec);
  return d.some((row, i) => row[i] < 0);
}

export function* permutations(arr) {
  if (arr.length <= 1) { yield [...arr]; return; }
  for (let i = 0; i < arr.length; i += 1) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) yield [arr[i], ...p];
  }
}

export function* combinations(arr, k, start = 0, acc = []) {
  if (acc.length === k) { yield [...acc]; return; }
  for (let i = start; i < arr.length; i += 1) {
    acc.push(arr[i]);
    yield* combinations(arr, k, i + 1, acc);
    acc.pop();
  }
}

// Weight-matrix (min over parallel edges), Infinity where no edge.
export function weightMatrix(spec) {
  const m = Array.from({ length: spec.n }, () => new Array(spec.n).fill(Infinity));
  spec.edges.forEach(([u, v, w]) => {
    m[u][v] = Math.min(m[u][v], w);
    if (!spec.directed) m[v][u] = Math.min(m[v][u], w);
  });
  return m;
}

// ---------------------------------------------------------------- reporting
export class Suite {
  constructor(name) {
    this.name = name;
    this.tests = 0;
    this.failures = 0;
    this.examples = [];
  }

  check(ok, describe) {
    this.tests += 1;
    if (!ok) {
      this.failures += 1;
      if (this.examples.length < 3) this.examples.push(typeof describe === 'function' ? describe() : describe);
    }
  }

  run(describe, fn) {
    let ok;
    let err = null;
    try { ok = fn(); } catch (e) { ok = false; err = e; }
    this.check(ok, () => {
      const d = typeof describe === 'function' ? describe() : describe;
      return err ? `${d} -> THROWS ${err.constructor.name}: ${String(err.message).trim().slice(0, 120)}` : d;
    });
  }
}

export const specStr = (s) => `${s.directed ? 'directed' : 'undirected'} n=${s.n} edges=${JSON.stringify(s.edges)}`;
