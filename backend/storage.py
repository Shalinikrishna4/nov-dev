"""
Session persistence — file-backed JSON storage.

Simple and dependency-free. For production you'd swap this for SQLite/Postgres,
but for a developer tool running locally, a single JSON file is plenty.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path

from models import Session


class SessionStore:
    """Thread-safe in-memory cache backed by a JSON file."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._data: dict[str, Session] = {}

    def load(self) -> None:
        if not self.path.exists():
            return
        try:
            with self.path.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            with self._lock:
                self._data = {
                    sid: Session(**rec) for sid, rec in raw.items()
                }
        except (json.JSONDecodeError, ValueError):
            # Corrupt or partial file — start fresh
            self._data = {}

    def save(self) -> None:
        with self._lock:
            serialised = {
                sid: s.model_dump() for sid, s in self._data.items()
            }
        with self.path.open("w", encoding="utf-8") as f:
            json.dump(serialised, f, indent=2, default=str)

    def get(self, session_id: str) -> Session | None:
        with self._lock:
            return self._data.get(session_id)

    def put(self, session: Session) -> None:
        with self._lock:
            self._data[session.id] = session
        # Write-through so a crash doesn't lose recent work
        self.save()

    def delete(self, session_id: str) -> bool:
        with self._lock:
            if session_id in self._data:
                del self._data[session_id]
                changed = True
            else:
                changed = False
        if changed:
            self.save()
        return changed

    def list_all(self) -> list[Session]:
        with self._lock:
            return list(self._data.values())
