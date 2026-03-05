from __future__ import annotations

import mimetypes
import os
from pathlib import Path

import requests

from .config import UploadConfig


def upload_file(file_path: Path, cfg: UploadConfig) -> None:
    if not cfg.enabled:
        return

    if not cfg.url:
        raise ValueError("upload.url is empty.")

    token = os.getenv(cfg.token_env, "").strip()
    headers = dict(cfg.headers)
    if token:
        headers["Authorization"] = f"{cfg.token_prefix}{token}"

    mime_type, _ = mimetypes.guess_type(file_path.name)
    mime_type = mime_type or "application/octet-stream"

    with file_path.open("rb") as f:
        files = {cfg.file_field_name: (file_path.name, f, mime_type)}
        response = requests.post(
            cfg.url,
            headers=headers,
            files=files,
            data=cfg.form_fields,
            timeout=cfg.timeout_sec,
            verify=cfg.verify_ssl,
        )

    if response.status_code >= 400:
        raise RuntimeError(
            f"Upload failed. status={response.status_code}, body={response.text[:500]}"
        )
