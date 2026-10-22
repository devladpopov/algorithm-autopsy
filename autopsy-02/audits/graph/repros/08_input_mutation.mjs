import { g, show } from './_h.mjs';
import kruskal from '../../../vendor/src/algorithms/graph/kruskal/kruskal';
import stronglyConnectedComponents from '../../../vendor/src/algorithms/graph/strongly-connected-components/stronglyConnectedComponents';

let { graph, V } = g('A B', [['A', 'B', 1]]);
kruskal(graph);
show('A.getDegree() after kruskal(graph) on single edge A-B', V.A.getDegree(), 1);

show('A.getNeighbors() after kruskal(graph)', V.A.getNeighbors().map((v) => v.getKey()), ['B']);

({ graph, V } = g('A B', [['A', 'B', 1]], true));
stronglyConnectedComponents(graph);
show('edge keys after stronglyConnectedComponents(graph) on A->B', Object.keys(graph.edges), ['A_B']);
