import Graph from '../../../vendor/src/data-structures/graph/Graph';
import GraphVertex from '../../../vendor/src/data-structures/graph/GraphVertex';
import GraphEdge from '../../../vendor/src/data-structures/graph/GraphEdge';

// g('A B C', [['A','B',w], ...], directed) -> { graph, V: {A: vertex, ...} }
// Vertices are added in the listed order, so getAllVertices()[0] is the first name.
export function g(names, edges, directed = false) {
  const graph = new Graph(directed);
  const V = {};
  names.split(' ').forEach((n) => { V[n] = new GraphVertex(n); graph.addVertex(V[n]); });
  edges.forEach(([a, b, w = 0]) => graph.addEdge(new GraphEdge(V[a], V[b], w)));
  return { graph, V };
}

export const keys = (x) => (Array.isArray(x) ? x.map((v) => v.getKey()) : Object.keys(x));

export const show = (label, actual, expected) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${label}\n  actual:   ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}\n  ${same ? 'OK' : 'MISMATCH'}`);
};
