import { g, show } from './_h.mjs';
import dijkstra from '../../../vendor/src/algorithms/graph/dijkstra/dijkstra';
import bellmanFord from '../../../vendor/src/algorithms/graph/bellman-ford/bellmanFord';
import floydWarshall from '../../../vendor/src/algorithms/graph/floyd-warshall/floydWarshall';
import kruskal from '../../../vendor/src/algorithms/graph/kruskal/kruskal';

// Undirected graph: Graph.addEdge accepts both A_B and B_A (different keys) -> two parallel edges.
const mk = () => g('A B', [['A', 'B', 7], ['B', 'A', 2]], false);
let { graph, V } = mk();
show('dijkstra from A', dijkstra(graph, V.A).distances, { A: 0, B: 2 });
({ graph, V } = mk());
show('bellmanFord from A', bellmanFord(graph, V.A).distances, { A: 0, B: 2 });
({ graph, V } = mk());
show('floydWarshall d[A][B]', floydWarshall(graph).distances[0][1], 2);
({ graph, V } = mk());
show('kruskal MST weight (uses getAllEdges, handles it)', kruskal(graph).getWeight(), 2);
