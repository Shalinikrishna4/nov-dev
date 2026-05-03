"""
Structured prompt engineering.

This is the heart of the reasoning pipeline. Each mode has:
  • a carefully tuned system prompt that enforces output structure
  • a multi-stage 'pipeline' description (used by the streaming endpoint
    to show a live trace of what the AI is doing)
  • metadata for the frontend (label, accent color, etc.)

Keeping all prompt logic on the server (rather than the client) means we
can iterate on prompts without redeploying the frontend, and we never
expose API keys to the browser.
"""

from __future__ import annotations


# ─── System prompts per mode ─────────────────────────────────────────────────
DEBUG_PROMPT = """You are an elite debugging assistant integrated into a developer IDE.
The user provides code and an error or unexpected behavior. Your job:

1. Identify the root cause precisely — not just symptoms.
2. Provide a fixed version of the code in a single fenced code block.
3. Explain the fix concisely with bullet-style reasoning.

Format your response EXACTLY as:

### Root Cause
<one paragraph: the precise root cause>

### Fixed Code
```<language>
<the complete corrected code>
```

### What Changed
- <change 1>
- <change 2>
- <change N>

### Why This Works
<one short paragraph>

Be precise. No filler. No "I hope this helps". Lead with the fix."""


EXPLAIN_PROMPT = """You are a senior engineer explaining code to a colleague. The user provides
code and optionally a specific question.

Format your response EXACTLY as:

### Summary
<one sentence: what this code does at a high level>

### How It Works
<2-4 paragraphs: walk through the logic, calling out key data flows, design decisions,
and non-obvious behavior. Use **bold** for variable names and `code` for inline code references.>

### Edge Cases & Gotchas
- <potential issue 1>
- <potential issue 2>
- <potential issue N>

Be substantive. Assume the reader is a strong developer — skip trivial explanations."""


OPTIMIZE_PROMPT = """You are a performance-obsessed senior engineer. The user provides code to
optimize. Identify the top 1-3 highest-impact optimizations.

Format your response EXACTLY as:

### Bottleneck Analysis
<one paragraph identifying where the real cost lives — algorithmic complexity,
redundant work, allocation pressure, I/O, etc.>

### Optimized Code
```<language>
<the optimized version>
```

### Optimizations Applied
- **<name>**: <one-line impact>
- **<name>**: <one-line impact>

### Performance Notes
<one short paragraph: complexity change, tradeoffs, when this matters>

Be honest — if the code is already well-optimized, say so and explain why. Don't fabricate improvements."""


REFACTOR_PROMPT = """You are a refactoring expert focused on clean code principles. The user
provides code to refactor. Apply principles: single responsibility, meaningful names,
remove duplication, reduce cognitive load.

Format your response EXACTLY as:

### Refactoring Goals
<one paragraph: what you'll improve and why>

### Refactored Code
```<language>
<the refactored code>
```

### Improvements
- **<name>**: <impact>
- **<name>**: <impact>

### Trade-offs
<honest discussion of any compromises — readability vs brevity, etc.>

Preserve behavior. Don't change the public API unless asked."""


TEST_PROMPT = """You are a test engineering expert. Generate comprehensive unit tests for the
user's code. Cover happy paths AND edge cases (empty input, null/undefined, boundary
values, type errors).

Format your response EXACTLY as:

### Test Strategy
<one paragraph: what you're testing and why>

### Test Code
```<language>
<complete test file with imports>
```

### Coverage Notes
- **<scenario>**: <what it verifies>

### Edge Cases Covered
- <edge case 1>
- <edge case 2>

Use the appropriate testing framework for the language (jest for JS/TS, pytest for Python,
JUnit for Java, testing for Go, #[test] for Rust)."""


# ─── Pipeline descriptions (frontend uses these for the live trace) ──────────
DEBUG_PIPELINE = [
    {"label": "Tokenize", "text": "Parsing source code AST", "subtask": "Lexical analysis"},
    {"label": "Trace", "text": "Mapping error trace to source location", "subtask": "Cross-referencing line numbers"},
    {"label": "Hypothesize", "text": "Generating root cause candidates", "subtask": "Ranking by likelihood"},
    {"label": "Synthesize", "text": "Constructing minimal fix", "subtask": "Validating against type rules"},
    {"label": "Verify", "text": "Confirming behavioral correctness", "subtask": "Edge case sweep"},
]

EXPLAIN_PIPELINE = [
    {"label": "Tokenize", "text": "Parsing source structure", "subtask": "Building AST"},
    {"label": "Trace", "text": "Following data and control flow", "subtask": "Building call graph"},
    {"label": "Identify", "text": "Recognizing patterns and idioms", "subtask": "Pattern matching"},
    {"label": "Compose", "text": "Drafting walkthrough", "subtask": "Audience: senior engineer"},
]

OPTIMIZE_PIPELINE = [
    {"label": "Tokenize", "text": "Parsing source code", "subtask": "Lexical analysis"},
    {"label": "Profile", "text": "Computing complexity bounds", "subtask": "Big-O analysis"},
    {"label": "Identify", "text": "Locating hot paths", "subtask": "Allocation pressure check"},
    {"label": "Rewrite", "text": "Applying optimization patterns", "subtask": "Memoization, vectorization"},
    {"label": "Verify", "text": "Confirming behavioral equivalence", "subtask": "Test invariants"},
]

REFACTOR_PIPELINE = [
    {"label": "Tokenize", "text": "Parsing source structure", "subtask": "Building AST"},
    {"label": "Smell", "text": "Detecting code smells", "subtask": "Long functions, duplication, naming"},
    {"label": "Plan", "text": "Designing refactoring sequence", "subtask": "Preserving behavior"},
    {"label": "Apply", "text": "Restructuring code", "subtask": "Extract, rename, simplify"},
]

TEST_PIPELINE = [
    {"label": "Tokenize", "text": "Parsing function signatures", "subtask": "Identifying I/O"},
    {"label": "Analyze", "text": "Identifying inputs and edges", "subtask": "Boundary detection"},
    {"label": "Generate", "text": "Composing test cases", "subtask": "Happy paths + edges"},
    {"label": "Frame", "text": "Wrapping in test framework", "subtask": "Standard conventions"},
]


# ─── Mode registry ───────────────────────────────────────────────────────────
MODE_CONFIG = {
    "debug": {
        "label": "Debug",
        "description": "Find and fix runtime errors",
        "system_prompt": DEBUG_PROMPT,
        "pipeline": DEBUG_PIPELINE,
        "needs_error": True,
        "accent": "#f87171",
    },
    "explain": {
        "label": "Explain",
        "description": "Understand any codebase",
        "system_prompt": EXPLAIN_PROMPT,
        "pipeline": EXPLAIN_PIPELINE,
        "needs_error": False,
        "accent": "#22d3ee",
    },
    "optimize": {
        "label": "Optimize",
        "description": "Speed up & simplify code",
        "system_prompt": OPTIMIZE_PROMPT,
        "pipeline": OPTIMIZE_PIPELINE,
        "needs_error": False,
        "accent": "#fbbf24",
    },
    "refactor": {
        "label": "Refactor",
        "description": "Clean up code structure",
        "system_prompt": REFACTOR_PROMPT,
        "pipeline": REFACTOR_PIPELINE,
        "needs_error": False,
        "accent": "#c084fc",
    },
    "test": {
        "label": "Tests",
        "description": "Generate unit tests",
        "system_prompt": TEST_PROMPT,
        "pipeline": TEST_PIPELINE,
        "needs_error": False,
        "accent": "#34d399",
    },
}


def build_system_prompt(mode: str) -> str:
    """Resolve a mode id to its system prompt."""
    cfg = MODE_CONFIG.get(mode)
    if not cfg:
        raise ValueError(f"Unknown mode: {mode}")
    return cfg["system_prompt"]


def build_user_message(code: str, language: str, error_text: str, cfg: dict) -> str:
    """Build the user-side message that wraps the code and error context."""
    msg = f"Language: {language}\n\nCode:\n```{language}\n{code}\n```"
    if error_text.strip():
        if cfg["needs_error"]:
            msg += f"\n\nError / Unexpected Behavior:\n```\n{error_text}\n```"
        else:
            msg += f"\n\nUser context: {error_text.strip()}"
    return msg
