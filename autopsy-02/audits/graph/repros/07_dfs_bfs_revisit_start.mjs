import { g, show } from './_h.mjs';
import depthFirstSearch from '../../../vendor/src/algorithms/graph/depth-first-search/depthFirstSearch';
import breadthFirstSearch from '../../../vendor/src/algorithms/graph/breadth-first-search/breadthFirstSearch';

const { graph, V } = g('A B', [['A', 'B']]);
const d = [];
depthFirstSearch(graph, V.A, { enterVertex: ({ currentVertex }) => d.push(currentVertex.getKey()) });
show('DFS from A on undirected A-B (default allowTraversal)', d, ['A', 'B']);
const b = [];
breadthFirstSearch(graph, V.A, { enterVertex: ({ currentVertex }) => b.push(currentVertex.getKey()) });
show('BFS from A on undirected A-B (default allowTraversal)', b, ['A', 'B']);
