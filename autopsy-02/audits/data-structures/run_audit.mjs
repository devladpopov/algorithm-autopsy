// Algorithm Autopsy #2 — trekhleb/javascript-algorithms, src/data-structures (excl. graph, disjoint-set)
// Usage: bun run_audit.mjs [sequencesPerSuite]
import { runSuite } from './framework.mjs';
import { suites } from './suites.mjs';
import { complexityProbes } from './complexity.mjs';

const N = Number(process.argv[2]) || 2000;
const results = [];
let totalSeq = 0;
let totalOps = 0;

for (const s of suites) {
  const t0 = performance.now();
  const r = runSuite({ ...s, sequences: N });
  r.ms = Math.round(performance.now() - t0);
  results.push(r);
  totalSeq += r.sequences;
  totalOps += r.ops;
}

const pad = (x, n) => String(x).padEnd(n);
console.log(`\n${pad('Suite', 56)}${pad('seqs', 7)}${pad('ops', 8)}${pad('failing', 9)}verdict`);
console.log('-'.repeat(90));
for (const r of results) {
  console.log(`${pad(r.name, 56)}${pad(r.sequences, 7)}${pad(r.ops, 8)}${pad(r.failing, 9)}${r.failing ? 'FAIL' : 'PASS'}`);
}
console.log('-'.repeat(90));
console.log(`TOTAL: ${results.length} suites, ${totalSeq} random sequences, ${totalOps} operations, ${results.filter((r) => r.failing).length} failing suites\n`);

for (const r of results.filter((x) => x.failing)) {
  console.log(`=== FAIL: ${r.name} (${r.failing}/${r.sequences} sequences)`);
  for (const f of r.failures) {
    console.log(`  [${f.kind}] x${f.count}`);
    console.log(`    shrunk ops: ${JSON.stringify(f.minimal)}`);
    console.log(`    ${f.msg}`);
  }
}

console.log('\n=== Complexity probes');
for (const p of complexityProbes()) console.log(`  ${p}`);
