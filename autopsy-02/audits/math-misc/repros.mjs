// Minimal deterministic reproductions for every finding in REPORT.md.  Run: bun repros.mjs
import path from 'node:path';
const A = path.resolve(import.meta.dir, '../../vendor/src/algorithms').replaceAll('\\', '/');
const d = async (p) => (await import(`${A}/${p}`)).default;
const m = async (p) => import(`${A}/${p}`);
const show = (id, expr, actual, expected) => console.log(`[${id}] ${expr}\n      actual:   ${actual}\n      expected: ${expected}\n`);
const hang = (id, expr, imp, ms = 3000) => {
  const code = `import f from '${A}/${imp}'; console.log(String(${expr.replace(/^\w+/, 'f')}));`;
  const t = Date.now(); const r = Bun.spawnSync([process.execPath, '-e', code], { timeout: ms });
  const out = (r.stdout.toString() + r.stderr.toString()).trim();
  console.log(`[${id}] ${expr}\n      actual:   ${r.exitCode === null || Date.now() - t >= ms ? `no result after ${ms} ms (killed)` : out}\n`);
};

const C = await d('math/complex-number/ComplexNumber.js');
const fft = await d('math/fourier-transform/fastFourierTransform.js');
const X = fft([new C({ re: 1 }), new C({ re: 2 })]);
show('B1', 'fastFourierTransform(fastFourierTransform([1, 2]), true)', JSON.stringify(fft(X, true)), '[{"re":1,"im":0},{"re":2,"im":0}]');

const knn = await d('ml/knn/kNN.js');
show('B2', "kNN([[0.001],[0.004]], ['a','b'], [0.0035], 1)", knn([[0.001], [0.004]], ['a', 'b'], [0.0035], 1), "'b'  (|0.0035-0.004|=0.0005 < |0.0035-0.001|=0.0025)");
const km = await d('ml/k-means/kMeans.js');
show('B3', 'kMeans([[0.001],[0.002],[0.009],[0.010]], 2)', JSON.stringify(km([[0.001], [0.002], [0.009], [0.010]], 2)), '[0,0,1,1]');
show('B3', 'kMeans([[1],[1],[5]], 2)', JSON.stringify(km([[1], [1], [5]], 2)), '[0,0,1]');

const sq = await d('math/square-root/squareRoot.js');
show('B4', 'squareRoot(6)', sq(6), `2  (Math.sqrt(6) = ${Math.sqrt(6)})`);
show('B4', 'squareRoot(3, 1)', sq(3, 1), `1.7  (Math.sqrt(3) = ${Math.sqrt(3)})  -- the repo's jest test asserts 1.8`);
hang('B4', 'squareRoot(65549, 11)', 'math/square-root/squareRoot.js');

const { bitsToFloat16, bitsToFloat32 } = await m('math/binary-floating-point/bitsToFloat.js');
const b = (s) => s.split('').map(Number);
show('B5', "bitsToFloat16(bits('0000000000000000'))", bitsToFloat16(b('0000000000000000')), '0');
show('B5', "bitsToFloat16(bits('0000000000000001'))", bitsToFloat16(b('0000000000000001')), '5.960464477539063e-8  (2^-24, listed in testCases.js)');
show('B5', 'bitsToFloat32(Array(32).fill(0))', bitsToFloat32(Array(32).fill(0)), '0');

const cp = await d('math/horner-method/classicPolynome.js');
const coeffs = [1, 2, 3];
const r1 = cp(coeffs, 2); const r2 = cp(coeffs, 2);
show('B6', 'c=[1,2,3]; classicPolynome(c, 2); classicPolynome(c, 2)', `${r1}, ${r2}`, '11, 11  (x^2+2x+3 at x=2)');

const { hillCipherEncrypt } = await m('cryptography/hill-cipher/hillCipher.js');
show('B7', "hillCipherEncrypt('act', 'gybnqkurp')", hillCipherEncrypt('act', 'gybnqkurp'), "'POH' (same as hillCipherEncrypt('ACT','GYBNQKURP'), per README)");
show('B7', "hillCipherEncrypt('a', 'B')", hillCipherEncrypt('a', 'B'), "'A'  (key B=1, message a=0: 1*0 mod 26 = 0 -> 'A'; same as hillCipherEncrypt('A','B'))");

hang('B8', 'bitLength(2 ** 30)', 'math/bits/bitLength.js');
hang('B8', 'multiplyUnsigned(0, 2 ** 31)', 'math/bits/multiplyUnsigned.js');
const bip = await d('math/bits/isPowerOfTwo.js');
show('B8', 'bits/isPowerOfTwo(0)', bip(0), 'false');

const ipb = await d('math/is-power-of-two/isPowerOfTwoBitwise.js');
show('B9', 'isPowerOfTwoBitwise(3 * 2 ** 31)   // 6442450944', ipb(3 * 2 ** 31), 'false');
show('B9', 'isPowerOfTwoBitwise(5 * 2 ** 32)   // 21474836480', ipb(5 * 2 ** 32), 'false');

const rf = await m('cryptography/rail-fence-cipher/railFenceCipher.js');
show('B10', "encodeRailFenceCipher('hello', 1)", JSON.stringify(rf.encodeRailFenceCipher('hello', 1)), '"hello"');
let dr; try { dr = rf.decodeRailFenceCipher('hello', 1); } catch (e) { dr = `throws ${e.constructor.name}: ${e.message}`; }
show('B10', "decodeRailFenceCipher('hello', 1)", dr, '"hello"');

hang('B11', 'fibonacciNth(0)', 'math/fibonacci/fibonacciNth.js');
hang('B11', 'fibonacci(0)', 'math/fibonacci/fibonacci.js');

const up = await d('uncategorized/unique-paths/uniquePaths.js');
const pt = await d('math/pascal-triangle/pascalTriangle.js');
show('B12', 'uniquePaths(29, 29)', up(29, 29), '7648690600760440  (C(56,28) < 2^53; dpUniquePaths(29,29) returns this)');
show('B12', 'pascalTriangle(55)[26]', pt(55)[26], '3560597348629860');

const lcm = await d('math/least-common-multiple/leastCommonMultiple.js');
show('B13', 'leastCommonMultiple(549533988, 76324165)', lcm(549533988, 76324165), '2747669940');

const gi = await d('math/euclidean-algorithm/euclideanAlgorithmIterative.js');
let t = performance.now(); gi(1e8, 1); const ms = (performance.now() - t).toFixed(0);
console.log(`[B14] euclideanAlgorithmIterative(1e8, 1) took ${ms} ms (1e8 subtractions); recursive version: <1 ms`);
hang('B14', 'euclideanAlgorithmIterative(2 ** 53 - 1, 2)', 'math/euclidean-algorithm/euclideanAlgorithmIterative.js', 5000);
