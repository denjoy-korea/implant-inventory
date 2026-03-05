from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import pyautogui
from pywinauto import Desktop
from pywinauto.application import Application
from pywinauto.keyboard import send_keys

from .config import Config


class DentwebAutomationError(RuntimeError):
    pass


@dataclass
class RunResult:
    status: str  # success | no_data
    excel_path: Path | None = None


class DentwebBot:
    def __init__(self, config: Config, logger, dry_run: bool = False) -> None:
        self.config = config
        self.logger = logger
        self.dry_run = dry_run
        self.app: Application | None = None
        self.main = None

    def run(self, target_day: date) -> RunResult:
        self._connect()
        self._navigate_to_report()
        self._set_specific_period(target_day)
        self._search()

        no_data = self._is_no_data()
        if no_data:
            self.logger.info("조회 결과가 없어서 엑셀 저장/업로드 없이 종료합니다.")
            return RunResult(status="no_data")

        excel_path = self._save_excel(target_day)
        return RunResult(status="success", excel_path=excel_path)

    def _connect(self) -> None:
        self.logger.info("덴트웹 메인 창 연결 시도")
        self.app = Application(backend="uia").connect(
            title_re=self.config.window_title_regex,
            timeout=self.config.wait_timeout_sec,
        )
        self.main = self.app.window(title_re=self.config.window_title_regex)
        self.main.wait("exists enabled visible ready", timeout=self.config.wait_timeout_sec)
        if not self.dry_run:
            self.main.set_focus()
        self.logger.info("덴트웹 메인 창 연결 완료")

    def _navigate_to_report(self) -> None:
        self._click("menu_management_stats")
        self._click("submenu_implant_stats")

    def _set_specific_period(self, target_day: date) -> None:
        yyyy_mm_dd = target_day.strftime("%Y-%m-%d")
        self._click("period_specific_radio")
        self._set_text("from_date_input", yyyy_mm_dd)
        self._set_text("to_date_input", yyyy_mm_dd)
        self.logger.info("특정기간 설정 완료: %s", yyyy_mm_dd)

    def _search(self) -> None:
        if "search_button" in self.config.selectors:
            self._click("search_button")
            self.logger.info("조회 버튼 클릭 완료")
        time.sleep(self.config.post_action_sleep_sec)

    def _is_no_data(self) -> bool:
        if self._find_and_close_no_data_dialog():
            return True

        row_count = self._count_result_rows()
        if row_count is None:
            mode = self.config.on_row_count_unknown.lower()
            if mode == "assume_data":
                self.logger.warning("행 개수 확인 실패, 데이터 있음으로 가정합니다.")
                return False
            if mode == "assume_no_data":
                self.logger.warning("행 개수 확인 실패, 데이터 없음으로 가정합니다.")
                return True
            raise DentwebAutomationError(
                "행 개수 확인 실패: selectors.result_grid를 보정하거나 on_row_count_unknown 설정을 조정하세요."
            )

        self.logger.info("조회 결과 행 개수: %s", row_count)
        return row_count == 0

    def _count_result_rows(self) -> int | None:
        grid = self._find_control("result_grid", required=False)
        if grid is None:
            return None

        try:
            data_items = grid.descendants(control_type="DataItem")
            if data_items:
                return len(data_items)
            list_items = grid.descendants(control_type="ListItem")
            if list_items:
                return len(list_items)
            return 0
        except Exception:
            return None

    def _find_and_close_no_data_dialog(self) -> bool:
        if not self.config.no_data_dialog_keywords:
            return False

        deadline = time.time() + 3
        while time.time() < deadline:
            for win in Desktop(backend="uia").windows():
                try:
                    text_blob = " ".join(t.strip() for t in win.texts() if t.strip())
                    if not text_blob:
                        continue
                    if any(keyword in text_blob for keyword in self.config.no_data_dialog_keywords):
                        self.logger.info("데이터 없음 팝업 감지: %s", text_blob[:120])
                        if not self.dry_run:
                            win.set_focus()
                            send_keys("{ENTER}")
                        return True
                except Exception:
                    continue
            time.sleep(self.config.poll_interval_sec)
        return False

    def _save_excel(self, target_day: date) -> Path:
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        before = set(self._list_excel_files())

        self._click("excel_save_button")
        self.logger.info("엑셀 저장 버튼 클릭 완료")
        self._confirm_save_dialog_if_present()

        deadline = time.time() + self.config.wait_timeout_sec
        while time.time() < deadline:
            after = self._list_excel_files()
            new_files = [f for f in after if f not in before]
            if new_files:
                newest = max(new_files, key=lambda p: p.stat().st_mtime)
                normalized = self._normalize_filename(newest, target_day)
                self.logger.info("엑셀 파일 저장 완료: %s", normalized)
                return normalized
            time.sleep(self.config.poll_interval_sec)

        raise DentwebAutomationError(
            f"엑셀 파일 생성 감지 실패: {self.config.output_dir}"
        )

    def _confirm_save_dialog_if_present(self) -> None:
        deadline = time.time() + 5
        while time.time() < deadline:
            try:
                dlg = Desktop(backend="uia").window(title_re=".*(저장|다른 이름으로 저장).*")
                if dlg.exists(timeout=0.5):
                    self.logger.info("저장 확인 창 감지, Enter 입력")
                    if not self.dry_run:
                        dlg.set_focus()
                        send_keys("{ENTER}")
                    return
            except Exception:
                pass
            time.sleep(self.config.poll_interval_sec)

    def _normalize_filename(self, file_path: Path, target_day: date) -> Path:
        ext = file_path.suffix or ".xlsx"
        base = f"{self.config.excel_filename_prefix}_{target_day.strftime('%Y%m%d')}"
        normalized = self.config.output_dir / f"{base}{ext}"
        if normalized.exists() and normalized.resolve() != file_path.resolve():
            normalized = self.config.output_dir / f"{base}_{int(time.time())}{ext}"
        if normalized.resolve() != file_path.resolve():
            file_path = file_path.rename(normalized)
        return file_path

    def _list_excel_files(self) -> list[Path]:
        paths = list(self.config.output_dir.glob("*.xls"))
        paths.extend(self.config.output_dir.glob("*.xlsx"))
        return paths

    def _find_control(self, selector_name: str, required: bool = True):
        spec = self.config.selectors.get(selector_name, {})
        candidates = spec.get("candidates", [])
        for candidate in candidates:
            try:
                ctrl = self.main.child_window(**candidate)
                if ctrl.exists(timeout=1):
                    return ctrl
            except Exception:
                continue

        if required:
            raise DentwebAutomationError(f"컨트롤을 찾지 못했습니다: {selector_name}")
        return None

    def _click(self, selector_name: str) -> None:
        if self.dry_run:
            self.logger.info("[DRY-RUN] click: %s", selector_name)
            return

        spec = self.config.selectors.get(selector_name, {})
        ctrl = self._find_control(selector_name, required=False)
        if ctrl is not None:
            ctrl.wait("enabled ready", timeout=self.config.wait_timeout_sec)
            ctrl.click_input()
            time.sleep(self.config.post_action_sleep_sec)
            return

        coords = self._extract_coords(spec)
        if coords is not None:
            pyautogui.click(coords[0], coords[1])
            time.sleep(self.config.post_action_sleep_sec)
            return

        raise DentwebAutomationError(f"클릭 대상 미설정: {selector_name}")

    def _set_text(self, selector_name: str, text: str) -> None:
        if self.dry_run:
            self.logger.info("[DRY-RUN] set_text: %s=%s", selector_name, text)
            return

        spec = self.config.selectors.get(selector_name, {})
        ctrl = self._find_control(selector_name, required=False)
        if ctrl is not None:
            try:
                ctrl.click_input()
                ctrl.set_edit_text(text)
                time.sleep(self.config.post_action_sleep_sec)
                return
            except Exception:
                ctrl.click_input()
                send_keys("^a{BACKSPACE}")
                send_keys(text, with_spaces=True)
                time.sleep(self.config.post_action_sleep_sec)
                return

        coords = self._extract_coords(spec)
        if coords is not None:
            pyautogui.click(coords[0], coords[1])
            send_keys("^a{BACKSPACE}")
            send_keys(text, with_spaces=True)
            time.sleep(self.config.post_action_sleep_sec)
            return

        raise DentwebAutomationError(f"텍스트 입력 대상 미설정: {selector_name}")

    @staticmethod
    def _extract_coords(spec: dict[str, Any]) -> tuple[int, int] | None:
        coords = spec.get("coords")
        if not coords:
            return None
        if isinstance(coords, dict) and "x" in coords and "y" in coords:
            return int(coords["x"]), int(coords["y"])
        if isinstance(coords, (list, tuple)) and len(coords) == 2:
            return int(coords[0]), int(coords[1])
        return None
