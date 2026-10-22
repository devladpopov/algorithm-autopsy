// Algorithm Autopsy #2 -- trekhleb/javascript-algorithms @ 85293e3
// Scope: src/algorithms/{string,search,sorting,sets,stack}
// Differential + property-based testing against brute-force references.
// Run: bun run_audit.mjs   (deterministic, seeded PRNG; optional: bun run_audit.mjs <seed>)

const V = '../../vendor/src/algorithms';
const imp = async (p) => (await import(`${V}/${p}`)).default;

const hammingDistance = await imp('string/hamming-distance/hammingDistance.js');
const knuthMorrisPratt = await imp('string/knuth-morris-pratt/knuthMorrisPratt.js');
const levenshteinDistance = await imp('string/levenshtein-distance/levenshteinDistance.js');
const longestCommonSubstring = await imp('string/longest-common-substring/longestCommonSubstring.js');
const isPalindrome = await imp('string/palindrome/isPalindrome.js');
const rabinKarp = await imp('string/rabin-karp/rabinKarp.js');
const regularExpressionMatching = await imp('string/regular-expression-matching/regularExpressionMatching.js');
const zAlgorithm = await imp('string/z-algorithm/zAlgorithm.js');

const binarySearch = await imp('search/binary-search/binarySearch.js');
const interpolationSearch = await imp('search/interpolation-search/interpolationSearch.js');
const jumpSearch = await imp('search/jump-search/jumpSearch.js');
const linearSearch = await imp('search/linear-search/linearSearch.js');

const BubbleSort = await imp('sorting/bubble-sort/BubbleSort.js');
const BucketSort = await imp('sorting/bucket-sort/BucketSort.js');
const CountingSort = await imp('sorting/counting-sort/CountingSort.js');
const HeapSort = await imp('sorting/heap-sort/HeapSort.js');
const InsertionSort = await imp('sorting/insertion-sort/InsertionSort.js');
const MergeSort = await imp('sorting/merge-sort/MergeSort.js');
const QuickSort = await imp('sorting/quick-sort/QuickSort.js');
const QuickSortInPlace = await imp('sorting/quick-sort/QuickSortInPlace.js');
const RadixSort = await imp('sorting/radix-sort/RadixSort.js');
const SelectionSort = await imp('sorting/selection-sort/SelectionSort.js');
const ShellSort = await imp('sorting/shell-sort/ShellSort.js');

const cartesianProduct = await imp('sets/cartesian-product/cartesianProduct.js');
const combinationSum = await imp('sets/combination-sum/combinationSum.js');
const combineWithoutRepetitions = await imp('sets/combinations/combineWithoutRepetitions.js');
const combineWithRepetitions = await imp('sets/combinations/combineWithRepetitions.js');
const fisherYates = await imp('sets/fisher-yates/fisherYates.js');
const Knapsack = await imp('sets/knapsack-problem/Knapsack.js');
const KnapsackItem = await imp('sets/knapsack-problem/KnapsackItem.js');
const longestCommonSubsequence = await imp('sets/longest-common-subsequence/longestCommonSubsequence.js');
const lcsRecursive = await imp('sets/longest-common-subsequence/longestCommonSubsequenceRecursive.js');
const dpLIS = await imp('sets/longest-increasing-subsequence/dpLongestIncreasingSubsequence.js');
const bfMaximumSubarray = await imp('sets/maximum-subarray/bfMaximumSubarray.js');
const dcMaximumSubarraySum = await imp('sets/maximum-subarray/dcMaximumSubarraySum.js');
const dpMaximumSubarray = await imp('sets/maximum-subarray/dpMaximumSubarray.js');
const permutateWithoutRepetitions = await imp('sets/permutations/permutateWithoutRepetitions.js');
const permutateWithRepetitions = await imp('sets/permutations/permutateWithRepetitions.js');
const btPowerSet = await imp('sets/power-set/btPowerSet.js');
const bwPowerSet = await imp('sets/power-set/bwPowerSet.js');
const caPowerSet = await imp('sets/power-set/caPowerSet.js');
const shortestCommonSupersequence = await imp('sets/shortest-common-supersequence/shortestCommonSupersequence.js');

const isValidParentheses = await imp('stack/valid-parentheses/validParentheses.js');

// ---------------------------------------------------------------- infra
let seed = Number(process.argv[2] ?? 20261023) >>> 0;
function rnd() { // mulberry32
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // inclusive
const pick = (a) => a[Math.floor(rnd() * a.length)];
const rstr = (alpha, n) => { let s = ''; for (let i = 0; i < n; i += 1) s += pick(alpha); return s; };
const rarr = (n, lo, hi) => Array.from({ length: n }, () => ri(lo, hi));

const results = new Map(); // name -> {tests, fails, examples[]}
function rec(name) {
  if (!results.has(name)) results.set(name, { tests: 0, fails: 0, examples: [] });
  return results.get(name);
}
const show = (x) => {
  try { return JSON.stringify(x, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v)); } catch { return String(x); }
};
// check(name, inputDesc, fn) -- fn returns true (pass) or a string describing the failure.
function check(name, input, fn) {
  const r = rec(name);
  r.tests += 1;
  let res;
  try { res = fn(); } catch (e) { res = `THREW ${e && e.constructor && e.constructor.name}: ${String(e && e.message).slice(0, 120)}`; }
  if (res !== true) {
    r.fails += 1;
    if (r.examples.length < 3) r.examples.push(`input=${show(input).slice(0, 200)} :: ${res}`);
  }
}
const eq = (a, b) => show(a) === show(b);
const expectEq = (actual, expected) => (eq(actual, expected) ? true : `actual=${show(actual).slice(0, 200)} expected=${show(expected).slice(0, 200)}`);

// Guarded array: throws after too many element reads (detects infinite loops).
function guarded(arr, limit = 100000) {
  let reads = 0;
  return new Proxy(arr, {
    get(t, p, r) {
      if (typeof p === 'string' && /^\d+$/.test(p)) { reads += 1; if (reads > limit) throw new Error(`INFINITE LOOP suspected: >${limit} element reads`); }
      return Reflect.get(t, p, r);
    },
  });
}

// ---------------------------------------------------------------- references
const refIndexOf = (t, w) => t.indexOf(w);
const refAllOcc = (t, w) => { const o = []; for (let i = 0; i + w.length <= t.length; i += 1) if (t.startsWith(w, i)) o.push(i); return o; };
function refLev(a, b) {
  const memo = new Map();
  const f = (i, j) => {
    if (i === a.length) return b.length - j;
    if (j === b.length) return a.length - i;
    const k = i * 1000 + j;
    if (memo.has(k)) return memo.get(k);
    const v = a[i] === b[j] ? f(i + 1, j + 1) : 1 + Math.min(f(i + 1, j), f(i, j + 1), f(i + 1, j + 1));
    memo.set(k, v); return v;
  };
  return f(0, 0);
}
function isSubseq(sub, seq) { let i = 0; for (const x of seq) { if (i < sub.length && sub[i] === x) i += 1; } return i === sub.length; }
function refLcsLen(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}
const numCmp = (x, y) => x - y;

// ================================================================ STRING
function testStrings() {
  const alphas = [['a'], ['a', 'b'], ['a', 'b', 'c'], ['a', 'b', '$', ':'], ['x', 'y', 'z', 'w', 'v', 'u'], ['é', '中', 'a', '￿', '\u0000']];
  for (let it = 0; it < 4000; it += 1) {
    const A = pick(alphas);
    const n = ri(0, it < 2000 ? 6 : 25);
    const a = rstr(A, n); const b = rstr(A, n);
    check('hammingDistance', [a, b], () => expectEq(hammingDistance(a, b), [...a].reduce((s, c, i) => s + (c !== b[i]), 0)));
  }
  check('hammingDistance', ['ab', 'a'], () => { try { hammingDistance('ab', 'a'); return 'no throw on unequal length'; } catch { return true; } });

  for (let it = 0; it < 6000; it += 1) {
    const A = pick(alphas);
    const t = rstr(A, ri(0, it < 3000 ? 8 : 40)); const w = rstr(A, ri(0, it < 3000 ? 4 : 8));
    check('knuthMorrisPratt', [t, w], () => expectEq(knuthMorrisPratt(t, w), refIndexOf(t, w)));
    check('rabinKarp (BMP text)', [t, w], () => expectEq(rabinKarp(t, w), refIndexOf(t, w)));
    if (w.length > 0) check('zAlgorithm', [t, w], () => expectEq(zAlgorithm(t, w), refAllOcc(t, w)));
  }
  // z-algorithm on alphabets WITHOUT '$' (to separate the separator issue from the core algorithm)
  for (let it = 0; it < 4000; it += 1) {
    const A = pick([['a'], ['a', 'b'], ['a', 'b', 'c']]);
    const t = rstr(A, ri(0, 30)); const w = rstr(A, ri(1, 6));
    check('zAlgorithm (no "$" in input)', [t, w], () => expectEq(zAlgorithm(t, w), refAllOcc(t, w)));
  }
  // Rabin-Karp with astral (non-BMP) chars -- marked @TODO in the repo's own tests, tracked separately.
  for (let it = 0; it < 1000; it += 1) {
    const A = ['a', 'b', '\u{1F600}', '\u{20000}'];
    const t = rstr(A, ri(0, 8)); const w = rstr(A, ri(1, 3));
    check('rabinKarp (astral chars, known @TODO)', [t, w], () => expectEq(rabinKarp(t, w), refIndexOf(t, w)));
  }

  for (let it = 0; it < 4000; it += 1) {
    const A = pick(alphas);
    const a = rstr(A, ri(0, it < 2000 ? 6 : 20)); const b = rstr(A, ri(0, it < 2000 ? 6 : 20));
    check('levenshteinDistance', [a, b], () => expectEq(levenshteinDistance(a, b), refLev(a, b)));
  }

  for (let it = 0; it < 3000; it += 1) {
    const A = pick([...alphas, ['a', '\u{1F600}', '\u{10335}']]);
    const s1 = rstr(A, ri(0, 12)); const s2 = rstr(A, ri(0, 12));
    check('longestCommonSubstring', [s1, s2], () => {
      const r = longestCommonSubstring(s1, s2);
      const c1 = [...s1]; const c2 = [...s2];
      let best = 0;
      for (let i = 0; i < c1.length; i += 1) for (let j = i + 1; j <= c1.length; j += 1) if (s2.includes(c1.slice(i, j).join('')) && j - i > best) best = j - i;
      if (!s1.includes(r) || !s2.includes(r)) return `result ${show(r)} is not a common substring`;
      if ([...r].length !== best) return `length ${[...r].length} != optimal ${best}`;
      return true;
    });
  }

  for (let it = 0; it < 4000; it += 1) {
    const A = pick(alphas);
    const h = rstr(A, ri(0, 6));
    const s = rnd() < 0.5 ? h + (rnd() < 0.5 ? pick(A) : '') + [...h].reverse().join('') : rstr(A, ri(0, 10));
    check('isPalindrome', s, () => expectEq(isPalindrome(s), s === s.split('').reverse().join('')));
  }

  // regex: tokens over {a,b,.} optionally followed by '*'; string over {a,b}
  for (let it = 0; it < 6000; it += 1) {
    let p = ''; const k = ri(0, 5);
    for (let i = 0; i < k; i += 1) p += pick(['a', 'b', '.']) + (rnd() < 0.4 ? '*' : '');
    const s = rstr(['a', 'b'], ri(0, 7));
    check('regularExpressionMatching', [s, p], () => expectEq(regularExpressionMatching(s, p), new RegExp(`^(?:${p})$`).test(s)));
  }
}

// ================================================================ SEARCH
function testSearch() {
  const gens = [
    () => rarr(ri(0, 8), 0, 5),
    () => rarr(ri(0, 40), -50, 50),
    () => rarr(ri(0, 40), -1e9, 1e9),
    () => Array.from({ length: ri(0, 30) }, () => Math.round((rnd() * 200 - 100) * 1000) / 1000),
    () => Array(ri(0, 10)).fill(ri(-3, 3)),
  ];
  for (let it = 0; it < 8000; it += 1) {
    const arr = pick(gens)().sort(numCmp);
    const x = rnd() < 0.6 && arr.length ? pick(arr) : (rnd() < 0.5 ? ri(-60, 60) : (arr.length ? arr[arr.length - 1] + ri(1, 5) : 1));
    const present = arr.includes(x);
    const valid = (i) => (present ? (arr[i] === x ? true : `returned ${i} (arr[i]=${arr[i]}) but ${x} is present`) : (i === -1 ? true : `returned ${i} but ${x} absent`));
    check('binarySearch', [arr, x], () => valid(binarySearch(arr, x)));
    check('jumpSearch', [arr, x], () => valid(jumpSearch(arr, x)));
    check('interpolationSearch', [arr, x], () => valid(interpolationSearch(guarded(arr), x)));
    check('linearSearch', [arr, x], () => expectEq(linearSearch(arr, x), arr.flatMap((v, i) => (v === x ? [i] : []))));
  }
}

// ================================================================ SORTING
function testSorting() {
  const comparisonSorts = { BubbleSort, InsertionSort, SelectionSort, HeapSort, MergeSort, QuickSort, QuickSortInPlace, ShellSort };
  const gens = [
    () => rarr(ri(0, 6), 0, 3),
    () => rarr(ri(0, 50), -100, 100),
    () => rarr(ri(0, 50), -1e9, 1e9),
    () => Array.from({ length: ri(0, 40) }, () => rnd() * 2000 - 1000),
    () => Array(ri(0, 20)).fill(ri(-5, 5)),
    () => rarr(ri(0, 50), 0, 1000).sort(numCmp),
    () => rarr(ri(0, 50), 0, 1000).sort((a, b) => b - a),
  ];
  for (let it = 0; it < 3000; it += 1) {
    const arr = pick(gens)();
    const copy = [...arr];
    const exp = [...arr].sort(numCmp);
    for (const [name, S] of Object.entries(comparisonSorts)) {
      check(name, arr, () => { const r = new S().sort(arr); if (!eq(arr, copy)) return 'mutated input'; return expectEq(r, exp); });
    }
  }
  // Stability for the sorts the README marks "Stable: Yes" (Bubble, Insertion, Merge, Counting/Radix tested below)
  for (let it = 0; it < 2000; it += 1) {
    const arr = Array.from({ length: ri(0, 30) }, (_, i) => ({ k: ri(0, 4), id: i }));
    const cb = { compareCallback: (a, b) => (a.k === b.k ? 0 : (a.k < b.k ? -1 : 1)) };
    const exp = [...arr].sort((a, b) => a.k - b.k || a.id - b.id); // Array.prototype.sort is stable
    for (const [name, S] of Object.entries({ BubbleSort, InsertionSort, MergeSort })) {
      check(`${name} (stability)`, arr.map((o) => `${o.k}.${o.id}`), () => expectEq(new S(cb).sort(arr).map((o) => o.id), exp.map((o) => o.id)));
    }
  }

  // Counting sort: integers incl. negatives, with and without explicit bounds.
  for (let it = 0; it < 4000; it += 1) {
    const arr = pick([() => rarr(ri(0, 8), 0, 4), () => rarr(ri(0, 60), -200, 200), () => rarr(ri(0, 60), -500, -100), () => rarr(ri(0, 60), 100, 400)])();
    const exp = [...arr].sort(numCmp);
    check('CountingSort', arr, () => expectEq(new CountingSort().sort(arr), exp));
    if (arr.length) check('CountingSort (explicit bounds)', arr, () => expectEq(new CountingSort().sort(arr, Math.min(...arr), Math.max(...arr)), exp));
  }

  // Radix sort: README "integer sorting algorithm" -> test non-negative integers (core domain) and negatives (separately).
  for (let it = 0; it < 3000; it += 1) {
    const arr = pick([() => rarr(ri(0, 8), 0, 9), () => rarr(ri(0, 60), 0, 1e6), () => rarr(ri(0, 60), 0, 2 ** 31)])();
    check('RadixSort (non-negative ints)', arr, () => expectEq(new RadixSort().sort(arr), [...arr].sort(numCmp)));
    const neg = rarr(ri(1, 10), -50, 50);
    check('RadixSort (negative ints)', neg, () => expectEq(new RadixSort().sort(neg), [...neg].sort(numCmp)));
    // strings: lowercase a-z of varying length (the repo's own tests use such strings)
    const strs = Array.from({ length: ri(0, 12) }, () => rstr(['a', 'b', 'c', 'z'], ri(1, 4)));
    check('RadixSort (lowercase strings)', strs, () => expectEq(new RadixSort().sort(strs), [...strs].sort()));
  }

  // Bucket sort: numbers of any sign / floats, any bucket count.
  for (let it = 0; it < 4000; it += 1) {
    const kind = it % 3;
    const arr = kind === 0 ? rarr(ri(0, 40), 0, 1000)
      : kind === 1 ? rarr(ri(1, 40), -1000, 1000)
        : Array.from({ length: ri(1, 30) }, () => Math.round(rnd() * 1000) / 1000);
    const k = ri(1, 12);
    const name = ['BucketSort (non-negative ints)', 'BucketSort (ints incl. negatives)', 'BucketSort (floats in [0,1])'][kind];
    check(name, [arr, k], () => expectEq(BucketSort(arr, k), [...arr].sort(numCmp)));
  }
}

// ================================================================ SETS
function testSets() {
  for (let it = 0; it < 500; it += 1) {
    const a = rarr(ri(1, 6), 0, 9); const b = rarr(ri(1, 6), 0, 9);
    check('cartesianProduct', [a, b], () => expectEq(cartesianProduct(a, b), a.flatMap((x) => b.map((y) => [x, y]))));
  }

  // combinationSum: distinct positive ints, positive target (README contract)
  const canon = (combos) => combos.map((c) => [...c].sort(numCmp).join(',')).sort();
  for (let it = 0; it < 1500; it += 1) {
    const cand = [...new Set(rarr(ri(1, 5), 1, 9))];
    const target = ri(1, 18);
    check('combinationSum', [cand, target], () => {
      const ref = [];
      const rec2 = (i, rem, cur) => { if (rem === 0) { ref.push([...cur]); return; } if (i === cand.length) return; for (let c = 0; c * cand[i] <= rem; c += 1) { rec2(i + 1, rem - c * cand[i], [...cur, ...Array(c).fill(cand[i])]); } };
      rec2(0, target, []);
      const got = combinationSum(cand, target);
      if (new Set(canon(got)).size !== got.length) return 'duplicate combinations';
      return expectEq(canon(got), canon(ref));
    });
  }

  for (let it = 0; it < 1000; it += 1) {
    const n = ri(0, 7); const opts = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); const k = ri(0, n + 1);
    check('combineWithoutRepetitions', [opts, k], () => {
      const ref = []; for (let m = 0; m < 2 ** n; m += 1) { const s = opts.filter((_, i) => m & (1 << i)); if (s.length === k) ref.push(s.join('')); }
      return expectEq(combineWithoutRepetitions(opts, k).map((c) => c.join('')).sort(), ref.sort());
    });
    const k2 = ri(0, 4);
    check('combineWithRepetitions', [opts, k2], () => {
      const ref = []; const g = (start, cur) => { if (cur.length === k2) { ref.push(cur.join('')); return; } for (let i = start; i < n; i += 1) g(i, [...cur, opts[i]]); }; g(0, []);
      return expectEq(combineWithRepetitions(opts, k2).map((c) => c.join('')).sort(), ref.sort());
    });
  }

  // Fisher-Yates: permutation property + uniformity (chi-square over 3! outcomes)
  for (let it = 0; it < 500; it += 1) {
    const a = rarr(ri(0, 20), -5, 5);
    check('fisherYates (is permutation)', a, () => expectEq([...fisherYates(a)].sort(numCmp), [...a].sort(numCmp)));
  }
  {
    const counts = {}; const N = 60000;
    for (let i = 0; i < N; i += 1) { const k = fisherYates([1, 2, 3]).join(''); counts[k] = (counts[k] || 0) + 1; }
    const e = N / 6; const chi = Object.values(counts).reduce((s, c) => s + (c - e) ** 2 / e, 0) + (6 - Object.keys(counts).length) * e;
    check('fisherYates (uniformity chi2, df=5)', counts, () => (chi < 25 ? true : `chi2=${chi.toFixed(1)} (critical 20.5 @ p=.001)`));
  }

  // 0/1 knapsack vs brute force over subsets
  for (let it = 0; it < 3000; it += 1) {
    const n = ri(1, 7);
    const spec = Array.from({ length: n }, () => ({ value: ri(1, 20), weight: ri(1, 10) }));
    const W = ri(1, 25);
    check('Knapsack 0/1 (DP)', [spec, W], () => {
      let best = 0;
      for (let m = 0; m < 2 ** n; m += 1) { let w = 0; let v = 0; spec.forEach((s, i) => { if (m & (1 << i)) { w += s.weight; v += s.value; } }); if (w <= W && v > best) best = v; }
      const items = spec.map((s) => new KnapsackItem(s));
      const ks = new Knapsack(items, W); ks.solveZeroOneKnapsackProblem();
      if (new Set(ks.selectedItems).size !== ks.selectedItems.length) return 'same item selected twice';
      if (ks.totalWeight > W) return `overweight: totalWeight=${ks.totalWeight} > limit ${W} (value ${ks.totalValue}, optimum ${best})`;
      if (ks.totalValue !== best) return `totalValue=${ks.totalValue} != optimum ${best}`;
      return true;
    });
  }
  // "Unbounded" (greedy) knapsack: README/code call it greedy -> only test FEASIBILITY (weight limit, stock limit)
  for (let it = 0; it < 3000; it += 1) {
    const n = ri(1, 5);
    const spec = Array.from({ length: n }, () => ({ value: ri(1, 30), weight: ri(1, 10), itemsInStock: ri(1, 4) }));
    const W = ri(1, 25);
    check('Knapsack unbounded/greedy (feasibility)', [spec, W], () => {
      const ks = new Knapsack(spec.map((s) => new KnapsackItem(s)), W); ks.solveUnboundedKnapsackProblem();
      if (ks.totalWeight > W) return `overweight: totalWeight=${ks.totalWeight} > limit ${W}; selected=${ks.selectedItems.map(String).join(' | ')}`;
      for (const s of ks.selectedItems) if (s.quantity > s.itemsInStock) return `quantity ${s.quantity} > stock ${s.itemsInStock}`;
      return true;
    });
  }

  for (let it = 0; it < 4000; it += 1) {
    const A = pick([['a'], ['a', 'b'], ['a', 'b', 'c'], ['a', ':'], ['A', 'B', 'C', 'D', 'E', 'F']]);
    const s1 = rstr(A, ri(0, it < 2000 ? 6 : 12)); const s2 = rstr(A, ri(0, it < 2000 ? 6 : 12));
    const L = refLcsLen(s1, s2);
    check('longestCommonSubsequence (DP)', [s1, s2], () => {
      const r = longestCommonSubsequence(s1.split(''), s2.split(''));
      const seq = L === 0 ? (eq(r, ['']) ? [] : r) : r;
      if (!isSubseq(seq, s1.split('')) || !isSubseq(seq, s2.split(''))) return `${show(r)} not a common subsequence`;
      return seq.length === L ? true : `length ${seq.length} != ${L}`;
    });
    check('longestCommonSubsequenceRecursive', [s1, s2], () => {
      const r = lcsRecursive(s1, s2);
      if (!isSubseq(r, s1) || !isSubseq(r, s2)) return `result ${show(r)} is not a common subsequence of the inputs`;
      return r.length === L ? true : `result ${show(r)} length ${r.length} != optimal ${L}`;
    });
    check('shortestCommonSupersequence', [s1, s2], () => {
      const r = shortestCommonSupersequence(s1.split(''), s2.split(''));
      if (!isSubseq(s1.split(''), r) || !isSubseq(s2.split(''), r)) return `${show(r.join(''))} is not a supersequence`;
      return r.length === s1.length + s2.length - L ? true : `length ${r.length} != optimal ${s1.length + s2.length - L}`;
    });
  }

  for (let it = 0; it < 3000; it += 1) {
    const a = pick([() => rarr(ri(0, 10), 0, 3), () => rarr(ri(0, 12), -20, 20), () => Array(ri(0, 6)).fill(1)])();
    check('dpLongestIncreasingSubsequence', a, () => {
      let best = 0;
      for (let m = 0; m < 2 ** a.length; m += 1) { const s = a.filter((_, i) => m & (1 << i)); if (s.every((v, i) => i === 0 || s[i - 1] < v)) best = Math.max(best, s.length); }
      return expectEq(dpLIS(a), best);
    });
  }

  for (let it = 0; it < 4000; it += 1) {
    const a = pick([() => rarr(ri(1, 12), -10, 10), () => rarr(ri(1, 8), -10, -1), () => rarr(ri(1, 8), 0, 5), () => Array.from({ length: ri(1, 10) }, () => Math.round((rnd() * 20 - 10) * 4) / 4)])();
    let best = -Infinity;
    for (let i = 0; i < a.length; i += 1) { let s = 0; for (let j = i; j < a.length; j += 1) { s += a[j]; best = Math.max(best, s); } }
    const isSlice = (r) => { for (let i = 0; i + r.length <= a.length; i += 1) if (eq(a.slice(i, i + r.length), r)) return true; return false; };
    const okSub = (r) => (r.length && isSlice(r) && Math.abs(r.reduce((x, y) => x + y, 0) - best) < 1e-9 ? true : `returned ${show(r)} (sum ${r.reduce((x, y) => x + y, 0)}) expected a subarray with sum ${best}`);
    check('bfMaximumSubarray', a, () => okSub(bfMaximumSubarray(a)));
    check('dpMaximumSubarray', a, () => okSub(dpMaximumSubarray(a)));
    check('dcMaximumSubarraySum', a, () => (Math.abs(dcMaximumSubarraySum(a) - best) < 1e-9 ? true : `got ${dcMaximumSubarraySum(a)} expected ${best}`));
  }

  for (let n = 1; n <= 7; n += 1) {
    const opts = Array.from({ length: n }, (_, i) => i);
    check('permutateWithoutRepetitions', opts, () => { const p = permutateWithoutRepetitions(opts); const s = new Set(p.map((x) => x.join(','))); const f = [1, 1, 2, 6, 24, 120, 720, 5040][n]; return p.length === f && s.size === f && p.every((x) => eq([...x].sort(numCmp), opts)) ? true : 'wrong permutations'; });
    for (let k = 1; k <= Math.min(n, 4); k += 1) check('permutateWithRepetitions', [opts, k], () => { const p = permutateWithRepetitions(opts, k); return p.length === n ** k && new Set(p.map((x) => x.join(','))).size === n ** k ? true : 'wrong'; });
  }
  for (let n = 0; n <= 10; n += 1) {
    const opts = Array.from({ length: n }, (_, i) => i);
    for (const [name, f] of Object.entries({ btPowerSet, bwPowerSet, caPowerSet })) {
      check(name, opts, () => { const p = f(opts); const s = new Set(p.map((x) => x.join(','))); return p.length === 2 ** n && s.size === 2 ** n && p.every((x) => x.every((v, i) => i === 0 || x[i - 1] < v)) ? true : 'wrong power set'; });
    }
  }
}

// ================================================================ STACK
function testStack() {
  const refValid = (s) => { const st = []; const m = { ')': '(', ']': '[', '}': '{' }; for (const c of s) { if ('([{'.includes(c)) st.push(c); else if (st.pop() !== m[c]) return false; } return st.length === 0; };
  for (let it = 0; it < 6000; it += 1) {
    let s;
    if (rnd() < 0.5) s = rstr(['(', ')', '[', ']', '{', '}'], ri(1, 12));
    else { // generate valid-ish strings by nesting
      const g = (d) => (d === 0 || rnd() < 0.3 ? '' : pick([['(', ')'], ['[', ']'], ['{', '}']]).join(g(d - 1)) + g(d - 1));
      s = g(4) || '()';
      if (rnd() < 0.3) { const i = ri(0, s.length - 1); s = s.slice(0, i) + s.slice(i + 1); }
      if (!s.length) s = '()';
    }
    check('validParentheses', s, () => expectEq(isValidParentheses(s), refValid(s)));
  }
}

// ================================================================ COMPLEXITY PROBES
function complexity() {
  const out = [];
  // ShellSort: README claims best case n log(n). Count comparisons on already-sorted input.
  for (const n of [1000, 2000, 4000]) {
    let cmp = 0;
    const sorter = new ShellSort({ compareCallback: (a, b) => { cmp += 1; return a - b; } });
    sorter.sort(Array.from({ length: n }, (_, i) => i));
    out.push(`ShellSort sorted input n=${n}: ${cmp} comparisons (n*log2(n)=${Math.round(n * Math.log2(n))}, n^2/2=${n * n / 2})`);
  }
  // Same for insertion sort as a sanity baseline (README best = n)
  {
    let cmp = 0; new InsertionSort({ compareCallback: (a, b) => { cmp += 1; return a - b; } }).sort(Array.from({ length: 4000 }, (_, i) => i));
    out.push(`InsertionSort sorted input n=4000: ${cmp} comparisons (baseline)`);
  }
  // Rabin-Karp: PolynomialHash.roll documented O(1) but loops over the whole window.
  for (const m of [10, 100, 1000]) {
    const PH = rabinKarp; // timing the full search with a fixed text
    const text = 'a'.repeat(20000); const word = `${'a'.repeat(m - 1)}b`;
    const t0 = performance.now(); PH(text, word); const dt = performance.now() - t0;
    out.push(`rabinKarp |text|=20000 |word|=${m}: ${dt.toFixed(1)} ms`);
  }
  // LCS recursive: memo uses truthiness -> '' results never cached.
  for (const n of [10, 12, 14]) {
    const t0 = performance.now(); lcsRecursive('a'.repeat(n), 'b'.repeat(n)); const dt = performance.now() - t0;
    out.push(`lcsRecursive('a'*${n}, 'b'*${n}): ${dt.toFixed(1)} ms`);
  }
  return out;
}

// ---------------------------------------------------------------- run
const t0 = performance.now();
testStrings(); testSearch(); testSorting(); testSets(); testStack();
const probes = complexity();

let total = 0; let failing = 0;
const rows = [...results.entries()];
console.log(`\nAlgorithm Autopsy #2 -- trekhleb/javascript-algorithms -- strings/search/sorting/sets/stack (seed ${process.argv[2] ?? 20261023})\n`);
console.log(`${'Algorithm / property'.padEnd(48)} ${'tests'.padStart(6)} ${'fails'.padStart(6)}  status`);
for (const [name, r] of rows) {
  total += r.tests; if (r.fails) failing += 1;
  console.log(`${name.padEnd(48)} ${String(r.tests).padStart(6)} ${String(r.fails).padStart(6)}  ${r.fails ? 'FAIL' : 'PASS'}`);
}
console.log(`\nTOTAL: ${total} randomized/edge tests, ${rows.length} properties, ${failing} failing\n`);
for (const [name, r] of rows) if (r.fails) { console.log(`--- ${name}`); r.examples.forEach((e) => console.log(`    ${e}`)); }
console.log('\nComplexity probes:'); probes.forEach((p) => console.log(`    ${p}`));
console.log(`\nElapsed ${(performance.now() - t0).toFixed(0)} ms`);
