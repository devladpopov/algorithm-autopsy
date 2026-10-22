// Minimal deterministic reproductions for every finding in REPORT.md.
// Run: bun repro.mjs
const V = '../../vendor/src/algorithms';
const imp = async (p) => (await import(`${V}/${p}`)).default;
const show = (x) => JSON.stringify(x);
const line = (label, actual, expected) => console.log(`${label}\n    actual:   ${show(actual)}\n    expected: ${show(expected)}  ${show(actual) === show(expected) ? 'OK' : '<-- MISMATCH'}`);

const Knapsack = await imp('sets/knapsack-problem/Knapsack.js');
const KnapsackItem = await imp('sets/knapsack-problem/KnapsackItem.js');
const BucketSort = await imp('sorting/bucket-sort/BucketSort.js');
const RadixSort = await imp('sorting/radix-sort/RadixSort.js');
const ShellSort = await imp('sorting/shell-sort/ShellSort.js');
const zAlgorithm = await imp('string/z-algorithm/zAlgorithm.js');
const lcsRecursive = await imp('sets/longest-common-subsequence/longestCommonSubsequenceRecursive.js');
const rabinKarp = await imp('string/rabin-karp/rabinKarp.js');

console.log('=== F1 interpolationSearch: infinite loop when seekElement > max (run in child process, 3 s timeout)');
for (const [arr, x] of [[[1, 2], 3], [[1, 2, 3], 4], [[10, 20, 30, 40, 50], 60]]) {
  const code = `import f from '${V}/search/interpolation-search/interpolationSearch.js'; console.log(f(${show(arr)}, ${x}));`;
  const p = Bun.spawnSync(['bun', '-e', code], { cwd: import.meta.dir, timeout: 3000 });
  const out = p.stdout.toString().trim();
  console.log(`interpolationSearch(${show(arr)}, ${x})\n    actual:   ${out || `<no result: killed after 3 s, signal=${p.signalCode}, exit=${p.exitCode}>`}\n    expected: -1`);
}

console.log('\n=== F2 Knapsack.solveZeroOneKnapsackProblem');
const k01 = (spec, W) => { const ks = new Knapsack(spec.map((s) => new KnapsackItem(s)), W); try { ks.solveZeroOneKnapsackProblem(); return { totalValue: ks.totalValue, totalWeight: ks.totalWeight, items: ks.selectedItems.map(String) }; } catch (e) { return `THROWS ${e.constructor.name}: ${e.message}`; } };
line('(a) single item that fits: items=[{value:3,weight:2}], limit=8', k01([{ value: 3, weight: 2 }], 8), { totalValue: 3, totalWeight: 2, items: ['v3 w2 x 1'] });
line('(b) crash: items=[{value:5,weight:2},{value:5,weight:6}], limit=5', k01([{ value: 5, weight: 2 }, { value: 5, weight: 6 }], 5), { totalValue: 5, totalWeight: 2, items: ['v5 w2 x 1'] });
line('(c) overweight: items=[{6,6},{1,3},{3,4},{7,6}] (value,weight), limit=7',
  k01([{ value: 6, weight: 6 }, { value: 1, weight: 3 }, { value: 3, weight: 4 }, { value: 7, weight: 6 }], 7),
  { totalValue: 7, totalWeight: 6, items: ['v7 w6 x 1'] });

console.log('\n=== F3 Knapsack.solveUnboundedKnapsackProblem: exceeds weight limit');
{
  const ks = new Knapsack([new KnapsackItem({ value: 20, weight: 8 })], 3);
  ks.solveUnboundedKnapsackProblem();
  line('items=[{value:20,weight:8}], limit=3', { totalWeight: ks.totalWeight, items: ks.selectedItems.map(String) }, { totalWeight: 0, items: [] });
  const ks2 = new Knapsack([new KnapsackItem({ value: 10, weight: 6 }), new KnapsackItem({ value: 1, weight: 5 })], 10);
  ks2.solveUnboundedKnapsackProblem();
  line('items=[{value:10,weight:6},{value:1,weight:5}], limit=10', { totalWeight: ks2.totalWeight, items: ks2.selectedItems.map(String) }, { totalWeight: 6, items: ['v10 w6 x 1'] });
}

console.log('\n=== F4 BucketSort: floats / negatives come back unsorted');
line('BucketSort([0.5, 0.2, 0.9, 0.1], 2)', BucketSort([0.5, 0.2, 0.9, 0.1], 2), [0.1, 0.2, 0.5, 0.9]);
line('BucketSort([1.5, 1.2])', BucketSort([1.5, 1.2]), [1.2, 1.5]);
line('BucketSort([-1, -2])', BucketSort([-1, -2]), [-2, -1]);

console.log('\n=== F5 RadixSort: strings of different length / negative ints');
line("new RadixSort().sort(['a', 'aa'])", new RadixSort().sort(['a', 'aa']), ['a', 'aa']);
line('new RadixSort().sort([-1, -2])', new RadixSort().sort([-1, -2]), [-2, -1]);
try { new RadixSort().sort(['hello world', 'a']); console.log("RadixSort(['hello world','a']) did not throw"); } catch (e) { console.log(`new RadixSort().sort(['hello world', 'a'])\n    actual:   THROWS ${e.constructor.name}: ${e.message}`); }

console.log('\n=== F6 zAlgorithm: "$" in input gives wrong / negative positions');
line("zAlgorithm('', '$')", zAlgorithm('', '$'), []);
line("zAlgorithm('a$b', '$')", zAlgorithm('a$b', '$'), [1]);
line("zAlgorithm('a$$', 'a$')", zAlgorithm('a$$', 'a$'), [0]);
line("zAlgorithm('USD 5$ or 7$', '$')", zAlgorithm('USD 5$ or 7$', '$'), [5, 11]);

console.log('\n=== F7 longestCommonSubsequenceRecursive: memo-key collision with ":" ');
line("lcsRecursive('::a:a', 'aa:::')  (expected any length-3 LCS, e.g. ':::')", lcsRecursive('::a:a', 'aa:::'), ':::');

console.log('\n=== F8 longestCommonSubsequenceRecursive: exponential time (empty results never memoized)');
for (const n of [8, 10, 12, 13]) { const t = performance.now(); lcsRecursive('a'.repeat(n), 'b'.repeat(n)); console.log(`    lcsRecursive('a'x${n}, 'b'x${n}) -> ${(performance.now() - t).toFixed(0)} ms`); }

console.log('\n=== F9 ShellSort: Theta(n^2) comparisons even on sorted input (README best case: n log n)');
for (const n of [1000, 2000, 4000]) {
  let c = 0; new ShellSort({ compareCallback: (a, b) => { c += 1; return a - b; } }).sort([...Array(n).keys()]);
  console.log(`    n=${n}: ${c} comparisons; n*log2(n)=${Math.round(n * Math.log2(n))}`);
}

console.log('\n=== F10 rabinKarp: PolynomialHash.roll() is O(|word|), search is O(n*m) on every input');
for (const m of [10, 100, 1000, 4000]) { const t = performance.now(); rabinKarp('a'.repeat(20000), `${'a'.repeat(m - 1)}b`); console.log(`    |text|=20000 |word|=${m}: ${(performance.now() - t).toFixed(0)} ms`); }
