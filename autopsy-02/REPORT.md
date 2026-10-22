# Algorithm Autopsy #2: trekhleb/javascript-algorithms

- **Target:** [trekhleb/javascript-algorithms](https://github.com/trekhleb/javascript-algorithms), 196k+ stars, commit `85293e3` (master HEAD as of 2026-10-23). Vendor copy unmodified.
- **Runtime:** bun 1.3.11.
- **Date:** 2026-10-23.
- **Method:** same as Autopsy #1. Each algorithm gets an obviously-correct brute-force reference and is checked against it on thousands of seeded random inputs. Data structures are checked with model-based stateful testing, with full invariant checks after every operation. Failing cases are shrunk to minimal repros, and README complexity claims are checked by counting operations.

## Totals

| Area | Harness | Checks | Defects | New |
|---|---|---:|---:|---:|
| Strings, search, sorting, sets | `audits/strings-search-sorting` | 169,441 | 10 | 4 |
| Graphs, tree traversal, disjoint set | `audits/graph` | 77,811 | 9 | 3 |
| Math, crypto, ML, misc | `audits/math-misc` | 1,000,549 | 19 | 5 |
| Data structures | `audits/data-structures` | 1,997,773 ops (76,000 sequences) | 14 | 3 (+1 new root cause) |
| **Total** | | **~3.25M** | **52** | **15** |

**About "already reported":** 37 of the 52 defects were already reported. The oldest is issue #248 (Knapsack, 2018); PR #561 (red-black rotations) has been open since 2020. Most of the rest sit in open PR #2187, an unmerged community "full-codebase audit" from 2026-07-03. The last merged PR on master is from 2026-06-26. The repo has 413 open issues and PRs.

## New findings (no existing issue or PR)

| # | Algorithm | Class | Severity | Minimal repro (actual vs expected) |
|---|---|---|---|---|
| N1 | RedBlackTree.insert: two new root causes (parent link erased in LL/RR rotation; spurious second rebalance) | wrong result | CRITICAL | insert `1,3,2,4,5`: `toString()` = `"3,4,5"`, so 1 and 2 are lost. 3000/3000 random 60-insert trees end broken. PR #561 alone does not fix it. |
| N2 | `GraphVertex.findEdge(v)` / `hasNeighbor` when `v` is the vertex itself | wrong result | HIGH | digraph A->B(-3), A->A(9): Bellman-Ford gives `{A:-3}`, expected `{A:0}`. Adjacency matrix reads the wrong weight for self-loops. |
| N3 | Shortest paths on undirected graphs with both A_B and B_A edges | undocumented restriction | MEDIUM | A-B(7) + B-A(2): Dijkstra, Bellman-Ford and Floyd-Warshall all return 7; expected 2. |
| N4 | Bellman-Ford complexity | complexity | MEDIUM | README claims O(VE) worst case and O(E) best case. Edge lookup is a linear scan and there is no early exit, so a complete digraph with V=160 takes 327M node visits (80×V·E). |
| N5 | `squareRoot` | wrong result | MEDIUM | `squareRoot(6)` = 3 (expected 2), `squareRoot(12)` = 4, `squareRoot(3,1)` = 1.8 (expected 1.7). The repo's own test asserts the wrong 1.8. |
| N6 | `multiplyUnsigned` | infinite loop | MEDIUM | `multiplyUnsigned(1, 0xFFFFFFFF)` never returns, because `>>=` sign-extends. Fix: `>>>=`. |
| N7 | `longestCommonSubsequenceRecursive`: memo key collision | wrong result | MEDIUM | `lcs('::a:a','aa:::')` = `'aa'`; the correct LCS has length 3 (`':::'`). The key `${s1}:${s2}` is ambiguous. |
| N8 | same file: memo never hits for empty results | complexity | MEDIUM | `if (memo[key])` treats `''` as a miss. `'a'×14` vs `'b'×14` takes 22 s; with a fixed memo, n=200 takes 20 ms. |
| N9 | ShellSort | complexity | MEDIUM | Sorted input, n=4000: 12.8M comparisons. README best case is n log n (≈48k). The inner loop never breaks. |
| N10 | AvlTree.insert | complexity | MEDIUM | `height` is recomputed recursively without caching, so an insert costs O(n), not O(log n). Calls per insert: 2,384 at n=500, 15,822 at n=4000. |
| N11 | `euclideanAlgorithmIterative` | complexity / hang | LOW | Subtraction-based, so O(max/min) steps. `(2**53-1, 2)` never finishes. |
| N12 | Trie.deleteWord | wrong result | LOW | add `'😀'`, delete `'😀'`: the word still exists. `addWord` iterates code points, `deleteWord` iterates UTF-16 units. |
| N13 | `uniquePaths` | wrong result | LOW | `uniquePaths(23,36)` = 3489348548829780.5, a non-integer. The true value is < 2^53. Multiplies before dividing. |
| N14 | `leastCommonMultiple` | wrong result | LOW | `lcm(549533988, 76324165)` = 2747669939.9999995. Fix: `a / gcd * b`. |
| N15 | PolynomialHash.roll (Rabin-Karp) | complexity | LOW | Recomputes `base^(m-1)` on every roll, so search is O(n·m); README claims O(n+m). PR #2187 only edits a comment here. |

## Already reported, still unfixed on master (reproduced)

**Strings, search, sorting, sets**
- InterpolationSearch hangs when the target is above the range (#2219).
- 0/1 Knapsack traceback is wrong on 1,976/3,000 instances, including over-weight answers and a TypeError (#248, open since 2018).
- Unbounded knapsack exceeds the weight limit.
- BucketSort does not sort floats or negatives.
- RadixSort mis-sorts strings of different lengths and negatives, and throws on non a-z characters.
- zAlgorithm breaks on inputs containing `$`.

**Graphs**
- Eulerian path crashes with a TypeError.
- Brute-force TSP accepts dead-end paths and ignores the return edge: it returns 103 when the optimum is 22.
- Articulation points, bridges and undirected cycle detection ignore every component except the first.
- Graph DFS/BFS visit the start vertex twice.
- Kruskal and Prim mutate the input graph.
- SCC leaves the input graph reversed.

**Math, crypto, ML**
- Inverse FFT returns NaN.
- `euclideanDistance` rounds to 2 decimals, which breaks kNN.
- k-means returns cluster id -1.
- `bitsToFloat` decodes zero as 2^-15.
- `classicPolynome` mutates its input.
- Hill cipher handles lowercase wrongly.
- `bitLength(2**30)` hangs.
- `isPowerOfTwo(0)` returns true.
- `fibonacci(0)` hangs.
- `squareRoot(65549, 11)` hangs.
- Rail fence with 1 rail crashes.

**Data structures**
- AVL insert loses nodes (#325).
- AVL remove leaves the tree unbalanced (#485).
- BST remove fails silently (#1102, #484, #369).
- BST leaves an undefined root after its last removal (#310).
- `Heap.remove` treats a 0 parent as "no parent".
- `PriorityQueue.remove` removes all items with equal priority.
- Red-black tree recolors a node on duplicate insert.
- Adhoc heap constructor throws.
- `LinkedList.insert` at the end loses the tail (#1016).
- LRUCache / HashTable break on `__proto__` / `toString` keys.

## Passed

**Strings, search, sorting, sets**
- Hamming, KMP, Levenshtein, longest common substring, palindrome, regex matching.
- Binary, jump and linear search.
- Bubble, Insertion, Selection, Heap, Merge, Quick (both), Counting sort.
- Cartesian product, combinations, combination sum, Fisher-Yates (chi²), LCS (DP), SCS, LIS, maximum subarray (3 versions), permutations, power set (3 versions), valid parentheses.

**Graphs**
- Dijkstra on simple graphs, Bellman-Ford without self-loops, Floyd-Warshall (distances and paths).
- Kruskal, Prim (connected graphs).
- Topological sort, SCC partition, Hamiltonian cycle.
- Directed and union-find cycle detection.
- Tree BFS/DFS, DisjointSet.

**Math, crypto, ML, misc**
- Primality, sieve, prime factors, recursive gcd, fast powering, factorial, Fibonacci (Binet), integer partition.
- 13 bit utilities, complex numbers, DFT, Horner, Liu Hui, matrix, radians.
- Caesar cipher.
- Weighted random, n-queens (vs OEIS A000170), knight tour, Hanoi, jump game, rain terraces, staircase, matrix rotation, stock profit (4 versions), seam carving.

**Data structures**
- Segment tree, Fenwick tree, Bloom filter, DoublyLinkedList, Deque, Queue, Stack, LRUCacheOnMap.

## Rerun

```bash
cd autopsy-02
git clone --depth 1 https://github.com/trekhleb/javascript-algorithms.git vendor
(cd vendor && git checkout 85293e3)
bun audits/strings-search-sorting/run_audit.mjs   # + repro.mjs
bun audits/graph/run_audit.mjs                     # + repros/*.mjs
bun audits/math-misc/run_audit.mjs                 # + repros.mjs
bun audits/data-structures/run_audit.mjs           # + repros.mjs, rb_rootcause.mjs, patched_check.mjs
```
