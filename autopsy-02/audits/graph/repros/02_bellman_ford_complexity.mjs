import { g } from './_h.mjs';
import bellmanFord from '../../../vendor/src/algorithms/graph/bellman-ford/bellmanFord';
import LinkedList from '../../../vendor/src/data-structures/linked-list/LinkedList';

// Count adjacency-list node visits (LinkedList.find used by findEdge, LinkedList.toArray used by
// getNeighbors) on complete digraphs with unit weights. With unit weights all distances are final
// after the first pass, i.e. the README's "best case". README: worst O(|V||E|), best O(|E|).
let ops = 0;
const origFind = LinkedList.prototype.find;
const origToArray = LinkedList.prototype.toArray;
LinkedList.prototype.find = function find(args) {
  let c = this.head;
  while (c) { ops += 1; if (args.callback && args.callback(c.value)) break; c = c.next; }
  return origFind.call(this, args);
};
LinkedList.prototype.toArray = function toArray() { const r = origToArray.call(this); ops += r.length; return r; };

for (const n of [20, 40, 80, 160]) {
  const names = Array.from({ length: n }, (_, i) => `v${i}`);
  const edges = [];
  names.forEach((a) => names.forEach((b) => { if (a !== b) edges.push([a, b, 1]); }));
  const { graph, V } = g(names.join(' '), edges, true);
  ops = 0;
  const t = performance.now();
  bellmanFord(graph, V.v0);
  const ms = performance.now() - t;
  const E = edges.length;
  console.log(`V=${n} E=${E} ops=${ops} ops/(V*E)=${(ops / (n * E)).toFixed(1)} ops/E=${(ops / E).toFixed(0)} time=${ms.toFixed(0)}ms`);
}
