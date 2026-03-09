from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


_ENV_PATTERN = re.compile(r"\$\{([A-Z0-9_]+)\}")


def _resolve_env_in_obj(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _resolve_env_in_obj(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve_env_in_obj(v) for v in value]
    if isinstance(value, str):
        return _ENV_PATTERN.sub(lambda m: os.getenv(m.group(1), ""), value)
    return value


def _to_abs_path(project_dir: Path, maybe_relative: str) -> Path:
    raw = Path(maybe_relative)
    if raw.is_absolute():
        return raw
    return (project_dir / raw).resolve()


@dataclass(frozen=True)
class UploadConfig:
    enabled: bool
    url: str
    timeout_sec: int
    verify_ssl: bool
    token_env: str
    token_prefix: str
    file_field_name: str
    headers: dict[str, str] = field(default_factory=dict)
    form_fields: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Config:
    project_dir: Path
    window_title_regex: str
    wait_timeout_sec: int
    poll_interval_sec: float
    startup_guard_hour: int
    post_action_sleep_sec: float
    excel_filename_prefix: str
    on_row_count_unknown: str
    output_dir: Path
    save_folder: Path  # 저장 다이얼로그에서 이동할 폴더 (미설정 시 output_dir 사용)
    state_file: Path
    log_dir: Path
    selectors: dict[str, Any]
    no_data_dialog_keywords: list[str]
    upload: UploadConfig


def load_config(path: str | Path) -> Config:
    config_path = Path(path).resolve()
    project_dir = config_path.parent

    with config_path.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    raw = _resolve_env_in_obj(raw)
    app = raw.get("app", {})
    paths = raw.get("paths", {})
    upload = raw.get("upload", {})

    output_dir = _to_abs_path(project_dir, paths.get("output_dir", "./exports"))
    state_file = _to_abs_path(project_dir, paths.get("state_file", "./state/run_state.json"))
    log_dir = _to_abs_path(project_dir, paths.get("log_dir", "./logs"))

    raw_save_folder = (paths.get("save_folder") or "").strip()
    save_folder = _to_abs_path(project_dir, raw_save_folder) if raw_save_folder else output_dir

    return Config(
        project_dir=project_dir,
        window_title_regex=app.get("window_title_regex", ".*덴트웹.*"),
        wait_timeout_sec=int(app.get("wait_timeout_sec", 20)),
        poll_interval_sec=float(app.get("poll_interval_sec", 0.5)),
        startup_guard_hour=int(app.get("startup_guard_hour", 22)),
        post_action_sleep_sec=float(app.get("post_action_sleep_sec", 0.5)),
        excel_filename_prefix=app.get("excel_filename_prefix", "implant_stats"),
        on_row_count_unknown=app.get("on_row_count_unknown", "abort"),
        output_dir=output_dir,
        save_folder=save_folder,
        state_file=state_file,
        log_dir=log_dir,
        selectors=raw.get("selectors", {}),
        no_data_dialog_keywords=raw.get("no_data_dialog_keywords", []),
        upload=UploadConfig(
            enabled=bool(upload.get("enabled", False)),
            url=upload.get("url", "").strip(),
            timeout_sec=int(upload.get("timeout_sec", 60)),
            verify_ssl=bool(upload.get("verify_ssl", True)),
            token_env=upload.get("token_env", "DENTWEB_UPLOAD_TOKEN"),
            token_prefix=upload.get("token_prefix", "Bearer "),
            file_field_name=upload.get("file_field_name", "file"),
            headers=upload.get("headers", {}) or {},
            form_fields=upload.get("form_fields", {}) or {},
        ),
    )
