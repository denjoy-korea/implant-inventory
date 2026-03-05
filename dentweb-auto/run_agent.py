#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

from src.dentweb_automation.config import load_config


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dentweb remote automation agent")
    parser.add_argument("--config", default="config.yaml", help="Path to config file")
    parser.add_argument("--poll-sec", type=int, default=60, help="Polling interval in seconds")
    return parser.parse_args()


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing env: {name}")
    return value


def sign_in(supabase_url: str, anon_key: str, email: str, password: str) -> str:
    endpoint = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    res = requests.post(
        endpoint,
        headers={
            "apikey": anon_key,
            "Content-Type": "application/json",
        },
        json={"email": email, "password": password},
        timeout=30,
    )
    if res.status_code >= 400:
        raise RuntimeError(f"Sign-in failed: HTTP {res.status_code} {res.text[:300]}")
    data = res.json()
    token = str(data.get("access_token", "")).strip()
    if not token:
        raise RuntimeError("Sign-in failed: access_token missing")
    return token


def call_automation(
    automation_url: str,
    anon_key: str,
    access_token: str,
    body: dict[str, Any],
) -> dict[str, Any]:
    res = requests.post(
        automation_url,
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=30,
    )
    if res.status_code == 401:
        raise PermissionError("unauthorized")
    if res.status_code >= 400:
        raise RuntimeError(f"Automation API failed: HTTP {res.status_code} {res.text[:300]}")
    return res.json()


def read_run_status(state_file: Path) -> tuple[str, str]:
    if not state_file.exists():
        return ("failed", "state file not found")
    try:
        data = json.loads(state_file.read_text(encoding="utf-8"))
    except Exception:
        return ("failed", "state file parse failed")
    status = str(data.get("status", "failed")).strip()
    message = str(data.get("message", "")).strip()
    if status not in {"success", "no_data", "failed"}:
        status = "failed"
    return (status, message[:1000])


def run_once(config_path: str) -> int:
    cmd = [
        sys.executable,
        "run_automation.py",
        "--config",
        config_path,
        "--reason",
        "schedule",
        "--force",
    ]
    return subprocess.call(cmd)


def main() -> int:
    args = parse_args()
    load_dotenv()

    cfg = load_config(args.config)
    supabase_url = required_env("VITE_SUPABASE_URL")
    anon_key = required_env("VITE_SUPABASE_ANON_KEY")
    email = required_env("DENTWEB_AGENT_EMAIL")
    password = required_env("DENTWEB_AGENT_PASSWORD")
    automation_url = os.getenv(
        "DENTWEB_AUTOMATION_URL",
        f"{supabase_url.rstrip('/')}/functions/v1/dentweb-automation",
    ).strip()
    poll_sec = max(15, int(args.poll_sec))

    print(f"[agent] polling: {automation_url} (every {poll_sec}s)")

    access_token: str | None = None
    while True:
        try:
            if not access_token:
                access_token = sign_in(supabase_url, anon_key, email, password)
                print("[agent] signed in")

            claim = call_automation(
                automation_url,
                anon_key,
                access_token,
                {"action": "claim_run"},
            )

            should_run = bool(claim.get("should_run"))
            reason = str(claim.get("reason", "")).strip()

            if should_run:
                print(f"[agent] run requested ({reason})")
                # 기존 uploader.py가 DENTWEB_UPLOAD_TOKEN 환경변수를 사용하므로
                # 에이전트 로그인 JWT를 그대로 주입해 업로드 인증에 재사용한다.
                os.environ["DENTWEB_UPLOAD_TOKEN"] = access_token
                rc = run_once(args.config)
                status, message = read_run_status(cfg.state_file)
                if rc != 0 and status != "failed":
                    status = "failed"
                    message = message or f"run_automation exit code: {rc}"

                call_automation(
                    automation_url,
                    anon_key,
                    access_token,
                    {
                        "action": "report_run",
                        "status": status,
                        "message": message,
                    },
                )
                print(f"[agent] reported: {status}")

            time.sleep(poll_sec)
        except PermissionError:
            print("[agent] token expired or unauthorized. retry sign-in...")
            access_token = None
            time.sleep(3)
        except KeyboardInterrupt:
            print("[agent] stopped")
            return 0
        except Exception as exc:
            print(f"[agent] error: {exc}")
            time.sleep(5)


if __name__ == "__main__":
    raise SystemExit(main())
