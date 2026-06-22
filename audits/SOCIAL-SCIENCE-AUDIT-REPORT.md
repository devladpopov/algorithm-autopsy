# Algorithm Audit: Social Science & Game Theory

**Repository:** TheAlgorithms/Python (190K+ stars)
**Date:** 2026-06-22
**Tests:** 1,817 total, 15 failures across 4 algorithms

## Summary

| Algorithm | Field | Tests | Status | Bugs Found |
|-----------|-------|-------|--------|------------|
| Gale-Shapley | Game Theory | 904 | PASS | Performance only |
| PageRank | Information Retrieval | 204 | **FAIL** | 3 bugs |
| Minimax | Game Theory | 215 | **FAIL** | 1 critical crash |
| Spearman Correlation | Statistics | 509 | **FAIL** | 2 bugs |

## Detailed Findings

### 1. PageRank (page_rank.py) -- 3 BUGS

**Bug 1: Normalization error (ranks initialized to 1 instead of 1/n)**

PageRank values should form a probability distribution summing to 1.0. The implementation initializes all ranks to 1, so for a 3-node graph the initial sum is 3.0 instead of 1.0. The algorithm converges to values proportional to correct PageRank, but with wrong magnitudes.

Consequence: anyone using these values as probabilities gets garbage. The relative ordering is usually preserved, so for "who's most important?" it works, but for any quantitative use the output is wrong.

Fix: change `ranks[node.name] = 1` to `ranks[node.name] = 1 / len(nodes)`

**Bug 2: No dangling node handling**

Nodes with no outlinks (dangling nodes) leak rank out of the system. Proper PageRank redistributes their rank evenly across all nodes. The implementation ignores this entirely.

Test case: `A -> B -> C` (C is dangling). TA gives C rank 0.386, correct value is 0.474 (23% error).

**Bug 3: No convergence check**

The default is 3 iterations with no convergence check. For most graphs this is woefully insufficient. The algorithm also prints intermediate results to stdout.

### 2. Minimax (minimax.py) -- CRASH BUG

**Bug: RecursionError on non-power-of-2 input**

The algorithm computes tree height as `math.log(len(scores), 2)`, which returns a float. The base case checks `depth == height`, comparing an integer to a float. For non-power-of-2 sizes (3, 5, 6, 7, 9, 10, 12...), the height is a non-integer float and the base case is NEVER reached, causing infinite recursion until Python's stack overflows.

```
math.log(3, 2) = 1.585  -> depth (int) never equals 1.585
math.log(6, 2) = 2.585  -> depth (int) never equals 2.585
```

The algorithm only works for score lists of size 2, 4, 8, 16, 32... This is not documented and there is no input validation.

Fix: either validate that len(scores) is a power of 2, or replace with `math.log2()` and `int()` rounding, or rewrite to split arrays rather than use index arithmetic.

Note: `math.log(8, 2)` happens to return exactly 3.0 in CPython, so the doctests pass. This is an implementation detail of CPython's float math, not a guarantee.

### 3. Spearman Rank Correlation (spearman_rank_correlation_coefficient.py) -- 2 BUGS

**Bug 1: Tied values handled incorrectly**

The `assign_ranks()` function gives tied values sequential ranks instead of averaged ranks. With ties, the Spearman formula requires fractional (averaged) ranks.

Example: `x = [1, 2, 2, 4]` -- values 2 and 2 should both get rank 2.5, but get ranks 2 and 3 instead.

| Input | TA result | Correct | Error |
|-------|-----------|---------|-------|
| x=[1,2,2,4], y=[1,2,3,4] | 1.000 | 0.950 | 5.3% |
| x=[1,1,1,1], y=[1,2,3,4] | 1.000 | 0.500 | 100% |
| x=[10,20,20,30,30,30], y=[1..6] | 1.000 | 0.929 | 7.7% |

The all-same-values case is extreme: it reports perfect correlation (1.0) when the true value is 0.5.

**Bug 2: ZeroDivisionError on n=1**

`n * (n**2 - 1)` equals 0 when n=1, causing division by zero. No input validation.

### 4. Gale-Shapley Stable Matching (gale_shapley_bigraph.py) -- CORRECT

All 904 tests pass. Every matching produced is verified stable (no blocking pairs).

**Performance issue:** Uses `list.index()` for preference lookup, making the algorithm O(n^3) instead of the theoretical O(n^2). A precomputed rank matrix would fix this.

## Conclusion

3 out of 4 social science / game theory algorithms in TheAlgorithms/Python have correctness bugs:

- **PageRank** gives wrong magnitudes and mishandles dangling nodes
- **Minimax** crashes on most input sizes (non-power-of-2)
- **Spearman** gives wrong correlation when data has ties (common in practice)

Combined with the Boyer-Moore finding from the earlier audit, we now have **4 buggy implementations** in a repository used as an educational reference by millions of developers.
