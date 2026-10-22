// Algorithm Autopsy #2 -- trekhleb/javascript-algorithms @ 85293e3
// Scope: math, cryptography, ml, statistics, uncategorized, image-processing, linked-list
// Run: bun run_audit.mjs            (deterministic: seeded PRNG, Math.random patched where needed)
// Method: property-based differential testing against simple, obviously-correct references.

import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '../../vendor/src');
const A = `${ROOT}/algorithms`;
const imp = async (p) => (await import(`${A}/${p}`));
const def = async (p) => (await imp(p)).default;

// ---------- deterministic PRNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(20261023);
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // inclusive
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---------- tiny framework ----------
const suites = [];
let cur = null;
async function suite(name, file, fn) {
  cur = { name, file, tests: 0, fails: 0, examples: [], notes: [] };
  const t0 = performance.now();
  try {
    await fn();
  } catch (e) {
    cur.tests += 1; cur.fails += 1;
    cur.examples.push(`HARNESS EXCEPTION: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  }
  cur.ms = performance.now() - t0;
  suites.push(cur);
  const status = cur.fails ? (cur.known ? 'KNWN' : 'FAIL') : 'PASS';
  console.log(`${status.padEnd(4)} ${name.padEnd(46)} tests=${String(cur.tests).padStart(7)} fails=${String(cur.fails).padStart(6)}  (${cur.ms.toFixed(0)} ms)`);
  for (const ex of cur.examples.slice(0, 4)) console.log(`       - ${ex}`);
  for (const n of cur.notes) console.log(`       note: ${n}`);
}
function check(ok, detail) {
  cur.tests += 1;
  if (!ok) {
    cur.fails += 1;
    if (cur.examples.length < 6) cur.examples.push(typeof detail === 'function' ? detail() : detail);
  }
  return ok;
}
const note = (s) => cur.notes.push(s);
const J = (x) => JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? `${v}n` : v));
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

// Run a snippet in a separate bun process with a timeout (to detect infinite loops safely).
function runIsolated(body, timeoutMs = 3000) {
  const code = body.replaceAll('@A', A.replaceAll('\\', '/'));
  const t0 = Date.now();
  const r = Bun.spawnSync([process.execPath, '-e', code], { timeout: timeoutMs, stdout: 'pipe', stderr: 'pipe' });
  const ms = Date.now() - t0;
  const out = (r.stdout.toString() + r.stderr.toString()).trim();
  const timedOut = r.exitCode === null || r.signalCode != null || ms >= timeoutMs;
  return { timedOut, out, ms, exitCode: r.exitCode };
}

// ---------- reference helpers ----------
const isPrimeRef = (n) => { if (!Number.isInteger(n) || n < 2) return false; for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false; return true; };
function millerRabin(nNum) { // deterministic for n < 3.3e24
  const n = BigInt(nNum); if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) { if (n === p) return true; if (n % p === 0n) return false; }
  let d = n - 1n, s = 0; while (d % 2n === 0n) { d /= 2n; s += 1; }
  const pw = (b, e, m) => { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; };
  for (const a of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    let x = pw(a, d, n); if (x === 1n || x === n - 1n) continue;
    let comp = true; for (let i = 1; i < s; i += 1) { x = x * x % n; if (x === n - 1n) { comp = false; break; } }
    if (comp) return false;
  }
  return true;
}
const gcdBig = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const binomBig = (n, k) => { if (k < 0 || k > n) return 0n; let r = 1n; for (let i = 1; i <= k; i += 1) r = r * BigInt(n - k + i) / BigInt(i); return r; };
const fibBig = (n) => { let a = 0n, b = 1n; for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]; return a; };
const MAXS = 2 ** 53;

// =====================================================================
// MATH
// =====================================================================
await suite('primality-test/trialDivision', 'math/primality-test/trialDivision.js', async () => {
  const f = await def('math/primality-test/trialDivision.js');
  const N = 100000; const sieve = Array(N + 1).fill(true); sieve[0] = sieve[1] = false;
  for (let i = 2; i * i <= N; i += 1) if (sieve[i]) for (let j = i * i; j <= N; j += i) sieve[j] = false;
  for (let n = -50; n <= N; n += 1) check(f(n) === (n >= 0 && sieve[n]), () => `n=${n}`);
  for (const x of [0.5, 2.5, 3.0000001, -7]) check(f(x) === false, `non-int ${x}`);
  for (let i = 0; i < 3000; i += 1) { const n = ri(1e5, 2 ** 31); check(f(n) === millerRabin(n), () => `n=${n}`); }
  for (let i = 0; i < 25; i += 1) { const n = ri(2 ** 44, 2 ** 46) | 1; const m = n + (n % 2 === 0 ? 1 : 0); check(f(m) === millerRabin(m), () => `n=${m}`); }
  for (const p of [2147483647, 4294967291, 1125899906842597]) check(f(p) === true, `known prime ${p}`);
});

await suite('sieve-of-eratosthenes', 'math/sieve-of-eratosthenes/sieveOfEratosthenes.js', async () => {
  const f = await def('math/sieve-of-eratosthenes/sieveOfEratosthenes.js');
  for (let n = 0; n <= 600; n += 1) { const exp = []; for (let i = 2; i <= n; i += 1) if (isPrimeRef(i)) exp.push(i); check(J(f(n)) === J(exp), () => `n=${n}`); }
  for (let i = 0; i < 40; i += 1) { const n = ri(1000, 200000); const r = f(n); check(r.length > 0 && r.every(isPrimeRef) && r[r.length - 1] <= n, `n=${n}`); }
  check(f(1000000).length === 78498, 'pi(1e6)=78498');
});

await suite('prime-factors (primeFactors)', 'math/prime-factors/primeFactors.js', async () => {
  const { primeFactors } = await imp('math/prime-factors/primeFactors.js');
  const test = (n) => { const r = primeFactors(n); const prod = r.reduce((a, b) => a * BigInt(b), 1n);
    const sorted = r.every((v, i) => i === 0 || r[i - 1] <= v);
    check(prod === BigInt(n) && r.every((p) => millerRabin(p)) && sorted, () => `n=${n} -> ${J(r)}`); };
  for (let n = 2; n <= 50000; n += 1) test(n);
  for (let i = 0; i < 2000; i += 1) test(ri(2, 2 ** 40));
  check(J(primeFactors(1)) === '[]', 'n=1');
  note(`primeFactors(0) = ${J(primeFactors(0))}, primeFactors(-12) = ${J(primeFactors(-12))} (out-of-domain, not counted)`);
});

await suite('euclidean-algorithm (recursive)', 'math/euclidean-algorithm/euclideanAlgorithm.js', async () => {
  const g = await def('math/euclidean-algorithm/euclideanAlgorithm.js');
  for (let i = 0; i < 20000; i += 1) {
    const a = ri(-1e6, 1e6), b = ri(-1e6, 1e6);
    check(g(a, b) === Number(gcdBig(BigInt(a), BigInt(b))), () => `gcd(${a},${b})=${g(a, b)}`);
  }
  for (let i = 0; i < 2000; i += 1) { const a = ri(0, MAXS - 1), b = ri(0, MAXS - 1); check(g(a, b) === Number(gcdBig(BigInt(a), BigInt(b))), `big gcd(${a},${b})`); }
});

await suite('euclidean-algorithm (iterative)', 'math/euclidean-algorithm/euclideanAlgorithmIterative.js', async () => {
  const g = await def('math/euclidean-algorithm/euclideanAlgorithmIterative.js');
  for (let i = 0; i < 20000; i += 1) {
    const a = ri(-3000, 3000), b = ri(-3000, 3000);
    check(g(a, b) === Number(gcdBig(BigInt(a), BigInt(b))), () => `gcd(${a},${b})=${g(a, b)}`);
  }
  // Complexity: subtraction-based variant is O(max(a,b)/min(a,b)), not O(log).
  const times = [];
  for (const n of [1e6, 1e7, 1e8]) { const t = performance.now(); g(n, 1); times.push([n, +(performance.now() - t).toFixed(0)]); }
  note(`gcdIterative(n,1) time ms: ${J(times)} (linear in n; recursive % version: <1 ms)`);
  const r = runIsolated("import g from '@A/math/euclidean-algorithm/euclideanAlgorithmIterative.js'; console.log(g(9007199254740991, 2));", 5000);
  check(!r.timedOut, `gcdIterative(2**53-1, 2) did not finish in 5 s (needs ~4.5e15 subtractions)`);
});

await suite('least-common-multiple', 'math/least-common-multiple/leastCommonMultiple.js', async () => {
  const l = await def('math/least-common-multiple/leastCommonMultiple.js');
  const ref = (a, b) => (a === 0n || b === 0n ? 0n : (a < 0n ? -a : a) / gcdBig(a, b) * (b < 0n ? -b : b));
  for (let i = 0; i < 20000; i += 1) { const a = ri(-1e5, 1e5), b = ri(-1e5, 1e5); check(BigInt(l(a, b)) === ref(BigInt(a), BigInt(b)), () => `lcm(${a},${b})=${l(a, b)}`); }
  // inputs and result < 2^53, but a*b > 2^53
  let bad = 0;
  for (let i = 0; i < 3000; i += 1) {
    const g = ri(2 ** 20, 2 ** 26); const a = g * ri(1, 2 ** 6) + 0, b = g * ri(1, 2 ** 6) + g; // share factor g
    const exp = ref(BigInt(a), BigInt(b)); if (exp >= BigInt(MAXS)) continue;
    const got = l(a, b); const ok = Number.isInteger(got) && BigInt(got) === exp; if (!ok) bad += 1;
    check(ok, () => `lcm(${a},${b}) = ${got}, expected ${exp} (a*b=${BigInt(a) * BigInt(b)} > 2^53)`);
  }
});

await suite('fast-powering', 'math/fast-powering/fastPowering.js', async () => {
  const f = await def('math/fast-powering/fastPowering.js');
  for (let b = -12; b <= 12; b += 1) for (let p = 0; p <= 60; p += 1) {
    const exp = BigInt(b) ** BigInt(p); if (exp > BigInt(MAXS) || exp < -BigInt(MAXS)) continue;
    check(f(b, p) === Number(exp), () => `${b}^${p} = ${f(b, p)} expected ${exp}`);
  }
  for (let i = 0; i < 3000; i += 1) { const b = rnd() * 4 - 2, p = ri(0, 40); check(close(f(b, p), b ** p, 1e-12), `${b}^${p}`); }
  note('negative / fractional powers are outside the documented domain ("two positive integers"), not tested');
});

await suite('factorial (iterative + recursive)', 'math/factorial/*.js', async () => {
  const f1 = await def('math/factorial/factorial.js'); const f2 = await def('math/factorial/factorialRecursive.js');
  let acc = 1n;
  for (let n = 0; n <= 170; n += 1) {
    if (n > 0) acc *= BigInt(n);
    if (acc < BigInt(MAXS)) { check(f1(n) === Number(acc) && f2(n) === Number(acc), `${n}!`); } else {
      check(close(f1(n), Number(acc), 1e-13) && close(f2(n), Number(acc), 1e-13), `${n}! approx`);
    }
  }
});

await suite('fibonacci / fibonacciNth / closed form', 'math/fibonacci/*.js', async () => {
  const fs = await def('math/fibonacci/fibonacci.js'); const fn = await def('math/fibonacci/fibonacciNth.js');
  const fc = await def('math/fibonacci/fibonacciNthClosedForm.js');
  for (let n = 1; n <= 78; n += 1) {
    check(fn(n) === Number(fibBig(n)), () => `fibonacciNth(${n})=${fn(n)} expected ${fibBig(n)}`);
    const seq = fs(n); check(seq.length === n && seq.every((v, i) => v === Number(fibBig(i + 1))), `fibonacci(${n})`);
  }
  for (let n = 1; n <= 70; n += 1) check(fc(n) === Number(fibBig(n)), () => `closedForm(${n})=${fc(n)} expected ${fibBig(n)}`);
  let threw = false; try { fc(0); } catch (e) { threw = true; } check(threw, 'closedForm(0) should throw (documented)');
  const r1 = runIsolated("import f from '@A/math/fibonacci/fibonacciNth.js'; console.log(f(0));");
  check(!r1.timedOut, `fibonacciNth(0) never returns (infinite loop; F(0)=0 or an error expected) [${r1.ms} ms, killed]`);
  const r2 = runIsolated("import f from '@A/math/fibonacci/fibonacci.js'; console.log(f(0));");
  check(!r2.timedOut, `fibonacci(0) never returns (infinite loop + unbounded array growth) [${r2.ms} ms, killed]`);
});

await suite('is-power-of-two (naive)', 'math/is-power-of-two/isPowerOfTwo.js', async () => {
  const f = await def('math/is-power-of-two/isPowerOfTwo.js');
  const ref = (n) => { if (!Number.isInteger(n) || n < 1) return false; return (BigInt(n) & (BigInt(n) - 1n)) === 0n; };
  for (let n = -100; n <= 70000; n += 1) check(f(n) === ref(n), `n=${n}`);
  for (let i = 0; i < 20000; i += 1) { const n = ri(1, MAXS - 1); check(f(n) === ref(n), () => `n=${n}`); }
  for (let e = 0; e < 53; e += 1) check(f(2 ** e) === true, `2^${e}`);
});

await suite('is-power-of-two (bitwise)', 'math/is-power-of-two/isPowerOfTwoBitwise.js', async () => {
  const f = await def('math/is-power-of-two/isPowerOfTwoBitwise.js');
  const ref = (n) => { if (!Number.isInteger(n) || n < 1) return false; return (BigInt(n) & (BigInt(n) - 1n)) === 0n; };
  for (let n = -100; n <= 70000; n += 1) check(f(n) === ref(n), `n=${n}`);
  for (let i = 0; i < 20000; i += 1) { const n = ri(1, MAXS - 1); check(f(n) === ref(n), () => `n=${n}: got ${f(n)}, expected ${ref(n)}`); }
  for (const n of [3 * 2 ** 31, 2 ** 32 + 2 ** 31, 5 * 2 ** 32, 2 ** 32 * 1000 + 2 ** 31]) check(f(n) === ref(n), `n=${n}: got ${f(n)}, expected false`);
});

await suite('integer-partition', 'math/integer-partition/integerPartition.js', async () => {
  const f = await def('math/integer-partition/integerPartition.js');
  // Euler pentagonal-number recurrence (BigInt)
  const p = [1n];
  for (let n = 1; n <= 200; n += 1) { let s = 0n; for (let k = 1; ; k += 1) { const g1 = k * (3 * k - 1) / 2, g2 = k * (3 * k + 1) / 2; if (g1 > n) break; const sg = k % 2 ? 1n : -1n; s += sg * p[n - g1]; if (g2 <= n) s += sg * p[n - g2]; } p.push(s); }
  for (let n = 0; n <= 200; n += 1) { if (p[n] >= BigInt(MAXS)) break; check(BigInt(f(n)) === p[n], () => `p(${n})=${f(n)} expected ${p[n]}`); }
});

await suite('square-root (Newton)', 'math/square-root/squareRoot.js', async () => {
  const f = await def('math/square-root/squareRoot.js');
  // Documented meaning of tolerance: "how many precise numbers after the floating point we want to get"
  // Reference: correctly-rounded sqrt to `t` decimals (only where the true value is not within 1e-9 of a rounding tie).
  for (let t = 0; t <= 6; t += 1) for (let n = 0; n <= 3000; n += 1) {
    const s = Math.sqrt(n) * 10 ** t; if (Math.abs((s % 1) - 0.5) < 1e-6) continue;
    const exp = Math.round(s) / 10 ** t; const got = f(n, t);
    check(got === exp, () => `squareRoot(${n}, ${t}) = ${got}, expected ${exp} (sqrt=${Math.sqrt(n)})`);
  }
  // Hang detection: tolerance well within double precision of the *root*, input modest
  for (const [n, t] of [[65549, 11], [8192, 12], [512, 13], [2, 16]]) {
    const r = runIsolated(`import f from '@A/math/square-root/squareRoot.js'; console.log(f(${n}, ${t}));`);
    check(!r.timedOut, `squareRoot(${n}, ${t}) never returns (residual |n-root^2| can't drop below 1e-${t}; true root ${Math.sqrt(n).toFixed(t)})`);
  }
});

await suite('bits/* (int32 utilities)', 'math/bits/*.js', async () => {
  const B = {};
  for (const n of ['bitLength', 'bitsDiff', 'clearBit', 'countSetBits', 'divideByTwo', 'fullAdder', 'getBit', 'isEven', 'isPositive', 'isPowerOfTwo', 'multiply', 'multiplyByTwo', 'multiplyUnsigned', 'setBit', 'switchSign', 'updateBit']) B[n] = await def(`math/bits/${n}.js`);
  const pop = (x) => { x >>>= 0; let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; };
  const i32 = () => (rnd() < 0.2 ? pick([0, 1, -1, 2 ** 31 - 1, -(2 ** 31), 2 ** 30, -(2 ** 30)]) : (Math.floor(rnd() * 2 ** 32) | 0));
  for (let i = 0; i < 20000; i += 1) {
    const a = i32(), b = i32(), p = ri(0, 31), v = ri(0, 1);
    check(B.getBit(a, p) === ((a >>> p) & 1), `getBit(${a},${p})`);
    check(B.setBit(a, p) === (a | (1 << p)), `setBit`);
    check(B.clearBit(a, p) === (a & ~(1 << p)), `clearBit`);
    check(B.updateBit(a, p, v) === (v ? (a | (1 << p)) : (a & ~(1 << p))), `updateBit`);
    check(B.countSetBits(a) === pop(a), `countSetBits(${a})`);
    check(B.bitsDiff(a, b) === pop(a ^ b), `bitsDiff`);
    check(B.isEven(a) === (a % 2 === 0), `isEven(${a})`);
    check(B.isPositive(a) === (a > 0), `isPositive(${a})`);
    check(B.divideByTwo(a) === Math.floor(a / 2), `divideByTwo(${a})`);
    check(B.multiplyByTwo(a) === ((a * 2) | 0), `multiplyByTwo(${a})`);
    check(B.switchSign(a) === -a, `switchSign(${a})`);
    check(B.fullAdder(a, b) === ((a + b) | 0), `fullAdder(${a},${b})`);
    // signed multiply where exact product fits int32
    const x = ri(-46340, 46340), y = ri(-46340, 46340);
    check(B.multiply(x, y) === x * y, () => `multiply(${x},${y})=${B.multiply(x, y)}`);
    const u = ri(0, 46340), w = ri(0, 46340);
    check(B.multiplyUnsigned(u, w) === u * w, () => `multiplyUnsigned(${u},${w})`);
    const nn = ri(0, 2 ** 30 - 1); check(B.bitLength(nn) === (nn === 0 ? 0 : Math.floor(Math.log2(nn)) + 1 - (2 ** Math.floor(Math.log2(nn)) > nn ? 1 : 0)), `bitLength(${nn})`);
  }
  for (let e = 0; e < 31; e += 1) { check(B.isPowerOfTwo(2 ** e) === true, `isPowerOfTwo(2^${e})`); }
  check(B.isPowerOfTwo(0) === false, `bits/isPowerOfTwo(0) returns ${B.isPowerOfTwo(0)} (0 is not a power of two; math/is-power-of-two guards this, bits/ version does not)`);
  for (let n = 3; n < 5000; n += 1) if (n & (n - 1)) check(B.isPowerOfTwo(n) === false, `isPowerOfTwo(${n})`);
  // Hang detection on valid 32-bit inputs
  const h1 = runIsolated("import f from '@A/math/bits/bitLength.js'; console.log(f(2**30));");
  check(!h1.timedOut, `bitLength(2**30) (=1073741824, a valid int32) never returns: 1<<31 is negative, 1<<32 === 1`);
  const h1b = runIsolated("import f from '@A/math/bits/bitLength.js'; console.log(f(2**31 - 1));");
  check(!h1b.timedOut, `bitLength(2**31-1) (INT32_MAX) never returns`);
  const h2 = runIsolated("import f from '@A/math/bits/multiplyUnsigned.js'; console.log(f(0, 2**31));");
  check(!h2.timedOut, `multiplyUnsigned(0, 2**31) never returns: multiplier >>= 1 sign-extends, sticks at -1`);
  const h3 = runIsolated("import f from '@A/math/bits/multiplyUnsigned.js'; console.log(f(1, 4294967295));");
  check(!h3.timedOut, `multiplyUnsigned(1, 0xFFFFFFFF) never returns`);
});

await suite('complex-number', 'math/complex-number/ComplexNumber.js', async () => {
  const C = await def('math/complex-number/ComplexNumber.js');
  const r = () => (rnd() - 0.5) * 200;
  for (let i = 0; i < 10000; i += 1) {
    const a = r(), b = r(), c = r(), d = r(); const x = new C({ re: a, im: b }), y = new C({ re: c, im: d });
    const ad = x.add(y), sb = x.subtract(y), ml = x.multiply(y), dv = x.divide(y);
    check(close(ad.re, a + c) && close(ad.im, b + d), 'add');
    check(close(sb.re, a - c) && close(sb.im, b - d), 'sub');
    check(close(ml.re, a * c - b * d) && close(ml.im, a * d + b * c), 'mul');
    const den = c * c + d * d; check(close(dv.re, (a * c + b * d) / den, 1e-9) && close(dv.im, (b * c - a * d) / den, 1e-9), 'div');
    check(close(x.getRadius(), Math.hypot(a, b)), 'radius');
    check(close(x.getPhase(), Math.atan2(b, a), 1e-12), () => `phase(${a},${b})`);
  }
  for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [-3, 3], [-3, -3], [3, -3]]) check(close(new C({ re: a, im: b }).getPhase(), Math.atan2(b, a), 1e-12), `phase(${a},${b})`);
});

await suite('fourier-transform: DFT / IDFT', 'math/fourier-transform/(inverse)discreteFourierTransform.js', async () => {
  const dft = await def('math/fourier-transform/discreteFourierTransform.js');
  const idft = await def('math/fourier-transform/inverseDiscreteFourierTransform.js');
  for (let i = 0; i < 400; i += 1) {
    const N = ri(1, 24); const x = Array.from({ length: N }, () => (rnd() - 0.5) * 20);
    const X = dft(x, 0); // threshold 0 -> pure arithmetic
    let ok = true;
    for (let k = 0; k < N; k += 1) { let re = 0, im = 0; for (let n = 0; n < N; n += 1) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } if (Math.abs(X[k].re - re / N) > 1e-9 || Math.abs(X[k].im - im / N) > 1e-9) ok = false; }
    check(ok, `dft N=${N}`);
    const back = idft(dft(x, 0), 0); check(back.every((v, j) => Math.abs(v - x[j]) < 1e-9), `idft(dft(x)) N=${N}`);
  }
});

await suite('fourier-transform: FFT', 'math/fourier-transform/fastFourierTransform.js', async () => {
  const fft = await def('math/fourier-transform/fastFourierTransform.js');
  const C = await def('math/complex-number/ComplexNumber.js');
  const naive = (x, sign) => x.map((_, k) => { let re = 0, im = 0; x.forEach((v, n) => { const ang = sign * 2 * Math.PI * k * n / x.length; re += v.re * Math.cos(ang) - v.im * Math.sin(ang); im += v.re * Math.sin(ang) + v.im * Math.cos(ang); }); return { re, im }; });
  let nanInverse = 0;
  for (let i = 0; i < 400; i += 1) {
    const N = ri(1, 64); const x = Array.from({ length: N }, () => new C({ re: (rnd() - 0.5) * 100, im: (rnd() - 0.5) * 100 }));
    const copy = x.map((c) => new C({ re: c.re, im: c.im }));
    const out = fft(x);
    let M = 1; while (M < N) M *= 2; const padded = [...copy]; while (padded.length < M) padded.push(new C());
    // repo's jest tests codify the e^{+i...} kernel for the forward transform
    const ref = naive(padded, +1);
    check(out.length === M && out.every((c, k) => Math.abs(c.re - ref[k].re) < 1e-6 && Math.abs(c.im - ref[k].im) < 1e-6), `fft N=${N}`);
    const inv = fft(out, true);
    const ok = inv.length === M && inv.every((c, k) => c instanceof C && Math.abs(c.re - padded[k].re) < 1e-6 && Math.abs(c.im - padded[k].im) < 1e-6);
    if (!ok) nanInverse += 1;
    check(ok, () => `fft(fft(x), true) should return x; N=${N}, got [${inv.slice(0, 2).map(String).join(', ')} ...]`);
  }
  note(`forward FFT uses e^{+2pi i kn/N} (no 1/N) while discreteFourierTransform.js uses e^{-2pi i kn/N} with 1/N: inconsistent conventions (not counted as bug)`);
  const inp = [new C({ re: 1 })]; fft(inp.concat([]).slice(), false); const inp3 = [new C(), new C(), new C()]; fft(inp3);
  note(`fft() mutates its argument: 3-element input array has length ${inp3.length} afterwards (zero-padded in place)`);
});

await suite('horner-method (horner + classicPolynome)', 'math/horner-method/*.js', async () => {
  const h = await def('math/horner-method/hornerMethod.js'); const c = await def('math/horner-method/classicPolynome.js');
  for (let i = 0; i < 5000; i += 1) {
    const deg = ri(0, 8); const co = Array.from({ length: deg + 1 }, () => ri(-20, 20)); const x = ri(-6, 6);
    let exp = 0n; co.forEach((a, k) => { exp += BigInt(a) * BigInt(x) ** BigInt(deg - k); });
    check(h(co, x) === Number(exp), `horner ${J(co)} @${x}`);
    const before = J(co); const r1 = c(co, x); const r2 = c(co, x);
    check(r1 === Number(exp) && r2 === Number(exp) && J(co) === before || deg === 0 || (co.every((v, k) => v === co[deg - k])),
      () => `classicPolynome(${before}, ${x}): 1st call=${r1}, 2nd call=${r2}, expected ${exp}; coefficients after: ${J(co)}`);
  }
});

await suite('liu-hui (pi approximation)', 'math/liu-hui/liuHui.js', async () => {
  const f = await def('math/liu-hui/liuHui.js');
  for (let s = 1; s <= 25; s += 1) { const m = 12 * 2 ** (s - 1); const exp = (m / 2) * Math.sin(2 * Math.PI / m); check(close(f(s), exp, 1e-9), () => `liuHui(${s})=${f(s)} expected ${exp}`); }
});

await suite('matrix (dot, t, add, mul, sub, shape)', 'math/matrix/Matrix.js', async () => {
  const m = await imp('math/matrix/Matrix.js');
  const rm = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, () => ri(-50, 50)));
  for (let i = 0; i < 3000; i += 1) {
    const r = ri(1, 7), k = ri(1, 7), c = ri(1, 7); const a = rm(r, k), b = rm(k, c);
    const exp = a.map((row) => Array.from({ length: c }, (_, j) => row.reduce((s, v, q) => s + v * b[q][j], 0)));
    check(J(m.dot(a, b)) === J(exp), `dot ${r}x${k} * ${k}x${c}`);
    check(J(m.t(a)) === J(Array.from({ length: k }, (_, j) => a.map((row) => row[j]))), `t ${r}x${k}`);
    const a2 = rm(r, k);
    check(J(m.add(a, a2)) === J(a.map((row, p) => row.map((v, q) => v + a2[p][q]))), 'add');
    check(J(m.sub(a, a2)) === J(a.map((row, p) => row.map((v, q) => v - a2[p][q]))), 'sub');
    check(J(m.mul(a, a2)) === J(a.map((row, p) => row.map((v, q) => v * a2[p][q]))), 'mul');
    check(J(m.shape(a)) === J([r, k]), 'shape');
    let threw = false; try { m.dot(a, rm(k + 1, c)); } catch (e) { threw = true; } check(threw, 'dot incompatible throws');
  }
  // 3-D add
  for (let i = 0; i < 300; i += 1) { const s = [ri(1, 4), ri(1, 4), ri(1, 4)]; const g = () => m.generate(s, () => ri(-9, 9)); const a = g(), b = g();
    check(J(m.add(a, b)) === J(a.map((x, p) => x.map((y, q) => y.map((v, w) => v + b[p][q][w])))), '3d add'); }
});

await suite('pascal-triangle (multiplicative + recursive)', 'math/pascal-triangle/*.js', async () => {
  const p1 = await def('math/pascal-triangle/pascalTriangle.js'); const p2 = await def('math/pascal-triangle/pascalTriangleRecursive.js');
  for (let n = 0; n <= 62; n += 1) {
    const row = Array.from({ length: n + 1 }, (_, k) => binomBig(n, k));
    if (row.some((v) => v >= BigInt(MAXS))) continue; // only rows exactly representable as doubles
    const r1 = p1(n), r2 = p2(n);
    const bad1 = row.findIndex((v, k) => BigInt(Math.round(r1[k])) !== v || !Number.isInteger(r1[k]));
    check(bad1 === -1, () => `pascalTriangle(${n})[${bad1}] = ${r1[bad1]}, expected ${row[bad1]}`);
    check(row.every((v, k) => BigInt(r2[k]) === v), `pascalTriangleRecursive(${n})`);
  }
});

await suite('radian conversions', 'math/radian/*.js', async () => {
  const d2r = await def('math/radian/degreeToRadian.js'); const r2d = await def('math/radian/radianToDegree.js');
  for (let i = 0; i < 10000; i += 1) { const d = (rnd() - 0.5) * 1e4; check(close(r2d(d2r(d)), d, 1e-12) && close(d2r(d), d * Math.PI / 180, 1e-14), `deg ${d}`); }
});

await suite('euclidean-distance', 'math/euclidean-distance/euclideanDistance.js', async () => {
  const f = await def('math/euclidean-distance/euclideanDistance.js');
  for (let i = 0; i < 5000; i += 1) { const n = ri(1, 6); const a = [Array.from({ length: n }, () => (rnd() - 0.5) * 100)]; const b = [Array.from({ length: n }, () => (rnd() - 0.5) * 100)];
    const exp = Math.sqrt(a[0].reduce((s, v, k) => s + (v - b[0][k]) ** 2, 0)); check(Math.abs(f(a, b) - exp) <= 0.005 + 1e-12, 'dist'); }
  note('result is deliberately rounded to 2 decimals (toFixed(2)); this rounding propagates into kNN and k-means (see those suites)');
});

await suite('binary-floating-point: bitsToFloat16/32/64', 'math/binary-floating-point/bitsToFloat.js', async () => {
  const { bitsToFloat16, bitsToFloat32, bitsToFloat64 } = await imp('math/binary-floating-point/bitsToFloat.js');
  const half = (bits) => { const s = bits[0] ? -1 : 1; const e = parseInt(bits.slice(1, 6).join(''), 2); const f = parseInt(bits.slice(6).join(''), 2);
    return e === 0 ? s * 2 ** -14 * (f / 1024) : s * 2 ** (e - 15) * (1 + f / 1024); };
  const viaDV = (bits, bytes) => { const dv = new DataView(new ArrayBuffer(bytes)); for (let i = 0; i < bytes; i += 1) dv.setUint8(i, parseInt(bits.slice(i * 8, i * 8 + 8).join(''), 2)); return bytes === 4 ? dv.getFloat32(0) : dv.getFloat64(0); };
  const rbits = (n) => Array.from({ length: n }, () => ri(0, 1));
  const cases = [[16, bitsToFloat16, (b) => half(b), 5], [32, bitsToFloat32, (b) => viaDV(b, 4), 8], [64, bitsToFloat64, (b) => viaDV(b, 8), 11]];
  for (const [n, f, ref, eb] of cases) {
    const fc = { normal: [0, 0], zeroExp: [0, 0] };
    for (let i = 0; i < 4000; i += 1) {
      const b = rbits(n); const expBits = b.slice(1, 1 + eb);
      if (expBits.every((x) => x === 1)) continue; // Inf/NaN: documented as omitted
      if (rnd() < 0.3) for (let j = 1; j <= eb; j += 1) b[j] = 0; // force zero/subnormal exponent
      const isZeroExp = b.slice(1, 1 + eb).every((x) => x === 0);
      if (isZeroExp && b.slice(1 + eb).every((x) => x === 0) && b[0] === 1) continue; // -0: documented as omitted
      const got = f(b), exp = ref(b);
      const bucket = isZeroExp ? fc.zeroExp : fc.normal; bucket[0] += 1; if (got !== exp) bucket[1] += 1;
      check(got === exp, () => `bitsToFloat${n}(${b.join('')}) = ${got}, expected ${exp}${isZeroExp ? ' [zero/subnormal]' : ''}`);
    }
    note(`float${n}: normal numbers ${fc.normal[1]}/${fc.normal[0]} wrong; exponent-field==0 (zero/subnormal) ${fc.zeroExp[1]}/${fc.zeroExp[0]} wrong`);
    const z = Array(n).fill(0); check(f(z) === 0, `bitsToFloat${n}(all zeros) = ${f(z)}, expected 0 (testCases.js lists [0, '000...0'])`);
  }
});

await suite('binary-floating-point: floatAs32/64BinaryString', 'math/binary-floating-point/floatAsBinaryString.js', async () => {
  const { floatAs32BinaryString, floatAs64BinaryString } = await imp('math/binary-floating-point/floatAsBinaryString.js');
  for (let i = 0; i < 5000; i += 1) {
    const x = (rnd() - 0.5) * 10 ** ri(-40, 40);
    const b64 = new DataView(new ArrayBuffer(8)); b64.setFloat64(0, x); const exp64 = BigInt(b64.getBigUint64(0)).toString(2).padStart(64, '0');
    check(floatAs64BinaryString(x) === exp64, `f64 ${x}`);
    const b32 = new DataView(new ArrayBuffer(4)); b32.setFloat32(0, x); const exp32 = b32.getUint32(0).toString(2).padStart(32, '0');
    check(floatAs32BinaryString(x) === exp32, `f32 ${x}`);
  }
});

// =====================================================================
// CRYPTOGRAPHY
// =====================================================================
await suite('caesar-cipher', 'cryptography/caesar-cipher/caesarCipher.js', async () => {
  const { caesarCipherEncrypt: enc, caesarCipherDecrypt: dec } = await imp('cryptography/caesar-cipher/caesarCipher.js');
  const chars = 'abcdefghijklmnopqrstuvwxyz ABCXYZ.,!?0123';
  for (let i = 0; i < 10000; i += 1) {
    const s = Array.from({ length: ri(0, 30) }, () => pick(chars)).join(''); const sh = ri(-200, 200);
    const exp = s.toLowerCase().split('').map((ch) => (ch >= 'a' && ch <= 'z' ? String.fromCharCode(97 + ((((ch.charCodeAt(0) - 97 + sh) % 26) + 26) % 26)) : ch)).join('');
    check(enc(s, sh) === exp, `enc(${J(s)},${sh})`); check(dec(enc(s, sh), sh) === s.toLowerCase(), `roundtrip ${sh}`);
  }
});

await suite('hill-cipher (encrypt)', 'cryptography/hill-cipher/hillCipher.js', async () => {
  const { hillCipherEncrypt: enc } = await imp('cryptography/hill-cipher/hillCipher.js');
  const ref = (msg, key) => { const n = msg.length; const v = (c) => c.toUpperCase().charCodeAt(0) - 65; let out = '';
    for (let r = 0; r < n; r += 1) { let s = 0; for (let c = 0; c < n; c += 1) s += v(key[r * n + c]) * v(msg[c]); out += String.fromCharCode(65 + (s % 26)); } return out; };
  const U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', L = U.toLowerCase();
  for (let i = 0; i < 4000; i += 1) {
    const n = ri(1, 4); const msg = Array.from({ length: n }, () => pick(U)).join(''); const key = Array.from({ length: n * n }, () => pick(U)).join('');
    check(enc(msg, key) === ref(msg, key), `upper ${msg}/${key}`);
  }
  for (let i = 0; i < 4000; i += 1) {
    const n = ri(1, 4); const alpha = rnd() < 0.5 ? L : U + L;
    const msg = Array.from({ length: n }, () => pick(alpha)).join(''); const key = Array.from({ length: n * n }, () => pick(alpha)).join('');
    check(enc(msg, key) === ref(msg, key), () => `hillCipherEncrypt(${J(msg)}, ${J(key)}) = ${enc(msg, key)}, expected ${ref(msg, key)} (= encrypt of upper-cased input)`);
  }
});

await suite('polynomial-hash (PolynomialHash)', 'cryptography/polynomial-hash/PolynomialHash.js', async () => {
  const PH = await def('cryptography/polynomial-hash/PolynomialHash.js');
  for (const [base, modulus] of [[37, 101], [31, 1000000007], [256, 65521]]) {
    const h = new PH({ base, modulus });
    for (let i = 0; i < 3000; i += 1) {
      const len = ri(1, 12); const txt = Array.from({ length: len + 10 }, () => String.fromCharCode(rnd() < 0.7 ? ri(32, 126) : ri(0x400, 0xD7FF))).join('');
      let hv = h.hash(txt.slice(0, len)); let ok = true;
      for (let s = 1; s + len <= txt.length; s += 1) { hv = h.roll(hv, txt.slice(s - 1, s - 1 + len), txt.slice(s, s + len)); if (hv !== h.hash(txt.slice(s, s + len))) ok = false; }
      check(ok, `roll consistency (BMP text) base=${base} mod=${modulus}`);
      // direct definition
      const w = txt.slice(0, len); let e = 0n; for (const ch of w) e = (e * BigInt(base) + BigInt(ch.codePointAt(0))) % BigInt(modulus);
      check(BigInt(h.hash(w)) === e, `hash def`);
    }
  }
});

await suite('polynomial-hash astral chars [KNOWN: test file says "@TODO: Provide Unicode support"]', 'cryptography/polynomial-hash/PolynomialHash.js', async () => {
  cur.known = true;
  const PH = await def('cryptography/polynomial-hash/PolynomialHash.js');
  // Astral (non-BMP) characters: hash() iterates code points, roll() indexes UTF-16 code units
  const h = new PH();
  for (let i = 0; i < 500; i += 1) {
    const pool = ['a', 'b', 'c', '\u{1F600}', '\u{1D11E}', 'x'];
    const txt = Array.from({ length: 12 }, () => pick(pool)).join(''); const cps = Array.from(txt); const len = ri(2, 4);
    for (let s = 1; s + len <= cps.length; s += 1) {
      const prev = cps.slice(s - 1, s - 1 + len).join(''), next = cps.slice(s, s + len).join('');
      if (!/[\u{10000}-\u{10FFFF}]/u.test(prev + next)) continue;
      const got = h.roll(h.hash(prev), prev, next), exp = h.hash(next);
      check(got === exp, () => `roll(hash(${J(prev)}), ${J(prev)}, ${J(next)}) = ${got}, hash(${J(next)}) = ${exp}`);
    }
  }
});

await suite('polynomial-hash (SimplePolynomialHash)', 'cryptography/polynomial-hash/SimplePolynomialHash.js', async () => {
  const SH = await def('cryptography/polynomial-hash/SimplePolynomialHash.js'); const h = new SH();
  for (let i = 0; i < 3000; i += 1) {
    const len = ri(1, 6); const txt = Array.from({ length: len + 8 }, () => String.fromCharCode(ri(97, 122))).join('');
    let hv = h.hash(txt.slice(0, len)); let ok = true;
    for (let s = 1; s + len <= txt.length; s += 1) { hv = h.roll(hv, txt.slice(s - 1, s - 1 + len), txt.slice(s, s + len)); if (hv !== h.hash(txt.slice(s, s + len))) ok = false; }
    check(ok, 'simple roll consistency');
  }
});

await suite('rail-fence-cipher', 'cryptography/rail-fence-cipher/railFenceCipher.js', async () => {
  const { encodeRailFenceCipher: enc, decodeRailFenceCipher: dec } = await imp('cryptography/rail-fence-cipher/railFenceCipher.js');
  const ref = (s, r) => { if (r === 1) return s; const rails = Array.from({ length: r }, () => ''); let row = 0, dir = 1; for (const ch of s) { rails[row] += ch; if (row === 0) dir = 1; else if (row === r - 1) dir = -1; row += dir; } return rails.join(''); };
  for (let i = 0; i < 3000; i += 1) {
    const s = Array.from({ length: ri(1, 40) }, () => String.fromCharCode(ri(65, 90))).join(''); const r = ri(2, 12);
    check(enc(s, r) === ref(s, r), `enc ${s} r=${r}`); check(dec(ref(s, r), r) === s, `dec r=${r}`);
  }
  // railCount = 1 (identity cipher)
  for (const s of ['hello', 'WEAREDISCOVERED', 'a']) {
    const e = enc(s, 1); check(e === s, () => `encodeRailFenceCipher(${J(s)}, 1) = ${J(e)}, expected ${J(s)}`);
    let d; try { d = dec(s, 1); } catch (er) { d = `throws ${er.constructor.name}: ${er.message}`; } check(d === s, () => `decodeRailFenceCipher(${J(s)}, 1) -> ${J(d)}`);
  }
  // Performance: recursive with array spreads -> O(n^2) time, deep recursion
  const t = performance.now(); enc('x'.repeat(4000), 3); note(`encode 4000 chars: ${(performance.now() - t).toFixed(0)} ms (O(n^2) from per-char array spreading)`);
});

// =====================================================================
// ML
// =====================================================================
await suite('knn', 'ml/knn/kNN.js', async () => {
  const kNN = await def('ml/knn/kNN.js');
  const ref = (data, labels, q, k) => {
    const d = data.map((p, i) => ({ d: Math.hypot(...p.map((v, j) => v - q[j])), l: labels[i], i })).sort((a, b) => a.d - b.d || a.i - b.i).slice(0, k);
    const cnt = {}; let top = null, tc = 0; for (const e of d) { cnt[e.l] = (cnt[e.l] || 0) + 1; if (cnt[e.l] > tc) { tc = cnt[e.l]; top = e.l; } } return { top, d };
  };
  for (const [scale, n] of [[100, 3000], [0.01, 3000]]) {
    let fails = 0, total = 0;
    for (let i = 0; i < n; i += 1) {
      const N = ri(3, 15), dim = ri(1, 3), k = pick([1, 3]); const data = Array.from({ length: N }, () => Array.from({ length: dim }, () => rnd() * scale));
      const labels = data.map(() => pick(['a', 'b', 'c'])); const q = Array.from({ length: dim }, () => rnd() * scale);
      const { top, d } = ref(data, labels, q, k);
      // skip inputs whose exact answer is itself ambiguous (near-ties in true distance)
      if (d.length > k && Math.abs((d[k] ? d[k].d : Infinity) - d[k - 1].d) < 1e-9) continue;
      total += 1; const got = kNN(data, labels, q, k);
      if (got !== top) fails += 1;
      check(got === top, () => `scale=${scale}: kNN(${J(data.map((p) => p.map((v) => +v.toFixed(5))))}, ${J(labels)}, ${J(q.map((v) => +v.toFixed(5)))}, k=${k}) = ${got}, exact nearest -> ${top}`);
    }
    note(`coordinate scale ${scale}: ${fails}/${total} wrong classifications`);
  }
  check(kNN([[0.001], [0.004]], ['a', 'b'], [0.0035], 1) === 'b', `kNN([[0.001],[0.004]], ['a','b'], [0.0035], 1) = ${kNN([[0.001], [0.004]], ['a', 'b'], [0.0035], 1)}, expected 'b'`);
});

await suite('k-means', 'ml/k-means/kMeans.js', async () => {
  const kMeans = await def('ml/k-means/kMeans.js');
  const valid = (data, k, cls) => {
    if (cls.length !== data.length || cls.some((c) => !(Number.isInteger(c) && c >= 0 && c < k))) return 'class out of range';
    // Lloyd fixed point (with exact means): each point no farther from its own centroid than from any other (tol for 2-dec rounding in repo)
    const dim = data[0].length; const cents = Array.from({ length: k }, () => Array(dim).fill(0)); const sz = Array(k).fill(0);
    data.forEach((p, i) => { sz[cls[i]] += 1; p.forEach((v, j) => { cents[cls[i]][j] += v; }); });
    cents.forEach((c, ci) => c.forEach((_, j) => { c[j] /= sz[ci] || 1; }));
    for (let i = 0; i < data.length; i += 1) { const dOwn = Math.hypot(...data[i].map((v, j) => v - cents[cls[i]][j]));
      for (let c = 0; c < k; c += 1) if (sz[c] && Math.hypot(...data[i].map((v, j) => v - cents[c][j])) < dOwn - 0.02) return `point ${i} closer to cluster ${c}`; }
    return null;
  };
  for (const scale of [100, 0.01]) {
    let fails = 0; const n = 1000;
    for (let i = 0; i < n; i += 1) {
      const N = ri(4, 20), dim = ri(1, 3), k = ri(2, Math.min(4, N));
      const data = Array.from({ length: N }, () => Array.from({ length: dim }, () => rnd() * scale));
      const out = kMeans(data, k); const err = valid(data, k, out); if (err) fails += 1;
      check(!err, () => `scale=${scale}: kMeans(${J(data.map((p) => p.map((v) => +v.toFixed(5))))}, ${k}) = ${J(out)}: ${err}`);
    }
    note(`coordinate scale ${scale}: ${fails}/${n} invalid outputs`);
  }
  // duplicate points among the first k rows (initial centroids coincide)
  for (const [data, k] of [[[[1], [1], [5]], 2], [[[0, 0], [0, 0], [10, 10], [10, 11]], 2], [[[2, 3], [2, 3], [2, 3], [9, 9], [9, 8]], 3]]) {
    const out = kMeans(data, k); check(!valid(data, k, out), `kMeans(${J(data)}, ${k}) = ${J(out)}`);
  }
});

// =====================================================================
// STATISTICS
// =====================================================================
await suite('weighted-random (chi-square)', 'statistics/weighted-random/weightedRandom.js', async () => {
  const wr = await def('statistics/weighted-random/weightedRandom.js');
  const realRandom = Math.random; Math.random = mulberry32(777);
  try {
    for (let t = 0; t < 30; t += 1) {
      const n = ri(1, 8); const w = Array.from({ length: n }, () => (rnd() < 0.2 ? 0 : ri(1, 20))); if (w.every((x) => x === 0)) w[0] = 1;
      const items = w.map((_, i) => `i${i}`); const S = w.reduce((a, b) => a + b, 0); const draws = 60000; const cnt = Array(n).fill(0);
      for (let d = 0; d < draws; d += 1) { const r = wr(items, w); cnt[r.index] += 1; }
      let chi = 0, dof = -1; for (let i = 0; i < n; i += 1) { const e = draws * w[i] / S; if (e > 0) { chi += (cnt[i] - e) ** 2 / e; dof += 1; } }
      const zeroHit = w.some((x, i) => x === 0 && cnt[i] > 0);
      // crude upper bound: chi2 critical value at p=0.0005 ~ dof + 5*sqrt(2*dof) + 10
      check(!zeroHit && chi <= dof + 5 * Math.sqrt(2 * Math.max(dof, 1)) + 10, `weights ${J(w)} counts ${J(cnt)} chi2=${chi.toFixed(2)}`);
    }
  } finally { Math.random = realRandom; }
});

// =====================================================================
// UNCATEGORIZED
// =====================================================================
await suite('best-time-to-buy-sell-stocks (4 impls)', 'uncategorized/best-time-to-buy-sell-stocks/*.js', async () => {
  const fs = {};
  for (const n of ['accumulator', 'dp', 'dq', 'peakvalley']) fs[n] = await def(`uncategorized/best-time-to-buy-sell-stocks/${n}BestTimeToBuySellStocks.js`);
  const ref = (p) => { // memoised state machine (holding / not holding)
    const memo = new Map(); const go = (i, hold) => { if (i === p.length) return 0; const key = i * 2 + hold; if (memo.has(key)) return memo.get(key);
      const v = hold ? Math.max(go(i + 1, 1), p[i] + go(i + 1, 0)) : Math.max(go(i + 1, 0), -p[i] + go(i + 1, 1)); memo.set(key, v); return v; }; return go(0, 0); };
  for (let i = 0; i < 4000; i += 1) {
    const n = ri(1, 14); const p = Array.from({ length: n }, () => ri(0, 30)); const exp = ref(p);
    for (const [k, f] of Object.entries(fs)) { if (k === 'dq' && n > 14) continue; check(f(p) === exp, () => `${k}(${J(p)}) = ${f(p)}, expected ${exp}`); }
  }
  for (let i = 0; i < 1000; i += 1) { const p = Array.from({ length: ri(15, 300) }, () => ri(0, 1000)); const exp = ref(p); for (const k of ['accumulator', 'dp', 'peakvalley']) check(fs[k](p) === exp, `${k} long`); }
  note(`empty price list: accumulator=${fs.accumulator([])}, dp=${fs.dp([])}, dq=${fs.dq([])}, peakvalley=${fs.peakvalley([])} (edge case, not counted)`);
});

await suite('hanoi-tower', 'uncategorized/hanoi-tower/hanoiTower.js', async () => {
  const hanoi = await def('uncategorized/hanoi-tower/hanoiTower.js'); const Stack = (await import(`${ROOT}/data-structures/stack/Stack.js`)).default;
  for (let n = 1; n <= 14; n += 1) {
    let illegal = 0; let moves = 0;
    class S extends Stack { push(v) { if (!this.isEmpty() && this.peek() < v) illegal += 1; super.push(v); } }
    const from = new S(), withP = new S(), to = new S();
    hanoi({ numberOfDiscs: n, moveCallback: () => { moves += 1; }, fromPole: from, withPole: withP, toPole: to });
    check(illegal === 0 && moves === 2 ** n - 1 && from.isEmpty() && withP.isEmpty() && J(to.toArray()) === J(Array.from({ length: n }, (_, i) => i + 1)), `hanoi n=${n}: moves=${moves} illegal=${illegal}`);
  }
});

await suite('jump-game (4 impls)', 'uncategorized/jump-game/*.js', async () => {
  const fs = {};
  for (const n of ['backtracking', 'dpBottomUp', 'dpTopDown', 'greedy']) fs[n] = await def(`uncategorized/jump-game/${n}JumpGame.js`);
  const ref = (a) => { const seen = new Set([0]); const q = [0]; while (q.length) { const i = q.shift(); for (let j = 1; j <= a[i]; j += 1) if (i + j < a.length && !seen.has(i + j)) { seen.add(i + j); q.push(i + j); } } return seen.has(a.length - 1); };
  for (let i = 0; i < 6000; i += 1) {
    const n = ri(1, 16); const a = Array.from({ length: n }, () => (rnd() < 0.35 ? 0 : ri(0, 4))); const exp = ref(a);
    for (const [k, f] of Object.entries(fs)) check(f(a) === exp, () => `${k}(${J(a)}) = ${f(a)}, expected ${exp}`);
  }
  for (let i = 0; i < 500; i += 1) { const a = Array.from({ length: ri(50, 400) }, () => (rnd() < 0.3 ? 0 : ri(0, 6))); const exp = ref(a); for (const k of ['dpBottomUp', 'greedy']) check(fs[k](a) === exp, `${k} long`); }
});

await suite('knight-tour', 'uncategorized/knight-tour/knightTour.js', async () => {
  const kt = await def('uncategorized/knight-tour/knightTour.js');
  const exists = { 1: true, 2: false, 3: false, 4: false, 5: true, 6: true };
  for (let n = 1; n <= 6; n += 1) {
    const t = performance.now(); const moves = kt(n); const ms = performance.now() - t;
    if (!exists[n]) { check(moves.length === 0, `n=${n} expected no tour`); continue; }
    const seen = new Set(moves.map((m) => m.join(',')));
    const legal = moves.every((m, i) => i === 0 || [[1, 2], [2, 1]].some(([x, y]) => Math.abs(m[0] - moves[i - 1][0]) === x && Math.abs(m[1] - moves[i - 1][1]) === y));
    check(moves.length === n * n && seen.size === n * n && legal && moves.every((m) => m.every((c) => c >= 0 && c < n)), `n=${n} tour invalid`);
    note(`n=${n}: ${ms.toFixed(0)} ms`);
  }
});

await suite('n-queens (backtracking + bitwise)', 'uncategorized/n-queens/*.js', async () => {
  const nq = await def('uncategorized/n-queens/nQueens.js'); const nqb = await def('uncategorized/n-queens/nQueensBitwise.js');
  const A000170 = [1, 1, 0, 0, 2, 10, 4, 40, 92, 352, 724, 2680, 14200];
  for (let n = 1; n <= 10; n += 1) {
    const sols = nq(n); check(sols.length === A000170[n], `nQueens(${n}) count ${sols.length}`);
    const keys = new Set(); let valid = true;
    for (const s of sols) { const cols = s.map((q) => q.columnIndex); keys.add(cols.join(',')); for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) if (cols[i] === cols[j] || Math.abs(cols[i] - cols[j]) === j - i || s[i].rowIndex !== i) valid = false; }
    check(valid && keys.size === sols.length, `nQueens(${n}) solutions valid & distinct`);
  }
  for (let n = 1; n <= 12; n += 1) check(nqb(n) === A000170[n], () => `nQueensBitwise(${n}) = ${nqb(n)}, expected ${A000170[n]}`);
});

await suite('rain-terraces (bf + dp)', 'uncategorized/rain-terraces/*.js', async () => {
  const bf = await def('uncategorized/rain-terraces/bfRainTerraces.js'); const dp = await def('uncategorized/rain-terraces/dpRainTerraces.js');
  const ref = (h) => { let w = 0; for (let i = 0; i < h.length; i += 1) { const lm = Math.max(...h.slice(0, i + 1)), rm = Math.max(...h.slice(i)); w += Math.min(lm, rm) - h[i]; } return w; };
  for (let i = 0; i < 10000; i += 1) { const h = Array.from({ length: ri(0, 20) }, () => ri(0, 10)); const exp = ref(h); check(bf(h) === exp, `bf ${J(h)}`); check(dp(h) === exp, `dp ${J(h)}`); }
});

await suite('recursive-staircase (4 impls)', 'uncategorized/recursive-staircase/*.js', async () => {
  const fs = {}; for (const n of ['BF', 'DP', 'IT', 'MEM']) fs[n] = await def(`uncategorized/recursive-staircase/recursiveStaircase${n}.js`);
  for (let n = 1; n <= 75; n += 1) { const exp = Number(fibBig(n + 1)); for (const [k, f] of Object.entries(fs)) { if (k === 'BF' && n > 25) continue; check(f(n) === exp, `${k}(${n})`); } }
});

await suite('square-matrix-rotation', 'uncategorized/square-matrix-rotation/squareMatrixRotation.js', async () => {
  const rot = await def('uncategorized/square-matrix-rotation/squareMatrixRotation.js');
  for (let i = 0; i < 3000; i += 1) { const n = ri(1, 9); const m = Array.from({ length: n }, () => Array.from({ length: n }, () => ri(0, 99)));
    const exp = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => m[n - 1 - c][r])); check(J(rot(m.map((r) => [...r]))) === J(exp), `rot n=${n}`); }
});

await suite('unique-paths (bt, dp, pascal)', 'uncategorized/unique-paths/*.js', async () => {
  const bt = await def('uncategorized/unique-paths/btUniquePaths.js'); const dp = await def('uncategorized/unique-paths/dpUniquePaths.js'); const up = await def('uncategorized/unique-paths/uniquePaths.js');
  for (let w = 1; w <= 40; w += 1) for (let h = 1; h <= 40; h += 1) {
    const exp = binomBig(w + h - 2, h - 1); if (exp >= BigInt(MAXS)) continue;
    check(BigInt(dp(w, h)) === exp, `dp(${w},${h})`);
    const g = up(w, h); check(Number.isInteger(g) && BigInt(g) === exp, () => `uniquePaths(${w}, ${h}) = ${g}, expected ${exp}`);
    if (w + h <= 22) check(BigInt(bt(w, h)) === exp, `bt(${w},${h})`);
  }
});

// =====================================================================
// IMAGE PROCESSING
// =====================================================================
await suite('seam-carving (resizeImageWidth)', 'image-processing/seam-carving/resizeImageWidth.js', async () => {
  const resize = await def('image-processing/seam-carving/resizeImageWidth.js');
  // Reference: same energy definition (README), DP min vertical seam with leftmost tie-breaking, recompute per removal.
  const refResize = (W, H, px, toW) => {
    let rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (__, x) => px[y * W + x]));
    for (let w = W; w > toW; w -= 1) {
      const e = rows.map((row) => row.map((m, x) => { let s = 0; if (x > 0) s += (row[x - 1][0] - m[0]) ** 2 + (row[x - 1][1] - m[1]) ** 2 + (row[x - 1][2] - m[2]) ** 2; if (x < w - 1) s += (row[x + 1][0] - m[0]) ** 2 + (row[x + 1][1] - m[1]) ** 2 + (row[x + 1][2] - m[2]) ** 2; return Math.sqrt(s); }));
      const cost = [e[0].slice()]; const prev = [Array(w).fill(-1)];
      for (let y = 1; y < H; y += 1) { cost.push([]); prev.push([]); for (let x = 0; x < w; x += 1) { let best = Infinity, bx = x; for (let i = x - 1; i <= x + 1; i += 1) if (i >= 0 && i < w && cost[y - 1][i] < best) { best = cost[y - 1][i]; bx = i; } cost[y].push(best + e[y][x]); prev[y].push(bx); } }
      let x = 0; for (let i = 1; i < w; i += 1) if (cost[H - 1][i] < cost[H - 1][x]) x = i;
      for (let y = H - 1; y >= 0; y -= 1) { rows[y].splice(x, 1); x = prev[y][x]; }
    }
    return rows;
  };
  for (let t = 0; t < 400; t += 1) {
    const W = ri(2, 9), H = ri(1, 7), toW = ri(1, W); const palette = rnd() < 0.5 ? 3 : 256;
    const px = Array.from({ length: W * H }, () => [ri(0, palette - 1) * (palette === 3 ? 100 : 1), ri(0, palette - 1) * (palette === 3 ? 100 : 1), ri(0, palette - 1) * (palette === 3 ? 100 : 1), 255]);
    const data = new Uint8ClampedArray(W * H * 4); px.forEach((p, i) => data.set(p, i * 4));
    const img = { width: W, height: H, data };
    const { size } = resize({ img, toWidth: toW });
    const got = Array.from({ length: H }, (_, y) => Array.from({ length: toW }, (__, x) => Array.from(data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4))));
    const exp = refResize(W, H, px, toW);
    check(size.w === toW && size.h === H && J(got) === J(exp), `seam carving ${W}x${H} -> ${toW}`);
  }
});

// =====================================================================
// LINKED LIST
// =====================================================================
await suite('linked-list traversal / reverseTraversal', 'linked-list/*/*.js', async () => {
  const LL = (await import(`${ROOT}/data-structures/linked-list/LinkedList.js`)).default;
  const tr = await def('linked-list/traversal/traversal.js'); const rtr = await def('linked-list/reverse-traversal/reverseTraversal.js');
  for (let i = 0; i < 2000; i += 1) { const arr = Array.from({ length: ri(0, 50) }, () => ri(-9, 9)); const l = new LL(); arr.forEach((v) => l.append(v));
    const a = [], b = []; tr(l, (v) => a.push(v)); rtr(l, (v) => b.push(v)); check(J(a) === J(arr) && J(b) === J([...arr].reverse()), 'traversal'); }
  note('reverseTraversal is recursive: RangeError (stack overflow) on ~1e5-node lists in bun; inherent to the recursive design, not counted');
});

// ---------- summary ----------
const T = suites.reduce((s, x) => s + x.tests, 0), F = suites.reduce((s, x) => s + x.fails, 0);
console.log('\n================ SUMMARY ================');
console.log(`suites: ${suites.length}, failing suites: ${suites.filter((s) => s.fails && !s.known).length} (+${suites.filter((s) => s.fails && s.known).length} known/documented), total checks: ${T}, failed checks: ${F}`);
for (const s of suites.filter((x) => x.fails)) console.log(`  ${s.known ? 'KNWN' : 'FAIL'} ${s.name}: ${s.fails}/${s.tests}`);
await Bun.write(path.join(import.meta.dir, 'results.json'), JSON.stringify(suites, null, 2));
