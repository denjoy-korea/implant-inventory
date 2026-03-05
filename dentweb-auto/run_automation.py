#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from datetime import datetime

from dotenv import load_dotenv

from src.dentweb_automation.config import load_config
from src.dentweb_automation.dentweb_bot import DentwebAutomationError, DentwebBot
from src.dentweb_automation.logger import build_logger
from src.dentweb_automation.state import RunState, load_state, save_state
from src.dentweb_automation.uploader import upload_file


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dentweb implant report automation")
    parser.add_argument("--config", default="config.yaml", help="Path to config file")
    parser.add_argument(
        "--reason",
        default="manual",
        choices=["manual", "schedule", "startup"],
        help="Trigger reason",
    )
    parser.add_argument("--force", action="store_true", help="Ignore daily run guard")
    parser.add_argument("--dry-run", action="store_true", help="Do not click/type/upload")
    return parser.parse_args()


def should_run_today(state: RunState, reason: str, today: str, now_hour: int, cfg, force: bool, logger) -> bool:
    if force:
        return True

    if state.last_run_date == today and state.status in {"success", "no_data"}:
        logger.info("오늘 작업이 이미 완료되어 종료합니다. status=%s", state.status)
        return False

    if reason == "startup" and now_hour < cfg.startup_guard_hour:
        logger.info(
            "시작시 실행이지만 현재 시간이 %02d시라 종료합니다. (실행 기준: %02d시 이후)",
            now_hour,
            cfg.startup_guard_hour,
        )
        return False

    return True


def main() -> int:
    args = parse_args()
    load_dotenv()

    cfg = load_config(args.config)
    logger = build_logger(cfg.log_dir)
    now = datetime.now()
    today_iso = now.strftime("%Y-%m-%d")

    logger.info("==== Dentweb 자동화 시작 ====")
    logger.info("reason=%s dry_run=%s config=%s", args.reason, args.dry_run, args.config)

    state = load_state(cfg.state_file)
    if not should_run_today(
        state=state,
        reason=args.reason,
        today=today_iso,
        now_hour=now.hour,
        cfg=cfg,
        force=args.force,
        logger=logger,
    ):
        return 0

    try:
        bot = DentwebBot(config=cfg, logger=logger, dry_run=args.dry_run)
        result = bot.run(now.date())

        if result.status == "no_data":
            save_state(
                cfg.state_file,
                RunState(
                    last_run_date=today_iso,
                    status="no_data",
                    message="조회 결과 없음",
                    excel_path="",
                ),
            )
            logger.info("작업 종료: 데이터 없음")
            return 0

        if result.excel_path is None:
            raise DentwebAutomationError("엑셀 파일 경로가 비어 있습니다.")

        if not args.dry_run:
            upload_file(result.excel_path, cfg.upload)
            logger.info("업로드 완료: %s", result.excel_path)

        save_state(
            cfg.state_file,
            RunState(
                last_run_date=today_iso,
                status="success",
                message="완료",
                excel_path=str(result.excel_path),
            ),
        )
        logger.info("작업 종료: 성공")
        return 0
    except Exception as exc:
        logger.exception("작업 실패: %s", exc)
        save_state(
            cfg.state_file,
            RunState(
                last_run_date=today_iso,
                status="failed",
                message=str(exc),
                excel_path="",
            ),
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
