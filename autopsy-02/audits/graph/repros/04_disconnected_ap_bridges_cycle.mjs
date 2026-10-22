import { g, keys, show } from './_h.mjs';
import articulationPoints from '../../../vendor/src/algorithms/graph/articulation-points/articulationPoints';
import graphBridges from '../../../vendor/src/algorithms/graph/bridges/graphBridges';
import detectUndirectedCycle from '../../../vendor/src/algorithms/graph/detect-cycle/detectUndirectedCycle';

// Two components: {A-B} and the path C-D-E.
const mk = () => g('A B C D E', [['A', 'B'], ['C', 'D'], ['D', 'E']]).graph;
show('articulationPoints', keys(articulationPoints(mk())), ['D']);
show('graphBridges', keys(graphBridges(mk())).sort(), ['A_B', 'C_D', 'D_E']);

// Components {A-B} and triangle C-D-E.
const c = detectUndirectedCycle(g('A B C D E', [['A', 'B'], ['C', 'D'], ['D', 'E'], ['E', 'C']]).graph);
show('detectUndirectedCycle finds a cycle', c !== null, true);
