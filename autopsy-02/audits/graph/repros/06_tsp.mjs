import { g, keys, show } from './_h.mjs';
import bfTravellingSalesman from '../../../vendor/src/algorithms/graph/travelling-salesman/bfTravellingSalesman';

// (a) The only tour is A->B->C->A (weight 40); the function returns a "tour" that skips B.
let { graph } = g('A B C', [['A', 'B', 19], ['C', 'A', 10], ['B', 'C', 11], ['A', 'C', 13]], true);
show('TSP directed 3 vertices', keys(bfTravellingSalesman(graph)), ['A', 'B', 'C']);

// (b) Complete undirected K4: the closing edge weight is ignored when comparing tours.
({ graph } = g('A B C D', [['A', 'B', 1], ['B', 'C', 1], ['C', 'D', 1], ['D', 'A', 100], ['A', 'C', 10], ['B', 'D', 10]]));
const t = keys(bfTravellingSalesman(graph));
const W = { AB: 1, BC: 1, CD: 1, AD: 100, AC: 10, BD: 10 };
const w = (a, b) => W[[a, b].sort().join('')];
const tourW = t.reduce((s, v, i) => s + w(v, t[(i + 1) % t.length]), 0);
show('TSP K4 (tour weight incl. return edge)', { tour: t, weight: tourW }, { tour: ['A', 'B', 'D', 'C'], weight: 22 });
