"""
Algorithm Audit: Social Science & Game Theory
Tests Gale-Shapley, PageRank, Minimax, Spearman from TheAlgorithms/Python
"""

import random
import time
import math
import itertools
from typing import List, Dict, Tuple

# ============================================================
# AUDIT INFRASTRUCTURE
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
        for e in self.errors[:15]:
            lines.append(f"  [{e['test']}] {e['detail']}")
            if e['context']:
                lines.append(f"    {e['context']}")
        if len(self.errors) > 15:
            lines.append(f"  ... and {len(self.errors) - 15} more")
        return "\n".join(lines)


# ============================================================
# 1. GALE-SHAPLEY STABLE MATCHING
# ============================================================

def _ta_stable_matching(donor_pref, recipient_pref):
    """TheAlgorithms/Python Gale-Shapley (verbatim)"""
    assert len(donor_pref) == len(recipient_pref)
    n = len(donor_pref)
    unmatched_donors = list(range(n))
    donor_record = [-1] * n
    rec_record = [-1] * n
    num_donations = [0] * n

    while unmatched_donors:
        donor = unmatched_donors[0]
        donor_preference = donor_pref[donor]
        recipient = donor_preference[num_donations[donor]]
        num_donations[donor] += 1
        rec_preference = recipient_pref[recipient]
        prev_donor = rec_record[recipient]

        if prev_donor != -1:
            if rec_preference.index(prev_donor) > rec_preference.index(donor):
                rec_record[recipient] = donor
                donor_record[donor] = recipient
                unmatched_donors.append(prev_donor)
                unmatched_donors.remove(donor)
        else:
            rec_record[recipient] = donor
            donor_record[donor] = recipient
            unmatched_donors.remove(donor)
    return donor_record


def is_stable(donor_pref, recipient_pref, matching):
    """Check if matching is stable (no blocking pair)."""
    n = len(matching)
    # matching[donor] = recipient
    rec_to_donor = {}
    for d, r in enumerate(matching):
        rec_to_donor[r] = d

    for donor in range(n):
        current_rec = matching[donor]
        donor_prefs = donor_pref[donor]
        # Check all recipients this donor prefers over current
        for rec in donor_prefs:
            if rec == current_rec:
                break  # reached current match, no blocking pair from this donor
            # donor prefers rec over current_rec
            # does rec prefer donor over their current partner?
            current_donor_of_rec = rec_to_donor[rec]
            rec_prefs = recipient_pref[rec]
            if rec_prefs.index(donor) < rec_prefs.index(current_donor_of_rec):
                return False, (donor, rec)
    return True, None


def reference_stable_matching_brute(donor_pref, recipient_pref):
    """Brute force: try all permutations, return first stable one (proposer-optimal)."""
    n = len(donor_pref)
    # For small n, check all permutations
    for perm in itertools.permutations(range(n)):
        matching = list(perm)
        stable, _ = is_stable(donor_pref, recipient_pref, matching)
        if stable:
            return matching
    return None


def gen_random_preferences(n):
    """Generate random preference lists for n donors and n recipients."""
    donor_pref = [random.sample(range(n), n) for _ in range(n)]
    recipient_pref = [random.sample(range(n), n) for _ in range(n)]
    return donor_pref, recipient_pref


def audit_gale_shapley():
    result = AuditResult("Gale-Shapley Stable Matching: TheAlgorithms/Python")

    # Static test 1: doctest example
    dp = [[0, 1, 3, 2], [0, 2, 3, 1], [1, 0, 2, 3], [0, 3, 1, 2]]
    rp = [[3, 1, 2, 0], [3, 1, 0, 2], [0, 3, 1, 2], [1, 0, 3, 2]]
    try:
        matching = _ta_stable_matching(dp, rp)
        if matching != [1, 2, 3, 0]:
            result.record_fail("doctest", f"expected [1,2,3,0], got {matching}")
        else:
            stable, bp = is_stable(dp, rp, matching)
            if stable:
                result.record_pass()
            else:
                result.record_fail("doctest", f"matching is not stable, blocking pair: {bp}")
    except Exception as e:
        result.record_fail("doctest", f"EXCEPTION: {e}")

    # Static test 2: trivial n=1
    try:
        matching = _ta_stable_matching([[0]], [[0]])
        if matching != [0]:
            result.record_fail("n=1", f"expected [0], got {matching}")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("n=1", f"EXCEPTION: {e}")

    # Static test 3: n=2 all prefer same
    dp2 = [[0, 1], [0, 1]]  # both donors prefer recipient 0
    rp2 = [[0, 1], [0, 1]]  # both recipients prefer donor 0
    try:
        matching = _ta_stable_matching(dp2, rp2)
        stable, bp = is_stable(dp2, rp2, matching)
        if not stable:
            result.record_fail("n=2 same prefs", f"not stable, blocking pair: {bp}")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("n=2 same prefs", f"EXCEPTION: {e}")

    # Static test 4: verify proposer-optimality
    # In Gale-Shapley, the proposing side gets their best stable partner
    dp3 = [[0, 1], [1, 0]]
    rp3 = [[0, 1], [0, 1]]
    try:
        matching = _ta_stable_matching(dp3, rp3)
        # Donor 0 prefers rec 0, donor 1 prefers rec 1
        # Both recs prefer donor 0, but donor-optimal should give [0, 1]
        if matching != [0, 1]:
            result.record_fail("proposer-optimal", f"expected [0,1], got {matching}")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("proposer-optimal", f"EXCEPTION: {e}")

    # Property-based: stability check on random instances
    random.seed(42)
    for n in [3, 4, 5, 6, 7, 8]:
        count = 200 if n <= 5 else 100
        for _ in range(count):
            dp, rp = gen_random_preferences(n)
            try:
                matching = _ta_stable_matching(dp, rp)

                # Check: is it a valid permutation?
                if sorted(matching) != list(range(n)):
                    result.record_fail("random", f"not a valid matching: {matching}", f"n={n}")
                    continue

                # Check: is it stable?
                stable, bp = is_stable(dp, rp, matching)
                if not stable:
                    result.record_fail("random", f"unstable! blocking pair: {bp}", f"n={n}")
                else:
                    result.record_pass()

                # For small n, verify proposer-optimality against brute force
                if n <= 4:
                    bf = reference_stable_matching_brute(dp, rp)
                    # Proposer-optimal: each donor should have best-or-equal partner
                    # compared to any other stable matching
                    # The brute force just finds *a* stable matching (first permutation)
                    # so we can't directly compare. Just verify stability.
                    pass

            except Exception as e:
                result.record_fail("random", f"EXCEPTION: {e}", f"n={n}")

    # Performance note
    result.add_note("Uses list.index() for preference lookup: O(n) per call, making algorithm O(n^3) instead of O(n^2)")
    result.add_note("A rank matrix (recipient_rank[r][d] = position) would fix this")

    return result


# ============================================================
# 2. PAGERANK
# ============================================================

class _Node:
    def __init__(self, name):
        self.name = name
        self.inbound = []
        self.outbound = []
    def add_inbound(self, node):
        self.inbound.append(node)
    def add_outbound(self, node):
        self.outbound.append(node)

def _ta_page_rank(nodes, limit=3, d=0.85):
    """TheAlgorithms/Python PageRank (verbatim, minus print)"""
    ranks = {}
    for node in nodes:
        ranks[node.name] = 1  # BUG? should be 1/n

    outbounds = {}
    for node in nodes:
        outbounds[node.name] = len(node.outbound)

    for i in range(limit):
        for _, node in enumerate(nodes):
            ranks[node.name] = (1 - d) + d * sum(
                ranks[ib] / outbounds[ib] for ib in node.inbound
            )
    return ranks


def reference_pagerank(adj_matrix, d=0.85, tol=1e-8, max_iter=1000):
    """Reference PageRank with proper normalization and convergence."""
    n = len(adj_matrix)
    if n == 0:
        return {}

    # Initialize to 1/n
    ranks = [1.0 / n] * n

    # Compute out-degree
    out_degree = [sum(row) for row in adj_matrix]

    for _ in range(max_iter):
        new_ranks = [0.0] * n
        # Handle dangling nodes (no outlinks): distribute their rank evenly
        dangling_sum = sum(ranks[i] for i in range(n) if out_degree[i] == 0)

        for j in range(n):
            inbound_sum = 0.0
            for i in range(n):
                if adj_matrix[i][j] == 1 and out_degree[i] > 0:
                    inbound_sum += ranks[i] / out_degree[i]
            new_ranks[j] = (1 - d) / n + d * (inbound_sum + dangling_sum / n)

        # Check convergence
        diff = sum(abs(new_ranks[i] - ranks[i]) for i in range(n))
        ranks = new_ranks
        if diff < tol:
            break

    return ranks


def build_nodes_from_matrix(adj_matrix, names=None):
    """Build Node objects from adjacency matrix."""
    n = len(adj_matrix)
    if names is None:
        names = [str(i) for i in range(n)]
    nodes = [_Node(name) for name in names]
    for i in range(n):
        for j in range(n):
            if adj_matrix[i][j] == 1:
                nodes[j].add_inbound(names[i])
                nodes[i].add_outbound(names[j])
    return nodes


def audit_pagerank():
    result = AuditResult("PageRank: TheAlgorithms/Python")

    # Bug 1: Initialization to 1 instead of 1/n
    result.add_note("INIT BUG: ranks initialized to 1 instead of 1/n")
    result.add_note("With 3 nodes, initial sum = 3.0 instead of 1.0")
    result.add_note("This means ranks don't sum to 1 (not a probability distribution)")

    # Test: verify ranks don't sum to 1
    adj = [[0, 1, 1], [0, 0, 1], [1, 0, 0]]
    nodes = build_nodes_from_matrix(adj, ["A", "B", "C"])
    ta_ranks = _ta_page_rank(nodes, limit=100, d=0.85)
    rank_sum = sum(ta_ranks.values())
    if abs(rank_sum - 1.0) > 0.01:
        result.record_fail("normalization",
                           f"ranks sum to {rank_sum:.4f}, should be 1.0",
                           "init=1 instead of 1/n causes non-normalized output")
    else:
        result.record_pass()

    # Test: relative ordering should still be correct (even if magnitudes wrong)
    ref = reference_pagerank(adj)
    ref_order = sorted(range(3), key=lambda i: ref[i], reverse=True)
    ta_order = sorted(ta_ranks.keys(), key=lambda k: ta_ranks[k], reverse=True)
    ref_names = [["A","B","C"][i] for i in ref_order]
    if ta_order == ref_names:
        result.record_pass()
        result.add_note("Relative ordering is correct despite wrong magnitudes")
    else:
        result.record_fail("ordering", f"ref order {ref_names}, TA order {ta_order}")

    # Bug 2: No convergence check, fixed iterations
    result.add_note("NO CONVERGENCE: uses fixed iteration count (default 3)")

    # Bug 3: No dangling node handling
    # Create graph with dangling node (node with no outlinks)
    adj_dangling = [[0, 1, 0], [0, 0, 1], [0, 0, 0]]  # node 2 is dangling
    nodes_d = build_nodes_from_matrix(adj_dangling, ["A", "B", "C"])
    try:
        ta_d = _ta_page_rank(nodes_d, limit=100, d=0.85)
        # Dangling node C should still have rank > 0 in proper PageRank
        # because its rank leaks to all nodes
        ref_d = reference_pagerank(adj_dangling)
        # In TA version, C gets rank from (1-d) only, which is 0.15
        # In proper version, C's rank redistributes
        result.add_note(f"DANGLING NODE: TA gives C={ta_d['C']:.4f}, correct={ref_d[2]:.4f}")
        if abs(ta_d['C'] - ref_d[2]) > 0.01:
            result.record_fail("dangling nodes",
                               f"C: TA={ta_d['C']:.4f}, ref={ref_d[2]:.4f}",
                               "rank leakage not redistributed")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("dangling nodes", f"EXCEPTION: {e}")

    # Bug 4: Division by zero for nodes with no outlinks
    adj_isolated = [[0, 0], [1, 0]]  # node 0 has no outlinks
    nodes_iso = build_nodes_from_matrix(adj_isolated, ["A", "B"])
    try:
        ta_iso = _ta_page_rank(nodes_iso, limit=10, d=0.85)
        result.record_pass()
        result.add_note("No crash on isolated nodes (but ranks are wrong)")
    except ZeroDivisionError:
        result.record_fail("division by zero",
                           "ZeroDivisionError when node has no outlinks",
                           "outbounds[node] = 0, divides by it")
    except Exception as e:
        result.record_fail("division by zero", f"EXCEPTION: {type(e).__name__}: {e}")

    # Random graphs: compare ordering
    random.seed(42)
    ordering_mismatches = 0
    for _ in range(200):
        n = random.randint(3, 8)
        adj = [[1 if random.random() < 0.3 and i != j else 0 for j in range(n)] for i in range(n)]
        # Ensure no isolated nodes (at least one outlink each)
        for i in range(n):
            if sum(adj[i]) == 0:
                j = random.choice([x for x in range(n) if x != i])
                adj[i][j] = 1

        names = [str(i) for i in range(n)]
        nodes = build_nodes_from_matrix(adj, names)

        try:
            ta_r = _ta_page_rank(nodes, limit=100, d=0.85)
            ref_r = reference_pagerank(adj)

            # Compare top node
            ta_top = max(ta_r.keys(), key=lambda k: ta_r[k])
            ref_top = max(range(n), key=lambda i: ref_r[i])
            if ta_top == str(ref_top):
                result.record_pass()
            else:
                ordering_mismatches += 1
                result.record_fail("random ordering",
                                   f"top node: TA={ta_top}, ref={ref_top}",
                                   f"n={n}")
        except Exception as e:
            result.record_fail("random", f"EXCEPTION: {e}", f"n={n}")

    return result


# ============================================================
# 3. MINIMAX
# ============================================================

def _ta_minimax(depth, node_index, is_max, scores, height):
    """TheAlgorithms/Python Minimax (verbatim)"""
    if depth < 0:
        raise ValueError("Depth cannot be less than 0")
    if len(scores) == 0:
        raise ValueError("Scores cannot be empty")
    if depth == height:
        return scores[node_index]
    if is_max:
        return max(
            _ta_minimax(depth + 1, node_index * 2, False, scores, height),
            _ta_minimax(depth + 1, node_index * 2 + 1, False, scores, height),
        )
    return min(
        _ta_minimax(depth + 1, node_index * 2, True, scores, height),
        _ta_minimax(depth + 1, node_index * 2 + 1, True, scores, height),
    )


def reference_minimax(scores, is_max=True):
    """Reference minimax on arbitrary-length list (recursive halving)."""
    if len(scores) == 1:
        return scores[0]
    mid = len(scores) // 2
    left = reference_minimax(scores[:mid], not is_max)
    right = reference_minimax(scores[mid:], not is_max)
    return max(left, right) if is_max else min(left, right)


def audit_minimax():
    result = AuditResult("Minimax: TheAlgorithms/Python")

    # Static doctests
    scores1 = [90, 23, 6, 33, 21, 65, 123, 34423]
    h1 = math.log(len(scores1), 2)
    try:
        r = _ta_minimax(0, 0, True, scores1, h1)
        if r != 65:
            result.record_fail("doctest1", f"expected 65, got {r}")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("doctest1", f"EXCEPTION: {e}")

    scores2 = [3, 5, 2, 9, 12, 5, 23, 23]
    h2 = math.log(len(scores2), 2)
    try:
        r = _ta_minimax(0, 0, True, scores2, h2)
        if r != 12:
            result.record_fail("doctest2", f"expected 12, got {r}")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("doctest2", f"EXCEPTION: {e}")

    # BUG TEST: non-power-of-2 sizes
    # math.log(6, 2) = 2.584..., depth will never == height (int vs float)
    result.add_note("CRITICAL: only works for power-of-2 score lists")
    result.add_note("math.log(len, 2) returns float; depth==height compares int to float")

    for bad_size in [3, 5, 6, 7, 9, 10, 12]:
        scores = list(range(bad_size))
        h = math.log(len(scores), 2)
        try:
            r = _ta_minimax(0, 0, True, scores, h)
            # If it returns, check if it's correct
            ref = reference_minimax(scores, True)
            if r != ref:
                result.record_fail(f"non-power-of-2 (n={bad_size})",
                                   f"TA={r}, ref={ref}")
            else:
                result.record_pass()
        except (IndexError, RecursionError) as e:
            result.record_fail(f"non-power-of-2 (n={bad_size})",
                               f"CRASH: {type(e).__name__}: {e}",
                               f"math.log({bad_size}, 2) = {h}")
        except Exception as e:
            result.record_fail(f"non-power-of-2 (n={bad_size})",
                               f"EXCEPTION: {type(e).__name__}: {e}")

    # Test power-of-2 sizes: should all work
    random.seed(42)
    for _ in range(200):
        size = random.choice([2, 4, 8, 16])
        scores = [random.randint(-100, 100) for _ in range(size)]
        h = math.log(size, 2)
        try:
            ta_r = _ta_minimax(0, 0, True, scores, h)
            ref_r = reference_minimax(scores, True)
            if ta_r != ref_r:
                result.record_fail("random power-of-2", f"TA={ta_r}, ref={ref_r}",
                                   f"scores={scores}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail("random power-of-2", f"EXCEPTION: {e}")

    # Float comparison issue: math.log(8, 2) might not be exactly 3.0
    result.add_note(f"math.log(8, 2) = {math.log(8, 2)} (exact? {math.log(8, 2) == 3.0})")
    result.add_note(f"math.log(16, 2) = {math.log(16, 2)} (exact? {math.log(16, 2) == 4.0})")
    result.add_note(f"math.log(32, 2) = {math.log(32, 2)} (exact? {math.log(32, 2) == 5.0})")

    # Test large power-of-2 where float precision might fail
    for size in [32, 64, 128, 256, 512, 1024]:
        h = math.log(size, 2)
        expected_h = int(round(h))
        if h != expected_h:
            result.record_fail(f"float precision (n={size})",
                               f"math.log({size}, 2) = {h}, not exactly {expected_h}",
                               "depth == height will fail due to float imprecision")
        else:
            result.record_pass()

    return result


# ============================================================
# 4. SPEARMAN RANK CORRELATION
# ============================================================

def _ta_assign_ranks(data):
    """TheAlgorithms/Python assign_ranks (verbatim)"""
    ranked_data = sorted((value, index) for index, value in enumerate(data))
    ranks = [0] * len(data)
    for position, (_, index) in enumerate(ranked_data):
        ranks[index] = position + 1
    return ranks

def _ta_spearman(var1, var2):
    """TheAlgorithms/Python Spearman (verbatim)"""
    n = len(var1)
    rank_var1 = _ta_assign_ranks(var1)
    rank_var2 = _ta_assign_ranks(var2)
    d = [rx - ry for rx, ry in zip(rank_var1, rank_var2)]
    d_squared = sum(di**2 for di in d)
    rho = 1 - (6 * d_squared) / (n * (n**2 - 1))
    return rho


def reference_spearman(var1, var2):
    """Reference using scipy-style computation with tie handling."""
    n = len(var1)

    def rank_with_ties(data):
        indexed = sorted((val, i) for i, val in enumerate(data))
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and indexed[j + 1][0] == indexed[i][0]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1  # average rank for ties
            for k in range(i, j + 1):
                ranks[indexed[k][1]] = avg_rank
            i = j + 1
        return ranks

    r1 = rank_with_ties(var1)
    r2 = rank_with_ties(var2)
    d_sq = sum((a - b)**2 for a, b in zip(r1, r2))
    rho = 1 - (6 * d_sq) / (n * (n**2 - 1))
    return rho


def audit_spearman():
    result = AuditResult("Spearman Rank Correlation: TheAlgorithms/Python")

    # Static tests (no ties)
    tests = [
        ([1,2,3,4,5], [5,4,3,2,1], -1.0, "perfect negative"),
        ([1,2,3,4,5], [2,4,6,8,10], 1.0, "perfect positive"),
        ([1,2,3,4,5], [5,1,2,9,5], 0.6, "doctest"),
    ]

    for x, y, expected, desc in tests:
        try:
            actual = _ta_spearman(x, y)
            if abs(actual - expected) > 1e-9:
                result.record_fail(f"static:{desc}", f"expected {expected}, got {actual}")
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail(f"static:{desc}", f"EXCEPTION: {e}")

    # BUG: Ties handling
    result.add_note("BUG: Does not handle tied values correctly")
    result.add_note("Tied values get arbitrary ranks instead of averaged ranks")

    # Test with ties
    tie_tests = [
        ([1, 2, 2, 4], [1, 2, 3, 4], "simple tie in x"),
        ([1, 1, 1, 1], [1, 2, 3, 4], "all same in x"),
        ([1, 2, 3, 4], [3, 3, 3, 3], "all same in y"),
        ([10, 20, 20, 30, 30, 30], [1, 2, 3, 4, 5, 6], "multiple ties"),
    ]

    for x, y, desc in tie_tests:
        ta_result = _ta_spearman(x, y)
        ref_result = reference_spearman(x, y)
        if abs(ta_result - ref_result) > 1e-9:
            result.record_fail(f"ties:{desc}",
                               f"TA={ta_result:.6f}, ref(with ties)={ref_result:.6f}",
                               f"x={x}, y={y}")
        else:
            result.record_pass()

    # Edge case: n=2
    try:
        r = _ta_spearman([1, 2], [2, 1])
        if abs(r - (-1.0)) > 1e-9:
            result.record_fail("n=2", f"expected -1.0, got {r}")
        else:
            result.record_pass()
    except Exception as e:
        result.record_fail("n=2", f"EXCEPTION: {e}")

    # Edge case: n=1 (division by zero: n*(n^2-1) = 0)
    try:
        r = _ta_spearman([1], [1])
        result.record_fail("n=1", f"should crash but returned {r}")
    except ZeroDivisionError:
        result.record_fail("n=1", "ZeroDivisionError: n*(n^2-1) = 0 when n=1",
                           "no input validation")
    except Exception as e:
        result.record_fail("n=1", f"EXCEPTION: {type(e).__name__}: {e}")

    # Random tests (no ties, should match)
    random.seed(42)
    for _ in range(500):
        n = random.randint(3, 20)
        x = random.sample(range(100), n)  # no ties guaranteed
        y = random.sample(range(100), n)
        ta_r = _ta_spearman(x, y)
        ref_r = reference_spearman(x, y)
        if abs(ta_r - ref_r) > 1e-9:
            result.record_fail("random (no ties)", f"TA={ta_r:.6f}, ref={ref_r:.6f}")
        else:
            result.record_pass()

    return result


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  ALGORITHM AUDIT: Social Science & Game Theory")
    print("  TheAlgorithms/Python")
    print("=" * 60)

    audits = [
        ("Gale-Shapley", audit_gale_shapley),
        ("PageRank", audit_pagerank),
        ("Minimax", audit_minimax),
        ("Spearman", audit_spearman),
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

    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    total_pass = 0
    total_fail = 0
    for r in results:
        status = "PASS" if r.failed == 0 else "**FAIL**"
        print(f"  {status}  {r.name}  ({r.passed} pass, {r.failed} fail)")
        total_pass += r.passed
        total_fail += r.failed
    print(f"\n  Total: {total_pass} pass, {total_fail} fail")
    print(f"  Overall: {'ALL PASS' if total_fail == 0 else 'FAILURES FOUND'}")
