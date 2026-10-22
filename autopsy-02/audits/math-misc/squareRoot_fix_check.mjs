function prFix(number, tolerance = 0) { // squareRoot as patched in PR #2187
  if (number === 0) return 0; let root = 1; let previousRoot = null; const requiredDelta = 1 / (10 ** tolerance);
  while (Math.abs(number - (root ** 2)) > requiredDelta) { const ir = root - (((root ** 2) - number) / (2 * root)); if (ir === root || ir === previousRoot) break; previousRoot = root; root = ir; }
  return Math.round(root * (10 ** tolerance)) / (10 ** tolerance);
}
function proposed(number, tolerance = 0) { // iterate Newton to convergence, then round
  if (number === 0) return 0; let root = number < 1 ? 1 : number; // start above the root -> monotone decrease
  for (;;) { const next = (root + number / root) / 2; if (next >= root) break; root = next; }
  return Math.round(root * (10 ** tolerance)) / (10 ** tolerance);
}
console.log('PR#2187 fix: squareRoot(6)=', prFix(6), ' squareRoot(3,1)=', prFix(3, 1));
let bad = 0, n_ = 0;
for (let t = 0; t <= 12; t++) for (let n = 0; n <= 20000; n++) { const s = Math.sqrt(n) * 10 ** t; if (Math.abs((s % 1) - 0.5) < 1e-6) continue; n_++; if (proposed(n, t) !== Math.round(s) / 10 ** t) bad++; }
console.log('proposed fix mismatches vs Math.sqrt rounding:', bad, '/', n_);
console.log('proposed(65549, 11)=', proposed(65549, 11), 'proposed(2,16)=', proposed(2, 16), 'proposed(4.5,10)=', proposed(4.5,10), 'proposed(217.534,10)=', proposed(217.534,10), 'proposed(0.25,2)=', proposed(0.25,2));
const byT = {}; for (let t = 0; t <= 12; t++) for (let n = 0; n <= 20000; n++) { const s = Math.sqrt(n) * 10 ** t; if (Math.abs((s % 1) - 0.5) < 1e-6) continue; if (proposed(n, t) !== Math.round(s) / 10 ** t) byT[t] = (byT[t] || 0) + 1; }
console.log('mismatches by tolerance:', JSON.stringify(byT));
