"""
Boyer-Moore implementations for audit.
Each function: search(text, pattern) -> list of 0-indexed positions.
"""

from typing import List


# ============================================================
# Implementation 1: Full Boyer-Moore (textbook, pre-Rytter)
# Based on common textbook presentations that may have delta2 bugs
# ============================================================

def bm_textbook_naive(text: str, pattern: str) -> List[int]:
    """Textbook BM with potentially buggy good suffix (pre-Rytter)."""
    if not pattern or not text or len(pattern) > len(text):
        return []

    m = len(pattern)
    n = len(text)

    # Bad character table
    bad_char = {}
    for i in range(m):
        bad_char[pattern[i]] = i

    # Good suffix table (naive version - may have bugs)
    # This is the version commonly found in textbooks before Rytter's fix
    suffix = [0] * m
    suffix[m - 1] = m

    g = m - 1
    f = 0
    for i in range(m - 2, -1, -1):
        if i > g and suffix[i + m - 1 - f] < i - g:
            suffix[i] = suffix[i + m - 1 - f]
        else:
            if i < g:
                g = i
            f = i
            while g >= 0 and pattern[g] == pattern[g + m - 1 - f]:
                g -= 1
            suffix[i] = f - g

    # Build shift table from suffix
    shift = [m] * m

    j = 0
    for i in range(m - 1, -1, -1):
        if suffix[i] == i + 1:
            while j < m - 1 - i:
                if shift[j] == m:
                    shift[j] = m - 1 - i
                j += 1

    for i in range(m - 1):
        shift[m - 1 - suffix[i]] = m - 1 - i

    # Search
    results = []
    i = 0
    while i <= n - m:
        j = m - 1
        while j >= 0 and pattern[j] == text[i + j]:
            j -= 1
        if j < 0:
            results.append(i)
            i += shift[0]
        else:
            bc_shift = j - bad_char.get(text[i + j], -1)
            gs_shift = shift[j]
            i += max(bc_shift, gs_shift)

    return results


# ============================================================
# Implementation 2: Boyer-Moore-Horspool (bad character only)
# Common simplified version
# ============================================================

def bm_horspool(text: str, pattern: str) -> List[int]:
    """Boyer-Moore-Horspool: only bad character rule."""
    if not pattern or not text or len(pattern) > len(text):
        return []

    m = len(pattern)
    n = len(text)

    # Bad character table: shift based on last char of window
    skip = {}
    for i in range(m - 1):  # exclude last char
        skip[pattern[i]] = m - 1 - i

    results = []
    i = 0
    while i <= n - m:
        j = m - 1
        while j >= 0 and text[i + j] == pattern[j]:
            j -= 1
        if j < 0:
            results.append(i)
            # Shift by 1 after match (simple approach)
            i += 1
        else:
            i += skip.get(text[i + m - 1], m)

    return results


# ============================================================
# Implementation 3: Full Boyer-Moore with Rytter correction
# This should be the correct version
# ============================================================

def bm_rytter_correct(text: str, pattern: str) -> List[int]:
    """Full BM with correct good suffix table (Rytter 1980)."""
    if not pattern or not text or len(pattern) > len(text):
        return []

    m = len(pattern)
    n = len(text)

    # Bad character table
    bad_char = [-1] * 256
    for i in range(m):
        bad_char[ord(pattern[i]) % 256] = i

    # Compute suffix array
    suffix = [0] * m
    suffix[m - 1] = m
    g = m - 1
    f = 0
    for i in range(m - 2, -1, -1):
        if i > g and suffix[i + m - 1 - f] < i - g:
            suffix[i] = suffix[i + m - 1 - f]
        else:
            if i < g:
                g = i
            f = i
            while g >= 0 and pattern[g] == pattern[g + m - 1 - f]:
                g -= 1
            suffix[i] = f - g

    # Good suffix table with Rytter correction
    good_suffix = [m] * m

    # Case 2: matching suffix is also a prefix of pattern
    j = 0
    for i in range(m - 1, -1, -1):
        if suffix[i] == i + 1:
            while j < m - 1 - i:
                if good_suffix[j] == m:
                    good_suffix[j] = m - 1 - i
                j += 1

    # Case 1: matching suffix occurs elsewhere in pattern
    for i in range(m - 1):
        good_suffix[m - 1 - suffix[i]] = m - 1 - i

    # Search
    results = []
    i = 0
    while i <= n - m:
        j = m - 1
        while j >= 0 and pattern[j] == text[i + j]:
            j -= 1
        if j < 0:
            results.append(i)
            i += good_suffix[0]
        else:
            bc_shift = j - bad_char[ord(text[i + j]) % 256]
            gs_shift = good_suffix[j]
            i += max(bc_shift, gs_shift)

    return results


# ============================================================
# Implementation 4: Common buggy version (wrong initialization)
# Mimics a common error pattern found in implementations
# ============================================================

def bm_wrong_init(text: str, pattern: str) -> List[int]:
    """BM with intentionally wrong good suffix initialization.
    Simulates the Gotoh-type initialization bug."""
    if not pattern or not text or len(pattern) > len(text):
        return []

    m = len(pattern)
    n = len(text)

    # Bad character table
    bad_char = {}
    for i in range(m):
        bad_char[pattern[i]] = i

    # Good suffix with WRONG initialization (all zeros instead of m)
    good_suffix = [0] * m  # BUG: should be [m] * m

    # Suffix computation
    suffix = [0] * m
    suffix[m - 1] = m
    g = m - 1
    f = 0
    for i in range(m - 2, -1, -1):
        if i > g and suffix[i + m - 1 - f] < i - g:
            suffix[i] = suffix[i + m - 1 - f]
        else:
            if i < g:
                g = i
            f = i
            while g >= 0 and pattern[g] == pattern[g + m - 1 - f]:
                g -= 1
            suffix[i] = f - g

    for i in range(m - 1):
        good_suffix[m - 1 - suffix[i]] = m - 1 - i

    # Search
    results = []
    i = 0
    while i <= n - m:
        j = m - 1
        while j >= 0 and pattern[j] == text[i + j]:
            j -= 1
        if j < 0:
            results.append(i)
            i += max(good_suffix[0], 1)
        else:
            bc_shift = j - bad_char.get(text[i + j], -1)
            gs_shift = max(good_suffix[j], 1)  # Ensure at least 1
            i += max(bc_shift, gs_shift)

    return results


# ============================================================
# Implementation 5: Bad character only, no good suffix
# (like Princeton algs4 / Sedgewick)
# ============================================================

def bm_bad_char_only(text: str, pattern: str) -> List[int]:
    """BM with only bad character rule (Sedgewick-style)."""
    if not pattern or not text or len(pattern) > len(text):
        return []

    m = len(pattern)
    n = len(text)

    # Bad character table
    right = {}
    for i in range(m):
        right[pattern[i]] = i

    results = []
    i = 0
    while i <= n - m:
        skip = -1
        for j in range(m - 1, -1, -1):
            if pattern[j] != text[i + j]:
                skip = j - right.get(text[i + j], -1)
                if skip < 1:
                    skip = 1
                break
        if skip == -1:
            results.append(i)
            i += 1  # Move by 1 after match
        else:
            i += skip

    return results


# ============================================================
# Implementation 6: Off-by-one in shift (common bug)
# ============================================================

def bm_off_by_one(text: str, pattern: str) -> List[int]:
    """BM with off-by-one error in bad character shift."""
    if not pattern or not text or len(pattern) > len(text):
        return []

    m = len(pattern)
    n = len(text)

    bad_char = {}
    for i in range(m):
        bad_char[pattern[i]] = i

    results = []
    i = 0
    while i <= n - m:
        j = m - 1
        while j >= 0 and pattern[j] == text[i + j]:
            j -= 1
        if j < 0:
            results.append(i)
            i += 1
        else:
            # BUG: should be j - bad_char.get(..., -1)
            # Using j - 1 instead of j
            bc_shift = (j - 1) - bad_char.get(text[i + j], -1)
            if bc_shift < 1:
                bc_shift = 1
            i += bc_shift

    return results


# ============================================================
# Implementation 7: TheAlgorithms-style Python BM
# Typical educational implementation
# ============================================================

def bm_thealgorithms_style(text: str, pattern: str) -> List[int]:
    """Typical TheAlgorithms/Python style BM implementation."""
    if not pattern or not text or len(pattern) > len(text):
        return []

    m = len(pattern)
    n = len(text)

    # Preprocessing: bad character heuristic
    def bad_character_table(pat):
        table = {}
        for i in range(len(pat) - 1):
            table[pat[i]] = len(pat) - 1 - i
        return table

    bc_table = bad_character_table(pattern)

    # Good suffix heuristic
    def good_suffix_table(pat):
        m = len(pat)
        table = [0] * (m + 1)
        last_prefix = m

        for i in range(m - 1, -1, -1):
            if pat[i:] == pat[:m - i]:
                last_prefix = i + 1
            table[i] = last_prefix + m - 1 - i

        for i in range(m - 1):
            slen = 0
            while slen < i and pat[i - slen] == pat[m - 1 - slen]:
                slen += 1
            if pat[i - slen] != pat[m - 1 - slen]:
                table[m - 1 - slen] = m - 1 - i + slen

        return table

    gs_table = good_suffix_table(pattern)

    # Search
    results = []
    i = m - 1
    while i < n:
        j = m - 1
        while j >= 0 and text[i] == pattern[j]:
            i -= 1
            j -= 1
        if j < 0:
            results.append(i + 1)
            i += gs_table[0]
        else:
            bc_shift = bc_table.get(text[i], m)
            gs_shift = gs_table[j + 1]
            i += max(bc_shift, gs_shift)

    return results
