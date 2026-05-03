"""
Static code analysis — runs without calling the LLM.

Computes a 5-axis health radar and a fallback complexity estimate. These are
fast (sub-millisecond) and free, so we run them on every code change in the
frontend without any API cost.
"""

from __future__ import annotations

import re


def compute_health_metrics(code: str, language: str) -> dict:
    """
    Score code on 5 axes (0-100, higher = better) and aggregate to an overall grade.

    Axes:
        Readability  — punished by long lines and absurdly long identifiers
        Simplicity   — punished by cyclomatic complexity and deep nesting
        Documentation — comment-to-code ratio
        Structure    — presence of named functions
        Safety       — penalty for magic numbers and obvious smells
    """
    if not code.strip():
        return _empty_metrics()

    lines = code.split("\n")
    non_blank = sum(1 for ln in lines if ln.strip())
    code_lines = sum(
        1 for ln in lines
        if ln.strip() and not ln.strip().startswith(("//", "#"))
    )
    comment_lines = sum(1 for ln in lines if re.match(r"^\s*(//|#)", ln))

    # Cyclomatic complexity proxy (count of branching keywords/operators)
    complexity = len(re.findall(
        r"\b(if|else if|elif|for|while|case|catch|&&|\|\||\?)\b", code
    ))

    # Nesting depth via brace counting (with a python ":" approximation)
    max_depth = 0
    depth = 0
    for ch in code:
        if ch == "{" or (ch == ":" and language == "python"):
            depth += 1
        elif ch == "}":
            depth -= 1
        max_depth = max(max_depth, depth)

    # Function count
    fn_count = len(re.findall(
        r"\b(function|def|fn|func)\s+\w+|=>\s*[{(]", code
    ))

    # Average line length
    avg_line_len = sum(len(ln) for ln in lines) / max(len(lines), 1)

    # Magic numbers (heuristic — ignores 0, 1, 2, 10, 100, 1000)
    common = {"100", "1000", "0", "1", "2", "10"}
    magic_numbers = sum(
        1 for n in re.findall(r"\b\d{2,}\b", code) if n not in common
    )

    # Long identifiers
    identifiers = re.findall(r"\b[a-zA-Z_]\w{0,}\b", code)
    long_idents = sum(1 for i in identifiers if len(i) > 20)

    # Score each axis
    readability = max(0, min(100, 100 - avg_line_len * 0.6 - long_idents * 5))
    simplicity = max(0, min(100, 100 - complexity * 4 - max_depth * 8))
    documentation = max(0, min(100,
        50 if code_lines == 0 else (comment_lines / code_lines) * 200 + 30
    ))
    structure = max(0, min(100,
        60 + min(40, fn_count * 8) if fn_count > 0 else 30
    ))
    safety = max(0, min(100, 100 - magic_numbers * 6))

    overall = round((readability + simplicity + documentation + structure + safety) / 5)
    grade = _grade(overall)

    return {
        "overall": overall,
        "grade": grade,
        "axes": [
            {"label": "Readability", "value": round(readability)},
            {"label": "Simplicity", "value": round(simplicity)},
            {"label": "Docs", "value": round(documentation)},
            {"label": "Structure", "value": round(structure)},
            {"label": "Safety", "value": round(safety)},
        ],
        "raw": {
            "lines": non_blank,
            "code_lines": code_lines,
            "comment_lines": comment_lines,
            "complexity": complexity,
            "max_depth": max_depth,
            "fn_count": fn_count,
            "magic_numbers": magic_numbers,
        },
    }


def _grade(score: int) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 55:
        return "C"
    if score >= 40:
        return "D"
    return "F"


def _empty_metrics() -> dict:
    return {
        "overall": 0,
        "grade": "F",
        "axes": [
            {"label": "Readability", "value": 0},
            {"label": "Simplicity", "value": 0},
            {"label": "Docs", "value": 0},
            {"label": "Structure", "value": 0},
            {"label": "Safety", "value": 0},
        ],
        "raw": {
            "lines": 0, "code_lines": 0, "comment_lines": 0,
            "complexity": 0, "max_depth": 0, "fn_count": 0,
            "magic_numbers": 0,
        },
    }


def estimate_complexity(code: str) -> dict:
    """
    Cheap fallback complexity estimator — used only when the LLM JSON parse fails.
    Counts loop nesting depth as a (very rough) Big-O approximation.
    """
    loop_kw = re.findall(r"\b(for|while)\b", code)
    nesting_estimate = min(len(loop_kw), 3)
    if nesting_estimate == 0:
        time = "O(1)"
    elif nesting_estimate == 1:
        time = "O(n)"
    elif nesting_estimate == 2:
        time = "O(n²)"
    else:
        time = "O(n³+)"
    return {
        "time": time,
        "space": "O(1)",
        "explanation": "Estimated from loop nesting depth (fallback heuristic).",
        "confidence": "low",
    }
