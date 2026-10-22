// Exhaustive search for the smallest Euler-able graph (no isolated vertices) on which eulerianPath fails.
import { buildGraph, reachableFrom, permutations, idx } from './lib.mjs';
import eulerianPath from '../../vendor/src/algorithms/graph/eulerian-path/eulerianPath';
let best = null;
for (let n = 3; n <= 5 && !best; n += 1) {
  const pairs = []; for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) pairs.push([u, v]);
  const masks = [...Array(1 << pairs.length).keys()].sort((a, b) => popc(a) - popc(b));
  for (const mask of masks) {
    const edges = pairs.filter((_, i) => mask & (1 << i)).map(([u, v]) => [u, v, 0]);
    const spec = { n, directed: false, edges };
    const deg = Array(n).fill(0); edges.forEach(([u, v]) => { deg[u]++; deg[v]++; });
    if (deg.some((d) => d === 0)) continue;
    const odd = deg.filter((d) => d % 2).length; if (odd !== 0 && odd !== 2) continue;
    if (reachableFrom(spec, 0).size !== n) continue;
    for (const order of permutations([...Array(n).keys()])) {
      try { const p = eulerianPath(buildGraph(spec, order).g); if (p.length !== edges.length + 1) throw new Error('short'); }
      catch (e) { best = { n, edges, order, err: e.message }; break; }
    }
    if (best) break;
  }
}
function popc(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
console.log(JSON.stringify(best));
