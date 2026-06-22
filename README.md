# Algorithm Autopsy

**Systematic audit of classic algorithm implementations for correctness bugs.**

Most foundational algorithms (30+ years old) are copied between textbooks, lectures, and GitHub repos without verification. We test them with property-based fuzzing against a brute-force reference and document what we find.

## Findings

### Bug Summary

**5 buggy implementations** found in TheAlgorithms/Python (190k+ stars) out of 12 audited. 8,357 total tests.

| Algorithm | Category | Bug | Severity |
|-----------|----------|-----|----------|
| Boyer-Moore | String search | Dead shift code (for-loop variable reassignment) | HIGH |
| PageRank | Information Retrieval | Ranks init to 1 not 1/n, no dangling nodes, no convergence | HIGH |
| Minimax | Game Theory | `RecursionError` on non-power-of-2 inputs | CRITICAL |
| Spearman | Statistics | Wrong result for tied data, `ZeroDivisionError` on n=1 | HIGH |
| A* | Graph | O(n log n) priority queue instead of O(log n) | MEDIUM |

### Boyer-Moore String Search (1977)

| # | Bug | Severity | Where |
|---|-----|----------|-------|
| 1 | **Dead shift code** in TheAlgorithms/Python (190k+ stars). The bad character shift is assigned to a `for`-loop variable, which has no effect in Python. Algorithm runs as brute-force O(nm) instead of O(n/m). | HIGH | [Details](audits/boyer-moore/results/AUDIT-REPORT.md) |
| 2 | **Infinite loop** when `pattern == text` in full BM implementations using pointer-based scanning with good suffix table. `gs_table[0]` shifts back exactly as far as `i` was decremented, returning to the same position forever. | CRITICAL | [Details](audits/boyer-moore/results/AUDIT-REPORT.md) |
| 3 | **Missing good suffix rule** in Princeton algs4 `BoyerMoore.java` (Sedgewick). Only bad character rule implemented. Not full Boyer-Moore, does not achieve O(m+n) worst-case. | MEDIUM | Widely taught in universities |
| 4 | **Delta2 table bugs** in Microsoft STL `std::boyer_moore_searcher`. Fixed in 2019 after applying Rytter correction (1980). The original 1977 paper did not contain a correct algorithm for computing the good suffix table. | CRITICAL (fixed) | [MS STL #713](https://github.com/microsoft/STL/issues/713) |

### PageRank (1998)

Ranks initialized to 1 instead of 1/n (sum = 3.0 for 3 nodes, not 1.0). No dangling node handling (23% error). Default 3 iterations with no convergence check. [Details](audits/SOCIAL-SCIENCE-AUDIT-REPORT.md)

### Minimax (1928)

`math.log(len(scores), 2)` returns float; `depth == height` compares int to float. For non-power-of-2 inputs (3, 5, 6, 7, 9...) the base case is never reached: infinite recursion, `RecursionError`. Doctests pass only because they use size 8. [Details](audits/SOCIAL-SCIENCE-AUDIT-REPORT.md)

### Spearman Rank Correlation (1904)

Tied values get sequential ranks instead of averaged ranks. For `x=[1,1,1,1], y=[1,2,3,4]` reports correlation 1.0 (correct: 0.5). Also `ZeroDivisionError` on n=1. [Details](audits/SOCIAL-SCIENCE-AUDIT-REPORT.md)

### Algorithms that passed (7/12)

KMP, Rabin-Karp, Aho-Corasick, Dijkstra, Bellman-Ford, Floyd-Warshall, Gale-Shapley stable matching. All correct across thousands of random tests. [Details](audits/FULL-AUDIT-REPORT.md)

## How it works

The test harness (`audits/boyer-moore/tests/test_harness.py`) runs each implementation through:

1. **35 static edge cases**: empty inputs, overlapping matches, periodic strings, patterns equal to text, etc.
2. **Property-based random tests** (configurable, default 5000+):
   - **Completeness**: every match found by brute-force reference is found by the implementation
   - **Soundness**: every position returned is actually a valid match
   - **Order**: results are in ascending order
   - **Count**: number of matches equals reference count
3. **Multiple test distributions**: small/large alphabets, binary strings, long patterns, short text

## Run it yourself

```bash
python audits/boyer-moore/tests/test_harness.py          # self-test
python audits/boyer-moore/run_audit.py                     # audit all implementations
```

To audit your own implementation:

```python
from audits.boyer_moore.tests.test_harness import audit_implementation

def my_search(text: str, pattern: str) -> list[int]:
    # your implementation here
    ...

result = audit_implementation("my_search", my_search, n_random_tests=5000)
print(result.summary())
```

## Background

Inspired by:
- [Flouri et al. (2015)](https://www.biorxiv.org/content/10.1101/031500v1) — "Are all global alignment algorithms and implementations correct?" Found errors in Gotoh (1982), 50% of implementations incorrect.
- [Ash Vardanian](https://github.com/ashvardanian) (Unum Cloud) — systematic audit of bioinformatics algorithms.
- [Rytter (1980)](https://doi.org/10.1016/0020-0190(80)90108-6) — first correct algorithm for Boyer-Moore's good suffix table (3 years after the original paper).

## Contributing

Found a bug in a classic algorithm? Open an issue with:
1. Algorithm name and original paper
2. Minimal reproducing example
3. Which implementations are affected

## License

MIT
