"""
Comprehensive Algorithm Audit: TheAlgorithms/Python
Tests real implementations against brute-force references.
"""

import sys
import os
import random
import time
import heapq
from typing import List, Dict, Tuple, Callable

# Add audit dir to path
sys.path.insert(0, os.path.dirname(__file__))

# ============================================================
# REFERENCE IMPLEMENTATIONS
# ============================================================

def reference_single_search(text: str, pattern: str) -> List[int]:
    if not pattern or not text:
        return []
    results = []
    for i in range(len(text) - len(pattern) + 1):
        if text[i:i + len(pattern)] == pattern:
            results.append(i)
    return results

def reference_multi_search(text: str, patterns: List[str]) -> Dict[str, List[int]]:
    results = {}
    for pat in patterns:
        matches = reference_single_search(text, pat)
        if matches:
            results[pat] = matches
    return results

def reference_dijkstra(graph, source):
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

def reference_floyd_warshall(n, edges):
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

def reference_bellman_ford(n, edges, source):
    INF = float('inf')
    dist = [INF] * n
    dist[source] = 0.0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    # Check negative cycle
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            return None  # negative cycle
    return dist

# ============================================================
# TEST INFRASTRUCTURE
# ============================================================

class AuditResult:
    def __init__(self, name):
        self.name = name
        self.passed = 0
        self.failed = 0
        self.errors = []
        self.notes = []

    def record_pass(self):
        self.passed += 1

    def record_fail(self, test_name, detail, context=""):
        self.failed += 1
        self.errors.append({"test": test_name, "detail": detail, "context": context})

    def add_note(self, note):
        self.notes.append(note)

    def summary(self):
        status = "PASS" if self.failed == 0 else "FAIL"
        lines = [
            f"\n{'='*60}",
            f"  {self.name}",
            f"  Status: {status}  Pass: {self.passed}  Fail: {self.failed}",
            f"{'='*60}",
        ]
        for n in self.notes:
            lines.append(f"  NOTE: {n}")
        for e in self.errors[:10]:
            lines.append(f"  [{e['test']}] {e['detail']}")
            if e['context']:
                lines.append(f"    {e['context']}")
        if len(self.errors) > 10:
            lines.append(f"  ... and {len(self.errors) - 10} more")
        return "\n".join(lines)

def gen_text(length, alphabet="abcde"):
    return "".join(random.choice(alphabet) for _ in range(length))

def gen_random_graph(n, density=0.3, max_weight=20, allow_negative=False):
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


# ============================================================
# 1. KMP AUDIT (TheAlgorithms/Python)
# ============================================================

# Inline the real implementation
def _ta_get_failure_array(pattern):
    failure = [0]
    i = 0
    j = 1
    while j < len(pattern):
        if pattern[i] == pattern[j]:
            i += 1
        elif i > 0:
            i = failure[i - 1]
            continue
        j += 1
        failure.append(i)
    return failure

def _ta_knuth_morris_pratt(text, pattern):
    """TheAlgorithms/Python KMP - returns first match index or -1"""
    if not pattern:
        return -1
    failure = _ta_get_failure_array(pattern)
    i, j = 0, 0
    while i < len(text):
        if pattern[j] == text[i]:
            if j == (len(pattern) - 1):
                return i - j
            j += 1
        elif j > 0:
            j = failure[j - 1]
            continue
        i += 1
    return -1

def audit_kmp():
    result = AuditResult("KMP: TheAlgorithms/Python")
    result.add_note("Implementation only finds FIRST occurrence (returns int, not list)")

    # Test first-match correctness
    tests = [
        ("abc", "abc", 0, "exact match"),
        ("abcabc", "abc", 0, "first of two"),
        ("xyzabc", "abc", 3, "match in middle"),
        ("xyz", "abc", -1, "no match"),
        ("aaa", "aa", 0, "overlapping first"),
        ("AABAACAADAABAABA", "AABA", 0, "classic KMP"),
        ("abcxabcxabc", "abcxabc", 0, "long pattern first"),
        ("xxxxxxxxxab", "ab", 9, "match at end"),
        ("abxxxxxxxxx", "ab", 0, "match at start"),
        ("a", "a", 0, "single char"),
        ("b", "a", -1, "single char no match"),
    ]

    for text, pat, expected, desc in tests:
        try:
            actual = _ta_knuth_morris_pratt(text, pat)
            if actual != expected:
                result.record_fail(f"static:{desc}", f"expected {expected}, got {actual}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail(f"static:{desc}", f"EXCEPTION: {e}")

    # Random first-match tests
    random.seed(42)
    for _ in range(2000):
        text = gen_text(random.randint(10, 100), "abc")
        pat = gen_text(random.randint(1, 8), "abc")
        ref = reference_single_search(text, pat)
        expected = ref[0] if ref else -1
        try:
            actual = _ta_knuth_morris_pratt(text, pat)
            if actual != expected:
                result.record_fail("random", f"expected {expected}, got {actual}",
                                   f"text={text[:30]}... pat={pat}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}", f"pat={pat}")

    # Edge case: empty pattern
    try:
        r = _ta_knuth_morris_pratt("abc", "")
        result.add_note(f"empty pattern returns: {r}")
    except:
        result.add_note("empty pattern raises exception")

    return result


# ============================================================
# 2. RABIN-KARP AUDIT (TheAlgorithms/Python)
# ============================================================

# Inline the real implementation
_rk_alphabet_size = 256
_rk_modulus = 1000003

def _ta_rabin_karp(pattern, text):
    """TheAlgorithms/Python Rabin-Karp - returns bool"""
    p_len = len(pattern)
    t_len = len(text)
    if p_len > t_len:
        return False

    p_hash = 0
    text_hash = 0
    modulus_power = 1

    for i in range(p_len):
        p_hash = (ord(pattern[i]) + p_hash * _rk_alphabet_size) % _rk_modulus
        text_hash = (ord(text[i]) + text_hash * _rk_alphabet_size) % _rk_modulus
        if i == p_len - 1:
            continue
        modulus_power = (modulus_power * _rk_alphabet_size) % _rk_modulus

    for i in range(t_len - p_len + 1):
        if text_hash == p_hash and text[i : i + p_len] == pattern:
            return True
        if i == t_len - p_len:
            continue
        text_hash = (
            (text_hash - ord(text[i]) * modulus_power) * _rk_alphabet_size
            + ord(text[i + p_len])
        ) % _rk_modulus
    return False

def audit_rabin_karp():
    result = AuditResult("Rabin-Karp: TheAlgorithms/Python")
    result.add_note("Implementation only returns bool (found/not found), not positions")

    tests = [
        ("abc", "xyzabcdef", True, "found in middle"),
        ("abc", "xyz", False, "not found"),
        ("abc", "abc", True, "exact match"),
        ("a", "a", True, "single char"),
        ("abc", "ab", False, "pattern longer than text"),
        ("ABABX", "ABABZABABYABABX", True, "late match"),
        ("AAAB", "ABAAAAAB", True, "many near misses"),
    ]

    for pat, text, expected, desc in tests:
        try:
            actual = _ta_rabin_karp(pat, text)
            if actual != expected:
                result.record_fail(f"static:{desc}", f"expected {expected}, got {actual}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail(f"static:{desc}", f"EXCEPTION: {e}")

    # Random tests
    random.seed(42)
    for _ in range(2000):
        text = gen_text(random.randint(10, 100), "abcde")
        pat = gen_text(random.randint(1, 8), "abcde")
        ref = reference_single_search(text, pat)
        expected = len(ref) > 0
        try:
            actual = _ta_rabin_karp(pat, text)
            if actual != expected:
                result.record_fail("random", f"expected {expected}, got {actual}",
                                   f"text={text[:30]}... pat={pat}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}", f"pat={pat}")

    # Edge cases
    try:
        r = _ta_rabin_karp("", "abc")
        result.add_note(f"empty pattern returns: {r}")
    except Exception as e:
        result.add_note(f"empty pattern raises: {e}")

    try:
        r = _ta_rabin_karp("abc", "")
        result.add_note(f"empty text returns: {r}")
    except Exception as e:
        result.add_note(f"empty text raises: {e}")

    return result


# ============================================================
# 3. AHO-CORASICK AUDIT (TheAlgorithms/Python)
# ============================================================

from collections import deque

class _TA_Automaton:
    """Verbatim copy of TheAlgorithms/Python Aho-Corasick"""
    def __init__(self, keywords):
        self.adlist = []
        self.adlist.append(
            {"value": "", "next_states": [], "fail_state": 0, "output": []}
        )
        for keyword in keywords:
            self.add_keyword(keyword)
        self.set_fail_transitions()

    def find_next_state(self, current_state, char):
        for state in self.adlist[current_state]["next_states"]:
            if char == self.adlist[state]["value"]:
                return state
        return None

    def add_keyword(self, keyword):
        current_state = 0
        for character in keyword:
            next_state = self.find_next_state(current_state, character)
            if next_state is None:
                self.adlist.append(
                    {"value": character, "next_states": [], "fail_state": 0, "output": []}
                )
                self.adlist[current_state]["next_states"].append(len(self.adlist) - 1)
                current_state = len(self.adlist) - 1
            else:
                current_state = next_state
        self.adlist[current_state]["output"].append(keyword)

    def set_fail_transitions(self):
        q = deque()
        for node in self.adlist[0]["next_states"]:
            q.append(node)
            self.adlist[node]["fail_state"] = 0
        while q:
            r = q.popleft()
            for child in self.adlist[r]["next_states"]:
                q.append(child)
                state = self.adlist[r]["fail_state"]
                while (
                    self.find_next_state(state, self.adlist[child]["value"]) is None
                    and state != 0
                ):
                    state = self.adlist[state]["fail_state"]
                self.adlist[child]["fail_state"] = self.find_next_state(
                    state, self.adlist[child]["value"]
                )
                if self.adlist[child]["fail_state"] is None:
                    self.adlist[child]["fail_state"] = 0
                self.adlist[child]["output"] = (
                    self.adlist[child]["output"]
                    + self.adlist[self.adlist[child]["fail_state"]]["output"]
                )

    def search_in(self, string):
        result = {}
        current_state = 0
        for i in range(len(string)):
            while (
                self.find_next_state(current_state, string[i]) is None
                and current_state != 0
            ):
                current_state = self.adlist[current_state]["fail_state"]
            next_state = self.find_next_state(current_state, string[i])
            if next_state is None:
                current_state = 0
            else:
                current_state = next_state
                for key in self.adlist[current_state]["output"]:
                    if key not in result:
                        result[key] = []
                    result[key].append(i - len(key) + 1)
        return result

def _ta_ac_search(text, patterns):
    if not patterns:
        return {}
    auto = _TA_Automaton(patterns)
    return auto.search_in(text)

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

def audit_aho_corasick():
    result = AuditResult("Aho-Corasick: TheAlgorithms/Python")

    for text, patterns, expected, desc in AC_STATIC_TESTS:
        try:
            actual = _ta_ac_search(text, patterns)
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
    for _ in range(1000):
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
            actual = _ta_ac_search(text, patterns)
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

    return result


# ============================================================
# 4. DIJKSTRA AUDIT (TheAlgorithms/Python)
# ============================================================

def _ta_dijkstra(graph, start, end):
    """TheAlgorithms/Python Dijkstra - returns cost to single target"""
    heap = [(0, start)]
    visited = set()
    while heap:
        (cost, u) = heapq.heappop(heap)
        if u in visited:
            continue
        visited.add(u)
        if u == end:
            return cost
        for v, c in graph[u]:
            if v in visited:
                continue
            next_item = cost + c
            heapq.heappush(heap, (next_item, v))
    return -1

def audit_dijkstra():
    result = AuditResult("Dijkstra: TheAlgorithms/Python")
    result.add_note("Implementation returns single shortest path cost (start->end), not all distances")
    result.add_note("Returns -1 for unreachable (not inf) - design issue for API consumers")

    # Static tests
    static = [
        (3, [(0,1,1), (1,2,2), (0,2,4)], 0, 2, 3),
        (4, [(0,1,1), (0,2,4), (1,2,2), (2,3,1)], 0, 3, 4),
        (3, [(0,1,5), (0,2,2), (2,1,1)], 0, 1, 3),
        (2, [], 0, 1, -1),  # unreachable
        (1, [], 0, 0, 0),   # self
    ]

    for n, edges, src, dst, expected in static:
        graph = edges_to_adj(edges, n)
        try:
            actual = _ta_dijkstra(graph, src, dst)
            if actual != expected:
                result.record_fail("static", f"src={src} dst={dst}: expected {expected}, got {actual}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail("static", f"EXCEPTION: {e}")

    # Random tests: compare against reference dijkstra for random (src, dst) pairs
    random.seed(42)
    for _ in range(500):
        n = random.randint(3, 15)
        edges = gen_random_graph(n, density=0.3)
        graph = edges_to_adj(edges, n)
        src = random.randint(0, n - 1)
        dst = random.randint(0, n - 1)

        ref = reference_dijkstra(graph, src)
        expected = ref.get(dst, float('inf'))
        if expected == float('inf'):
            expected = -1

        try:
            actual = _ta_dijkstra(graph, src, dst)
            if abs(actual - expected) > 1e-9:
                result.record_fail("random",
                                   f"src={src} dst={dst}: expected {expected}, got {actual}",
                                   f"n={n} edges={len(edges)}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}")

    return result


# ============================================================
# 5. BELLMAN-FORD AUDIT (TheAlgorithms/Python)
# ============================================================

def _ta_bellman_ford(graph_dicts, vertex_count, edge_count, src):
    """TheAlgorithms/Python Bellman-Ford"""
    distance = [float("inf")] * vertex_count
    distance[src] = 0.0

    for _ in range(vertex_count - 1):
        for j in range(edge_count):
            u, v, w = (graph_dicts[j][k] for k in ["src", "dst", "weight"])
            if distance[u] != float("inf") and distance[u] + w < distance[v]:
                distance[v] = distance[u] + w

    for j in range(edge_count):
        u, v, w = (graph_dicts[j][k] for k in ["src", "dst", "weight"])
        if distance[u] != float("inf") and distance[u] + w < distance[v]:
            raise Exception("Negative cycle found")

    return distance

def audit_bellman_ford():
    result = AuditResult("Bellman-Ford: TheAlgorithms/Python")

    # Static tests (no negative weights for basic correctness)
    static = [
        (3, [(0,1,1), (1,2,2), (0,2,4)], 0, [0, 1, 3]),
        (4, [(0,1,1), (0,2,4), (1,2,2), (2,3,1)], 0, [0, 1, 3, 4]),
        (3, [(0,1,5), (0,2,2), (2,1,1)], 0, [0, 3, 2]),
    ]

    for n, edges, src, expected in static:
        graph_dicts = [{"src": u, "dst": v, "weight": w} for u, v, w in edges]
        try:
            actual = _ta_bellman_ford(graph_dicts, n, len(edges), src)
            actual_clean = [float('inf') if d == float('inf') else d for d in actual]
            ok = True
            for i in range(n):
                e = expected[i] if i < len(expected) else float('inf')
                a = actual_clean[i]
                if abs(e - a) > 1e-9:
                    result.record_fail("static", f"node {i}: expected {e}, got {a}")
                    ok = False
                    break
            if ok:
                result.record_pass()
        except Exception as e:
            result.record_fail("static", f"EXCEPTION: {e}")

    # Test with negative weights (no negative cycle)
    neg_tests = [
        (4, [(2, 1, -10), (3, 2, 3), (0, 3, 5), (0, 1, 4)], 0, [0, -2, 8, 5]),
    ]
    for n, edges, src, expected in neg_tests:
        graph_dicts = [{"src": u, "dst": v, "weight": w} for u, v, w in edges]
        try:
            actual = _ta_bellman_ford(graph_dicts, n, len(edges), src)
            ok = True
            for i in range(n):
                if abs(expected[i] - actual[i]) > 1e-9:
                    result.record_fail("negative weights", f"node {i}: expected {expected[i]}, got {actual[i]}")
                    ok = False
                    break
            if ok:
                result.record_pass()
        except Exception as e:
            result.record_fail("negative weights", f"EXCEPTION: {e}")

    # Test negative cycle detection
    neg_cycle_edges = [(2, 1, -10), (3, 2, 3), (0, 3, 5), (0, 1, 4), (1, 3, 5)]
    graph_dicts = [{"src": u, "dst": v, "weight": w} for u, v, w in neg_cycle_edges]
    try:
        _ta_bellman_ford(graph_dicts, 4, 5, 0)
        result.record_fail("negative cycle", "should have raised Exception but didn't")
    except Exception as e:
        if "Negative cycle" in str(e):
            result.record_pass()
        else:
            result.record_fail("negative cycle", f"wrong exception: {e}")

    # Random tests (positive weights only)
    random.seed(42)
    for _ in range(500):
        n = random.randint(3, 12)
        edges = gen_random_graph(n, density=0.3)
        graph_dicts = [{"src": u, "dst": v, "weight": w} for u, v, w in edges]
        src = 0
        ref = reference_bellman_ford(n, edges, src)
        if ref is None:
            continue  # skip negative cycles

        try:
            actual = _ta_bellman_ford(graph_dicts, n, len(edges), src)
            ok = True
            for i in range(n):
                e = ref[i]
                a = actual[i]
                if e == float('inf') and a == float('inf'):
                    continue
                if abs(e - a) > 1e-9:
                    result.record_fail("random", f"node {i}: expected {e}, got {a}",
                                       f"n={n} edges={len(edges)}")
                    ok = False
                    break
            if ok:
                result.record_pass()
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}")

    return result


# ============================================================
# 6. FLOYD-WARSHALL AUDIT (TheAlgorithms/Python)
# ============================================================

def _ta_floyd_warshall(graph_matrix, v):
    """TheAlgorithms/Python Floyd-Warshall (without printing)"""
    dist = [[float("inf") for _ in range(v)] for _ in range(v)]
    for i in range(v):
        for j in range(v):
            dist[i][j] = graph_matrix[i][j]

    for k in range(v):
        for i in range(v):
            for j in range(v):
                if (
                    dist[i][k] != float("inf")
                    and dist[k][j] != float("inf")
                    and dist[i][k] + dist[k][j] < dist[i][j]
                ):
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist

def audit_floyd_warshall():
    result = AuditResult("Floyd-Warshall: TheAlgorithms/Python")
    result.add_note("Original prints to stdout (side effect in library code)")
    result.add_note("Returns (dist, v) tuple instead of just dist - unusual API")

    # Static tests
    static = [
        (3, [(0,1,1), (1,2,2), (0,2,4)]),
        (4, [(0,1,1), (0,2,4), (1,2,2), (2,3,1), (3,0,7)]),
        (3, [(0,1,3), (1,2,1), (0,2,6), (2,0,2)]),
    ]

    for n, edges in static:
        # Build adjacency matrix
        INF = float('inf')
        matrix = [[INF] * n for _ in range(n)]
        for i in range(n):
            matrix[i][i] = 0
        for u, v, w in edges:
            matrix[u][v] = min(matrix[u][v], w)

        expected = reference_floyd_warshall(n, edges)
        try:
            actual = _ta_floyd_warshall(matrix, n)
            ok = True
            for i in range(n):
                for j in range(n):
                    e = expected[i][j]
                    a = actual[i][j]
                    if e == INF and a == INF:
                        continue
                    if abs(e - a) > 1e-9:
                        result.record_fail("static", f"dist[{i}][{j}]: expected {e}, got {a}")
                        ok = False
                        break
                if not ok:
                    break
            if ok:
                result.record_pass()
        except Exception as e:
            result.record_fail("static", f"EXCEPTION: {e}")

    # Random tests
    random.seed(42)
    for _ in range(300):
        n = random.randint(3, 10)
        edges = gen_random_graph(n, density=0.3)
        INF = float('inf')
        matrix = [[INF] * n for _ in range(n)]
        for i in range(n):
            matrix[i][i] = 0
        for u, v, w in edges:
            matrix[u][v] = min(matrix[u][v], w)

        expected = reference_floyd_warshall(n, edges)
        try:
            actual = _ta_floyd_warshall(matrix, n)
            ok = True
            for i in range(n):
                for j in range(n):
                    e = expected[i][j]
                    a = actual[i][j]
                    if e == INF and a == INF:
                        continue
                    if e == INF or a == INF:
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

    return result


# ============================================================
# 7. A* AUDIT (TheAlgorithms/Python)
# ============================================================

_DIRECTIONS = [[-1, 0], [0, -1], [1, 0], [0, 1]]

def _ta_a_star_search(grid, init, goal, cost, heuristic):
    """TheAlgorithms/Python A* - verbatim"""
    closed = [[0 for col in range(len(grid[0]))] for row in range(len(grid))]
    closed[init[0]][init[1]] = 1
    action = [[0 for col in range(len(grid[0]))] for row in range(len(grid))]

    x = init[0]
    y = init[1]
    g = 0
    f = g + heuristic[x][y]
    cell = [[f, g, x, y]]

    found = False
    resign = False

    while not found and not resign:
        if len(cell) == 0:
            raise ValueError("Algorithm is unable to find solution")
        else:
            cell.sort()
            cell.reverse()
            next_cell = cell.pop()
            x = next_cell[2]
            y = next_cell[3]
            g = next_cell[1]

            if x == goal[0] and y == goal[1]:
                found = True
            else:
                for i in range(len(_DIRECTIONS)):
                    x2 = x + _DIRECTIONS[i][0]
                    y2 = y + _DIRECTIONS[i][1]
                    if (
                        x2 >= 0
                        and x2 < len(grid)
                        and y2 >= 0
                        and y2 < len(grid[0])
                        and closed[x2][y2] == 0
                        and grid[x2][y2] == 0
                    ):
                        g2 = g + cost
                        f2 = g2 + heuristic[x2][y2]
                        cell.append([f2, g2, x2, y2])
                        closed[x2][y2] = 1
                        action[x2][y2] = i
    invpath = []
    x = goal[0]
    y = goal[1]
    invpath.append([x, y])
    while x != init[0] or y != init[1]:
        x2 = x - _DIRECTIONS[action[x][y]][0]
        y2 = y - _DIRECTIONS[action[x][y]][1]
        x = x2
        y = y2
        invpath.append([x, y])

    path = []
    for i in range(len(invpath)):
        path.append(invpath[len(invpath) - 1 - i])
    return path, action

def _bfs_shortest_path(grid, init, goal):
    """BFS reference for shortest path on unweighted grid."""
    from collections import deque
    rows, cols = len(grid), len(grid[0])
    if grid[init[0]][init[1]] == 1 or grid[goal[0]][goal[1]] == 1:
        return None
    visited = set()
    visited.add((init[0], init[1]))
    q = deque([(init[0], init[1], [init])])
    while q:
        x, y, path = q.popleft()
        if x == goal[0] and y == goal[1]:
            return path
        for dx, dy in [(-1,0), (0,-1), (1,0), (0,1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < rows and 0 <= ny < cols and (nx, ny) not in visited and grid[nx][ny] == 0:
                visited.add((nx, ny))
                q.append((nx, ny, path + [[nx, ny]]))
    return None

def audit_a_star():
    result = AuditResult("A*: TheAlgorithms/Python")
    result.add_note("Grid-based implementation (not general graph A*)")
    result.add_note("Uses sort+reverse+pop instead of heapq - O(n log n) per step")

    # Test 1: doctest grid
    grid = [
        [0, 1, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 0],
        [0, 0, 0, 0, 1, 0],
    ]
    init = [0, 0]
    goal = [len(grid) - 1, len(grid[0]) - 1]
    cost = 1
    heuristic = [[0 for _ in range(len(grid[0]))] for _ in range(len(grid))]
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            heuristic[i][j] = abs(i - goal[0]) + abs(j - goal[1])
            if grid[i][j] == 1:
                heuristic[i][j] = 99

    try:
        path, action = _ta_a_star_search(grid, init, goal, cost, heuristic)
        # Verify path is valid
        ok = True
        if path[0] != init or path[-1] != goal:
            result.record_fail("doctest grid", f"path doesn't connect start to goal")
            ok = False
        if ok:
            for k in range(len(path)):
                r, c = path[k]
                if grid[r][c] == 1:
                    result.record_fail("doctest grid", f"path goes through obstacle at {path[k]}")
                    ok = False
                    break
                if k > 0:
                    dr = abs(path[k][0] - path[k-1][0])
                    dc = abs(path[k][1] - path[k-1][1])
                    if dr + dc != 1:
                        result.record_fail("doctest grid", f"non-adjacent steps at {path[k-1]}->{path[k]}")
                        ok = False
                        break
        if ok:
            # Check optimality: path length should match BFS
            bfs_path = _bfs_shortest_path(grid, init, goal)
            if bfs_path and len(path) != len(bfs_path):
                result.record_fail("doctest grid",
                                   f"non-optimal: A* path={len(path)}, BFS={len(bfs_path)}")
            else:
                result.record_pass()
    except Exception as e:
        result.record_fail("doctest grid", f"EXCEPTION: {e}")

    # Test 2: open grid (no obstacles)
    grid2 = [[0]*5 for _ in range(5)]
    init2 = [0, 0]
    goal2 = [4, 4]
    h2 = [[abs(i-4)+abs(j-4) for j in range(5)] for i in range(5)]
    try:
        path, _ = _ta_a_star_search(grid2, init2, goal2, 1, h2)
        bfs = _bfs_shortest_path(grid2, init2, goal2)
        if len(path) != len(bfs):
            result.record_fail("open grid", f"non-optimal: A*={len(path)}, BFS={len(bfs)}")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("open grid", f"EXCEPTION: {e}")

    # Test 3: no path exists
    grid3 = [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
    ]
    h3 = [[abs(i-2)+abs(j-2) for j in range(3)] for i in range(3)]
    try:
        _ta_a_star_search(grid3, [0, 0], [2, 2], 1, h3)
        result.record_fail("no path", "should have raised ValueError")
    except ValueError:
        result.record_pass()
    except Exception as e:
        result.record_fail("no path", f"wrong exception: {type(e).__name__}: {e}")

    # Random grids
    random.seed(42)
    for _ in range(200):
        rows = random.randint(5, 15)
        cols = random.randint(5, 15)
        grid = [[1 if random.random() < 0.25 else 0 for _ in range(cols)] for _ in range(rows)]
        grid[0][0] = 0
        grid[rows-1][cols-1] = 0
        init = [0, 0]
        goal = [rows-1, cols-1]
        h = [[abs(i-goal[0])+abs(j-goal[1]) for j in range(cols)] for i in range(rows)]
        for i in range(rows):
            for j in range(cols):
                if grid[i][j] == 1:
                    h[i][j] = 99

        bfs = _bfs_shortest_path(grid, init, goal)

        try:
            path, _ = _ta_a_star_search(grid, init, goal, 1, h)
            if bfs is None:
                result.record_fail("random", "A* found path but BFS says no path exists")
            elif len(path) != len(bfs):
                result.record_fail("random",
                                   f"non-optimal: A*={len(path)}, BFS={len(bfs)}",
                                   f"grid {rows}x{cols}")
            else:
                result.record_pass()
        except ValueError:
            if bfs is None:
                result.record_pass()
            else:
                result.record_fail("random",
                                   f"A* raised ValueError but BFS found path of length {len(bfs)}",
                                   f"grid {rows}x{cols}")
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}")

    return result


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  ALGORITHM AUDIT: TheAlgorithms/Python")
    print("  Testing 7 implementations against brute-force references")
    print("=" * 60)

    audits = [
        ("KMP", audit_kmp),
        ("Rabin-Karp", audit_rabin_karp),
        ("Aho-Corasick", audit_aho_corasick),
        ("Dijkstra", audit_dijkstra),
        ("Bellman-Ford", audit_bellman_ford),
        ("Floyd-Warshall", audit_floyd_warshall),
        ("A*", audit_a_star),
    ]

    results = []
    for name, fn in audits:
        print(f"\nRunning {name}...", end=" ", flush=True)
        start = time.perf_counter()
        r = fn()
        elapsed = (time.perf_counter() - start) * 1000
        print(f"{elapsed:.0f}ms")
        print(r.summary())
        results.append(r)

    # Summary table
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    total_pass = 0
    total_fail = 0
    for r in results:
        status = "PASS" if r.failed == 0 else "FAIL"
        print(f"  {status}  {r.name}  ({r.passed} pass, {r.failed} fail)")
        total_pass += r.passed
        total_fail += r.failed
    print(f"\n  Total: {total_pass} pass, {total_fail} fail")
    print(f"  Overall: {'ALL PASS' if total_fail == 0 else 'FAILURES FOUND'}")
