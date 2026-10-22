import { g } from './_h.mjs';
import eulerianPath from '../../../vendor/src/algorithms/graph/eulerian-path/eulerianPath';

const run = (label, graph, expected) => {
  let out;
  try { out = JSON.stringify(eulerianPath(graph).map((v) => v.getKey())); } catch (e) { out = `THROWS ${e.constructor.name}: ${e.message}`; }
  console.log(`${label}\n  actual:   ${out}\n  expected: an Euler trail, e.g. ${expected}`);
};

// Connected, exactly two odd-degree vertices (A, C), no isolated vertices.
// Euler path exists: A-B-D-E-B-C. (Smallest failing case found by exhaustive search, find_min_euler.mjs.)
run('eulerianPath on A-B, B-C, B-D, B-E, D-E',
  g('A B C D E', [['B', 'C'], ['B', 'D'], ['B', 'E'], ['A', 'B'], ['D', 'E']]).graph,
  '["A","B","D","E","B","C"]');

// Triangle plus an isolated vertex that happens to be the first vertex.
run('eulerianPath on isolated X + triangle A-B-C',
  g('X A B C', [['A', 'B'], ['B', 'C'], ['C', 'A']]).graph,
  '["A","B","C","A"]');
