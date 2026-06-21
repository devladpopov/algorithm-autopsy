"""
Boyer-Moore Algorithm Audit: Property-Based Test Harness

Tests any string matching implementation against a brute-force reference
and mathematical invariants. Designed to catch the known classes of errors:
- Delta2 (good suffix) table computation bugs (Rytter correction)
- Off-by-one indexing errors
- Initialization bugs
- Overlapping match handling
- Edge case failures
"""

import random
import string
import time
import importlib
import sys
from pathlib import Path
from typing import Callable, List, Optional


# ============================================================
# REFERENCE IMPLEMENTATION (brute-force, provably correct)
# ============================================================

def reference_search(text: str, pattern: str) -> List[int]:
    """Naive O(nm) search. Correct by construction."""
    if not pattern:
        return []
    results = []
    for i in range(len(text) - len(pattern) + 1):
        if text[i:i + len(pattern)] == pattern:
            results.append(i)
    return results


# ============================================================
# TEST CASES: Known edge cases and pathological inputs
# ============================================================

STATIC_TESTS = [
    # (text, pattern, expected_positions, description)
    ("", "", [], "both empty"),
    ("abc", "", [], "empty pattern"),
    ("", "abc", [], "empty text"),
    ("a", "ab", [], "pattern longer than text"),
    ("abc", "abc", [0], "pattern equals text"),
    ("a", "a", [0], "single char match"),
    ("b", "a", [], "single char no match"),

    # Basic matches
    ("abcabc", "abc", [0, 3], "two non-overlapping matches"),
    ("hello world", "world", [6], "match at end"),
    ("hello world", "hello", [0], "match at start"),
    ("abcdef", "xyz", [], "no match"),

    # Overlapping matches
    ("aaa", "aa", [0, 1], "overlapping: aaa/aa"),
    ("aaaa", "aa", [0, 1, 2], "overlapping: aaaa/aa"),
    ("ababab", "abab", [0, 2], "overlapping: ababab/abab"),
    ("aaaaaa", "aaa", [0, 1, 2, 3], "overlapping: aaaaaa/aaa"),

    # Pathological: all same characters (worst case for BM)
    ("aaaaaaaaaa", "aaaa", [0, 1, 2, 3, 4, 5, 6], "periodic: all a's"),
    ("bbbbbbbbbb", "bbb", [0, 1, 2, 3, 4, 5, 6, 7], "periodic: all b's"),

    # Good suffix rule stress tests
    ("AABA ABAACAADAABAABA", "AABA", [0, 13, 16], "Gotoh-style test"),
    ("AABAACAADAABAABA", "AABA", [0, 9, 12], "williamfiset bug pattern"),

    # Near-matches (off by one)
    ("abcxabc", "abcyabc", [], "near match with one diff"),
    ("xyzxyzxyz", "xyzxyzxya", [], "near match at end"),

    # Pattern at very end
    ("xxxxxxxxxab", "ab", [9], "match only at end"),
    ("abxxxxxxxxx", "ab", [0], "match only at start"),

    # Single character patterns (delta2 trivial)
    ("abcabc", "a", [0, 3], "single char: a in abcabc"),
    ("abcabc", "c", [2, 5], "single char: c in abcabc"),
    ("abcabc", "x", [], "single char: x not found"),

    # Binary alphabet (BM less effective)
    ("01010101", "0101", [0, 2, 4], "binary: overlapping"),
    ("00000000", "000", [0, 1, 2, 3, 4, 5], "binary: all zeros"),
    ("10101010", "1010", [0, 2, 4], "binary: alternating"),

    # Long pattern
    ("abcdefghijklmnop", "abcdefghijklmnop", [0], "full text as pattern"),
    ("xabcdefghijklmnop", "abcdefghijklmnop", [1], "full pattern offset 1"),

    # Special: pattern with repeated suffix
    ("ABCABDABCABC", "ABCABC", [6], "suffix overlap in pattern"),
    ("GCATCGCAGAGAGTATACAGTACG", "GCAGAGAG", [5], "classic BM textbook"),

    # Rytter correction test: patterns where delta2 matters
    ("ABAAABAB", "AABAB", [3], "good suffix shift test 1"),
    ("AABAABAAB", "AABAB", [], "good suffix shift test 2 (no match)"),
]


# ============================================================
# PROPERTY-BASED TESTS (random inputs)
# ============================================================

def gen_random_text(length: int, alphabet: str = "abcde") -> str:
    return "".join(random.choice(alphabet) for _ in range(length))


def gen_random_pattern(text: str, max_len: int = 10) -> str:
    """Generate pattern that may or may not be in text."""
    if random.random() < 0.5 and len(text) >= 2:
        # Extract substring from text (guaranteed match)
        start = random.randint(0, len(text) - 1)
        end = min(start + random.randint(1, max_len), len(text))
        return text[start:end]
    else:
        # Random pattern (may not match)
        length = random.randint(1, max_len)
        return gen_random_text(length, "abcde")


def property_completeness(search_fn: Callable, text: str, pattern: str) -> Optional[str]:
    """Every position returned by reference must be returned by search_fn."""
    expected = reference_search(text, pattern)
    actual = search_fn(text, pattern)
    missing = set(expected) - set(actual)
    if missing:
        return f"MISSING matches at positions {sorted(missing)}"
    return None


def property_soundness(search_fn: Callable, text: str, pattern: str) -> Optional[str]:
    """Every position returned by search_fn must actually be a match."""
    actual = search_fn(text, pattern)
    for pos in actual:
        if pos < 0 or pos + len(pattern) > len(text):
            return f"INVALID position {pos} (out of bounds)"
        if text[pos:pos + len(pattern)] != pattern:
            return f"FALSE POSITIVE at position {pos}: '{text[pos:pos+len(pattern)]}' != '{pattern}'"
    return None


def property_order(search_fn: Callable, text: str, pattern: str) -> Optional[str]:
    """Results must be in ascending order."""
    actual = search_fn(text, pattern)
    for i in range(1, len(actual)):
        if actual[i] <= actual[i - 1]:
            return f"OUT OF ORDER: position {actual[i]} after {actual[i-1]}"
    return None


def property_commutativity_count(search_fn: Callable, text: str, pattern: str) -> Optional[str]:
    """Count of matches must equal reference count."""
    expected_count = len(reference_search(text, pattern))
    actual_count = len(search_fn(text, pattern))
    if expected_count != actual_count:
        return f"COUNT MISMATCH: expected {expected_count}, got {actual_count}"
    return None


# ============================================================
# AUDIT RUNNER
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

    def record_fail(self, test_name: str, detail: str, text: str, pattern: str):
        self.failed += 1
        self.errors.append({
            "test": test_name,
            "detail": detail,
            "text": text if len(text) <= 100 else text[:50] + "..." + text[-50:],
            "pattern": pattern,
        })

    def summary(self) -> str:
        status = "PASS" if self.failed == 0 else "FAIL"
        lines = [
            f"\n{'='*60}",
            f"  AUDIT RESULT: {self.name}",
            f"  Status: {status}",
            f"  Passed: {self.passed}  Failed: {self.failed}",
            f"  Time: {self.timing_ms:.1f}ms",
            f"{'='*60}",
        ]
        if self.errors:
            lines.append(f"\n  FAILURES ({len(self.errors)}):")
            for i, err in enumerate(self.errors[:20]):  # limit output
                lines.append(f"  [{i+1}] {err['test']}")
                lines.append(f"      {err['detail']}")
                lines.append(f"      text='{err['text']}' pattern='{err['pattern']}'")
            if len(self.errors) > 20:
                lines.append(f"  ... and {len(self.errors) - 20} more failures")
        return "\n".join(lines)


def audit_implementation(
    name: str,
    search_fn: Callable[[str, str], List[int]],
    n_random_tests: int = 5000,
    random_seed: int = 42,
) -> AuditResult:
    """Run full audit suite against a search function.

    search_fn(text, pattern) -> list of match positions (0-indexed)
    """
    result = AuditResult(name)
    start = time.perf_counter()

    # Phase 1: Static tests
    for text, pattern, expected, desc in STATIC_TESTS:
        try:
            actual = search_fn(text, pattern)
            if isinstance(actual, int):
                # Some implementations return first match only
                actual = [actual] if actual >= 0 else []
            actual = sorted(actual)
            if actual != expected:
                result.record_fail(
                    f"static: {desc}",
                    f"expected {expected}, got {actual}",
                    text, pattern,
                )
            else:
                result.record_pass()
        except Exception as e:
            result.record_fail(f"static: {desc}", f"EXCEPTION: {e}", text, pattern)

    # Phase 2: Property-based random tests
    rng = random.Random(random_seed)
    random.seed(random_seed)

    properties = [
        ("completeness", property_completeness),
        ("soundness", property_soundness),
        ("order", property_order),
        ("count", property_commutativity_count),
    ]

    # Different test distributions
    test_configs = [
        # (text_len, pattern_max_len, alphabet, count, description)
        (50, 5, "abc", n_random_tests // 5, "small text, small alphabet"),
        (200, 10, "abcde", n_random_tests // 5, "medium text"),
        (500, 20, "abcdefghij", n_random_tests // 5, "large text, large alphabet"),
        (100, 8, "ab", n_random_tests // 5, "binary alphabet"),
        (100, 50, "abc", n_random_tests // 5, "long patterns"),
    ]

    for text_len, pat_max, alphabet, count, config_desc in test_configs:
        for _ in range(count):
            text = gen_random_text(text_len, alphabet)
            pattern = gen_random_pattern(text, pat_max)

            for prop_name, prop_fn in properties:
                try:
                    err = prop_fn(search_fn, text, pattern)
                    if err:
                        result.record_fail(
                            f"random/{config_desc}/{prop_name}",
                            err, text, pattern,
                        )
                    else:
                        result.record_pass()
                except Exception as e:
                    result.record_fail(
                        f"random/{config_desc}/{prop_name}",
                        f"EXCEPTION: {e}", text, pattern,
                    )

    result.timing_ms = (time.perf_counter() - start) * 1000
    return result


# ============================================================
# MAIN: Run audits
# ============================================================

if __name__ == "__main__":
    print("Boyer-Moore Algorithm Audit Framework")
    print("=" * 60)

    # Self-test: audit the reference implementation
    print("\nSelf-test: auditing reference (brute-force) implementation...")
    ref_result = audit_implementation("reference (brute-force)", reference_search)
    print(ref_result.summary())

    if ref_result.failed > 0:
        print("\nCRITICAL: Reference implementation failed self-test!")
        sys.exit(1)

    print(f"\nReference passed all {ref_result.passed} tests.")
    print("\nTo audit an implementation, import and call:")
    print("  audit_implementation('name', your_search_fn)")
