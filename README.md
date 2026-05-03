# NOVA.DEV — AI Code Assistant & Debugging Tool

> Full-stack AI-powered developer assistant. Analyzes runtime errors, explains code, optimizes performance, refactors, and generates tests through a structured prompt-engineering pipeline.

**Tech Stack:** `Python` · `FastAPI` · `React` · `Vite` · `Anthropic Claude API`

---

## What it does

NOVA.DEV is a five-mode AI code intelligence tool:

| Mode | What it does |
|---|---|
| **Debug** | Identifies root causes of runtime errors and produces a fix |
| **Explain** | Walks through what code does, including edge cases & gotchas |
| **Optimize** | Finds bottlenecks and rewrites code for speed |
| **Refactor** | Cleans up structure while preserving behavior |
| **Tests** | Generates comprehensive unit tests including edge cases |

Each mode runs a multi-stage **reasoning pipeline** (Tokenize → Trace → Hypothesize → Synthesize → Verify) that streams live to the browser via Server-Sent Events.

---

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   React Frontend    │  HTTP   │   FastAPI Backend    │  HTTPS  │  Anthropic API  │
│   (port 5173)       │◄───────►│   (port 8000)        │◄───────►│  (Claude Sonnet)│
│                     │   SSE   │                      │         │                 │
│  • Glassmorphic UI  │         │  • Prompt engineering│         │                 │
│  • Live pipeline    │         │  • Reasoning pipeline│         │                 │
│  • Health radar     │         │  • Session storage   │         │                 │
│  • Dashboard        │         │  • Static analysis   │         │                 │
│  • Diff viewer      │         │  • SSE streaming     │         │                 │
└─────────────────────┘         └──────────────────────┘         └─────────────────┘
```

**Why this architecture:**
- **Prompt engineering lives server-side** — iterate on prompts without redeploying the frontend, and never expose API keys to the browser.
- **SSE streaming** sends each pipeline stage to the UI in real time, so users see *what* the AI is reasoning about, not just a spinner.
- **JSON file persistence** keeps things dependency-free; swap for SQLite/Postgres in production.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/settings/keys)

### 1. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Open .env and paste your ANTHROPIC_API_KEY

uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. Verify with `curl http://localhost:8000/` — you should see a JSON status response.

API docs are auto-generated at `http://localhost:8000/docs` (FastAPI's Swagger UI).

### 2. Frontend setup

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Vite proxies `/api/*` requests to the backend automatically.

### 3. Try it

Open `http://localhost:5173`, hit `⌘K` for the command palette, click "Load Sample Code", and press `⌘↵` to run.

---

## API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/analyze` | POST | Run full code analysis (returns response in one shot) |
| `/api/analyze/stream` | POST | Same as above but streams pipeline events via SSE |
| `/api/followup` | POST | Continue conversation in an existing session |
| `/api/health` | POST | Static code-health metrics (5-axis radar, no LLM call) |
| `/api/complexity` | POST | Big-O time/space complexity estimation |
| `/api/sessions` | GET | List all saved sessions |
| `/api/sessions/{id}` | GET | Load a session |
| `/api/sessions/{id}` | DELETE | Delete a session |
| `/api/stats` | GET | Aggregate analytics across all sessions |
| `/api/modes` | GET | Available analysis modes & their config |

---

## Features

### Core
- **5 analysis modes** with mode-specific structured prompts
- **Live SSE pipeline trace** — watch the AI reason in real time
- **Multi-language support** — JS, TS, Python, Java, Go, Rust (auto-detected)
- **Conversation continuity** — ask follow-up questions in any session
- **Session persistence** — JSON-backed, survives restarts

### Polish
- **Glassmorphic command-deck UI** with animated mesh-gradient backdrop
- **Code health radar** — 5-axis scoring (Readability/Simplicity/Docs/Structure/Safety) with letter grade, debounced live updates
- **Big-O complexity estimator** — LLM-powered, dedicated panel
- **Side-by-side diff viewer** with LCS-based line diffing and stats
- **Dashboard** — aggregate analytics, usage by mode, by language, token spend estimate
- **Action chaining** — apply a fix, then "Optimize this" or "Test this" in one click
- **Command palette** (⌘K) — fuzzy search every action
- **Backend health indicator** — live online/offline pill in header

### Keyboard shortcuts
| Shortcut | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘↵` | Run analysis |
| `⌘H` | Open history |
| `⌘D` | Open dashboard |
| `⌘⇧N` | New session |

---

## Project structure

```
nova-dev/
├── backend/
│   ├── main.py            # FastAPI app & route handlers
│   ├── models.py          # Pydantic schemas
│   ├── prompts.py         # Structured prompt engineering (per-mode)
│   ├── analysis.py        # Static code-health metrics
│   ├── storage.py         # File-backed session store
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx                # Main orchestrator
    │   ├── main.jsx
    │   ├── index.css
    │   ├── components/
    │   │   ├── MeshBackground.jsx
    │   │   ├── CodeBlock.jsx      # Syntax highlighter + diff viewer
    │   │   ├── HealthRadar.jsx    # SVG pentagon radar
    │   │   ├── ReasoningGraph.jsx # Pipeline trace viz
    │   │   ├── ResponseBlock.jsx  # Markdown renderer
    │   │   ├── CommandPalette.jsx
    │   │   ├── HistoryDrawer.jsx
    │   │   └── Dashboard.jsx      # Aggregate analytics
    │   └── utils/
    │       ├── api.js             # Backend client + SSE helper
    │       ├── modes.js           # Mode config & sample code
    │       └── syntax.jsx         # 6-language highlighter + LCS diff
    ├── package.json
    ├── vite.config.js
    └── index.html
```

---

## How the prompt engineering works

Every mode has three pieces in `backend/prompts.py`:

1. **System prompt** — enforces output structure (headers, fenced code blocks, bullet lists). The model is instructed to produce sections like `### Root Cause`, `### Fixed Code`, `### What Changed`, etc., so the frontend can parse and render them differently.

2. **Pipeline description** — a list of named stages (`Tokenize`, `Trace`, `Hypothesize`...) that the streaming endpoint emits as live events. The frontend animates a graph as each stage advances.

3. **Mode metadata** — accent color, whether an error message is required, label, description.

Adding a new mode = add an entry to `MODE_CONFIG` and write its prompt. The frontend picks it up automatically via `/api/modes`.

---

## Troubleshooting

**"Backend connection failed"** — make sure `uvicorn main:app --reload` is running in `backend/`.

**"ANTHROPIC_API_KEY not configured"** — copy `.env.example` to `.env` in `backend/` and paste your key.

**Port conflicts** — change the port in `backend/main.py` (uvicorn line) and update `frontend/vite.config.js` proxy target.

---

## License

MIT — do whatever you want.
