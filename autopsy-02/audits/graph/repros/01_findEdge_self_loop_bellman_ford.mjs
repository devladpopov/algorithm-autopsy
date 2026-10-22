import { g, show } from './_h.mjs';
import bellmanFord from '../../../vendor/src/algorithms/graph/bellman-ford/bellmanFord';

// (1) Graph.findEdge(A, A) returns an unrelated edge even when there is no self-loop.
let { graph, V } = g('A B', [['A', 'B', 5]], true);
const e = graph.findEdge(V.A, V.A);
show('Graph.findEdge(A, A) on digraph {A->B}', e && e.getKey(), null);

// (2) Bellman-Ford on a digraph with a NON-negative self-loop (no negative cycle).
({ graph, V } = g('A B', [['A', 'B', -3], ['A', 'A', 9]], true));
const { distances } = bellmanFord(graph, V.A);
show('bellmanFord {A->B:-3, A->A:9} from A', distances, { A: 0, B: -3 });

// (3) getAdjacencyMatrix diagonal for a weighted self-loop (JSON prints Infinity as null).
({ graph, V } = g('A B', [['A', 'B', 2], ['A', 'A', 5]], false));
show('getAdjacencyMatrix undirected {A-B:2, A-A:5}', graph.getAdjacencyMatrix(), [[5, 2], [2, null]]);

// (4) The negative-cycle pass proposed in open PR #2187 (copied verbatim below) relies on the
// same findEdge and would report a negative cycle on this valid graph.
({ graph, V } = g('A B', [['A', 'B', -3], ['A', 'A', 9]], true));
const d = bellmanFord(graph, V.A).distances;
let threw = false;
Object.keys(d).forEach((vertexKey) => {
  const vertex = graph.getVertexByKey(vertexKey);
  graph.getNeighbors(vertex).forEach((neighbor) => {
    const edge = graph.findEdge(vertex, neighbor);
    if (d[vertex.getKey()] + edge.weight < d[neighbor.getKey()]) threw = true;
  });
});
show('PR #2187 extra relaxation pass flags a negative cycle', threw, false);
