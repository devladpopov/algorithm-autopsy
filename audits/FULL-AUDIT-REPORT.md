# Algorithm Audit Report: TheAlgorithms/Python

**Repository:** https://github.com/TheAlgorithms/Python (190K+ stars)
**Date:** 2026-06-21
**Tests run:** 6,540 total across 7 algorithms
**Overall result:** All implementations produce correct results

## Summary

| Algorithm | Tests | Status | Notes |
|-----------|-------|--------|-------|
| KMP | 2,011 | PASS | First-match only (not all occurrences) |
| Rabin-Karp | 2,007 | PASS | Returns bool only (not positions) |
| Aho-Corasick | 1,006 | PASS | Correct multi-pattern matching |
| Dijkstra | 505 | PASS | Single target only, returns -1 for unreachable |
| Bellman-Ford | 505 | PASS | Correct including negative cycle detection |
| Floyd-Warshall | 303 | PASS | Prints to stdout as side effect |
| A* | 203 | PASS | Grid-based only, suboptimal priority queue |

## Methodology

Each implementation was tested against a brute-force reference:
- Static edge-case tests (empty inputs, overlapping matches, boundary cases)
- Property-based random tests (random graphs/strings, verified against reference)
- 4 properties checked: completeness, soundness, ordering, count

## Detailed Findings

### 1. KMP (knuth_morris_pratt.py)

**Correctness:** PASS (2,011 tests)

**Design limitation:** Only returns first occurrence position (or -1). A complete KMP should find all occurrences. This is a feature limitation, not a bug.

**Empty pattern handling:** Returns -1 (reasonable, but Python's `str.find("")` returns 0).

### 2. Rabin-Karp (rabin_karp.py)

**Correctness:** PASS (2,007 tests)

**Design limitation:** Returns `bool` (found/not found) instead of position(s). Severely limits utility as a search algorithm. The educational value of showing rolling hash is preserved, but the API is not practical.

**Edge case:** Empty pattern returns `True` (questionable — the loop runs once and matches empty slice).

### 3. Aho-Corasick (aho_corasick.py)

**Correctness:** PASS (1,006 tests)

No bugs found. The implementation correctly handles overlapping patterns, failure transitions, and output merging. This is the strongest implementation in the repository.

### 4. Dijkstra (dijkstra.py)

**Correctness:** PASS (505 tests)

**Design issues:**
- Uses string keys for vertices (not general integer-indexed)
- Returns single path cost to target, not all-pairs shortest distances
- Returns `-1` for unreachable vertices instead of `float('inf')` — consumers who check `dist < threshold` will get wrong results

**Performance note:** Uses `heapq` correctly. No performance bugs found.

### 5. Bellman-Ford (bellman_ford.py)

**Correctness:** PASS (505 tests)

Correctly handles negative weights and detects negative cycles. Edge format (`list[dict]` with "src", "dst", "weight" keys) is unusual but functional.

### 6. Floyd-Warshall (graphs_floyd_warshall.py)

**Correctness:** PASS (303 tests)

**Design issues:**
- `_print_dist()` called inside `floyd_warshall()` — prints to stdout as a side effect in library code
- Returns `(dist, v)` tuple instead of just `dist` — unusual API, `v` is already an input parameter
- File is at `graphs/graphs_floyd_warshall.py` (redundant "graphs_" prefix)

### 7. A* (a_star.py)

**Correctness:** PASS (203 tests)

**Performance bug:** Uses `cell.sort(); cell.reverse(); cell.pop()` instead of `heapq`. This is O(n log n) per step instead of O(log n). For large grids this is significantly slower.

**Design limitation:** Grid-based only (4-directional movement with obstacles). Not a general graph A* implementation.

## Previously Found Bugs (Boyer-Moore)

The audit began with Boyer-Moore string search, where critical bugs were found:

1. **Dead code shift** in `strings/boyer_moore_search.py`: Bad character shift assigned to `for`-loop variable, making it brute-force O(nm) instead of Boyer-Moore O(n/m). Issue filed: TheAlgorithms/Python#14844
2. **Infinite loop** when `pattern == text` in full BM implementations
3. **Original 1977 paper** lacked correct good suffix algorithm (Rytter correction, 1980)

## Conclusion

Of the 8 algorithms audited from TheAlgorithms/Python:
- **1 has a critical bug** (Boyer-Moore: dead code renders core optimization non-functional)
- **7 produce correct results** but several have design/API issues
- **1 has a performance issue** (A*: O(n log n) priority queue instead of O(log n))

The Boyer-Moore finding remains the most significant: a repository used as an educational reference by millions has an implementation where the defining optimization is dead code.
