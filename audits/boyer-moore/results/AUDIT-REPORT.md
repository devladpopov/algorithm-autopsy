# Boyer-Moore Audit Report

**Дата:** 2026-06-20
**Статус:** Phase 1 complete (local implementations + TheAlgorithms/Python)

---

## Результаты тестирования

Тестовый фреймворк: 35 статических тестов + property-based рандомные тесты (completeness, soundness, order, count).

```
Implementation                           Pass   Fail   Status
------------------------------------------------------------
Textbook naive (pre-Rytter)               835      0   OK
Horspool (bad char only)                  435      0   OK
Rytter correct (full BM)                  835      0   OK
Wrong init (Gotoh-type bug)               835      0   OK*
Bad char only (Sedgewick-style)           835      0   OK
Off-by-one shift bug                      835      0   OK*
TheAlgorithms/Python (REAL code)         2035      0   OK**
TheAlgorithms-style (full BM)            HANG   HANG   HANG
```

*На 200-500 рандомных тестах. Могут быть баги на более крупных входах.
**Корректен, но с критическим performance-багом.

---

## Найденные баги

### BUG #1: TheAlgorithms-style full BM (бесконечный цикл)

**Severity:** CRITICAL (infinite loop = denial of service)
**Trigger:** pattern == text (например text="abc", pattern="abc")
**Root cause:** После полного совпадения i декрементируется на m позиций (от m-1 до -1). Затем gs_table[0] сдвигает i назад на m, возвращая на исходную позицию. Цикл никогда не завершается.
**Affected:** Реализации, использующие i как одновременно индекс окна и индекс сканирования при right-to-left matching с good suffix shift.

Воспроизведение:
```python
bm_thealgorithms_style("abc", "abc")  # infinite loop
```

### BUG #2: TheAlgorithms/Python (dead shift code)

**Severity:** HIGH (performance degradation O(n/m) -> O(nm))
**Repo:** github.com/TheAlgorithms/Python (190k+ stars)
**File:** strings/boyer_moore_search.py
**Root cause:** В методе bad_character_heuristic() строка:
```python
for i in range(self.textLen - self.patLen + 1):
    ...
    i = (mismatch_index - match_index)  # BUG: no effect
```
Переприсвоение переменной `i` внутри Python for-loop не влияет на итерацию. Следующая итерация берёт следующее значение из range(). Bad character shift вообще не работает. Алгоритм проверяет каждую позицию, как brute force.

**Impact:** 190k+ stars, копируется студентами массово. Все, кто скопировали этот код, думают что у них Boyer-Moore O(n/m), а реально у них brute force O(nm).

### BUG #3: Microsoft STL std::boyer_moore_searcher (исторический, исправлен)

**Severity:** CRITICAL (incorrect results)
**Issues:** #713, #4376, #726
**Root cause:** Delta2 таблица вычислялась без Rytter correction (1980). Исправлено в PR #724.
**Status:** Fixed

### BUG #4: williamfiset/Algorithms BoyerMooreStringSearch.java (исторический, исправлен)

**Severity:** HIGH (incorrect results for specific patterns)
**Issue:** #174, Pattern "AABA" in "AABAACAADAABAABA" не находился
**Status:** Fixed in PR #187 (June 2020)

### OBSERVATION #5: Princeton algs4 BoyerMoore.java

**Severity:** MEDIUM (incomplete algorithm)
**Issue:** Реализует ТОЛЬКО bad character rule, без good suffix rule. Это НЕ полный Boyer-Moore. Не достигает заявленной O(m+n) worst-case сложности.
**Impact:** Самая преподаваемая реализация BM в университетах.

---

## Ключевые находки

1. **Good suffix table (delta2) остаётся главным источником багов.** Оригинальная статья 1977 года не содержала корректного алгоритма. Rytter дал первый правильный в 1980. 46 лет спустя реализации всё ещё ошибаются.

2. **TheAlgorithms/Python BM не работает как BM.** Самый популярный open-source образовательный репозиторий алгоритмов (190k+ stars) содержит мёртвый код сдвига. Это не баг корректности, но баг контракта: код не делает то, что обещает.

3. **Бесконечный цикл при pattern==text** воспроизводим в реализациях с pointer-based scanning (i как двойной индекс) при определённых значениях good suffix table.

---

## Следующие шаги

- [ ] Скачать и протестировать реализации с GitHub (zg/boyer-moore, sarpdag/boyermoore, magiclen/boyer-moore-magiclen)
- [ ] Написать issue/PR для TheAlgorithms/Python
- [ ] Протестировать C++ реализацию TheAlgorithms
- [ ] Начать аудит BLAST
- [ ] Формализовать результаты для публикации
