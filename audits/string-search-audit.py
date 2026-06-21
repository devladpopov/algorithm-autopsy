"""
String Search Algorithm Audit: Aho-Corasick, Rabin-Karp, KMP
Tests implementations against brute-force reference.
"""

import random
import time
import sys
from typing import Callable, List, Dict, Set, Optional, Tuple


# ============================================================
# REFERENCE IMPLEMENTATIONS (brute-force, provably correct)
# ============================================================

def reference_single_search(text: str, pattern: str) -> List[int]:
    """Naive O(nm) single-pattern search."""
    if not pattern or not text:
        return []
    results = []
    for i in range(len(text) - len(pattern) + 1):
        if text[i:i + len(pattern)] == pattern:
            results.append(i)
    return results


def reference_multi_search(text: str, patterns: List[str]) -> Dict[str, List[int]]:
    """Naive multi-pattern search (for Aho-Corasick comparison)."""
    results = {}
    for pat in patterns:
        matches = reference_single_search(text, pat)
        if matches:
            results[pat] = matches
    return results


# ============================================================
# TEST INFRASTRUCTURE
# ============================================================

class AuditResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = 0
        self.failed = 0
        self.errors = []
        self.timing_ms = 0.0

    def record_pass(self):
        self.passed += 1

    def record_fail(self, test_name: str, detail: str, context: str = ""):
        self.failed += 1
        self.errors.append({"test": test_name, "detail": detail, "context": context})

    def summary(self) -> str:
        status = "PASS" if self.failed == 0 else "FAIL"
        lines = [
            f"\n{'='*60}",
            f"  {self.name}",
            f"  Status: {status}  Pass: {self.passed}  Fail: {self.failed}  Time: {self.timing_ms:.0f}ms",
            f"{'='*60}",
        ]
        for e in self.errors[:10]:
            lines.append(f"  [{e['test']}] {e['detail']}")
            if e['context']:
                lines.append(f"    {e['context']}")
        if len(self.errors) > 10:
            lines.append(f"  ... and {len(self.errors) - 10} more")
        return "\n".join(lines)


def gen_text(length: int, alphabet: str = "abcde") -> str:
    return "".join(random.choice(alphabet) for _ in range(length))


# ============================================================
# KMP AUDIT
# ============================================================

KMP_STATIC_TESTS = [
    ("", "", [], "both empty"),
    ("abc", "", [], "empty pattern"),
    ("", "abc", [], "empty text"),
    ("abc", "abc", [0], "exact match"),
    ("abcabc", "abc", [0, 3], "two matches"),
    ("aaa", "aa", [0, 1], "overlapping"),
    ("aaaa", "aa", [0, 1, 2], "triple overlap"),
    ("ababab", "abab", [0, 2], "overlapping abab"),
    ("aaaaaaaaaa", "aaaa", [0, 1, 2, 3, 4, 5, 6], "periodic"),
    ("ABCDEFG", "XYZ", [], "no match"),
    ("a", "a", [0], "single char match"),
    ("b", "a", [], "single char no match"),
    ("xxxxxxxxxab", "ab", [9], "match at end"),
    ("abxxxxxxxxx", "ab", [0], "match at start"),
    ("AABAACAADAABAABA", "AABA", [0, 9, 12], "classic KMP test"),
    ("abcxabcxabcxabc", "abcxabc", [0, 4, 8], "overlapping long"),
    ("01010101", "0101", [0, 2, 4], "binary overlapping"),
]


def audit_kmp(name: str, search_fn: Callable[[str, str], List[int]],
              n_random: int = 2000) -> AuditResult:
    result = AuditResult(f"KMP: {name}")
    start = time.perf_counter()

    for text, pattern, expected, desc in KMP_STATIC_TESTS:
        try:
            actual = search_fn(text, pattern)
            if isinstance(actual, int):
                actual = [actual] if actual >= 0 else []
            actual = sorted(actual)
            if actual != expected:
                result.record_fail(f"static:{desc}", f"expected {expected}, got {actual}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail(f"static:{desc}", f"EXCEPTION: {e}")

    random.seed(42)
    configs = [
        (50, 5, "abc"), (200, 10, "abcde"), (100, 8, "ab"), (100, 50, "abc"),
    ]
    per_config = n_random // len(configs)

    for text_len, pat_max, alpha in configs:
        for _ in range(per_config):
            text = gen_text(text_len, alpha)
            if random.random() < 0.5 and len(text) >= 2:
                s = random.randint(0, len(text) - 1)
                pat = text[s:min(s + random.randint(1, pat_max), len(text))]
            else:
                pat = gen_text(random.randint(1, pat_max), alpha)

            expected = reference_single_search(text, pat)
            try:
                actual = search_fn(text, pat)
                if isinstance(actual, int):
                    actual = [actual] if actual >= 0 else []
                actual = sorted(actual)
                if actual != expected:
                    result.record_fail("random", f"expected {len(expected)} matches, got {len(actual)}",
                                       f"text={text[:40]}... pat={pat}")
                else:
                    result.record_pass()
            except Exception as e:
                result.record_fail("random", f"EXCEPTION: {e}", f"pat={pat}")

    result.timing_ms = (time.perf_counter() - start) * 1000
    return result


# ============================================================
# RABIN-KARP AUDIT (same interface as KMP)
# ============================================================

audit_rabin_karp = audit_kmp  # Same test suite, same interface


# ============================================================
# AHO-CORASICK AUDIT (multi-pattern)
# ============================================================

AC_STATIC_TESTS = [
    ("ahishers", ["he", "she", "his", "hers"],
     {"he": [4], "she": [3], "his": [1], "hers": [4]},
     "classic AC textbook"),
    ("abcabc", ["abc"],
     {"abc": [0, 3]},
     "single pattern"),
    ("aaaa", ["a", "aa"],
     {"a": [0, 1, 2, 3], "aa": [0, 1, 2]},
     "overlapping patterns"),
    ("xyz", ["abc", "def"],
     {},
     "no matches"),
    ("abcdef", ["ab", "cd", "ef"],
     {"ab": [0], "cd": [2], "ef": [4]},
     "adjacent patterns"),
    ("aabaabaa", ["aab", "ba", "aa"],
     {"aab": [0, 3], "ba": [2, 5], "aa": [0, 3, 6]},
     "overlapping multi"),
]


def audit_aho_corasick(name: str,
                       search_fn: Callable[[str, List[str]], Dict[str, List[int]]],
                       n_random: int = 1000) -> AuditResult:
    result = AuditResult(f"Aho-Corasick: {name}")
    start = time.perf_counter()

    for text, patterns, expected, desc in AC_STATIC_TESTS:
        try:
            actual = search_fn(text, patterns)
            # Normalize: sort positions, remove empty
            norm_expected = {k: sorted(v) for k, v in expected.items() if v}
            norm_actual = {k: sorted(v) for k, v in actual.items() if v}
            if norm_actual != norm_expected:
                result.record_fail(f"static:{desc}",
                                   f"expected {norm_expected}, got {norm_actual}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail(f"static:{desc}", f"EXCEPTION: {e}")

    random.seed(42)
    for _ in range(n_random):
        text = gen_text(random.randint(20, 100), "abcde")
        n_pats = random.randint(1, 5)
        patterns = []
        for _ in range(n_pats):
            if random.random() < 0.5 and len(text) >= 3:
                s = random.randint(0, len(text) - 2)
                patterns.append(text[s:s + random.randint(1, 5)])
            else:
                patterns.append(gen_text(random.randint(1, 4), "abcde"))
        patterns = list(set(p for p in patterns if p))
        if not patterns:
            continue

        expected = reference_multi_search(text, patterns)
        try:
            actual = search_fn(text, patterns)
            norm_expected = {k: sorted(v) for k, v in expected.items() if v}
            norm_actual = {k: sorted(v) for k, v in actual.items() if v}
            if norm_actual != norm_expected:
                result.record_fail("random",
                                   f"mismatch for {len(patterns)} patterns",
                                   f"text={text[:30]}... patterns={patterns}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}")

    result.timing_ms = (time.perf_counter() - start) * 1000
    return result


# ============================================================
# GRAPH ALGORITHM AUDITS
# ============================================================

# Dijkstra / Bellman-Ford / Floyd-Warshall share similar testing

import heapq

def reference_dijkstra(graph: Dict[int, List[Tuple[int, float]]], source: int) -> Dict[int, float]:
    """Reference Dijkstra. graph[u] = [(v, weight), ...]"""
    dist = {source: 0.0}
    pq = [(0.0, source)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float('inf')):
            continue
        for v, w in graph.get(u, []):
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist


def reference_floyd_warshall(n: int, edges: List[Tuple[int, int, float]]) -> List[List[float]]:
    """Reference Floyd-Warshall. Returns n x n distance matrix."""
    INF = float('inf')
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist


def gen_random_graph(n: int, density: float = 0.3,
                     max_weight: int = 20, directed: bool = True,
                     allow_negative: bool = False) -> List[Tuple[int, int, int]]:
    """Generate random graph as edge list."""
    edges = []
    for u in range(n):
        for v in range(n):
            if u != v and random.random() < density:
                if allow_negative:
                    w = random.randint(-max_weight // 4, max_weight)
                else:
                    w = random.randint(1, max_weight)
                edges.append((u, v, w))
    return edges


def edges_to_adj(edges, n):
    graph = {i: [] for i in range(n)}
    for u, v, w in edges:
        graph[u].append((v, w))
    return graph


DIJKSTRA_STATIC = [
    # (n, edges, source, expected_dist)
    (3, [(0,1,1), (1,2,2), (0,2,4)], 0, {0: 0, 1: 1, 2: 3}),
    (4, [(0,1,1), (0,2,4), (1,2,2), (2,3,1)], 0, {0: 0, 1: 1, 2: 3, 3: 4}),
    (2, [], 0, {0: 0}),  # disconnected
    (1, [], 0, {0: 0}),  # single node
    (3, [(0,1,5), (0,2,2), (2,1,1)], 0, {0: 0, 1: 3, 2: 2}),  # indirect shorter
]


def audit_dijkstra(name: str,
                   search_fn: Callable,
                   n_random: int = 500) -> AuditResult:
    """search_fn(graph, source) -> dict of {node: distance}
    or search_fn(graph, source, target) -> distance"""
    result = AuditResult(f"Dijkstra: {name}")
    start = time.perf_counter()

    for n, edges, source, expected in DIJKSTRA_STATIC:
        graph = edges_to_adj(edges, n)
        try:
            actual = search_fn(graph, source)
            if isinstance(actual, dict):
                for node, exp_dist in expected.items():
                    act_dist = actual.get(node, float('inf'))
                    if abs(act_dist - exp_dist) > 1e-9:
                        result.record_fail("static",
                                           f"node {node}: expected {exp_dist}, got {act_dist}")
                        break
                else:
                    result.record_pass()
            else:
                result.record_fail("static", f"unexpected return type: {type(actual)}")
        except Exception as e:
            result.record_fail("static", f"EXCEPTION: {e}")

    random.seed(42)
    for _ in range(n_random):
        n = random.randint(3, 15)
        edges = gen_random_graph(n, density=0.3)
        graph = edges_to_adj(edges, n)
        source = 0
        expected = reference_dijkstra(graph, source)
        try:
            actual = search_fn(graph, source)
            if isinstance(actual, dict):
                ok = True
                for node in range(n):
                    exp = expected.get(node, float('inf'))
                    act = actual.get(node, float('inf'))
                    if abs(exp - act) > 1e-9:
                        result.record_fail("random",
                                           f"node {node}: expected {exp}, got {act}",
                                           f"n={n} edges={len(edges)}")
                        ok = False
                        break
                if ok:
                    result.record_pass()
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}")

    result.timing_ms = (time.perf_counter() - start) * 1000
    return result


FW_STATIC = [
    (3, [(0,1,1), (1,2,2), (0,2,4)]),
    (4, [(0,1,1), (0,2,4), (1,2,2), (2,3,1), (3,0,7)]),
    (3, [(0,1,3), (1,2,1), (0,2,6), (2,0,2)]),
]


def audit_floyd_warshall(name: str,
                         fw_fn: Callable,
                         n_random: int = 300) -> AuditResult:
    """fw_fn(n, edges) -> n x n distance matrix (list of lists)"""
    result = AuditResult(f"Floyd-Warshall: {name}")
    start = time.perf_counter()

    for n, edges in FW_STATIC:
        expected = reference_floyd_warshall(n, edges)
        try:
            actual = fw_fn(n, edges)
            ok = True
            for i in range(n):
                for j in range(n):
                    e = expected[i][j]
                    a = actual[i][j] if actual[i][j] != float('inf') else float('inf')
                    if abs(e - a) > 1e-9 and not (e == float('inf') and a == float('inf')):
                        result.record_fail("static",
                                           f"dist[{i}][{j}]: expected {e}, got {a}")
                        ok = False
                        break
                if not ok:
                    break
            if ok:
                result.record_pass()
        except Exception as e:
            result.record_fail("static", f"EXCEPTION: {e}")

    random.seed(42)
    for _ in range(n_random):
        n = random.randint(3, 10)
        edges = gen_random_graph(n, density=0.3)
        expected = reference_floyd_warshall(n, edges)
        try:
            actual = fw_fn(n, edges)
            ok = True
            for i in range(n):
                for j in range(n):
                    e = expected[i][j]
                    a = actual[i][j]
                    if e == float('inf') and a == float('inf'):
                        continue
                    if e == float('inf') or a == float('inf'):
                        result.record_fail("random", f"dist[{i}][{j}]: exp={e} got={a}")
                        ok = False
                        break
                    if abs(e - a) > 1e-9:
                        result.record_fail("random", f"dist[{i}][{j}]: exp={e} got={a}")
                        ok = False
                        break
                if not ok:
                    break
            if ok:
                result.record_pass()
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}")

    result.timing_ms = (time.perf_counter() - start) * 1000
    return result


# ============================================================
# SELF-TEST
# ============================================================

if __name__ == "__main__":
    print("String & Graph Algorithm Audit Framework")
    print("=" * 60)

    # Self-test string search
    print("\nSelf-test: KMP reference...")
    r = audit_kmp("reference", reference_single_search, n_random=500)
    print(r.summary())

    # Self-test AC
    print("\nSelf-test: Aho-Corasick reference...")
    r = audit_aho_corasick("reference", reference_multi_search, n_random=200)
    print(r.summary())

    # Self-test Dijkstra
    print("\nSelf-test: Dijkstra reference...")
    r = audit_dijkstra("reference", lambda g, s: reference_dijkstra(g, s), n_random=200)
    print(r.summary())

    # Self-test Floyd-Warshall
    print("\nSelf-test: Floyd-Warshall reference...")
    r = audit_floyd_warshall("reference", reference_floyd_warshall, n_random=100)
    print(r.summary())

    print("\nAll self-tests complete.")
