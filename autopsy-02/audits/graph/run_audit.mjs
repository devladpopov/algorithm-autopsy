// Algorithm Autopsy #2 - trekhleb/javascript-algorithms graph + tree algorithms.
// Differential / property-based tests against brute-force oracles.
// Usage: bun run_audit.mjs [seed]
import {
  mulberry32, randInt, shuffle, randomSpec, buildGraph, idx, adjList, reachableFrom,
  countComponents, apsp, hasNegativeCycle, permutations, combinations, weightMatrix,
  Suite, specStr, Graph, GraphVertex, GraphEdge,
} from './lib.mjs';

import depthFirstSearch from '../../vendor/src/algorithms/graph/depth-first-search/depthFirstSearch';
import breadthFirstSearch from '../../vendor/src/algorithms/graph/breadth-first-search/breadthFirstSearch';
import dijkstra from '../../vendor/src/algorithms/graph/dijkstra/dijkstra';
import bellmanFord from '../../vendor/src/algorithms/graph/bellman-ford/bellmanFord';
import floydWarshall from '../../vendor/src/algorithms/graph/floyd-warshall/floydWarshall';
import kruskal from '../../vendor/src/algorithms/graph/kruskal/kruskal';
import prim from '../../vendor/src/algorithms/graph/prim/prim';
import articulationPoints from '../../vendor/src/algorithms/graph/articulation-points/articulationPoints';
import graphBridges from '../../vendor/src/algorithms/graph/bridges/graphBridges';
import detectUndirectedCycle from '../../vendor/src/algorithms/graph/detect-cycle/detectUndirectedCycle';
import detectUndirectedCycleUsingDisjointSet from '../../vendor/src/algorithms/graph/detect-cycle/detectUndirectedCycleUsingDisjointSet';
import detectDirectedCycle from '../../vendor/src/algorithms/graph/detect-cycle/detectDirectedCycle';
import topologicalSort from '../../vendor/src/algorithms/graph/topological-sorting/topologicalSort';
import stronglyConnectedComponents from '../../vendor/src/algorithms/graph/strongly-connected-components/stronglyConnectedComponents';
import eulerianPath from '../../vendor/src/algorithms/graph/eulerian-path/eulerianPath';
import hamiltonianCycle from '../../vendor/src/algorithms/graph/hamiltonian-cycle/hamiltonianCycle';
import bfTravellingSalesman from '../../vendor/src/algorithms/graph/travelling-salesman/bfTravellingSalesman';
import treeBFS from '../../vendor/src/algorithms/tree/breadth-first-search/breadthFirstSearch';
import treeDFS from '../../vendor/src/algorithms/tree/depth-first-search/depthFirstSearch';
import BinaryTreeNode from '../../vendor/src/data-structures/tree/BinaryTreeNode';
import DisjointSet from '../../vendor/src/data-structures/disjoint-set/DisjointSet';
import DisjointSetAdhoc from '../../vendor/src/data-structures/disjoint-set/DisjointSetAdhoc';

const SEED = Number(process.argv[2] || 20261023);
const rng = mulberry32(SEED);
const suites = [];
const S = (name) => { const s = new Suite(name); suites.push(s); return s; };
const sizes = (count, lo, hi) => Array.from({ length: count }, (_, i) => lo + Math.floor((i * (hi - lo + 1)) / count));
const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
const randOrder = (n) => shuffle(rng, Array.from({ length: n }, (_, i) => i));

// ======================================================= Graph DFS / BFS (default callbacks)
{
  const sDfs = S('graph/depthFirstSearch: each reachable vertex entered exactly once (default allowTraversal)');
  const sBfs = S('graph/breadthFirstSearch: each reachable vertex entered exactly once (default allowTraversal)');
  const sBfsOrder = S('graph/breadthFirstSearch: first-visit order is non-decreasing in BFS distance');
  const sExtra = S('graph DFS+BFS diagnostic: duplicate entries are ONLY the start vertex, re-entered once, iff start has an incoming edge from a reachable vertex');
  for (const n of sizes(3000, 1, 9)) {
    const spec = randomSpec(rng, { n, p: rng() * 0.6, directed: rng() < 0.5 });
    const { g, vs } = buildGraph(spec);
    const s = randInt(rng, 0, n - 1);
    const reach = [...reachableFrom(spec, s)].map((i) => `v${i}`);
    const desc = () => `${specStr(spec)} start=v${s}`;
    sDfs.run(() => `${desc()} entered=${JSON.stringify(dfsOrder)}`, () => {
      dfsOrder = [];
      depthFirstSearch(g, vs[s], { enterVertex: ({ currentVertex }) => dfsOrder.push(currentVertex.getKey()) });
      return dfsOrder.length === reach.length && sameSet(dfsOrder, reach);
    });
    let bfsOrder = [];
    sBfs.run(() => `${desc()} entered=${JSON.stringify(bfsOrder)}`, () => {
      breadthFirstSearch(g, vs[s], { enterVertex: ({ currentVertex }) => bfsOrder.push(currentVertex.getKey()) });
      return bfsOrder.length === reach.length && sameSet(bfsOrder, reach);
    });
    // BFS order property (unit distances)
    const unit = { ...spec, edges: spec.edges.map(([u, v]) => [u, v, 1]) };
    const d = apsp(unit)[s];
    sBfsOrder.run(() => `${desc()} entered=${JSON.stringify(bfsOrder)}`, () => {
      const ds = [...new Set(bfsOrder)].map((k) => d[Number(k.slice(1))]);
      return ds.every((x, i) => i === 0 || ds[i - 1] <= x);
    });
    const reachSet = reachableFrom(spec, s);
    const startHasIncoming = spec.edges.some(([u, v]) => (v === s && reachSet.has(u)) || (!spec.directed && u === s));
    sExtra.run(() => `${desc()} dfs=${JSON.stringify(dfsOrder)} bfs=${JSON.stringify(bfsOrder)}`, () => {
      const expectLen = reach.length + (startHasIncoming ? 1 : 0);
      const extraOk = (o) => o.length === expectLen && (!startHasIncoming || o.filter((k) => k === `v${s}`).length === 2);
      return extraOk(dfsOrder) && extraOk(bfsOrder);
    });
  }
}
var dfsOrder; // eslint-disable-line

// ======================================================= Dijkstra
{
  const s1 = S('dijkstra: distances + predecessor paths vs Floyd-Warshall oracle (simple graphs, w>=0)');
  for (const n of sizes(3000, 1, 9)) {
    const spec = randomSpec(rng, { n, p: rng() * 0.7, directed: rng() < 0.5, minW: 0, maxW: 9 });
    const { g, vs } = buildGraph(spec, randOrder(n));
    const s = randInt(rng, 0, n - 1);
    const ref = apsp(spec)[s];
    let res;
    s1.run(() => `${specStr(spec)} start=v${s} got=${JSON.stringify(res && res.distances)} want=${JSON.stringify(ref)}`, () => {
      res = dijkstra(g, vs[s]);
      for (let v = 0; v < n; v += 1) {
        if (res.distances[`v${v}`] !== ref[v]) return false;
        // predecessor chain must be a path of exactly that weight
        if (ref[v] !== Infinity && v !== s) {
          let cur = v; let w = 0; let steps = 0;
          const wm = weightMatrix(spec);
          while (cur !== s && steps <= n) {
            const p = res.previousVertices[`v${cur}`];
            if (!p) return false;
            w += wm[idx(p)][cur]; cur = idx(p); steps += 1;
          }
          if (cur !== s || w !== ref[v]) return false;
        }
      }
      return true;
    });
  }
  // Multigraph: undirected graph containing both A_B and B_A (Graph.addEdge accepts this).
  const s2 = S('dijkstra: undirected graph with two parallel edges (keys u_v and v_u accepted by Graph.addEdge)');
  for (const n of sizes(1000, 2, 7)) {
    const spec = randomSpec(rng, { n, p: 0.5, directed: false, minW: 0, maxW: 9 });
    const extra = spec.edges.filter(() => rng() < 0.5).map(([u, v]) => [v, u, randInt(rng, 0, 9)]);
    const mspec = { ...spec, edges: [...spec.edges, ...extra] };
    const { g, vs } = buildGraph(mspec);
    const ref = apsp(mspec)[0];
    let res;
    s2.run(() => `${specStr(mspec)} got=${JSON.stringify(res && res.distances)} want=${JSON.stringify(ref)}`, () => {
      res = dijkstra(g, vs[0]);
      return ref.every((x, v) => res.distances[`v${v}`] === x);
    });
  }
}

// ======================================================= Bellman-Ford
{
  const s1 = S('bellmanFord: directed, negative weights, no negative cycles, no self-loops');
  const s2 = S('bellmanFord: directed, negative weights + non-negative self-loops (no negative cycles)');
  for (const n of sizes(3000, 1, 8)) {
    for (const [suite, loops] of [[s1, 0], [s2, 0.3]]) {
      let spec;
      do { spec = randomSpec(rng, { n, p: rng() * 0.6, directed: true, minW: -4, maxW: 9, selfLoops: loops }); }
      while (hasNegativeCycle(spec));
      if (loops) spec.edges = spec.edges.map(([u, v, w]) => (u === v ? [u, v, Math.abs(w)] : [u, v, w]));
      if (hasNegativeCycle(spec)) continue;
      const { g, vs } = buildGraph(spec, randOrder(n));
      const s = randInt(rng, 0, n - 1);
      const ref = apsp(spec)[s];
      let res;
      suite.run(() => `${specStr(spec)} start=v${s} got=${JSON.stringify(res && res.distances)} want=${JSON.stringify(ref)}`, () => {
        res = bellmanFord(g, vs[s]);
        return ref.every((x, v) => res.distances[`v${v}`] === x);
      });
    }
  }
}

// ======================================================= Floyd-Warshall + Graph.getAdjacencyMatrix
{
  const s1 = S('floydWarshall: distances vs oracle (directed w/ negative weights, undirected w>=0)');
  const s2 = S('floydWarshall: nextVertices reconstructs a path of the reported length (intermediate-vertex semantics)');
  for (const n of sizes(3000, 1, 8)) {
    const directed = rng() < 0.5;
    let spec;
    do { spec = randomSpec(rng, { n, p: rng() * 0.6, directed, minW: directed ? -4 : 0, maxW: 9 }); }
    while (hasNegativeCycle(spec));
    const { g } = buildGraph(spec);
    const ref = apsp(spec);
    const wm = weightMatrix(spec);
    let res;
    s1.run(() => `${specStr(spec)} got=${JSON.stringify(res && res.distances)} want=${JSON.stringify(ref)}`, () => {
      res = floydWarshall(g);
      return ref.every((row, i) => row.every((x, j) => res.distances[i][j] === x));
    });
    s2.run(() => specStr(spec), () => {
      const rec = (i, j, depth) => {
        if (depth > 3 * n) throw new Error('reconstruction loops');
        const nv = res.nextVertices[i][j];
        if (nv === null) return null;
        const k = idx(nv);
        if (k === i) return wm[i][j];
        const a = rec(i, k, depth + 1); const b = rec(k, j, depth + 1);
        return a === null || b === null ? null : a + b;
      };
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
        if (i === j || ref[i][j] === Infinity) continue;
        if (rec(i, j, 0) !== ref[i][j]) return false;
      }
      return true;
    });
  }
  const s3 = S('Graph.getAdjacencyMatrix: entry [u][v] equals weight of edge u->v (simple graphs incl. self-loops)');
  for (const n of sizes(2000, 1, 7)) {
    const spec = randomSpec(rng, { n, p: 0.5, directed: rng() < 0.5, minW: 1, maxW: 9, selfLoops: 0.3 });
    const { g } = buildGraph(spec);
    const wm = weightMatrix(spec);
    let m;
    s3.run(() => `${specStr(spec)} got=${JSON.stringify(m)} want=${JSON.stringify(wm)}`, () => {
      m = g.getAdjacencyMatrix();
      return wm.every((row, i) => row.every((x, j) => m[i][j] === x));
    });
  }
}

// ======================================================= MST: Kruskal / Prim
function bruteMSF(spec) {
  const c = countComponents(spec);
  const k = spec.n - c;
  let best = Infinity;
  const ids = spec.edges.map((_, i) => i);
  for (const comb of combinations(ids, k)) {
    const sub = { ...spec, edges: comb.map((i) => spec.edges[i]) };
    if (countComponents(sub) !== c) continue;
    const w = comb.reduce((a, i) => a + spec.edges[i][2], 0);
    if (w < best) best = w;
  }
  return k === 0 ? 0 : best;
}
{
  const sk = S('kruskal: spanning forest of minimum weight (brute force over edge subsets; incl. disconnected, ties)');
  const sp = S('prim: spanning tree of minimum weight (connected graphs, brute force over edge subsets, ties)');
  for (const n of sizes(1500, 1, 7)) {
    const spec = randomSpec(rng, { n, p: 0.3 + rng() * 0.4, directed: false, minW: -3, maxW: 5 });
    if (spec.edges.length > 14) spec.edges = spec.edges.slice(0, 14);
    const ref = bruteMSF(spec);
    const c = countComponents(spec);
    let t;
    sk.run(() => `${specStr(spec)} got=${t && t.getWeight()} want=${ref}`, () => {
      const { g } = buildGraph(spec, randOrder(n));
      t = kruskal(g);
      return t.getWeight() === ref && t.getAllEdges().length === n - c;
    });
    if (c === 1) {
      let tp;
      sp.run(() => `${specStr(spec)} got=${tp && tp.getWeight()} want=${ref}`, () => {
        const { g } = buildGraph(spec, randOrder(n));
        tp = prim(g);
        return tp.getWeight() === ref && tp.getAllEdges().length === n - 1
          && (n === 1 || tp.getAllVertices().length === n);
      });
    }
  }
}

// ======================================================= Articulation points / bridges
{
  const apC = S('articulationPoints: connected undirected graphs vs brute-force vertex removal');
  const apD = S('articulationPoints: disconnected undirected graphs vs brute-force vertex removal');
  const brC = S('graphBridges: connected undirected graphs vs brute-force edge removal');
  const brD = S('graphBridges: disconnected undirected graphs vs brute-force edge removal');
  for (const n of sizes(4000, 1, 10)) {
    const spec = randomSpec(rng, { n, p: rng() * 0.6, directed: false });
    const c0 = countComponents(spec);
    const wantAP = []; for (let v = 0; v < n; v += 1) if (countComponents(spec, v) > c0) wantAP.push(`v${v}`);
    const wantBr = spec.edges.filter((e, i) => countComponents(spec, -1, i) > c0).map(([u, v]) => `v${u}_v${v}`);
    const order = randOrder(n);
    let gotAP; let gotBr;
    (c0 === 1 ? apC : apD).run(() => `${specStr(spec)} order=${JSON.stringify(order)} got=${JSON.stringify(gotAP)} want=${JSON.stringify(wantAP)}`, () => {
      gotAP = Object.keys(articulationPoints(buildGraph(spec, order).g));
      return sameSet(gotAP, wantAP);
    });
    (c0 === 1 ? brC : brD).run(() => `${specStr(spec)} order=${JSON.stringify(order)} got=${JSON.stringify(gotBr)} want=${JSON.stringify(wantBr)}`, () => {
      gotBr = Object.keys(graphBridges(buildGraph(spec, order).g));
      return sameSet(gotBr, wantBr);
    });
  }
}

// ======================================================= Cycle detection
function validUndirectedCycle(spec, cycle) {
  const keys = Object.keys(cycle);
  if (keys.length < 3) return keys.length === 1 && spec.edges.some(([u, v]) => u === v && `v${u}` === keys[0]);
  const wm = weightMatrix(spec);
  // each entry x -> cycle[x] is an edge and following pointers yields a single loop over all keys
  if (!keys.every((k) => wm[Number(k.slice(1))][idx(cycle[k])] !== Infinity)) return false;
  let cur = keys[0]; const seen = new Set();
  while (!seen.has(cur)) { seen.add(cur); cur = cycle[cur].getKey(); }
  return cur === keys[0] && seen.size === keys.length;
}
{
  const cuC = S('detectUndirectedCycle (DFS): connected graphs, null iff forest, returned cycle valid');
  const cuD = S('detectUndirectedCycle (DFS): disconnected graphs, null iff forest');
  const cuDS = S('detectUndirectedCycleUsingDisjointSet: any graph, true iff not a forest');
  for (const n of sizes(4000, 1, 10)) {
    const spec = randomSpec(rng, { n, p: rng() * 0.45, directed: false });
    const hasCycle = spec.edges.length > n - countComponents(spec);
    const conn = countComponents(spec) === 1;
    let got;
    (conn ? cuC : cuD).run(() => `${specStr(spec)} got=${got ? JSON.stringify(Object.keys(got)) : got} wantCycle=${hasCycle}`, () => {
      got = detectUndirectedCycle(buildGraph(spec, randOrder(n)).g);
      return hasCycle ? (got !== null && validUndirectedCycle(spec, got)) : got === null;
    });
    let gotDS;
    cuDS.run(() => `${specStr(spec)} got=${gotDS} want=${hasCycle}`, () => {
      gotDS = detectUndirectedCycleUsingDisjointSet(buildGraph(spec, randOrder(n)).g);
      return gotDS === hasCycle;
    });
  }
  const cd = S('detectDirectedCycle: null iff DAG, returned cycle follows real edges (incl. self-loops)');
  for (const n of sizes(4000, 1, 10)) {
    const spec = randomSpec(rng, { n, p: rng() * 0.3, directed: true, selfLoops: 0.03 });
    const reach = Array.from({ length: n }, (_, i) => i);
    const hasCycle = spec.edges.some(([u, v]) => u === v || reachableFrom(spec, v).has(u));
    const wm = weightMatrix(spec);
    let got;
    cd.run(() => `${specStr(spec)} got=${got ? JSON.stringify(Object.keys(got)) : got} want=${hasCycle}`, () => {
      got = detectDirectedCycle(buildGraph(spec, randOrder(n)).g);
      if (!hasCycle) return got === null;
      if (got === null) return false;
      const keys = Object.keys(got);
      // cycle[x] = previous vertex => edge cycle[x] -> x must exist
      if (!keys.every((k) => wm[idx(got[k])][Number(k.slice(1))] !== Infinity)) return false;
      let cur = keys[0]; const seen = new Set();
      while (!seen.has(cur)) { seen.add(cur); cur = got[cur].getKey(); }
      return cur === keys[0] && seen.size === keys.length && reach.length > 0;
    });
  }
}

// ======================================================= Topological sort / SCC
{
  const ts = S('topologicalSort: random DAGs, output is a permutation respecting every edge');
  for (const n of sizes(3000, 1, 12)) {
    const perm = randOrder(n);
    const spec = randomSpec(rng, { n, p: rng() * 0.5, directed: true });
    // randomSpec(directed) may contain both u->v and v->u; orient along perm and dedupe.
    const seenE = new Set();
    spec.edges = spec.edges.map(([u, v, w]) => (perm.indexOf(u) < perm.indexOf(v) ? [u, v, w] : [v, u, w]))
      .filter(([u, v]) => { const k = `${u}_${v}`; if (seenE.has(k)) return false; seenE.add(k); return true; });
    let got;
    ts.run(() => `${specStr(spec)} got=${JSON.stringify(got)}`, () => {
      got = topologicalSort(buildGraph(spec, randOrder(n)).g).map((v) => v.getKey());
      const pos = Object.fromEntries(got.map((k, i) => [k, i]));
      return got.length === n && new Set(got).size === n
        && spec.edges.every(([u, v]) => pos[`v${u}`] < pos[`v${v}`]);
    });
  }
  const scc = S('stronglyConnectedComponents: partition equals mutual-reachability classes');
  for (const n of sizes(3000, 1, 10)) {
    const spec = randomSpec(rng, { n, p: rng() * 0.35, directed: true, selfLoops: 0.05 });
    const R = Array.from({ length: n }, (_, i) => reachableFrom(spec, i));
    const want = []; const done = new Set();
    for (let i = 0; i < n; i += 1) {
      if (done.has(i)) continue;
      const comp = []; for (let j = 0; j < n; j += 1) if (R[i].has(j) && R[j].has(i)) { comp.push(`v${j}`); done.add(j); }
      want.push(comp.sort().join(','));
    }
    let got;
    scc.run(() => `${specStr(spec)} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`, () => {
      got = stronglyConnectedComponents(buildGraph(spec, randOrder(n)).g).map((c) => c.map((v) => v.getKey()).sort().join(','));
      return sameSet(got, want);
    });
  }
}

// ======================================================= Eulerian path (Fleury)
function eulerInstance(spec) {
  const deg = new Array(spec.n).fill(0);
  spec.edges.forEach(([u, v]) => { deg[u] += 1; deg[v] += 1; });
  const odd = deg.filter((d) => d % 2).length;
  // all edges in a single component
  const nonIso = deg.map((d, i) => (d > 0 ? i : -1)).filter((i) => i >= 0);
  if (!spec.edges.length || (odd !== 0 && odd !== 2)) return null;
  const r = reachableFrom(spec, nonIso[0]);
  return nonIso.every((i) => r.has(i)) ? { deg, odd } : null;
}
function validEulerTrail(spec, path) {
  if (path.length !== spec.edges.length + 1) return false;
  const left = new Map();
  spec.edges.forEach(([u, v]) => { const k = [u, v].sort().join('-'); left.set(k, (left.get(k) || 0) + 1); });
  for (let i = 1; i < path.length; i += 1) {
    const k = [idx(path[i - 1]), idx(path[i])].sort().join('-');
    if (!left.get(k)) return false;
    left.set(k, left.get(k) - 1);
  }
  return true;
}
{
  const e1 = S('eulerianPath: Euler-able graphs WITHOUT isolated vertices -> valid trail using every edge once');
  const e2 = S('eulerianPath: Euler-able graphs WITH isolated vertices -> valid trail using every edge once');
  let made1 = 0; let made2 = 0; let guard = 0;
  while ((made1 < 2000 || made2 < 1000) && guard < 400000) {
    guard += 1;
    const n = randInt(rng, 2, 8);
    const spec = randomSpec(rng, { n, p: 0.3 + rng() * 0.5, directed: false });
    const inst = eulerInstance(spec);
    if (!inst) continue;
    const iso = inst.deg.some((d) => d === 0);
    if (iso ? made2 >= 1000 : made1 >= 2000) continue;
    if (iso) made2 += 1; else made1 += 1;
    const order = randOrder(n);
    let got;
    (iso ? e2 : e1).run(() => `${specStr(spec)} order=${JSON.stringify(order)} got=${JSON.stringify(got)}`, () => {
      got = null;
      const p = eulerianPath(buildGraph(spec, order).g);
      got = p.map((v) => v.getKey());
      return validEulerTrail(spec, p);
    });
  }
}

// ======================================================= Hamiltonian cycle / TSP
{
  const hc = S('hamiltonianCycle: set of cycles from vertex[0] equals brute-force permutations (n>=3)');
  for (const n of sizes(1500, 3, 7)) {
    const spec = randomSpec(rng, { n, p: 0.4 + rng() * 0.5, directed: rng() < 0.5 });
    const wm = weightMatrix(spec);
    const want = [];
    for (const p of permutations(Array.from({ length: n - 1 }, (_, i) => i + 1))) {
      const cyc = [0, ...p];
      if (cyc.every((v, i) => wm[v][cyc[(i + 1) % n]] !== Infinity)) want.push(cyc.map((v) => `v${v}`).join(','));
    }
    let got;
    hc.run(() => `${specStr(spec)} got=${got && got.length} want=${want.length}`, () => {
      got = hamiltonianCycle(buildGraph(spec).g).map((c) => c.map((v) => v.getKey()).join(','));
      return sameSet(got, want);
    });
  }
  const tsp = S('bfTravellingSalesman: returns a Hamiltonian cycle of minimum total weight (incl. return edge)');
  for (const n of sizes(1500, 3, 7)) {
    const spec = randomSpec(rng, { n, p: 0.5 + rng() * 0.5, directed: rng() < 0.5, minW: 1, maxW: 20 });
    const wm = weightMatrix(spec);
    let best = Infinity;
    for (const p of permutations(Array.from({ length: n - 1 }, (_, i) => i + 1))) {
      const cyc = [0, ...p];
      const w = cyc.reduce((a, v, i) => a + wm[v][cyc[(i + 1) % n]], 0);
      if (w < best) best = w;
    }
    let got; let gotW;
    tsp.run(() => `${specStr(spec)} got=${JSON.stringify(got)} weight(with return)=${gotW} optimal=${best}`, () => {
      got = bfTravellingSalesman(buildGraph(spec).g).map((v) => idx(v));
      if (best === Infinity) return got.length === 0;
      gotW = got.length ? got.reduce((a, v, i) => a + wm[v][got[(i + 1) % got.length]], 0) : null;
      return got.length === n && new Set(got).size === n && gotW === best;
    });
  }
}

{
  // Complete graphs: findAllPaths never gets stuck early, so every candidate is a full
  // Hamiltonian path - isolates the "return edge not counted" defect.
  const tspK = S('bfTravellingSalesman: COMPLETE graphs, minimum tour weight (incl. return edge)');
  for (const n of sizes(1500, 3, 7)) {
    const spec = randomSpec(rng, { n, p: 1.0, directed: rng() < 0.5, minW: 1, maxW: 20 });
    const wm = weightMatrix(spec);
    let best = Infinity;
    for (const p of permutations(Array.from({ length: n - 1 }, (_, i) => i + 1))) {
      const cyc = [0, ...p];
      const w = cyc.reduce((a, v, i) => a + wm[v][cyc[(i + 1) % n]], 0);
      if (w < best) best = w;
    }
    let got; let gotW;
    tspK.run(() => `${specStr(spec)} got=${JSON.stringify(got)} weight(with return)=${gotW} optimal=${best}`, () => {
      got = bfTravellingSalesman(buildGraph(spec).g).map((v) => idx(v));
      gotW = got.reduce((a, v, i) => a + wm[v][got[(i + 1) % got.length]], 0);
      return got.length === n && new Set(got).size === n && gotW === best;
    });
  }
}

// ======================================================= Tree BFS / DFS
{
  const tb = S('tree/breadthFirstSearch: enter order equals level order');
  const td = S('tree/depthFirstSearch: enter = preorder, leave = postorder');
  for (const n of sizes(3000, 1, 30)) {
    const nodes = Array.from({ length: n }, (_, i) => new BinaryTreeNode(i));
    for (let i = 1; i < n; i += 1) {
      // attach to a random node with a free slot
      for (;;) {
        const p = nodes[randInt(rng, 0, i - 1)];
        const side = rng() < 0.5 ? 'left' : 'right';
        if (!p[side]) { if (side === 'left') p.setLeft(nodes[i]); else p.setRight(nodes[i]); break; }
      }
    }
    const root = nodes[0];
    const lvl = []; const q = [root];
    while (q.length) { const x = q.shift(); lvl.push(x.value); if (x.left) q.push(x.left); if (x.right) q.push(x.right); }
    const pre = []; const post = [];
    const walk = (x) => { if (!x) return; pre.push(x.value); walk(x.left); walk(x.right); post.push(x.value); };
    walk(root);
    tb.run('tree bfs', () => { const o = []; treeBFS(root, { enterNode: (x) => o.push(x.value) }); return o.join() === lvl.join(); });
    td.run('tree dfs', () => {
      const e = []; const l = [];
      treeDFS(root, { enterNode: (x) => e.push(x.value), leaveNode: (x) => l.push(x.value) });
      return e.join() === pre.join() && l.join() === post.join();
    });
  }
}

// ======================================================= Disjoint sets
{
  const ds = S('DisjointSet: inSameSet/find after random unions vs naive labelling');
  const da = S('DisjointSetAdhoc: connected after random unions vs naive labelling');
  for (let t = 0; t < 2000; t += 1) {
    const n = randInt(rng, 1, 25);
    const label = Array.from({ length: n }, (_, i) => i);
    const set = new DisjointSet(); const ad = new DisjointSetAdhoc(n);
    for (let i = 0; i < n; i += 1) set.makeSet(i);
    let ok = true; let okA = true;
    for (let op = 0; op < 3 * n; op += 1) {
      const a = randInt(rng, 0, n - 1); const b = randInt(rng, 0, n - 1);
      if (rng() < 0.5) {
        set.union(a, b); ad.union(a, b);
        const la = label[a]; const lb = label[b];
        for (let i = 0; i < n; i += 1) if (label[i] === lb) label[i] = la;
      } else {
        if (set.inSameSet(a, b) !== (label[a] === label[b])) ok = false;
        if (ad.connected(a, b) !== (label[a] === label[b])) okA = false;
      }
    }
    ds.check(ok, `n=${n}`); da.check(okA, `n=${n}`);
  }
}

// ======================================================= input-graph side effects
{
  const sig = (g) => g.getAllVertices().map((v) => `${v.getKey()}:${v.getEdges().map((e) => e.getKey()).sort().join('/')}`).join(' ');
  const mk = S('kruskal/prim: input graph vertex adjacency unchanged after the call');
  const ms = S('stronglyConnectedComponents: input graph edges unchanged after the call');
  for (const n of sizes(1000, 2, 8)) {
    const spec = randomSpec(rng, { n, p: 0.5, directed: false });
    if (!spec.edges.length) continue;
    const { g } = buildGraph(spec);
    const before = sig(g);
    if (countComponents(spec) === 1 && rng() < 0.5) prim(g); else kruskal(g);
    mk.check(sig(g) === before, () => `${specStr(spec)}\n  before=${before}\n  after =${sig(g)}`);
    const dspec = randomSpec(rng, { n, p: 0.3, directed: true });
    if (!dspec.edges.length) continue;
    const { g: dg } = buildGraph(dspec);
    const dbefore = sig(dg);
    stronglyConnectedComponents(dg);
    ms.check(sig(dg) === dbefore, () => `${specStr(dspec)} before=${dbefore} after=${sig(dg)}`);
  }
}

// ======================================================= complexity: Bellman-Ford vs README O(|V||E|)
import LinkedList from '../../vendor/src/data-structures/linked-list/LinkedList';
const complexityRows = [];
{
  const origFind = LinkedList.prototype.find;
  const origToArray = LinkedList.prototype.toArray;
  let ops = 0;
  LinkedList.prototype.find = function find(args) {
    // count nodes inspected until the match
    let c = this.head; while (c) { ops += 1; if ((args.callback && args.callback(c.value))) break; c = c.next; }
    return origFind.call(this, args);
  };
  LinkedList.prototype.toArray = function toArray() { const r = origToArray.call(this); ops += r.length; return r; };
  for (const n of [10, 20, 40, 80]) {
    // complete directed graph, all weights 1 (an easy "best case": distances final after 1 pass)
    const edges = []; for (let u = 0; u < n; u += 1) for (let v = 0; v < n; v += 1) if (u !== v) edges.push([u, v, 1]);
    const { g, vs } = buildGraph({ n, directed: true, edges });
    ops = 0; bellmanFord(g, vs[0]);
    complexityRows.push({ V: n, E: edges.length, ops, perVE: ops / (n * edges.length), perE: ops / edges.length });
  }
  LinkedList.prototype.find = origFind;
  LinkedList.prototype.toArray = origToArray;
}

// ======================================================= summary
let total = 0; let failedTests = 0;
console.log(`Algorithm Autopsy #2 - graph audit (seed ${SEED})\n`);
for (const s of suites) {
  total += s.tests; failedTests += s.failures;
  const status = s.failures ? `FAIL ${s.failures}/${s.tests}` : `PASS ${s.tests}`;
  console.log(`${status.padEnd(16)} ${s.name}`);
  s.examples.slice(0, 2).forEach((e) => console.log(`                   e.g. ${e.slice(0, 400)}`));
}
console.log('\nBellman-Ford edge-list node visits on complete digraphs (README: worst O(|V||E|), best O(|E|)):');
complexityRows.forEach((r) => console.log(`  V=${r.V} E=${r.E} ops=${r.ops} ops/(V*E)=${r.perVE.toFixed(2)} ops/E=${r.perE.toFixed(1)}`));
console.log(`\nTOTAL: ${total} randomized checks, ${failedTests} failing, ${suites.filter((s) => s.failures).length}/${suites.length} suites failing`);
