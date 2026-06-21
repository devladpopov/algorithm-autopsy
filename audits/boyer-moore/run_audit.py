"""
Run Boyer-Moore audit against all implementations.

Usage:
    python audits/boyer-moore/run_audit.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "tests"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "implementations"))

from test_harness import audit_implementation
from bm_implementations import (
    bm_textbook_naive,
    bm_horspool,
    bm_rytter_correct,
    bm_bad_char_only,
)

# TheAlgorithms/Python real implementation (copied verbatim)
# Source: https://github.com/TheAlgorithms/Python/blob/master/strings/boyer_moore_search.py
class BoyerMooreSearch:
    def __init__(self, text, pattern):
        self.text, self.pattern = text, pattern
        self.textLen, self.patLen = len(text), len(pattern)

    def match_in_pattern(self, char):
        for i in range(self.patLen - 1, -1, -1):
            if char == self.pattern[i]:
                return i
        return -1

    def mismatch_in_text(self, current_pos):
        for i in range(self.patLen - 1, -1, -1):
            if self.pattern[i] != self.text[current_pos + i]:
                return current_pos + i
        return -1

    def bad_character_heuristic(self):
        positions = []
        for i in range(self.textLen - self.patLen + 1):
            mismatch_index = self.mismatch_in_text(i)
            if mismatch_index == -1:
                positions.append(i)
            else:
                match_index = self.match_in_pattern(self.text[mismatch_index])
                i = (mismatch_index - match_index)  # BUG: dead code in for-loop
        return positions


def thealgorithms_python(text, pattern):
    if not pattern or not text or len(pattern) > len(text):
        return []
    return BoyerMooreSearch(text, pattern).bad_character_heuristic()


implementations = [
    ("1. Textbook BM (both rules)", bm_textbook_naive),
    ("2. Horspool (bad char only)", bm_horspool),
    ("3. Rytter-correct BM", bm_rytter_correct),
    ("4. Sedgewick-style (bad char only)", bm_bad_char_only),
    ("5. TheAlgorithms/Python (real)", thealgorithms_python),
]

print("Boyer-Moore Algorithm Audit")
print("=" * 60)
print(f"Testing {len(implementations)} implementations")
print(f"Each against brute-force reference + property-based tests\n")

summary = []
for name, fn in implementations:
    print(f"Auditing: {name}...")
    result = audit_implementation(name, fn, n_random_tests=2000)
    print(result.summary())
    summary.append((name, result.passed, result.failed))

print("\n\n" + "=" * 60)
print("  SUMMARY")
print("=" * 60)
print(f"{'Implementation':<40} {'Pass':>6} {'Fail':>6} {'Status':>8}")
print("-" * 60)
for name, passed, failed in summary:
    status = "OK" if failed == 0 else "FAIL"
    print(f"{name:<40} {passed:>6} {failed:>6} {status:>8}")

# Demonstrate TheAlgorithms dead shift bug
print("\n" + "=" * 60)
print("  DEAD SHIFT DEMONSTRATION")
print("=" * 60)

class InstrumentedBMS(BoyerMooreSearch):
    def bad_character_heuristic(self):
        positions = []
        self.iterations = 0
        for i in range(self.textLen - self.patLen + 1):
            self.iterations += 1
            mismatch_index = self.mismatch_in_text(i)
            if mismatch_index == -1:
                positions.append(i)
            else:
                match_index = self.match_in_pattern(self.text[mismatch_index])
                i = (mismatch_index - match_index)
        return positions

text = "ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP"
pattern = "MNOP"
bms = InstrumentedBMS(text, pattern)
positions = bms.bad_character_heuristic()
brute_force_iters = len(text) - len(pattern) + 1

print(f"Text: '{text}' ({len(text)} chars)")
print(f"Pattern: '{pattern}' ({len(pattern)} chars)")
print(f"Matches at: {positions}")
print(f"Iterations: {bms.iterations} (brute-force: {brute_force_iters})")
print(f"Shift is dead: {bms.iterations == brute_force_iters}")
print(f"\nReason: reassigning `i` inside Python `for` loop has no effect.")
print(f"The `for` loop always takes the next value from range().")
