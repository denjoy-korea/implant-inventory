"""pyautogui 기반 DentWeb 자동화 시퀀스"""

import os
import time
import glob
import pyautogui


class DentwebRunner:
    def __init__(self, cfg: dict):
        self.window_title = cfg.get("dentweb_window_title", "DentWeb")
        self.download_dir = cfg["download_dir"]
        self.click_delay = cfg.get("click_delay_ms", 300) / 1000
        self.download_timeout = cfg.get("download_timeout_seconds", 30)
        # 저장 다이얼로그용 좌표 (config.json에서 로드)
        self.coords = cfg.get("coords", {})

    def _find_and_click(self, image_name: str, fallback_xy: tuple = None, double: bool = False) -> bool:
        """이미지 인식 우선, 실패 시 fallback 좌표 사용"""
        image_path = os.path.join(os.path.dirname(__file__), "images", image_name)
        try:
            location = pyautogui.locateOnScreen(image_path, confidence=0.8)
            if location:
                center = pyautogui.center(location)
                if double:
                    pyautogui.doubleClick(center)
                else:
                    pyautogui.click(center)
                time.sleep(self.click_delay)
                return True
        except Exception:
            pass

        if fallback_xy:
            if double:
                pyautogui.doubleClick(*fallback_xy)
            else:
                pyautogui.click(*fallback_xy)
            time.sleep(self.click_delay)
            return True
        return False

    def _click_coord(self, key: str, double: bool = False) -> bool:
        """config.json coords 섹션에서 좌표를 읽어 클릭"""
        coord = self.coords.get(key)
        if not coord:
            return False
        x, y = int(coord.get("x", 0)), int(coord.get("y", 0))
        if x == 0 and y == 0:
            return False
        if double:
            pyautogui.doubleClick(x, y)
        else:
            pyautogui.click(x, y)
        time.sleep(self.click_delay)
        return True

    def _activate_dentweb(self) -> bool:
        """DentWeb 창을 포그라운드로 활성화"""
        try:
            import pygetwindow as gw

            windows = gw.getWindowsWithTitle(self.window_title)
            if not windows:
                return False
            windows[0].activate()
            time.sleep(0.5)
            return True
        except Exception:
            return False

    def _wait_for_download(self) -> str | None:
        """다운로드 폴더에서 최신 xlsx 파일 감지"""
        deadline = time.time() + self.download_timeout
        before = set(glob.glob(os.path.join(self.download_dir, "*.xlsx")))

        while time.time() < deadline:
            current = set(glob.glob(os.path.join(self.download_dir, "*.xlsx")))
            new_files = current - before
            if new_files:
                return max(new_files, key=os.path.getmtime)
            time.sleep(1)
        return None

    def _handle_save_dialog(self) -> bool:
        """다른 이름으로 저장 다이얼로그: 폴더 이동 후 저장"""
        time.sleep(1.0)  # 다이얼로그 열림 대기

        # 1. 덴트웹 에이전트 폴더 더블클릭
        if not self._click_coord("save_dialog_agent_folder", double=True):
            return False
        time.sleep(0.5)

        # 2. exports 폴더 더블클릭
        if not self._click_coord("save_dialog_exports_folder", double=True):
            return False
        time.sleep(0.5)

        # 3. 저장(S) 버튼 클릭
        self._click_coord("save_dialog_save_button", double=False)
        time.sleep(0.5)
        return True

    def download_excel(self) -> str | None:
        """DentWeb 자동화 전체 시퀀스 -> Excel 파일 경로 반환"""
        if not self._activate_dentweb():
            return None

        # ── 1~8: 메뉴 클릭 시퀀스 (좌표 기반) ──────────────────
        sequence = [
            ("btn_stats",           False),  # 경영/통계 메뉴
            ("btn_implant",         False),  # 임플란트 수술통계
            ("btn_period_radio",    False),  # 특정기간 라디오버튼
            ("btn_date_start",      False),  # 시작일 클릭
            ("btn_cal_today_start", False),  # 달력 오늘(시작)
            ("btn_date_end",        False),  # 종료일 클릭
            ("btn_cal_today_end",   False),  # 달력 오늘(종료)
            ("btn_export",          False),  # 엑셀저장 버튼
        ]

        for key, double in sequence:
            if not self._click_coord(key, double=double):
                return None
            time.sleep(self.click_delay)

        # ── 9~11: 저장 다이얼로그 (에이전트 폴더 → exports → 저장) ──
        self._handle_save_dialog()

        return self._wait_for_download()

    def cleanup(self, file_path: str):
        """임시 파일 삭제"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass
