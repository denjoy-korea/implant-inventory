from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class RunState:
    last_run_date: str = ""
    status: str = ""  # success | no_data | failed
    message: str = ""
    excel_path: str = ""
    updated_at: str = ""

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RunState":
        return cls(
            last_run_date=str(data.get("last_run_date", "")),
            status=str(data.get("status", "")),
            message=str(data.get("message", "")),
            excel_path=str(data.get("excel_path", "")),
            updated_at=str(data.get("updated_at", "")),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "last_run_date": self.last_run_date,
            "status": self.status,
            "message": self.message,
            "excel_path": self.excel_path,
            "updated_at": self.updated_at,
        }


def load_state(path: Path) -> RunState:
    if not path.exists():
        return RunState()
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return RunState.from_dict(data)
    except Exception:
        return RunState()


def save_state(path: Path, state: RunState) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    state.updated_at = datetime.now().isoformat(timespec="seconds")
    with path.open("w", encoding="utf-8") as f:
        json.dump(state.to_dict(), f, ensure_ascii=False, indent=2)
