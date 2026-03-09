"""DenJOY 덴트웹 에이전트 GUI"""

import json
import os
import sys
import threading
import time
import tkinter as tk
from tkinter import ttk, messagebox
import traceback

from config import load_config, DEFAULTS, SERVER_URL
from api_client import ApiClient
from dentweb_runner import DentwebRunner
from logger import AgentLogger

CONFIG_PATH = "config.json"
VERSION = "3.5.1"

# ── 색상/스타일 ──────────────────────────────────────────────
BG = "#1e1e2e"
CARD = "#2a2a3e"
GREEN = "#3ecf8e"
GREEN_DARK = "#2ea87a"
TEXT = "#e2e8f0"
TEXT_MUTED = "#94a3b8"
BORDER = "#3a3a50"
RED = "#f87171"
AMBER = "#fbbf24"


def apply_style(root):
    root.configure(bg=BG)
    style = ttk.Style(root)
    style.theme_use("default")
    style.configure("TFrame", background=BG)


# ── 커스텀 토글 스위치 ────────────────────────────────────────
class ToggleSwitch(tk.Canvas):
    W, H = 46, 26

    def __init__(self, parent, variable: tk.BooleanVar, bg=BG, command=None, **kwargs):
        super().__init__(parent, width=self.W, height=self.H,
                         bg=bg, highlightthickness=0, cursor="hand2", **kwargs)
        self._var = variable
        self._cmd = command
        self.bind("<Button-1>", self._click)
        self._var.trace_add("write", lambda *_: self._draw())
        self._draw()

    def _click(self, _event):
        self._var.set(not self._var.get())
        if self._cmd:
            self._cmd()

    def _draw(self):
        self.delete("all")
        on = self._var.get()
        w, h = self.W, self.H
        r = h // 2
        color = GREEN if on else "#4a4a60"
        # 배경 알약 모양
        self.create_oval(0, 0, h, h, fill=color, outline="")
        self.create_oval(w - h, 0, w, h, fill=color, outline="")
        self.create_rectangle(r, 0, w - r, h, fill=color, outline="")
        # 슬라이딩 원
        pad = 3
        cx = w - r if on else r
        self.create_oval(cx - r + pad, pad, cx + r - pad, h - pad,
                         fill="white", outline="")


# ── 메인 앱 ─────────────────────────────────────────────────
class AgentApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title(f"DenJOY 덴트웹 에이전트  v{VERSION}")
        self.root.geometry("380x480")
        self.root.resizable(False, False)
        self.root.configure(bg=BG)
        apply_style(self.root)

        # 아이콘 설정 (없으면 무시)
        try:
            icon_path = resource_path("icon.ico")
            if os.path.exists(icon_path):
                self.root.iconbitmap(icon_path)
        except Exception:
            pass

        self.cfg = None
        self.api = None
        self.runner = None
        self.log = None
        self._running = False
        self._poll_thread = None

        self._build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── UI 빌드 ──────────────────────────────────────────────
    def _build_ui(self):
        """config.json 존재 여부에 따라 초기 화면 분기"""
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                if cfg.get("agent_token"):
                    self._build_main_screen(cfg)
                    return
            except Exception:
                pass
        self._build_token_screen()

    def _clear(self):
        for w in self.root.winfo_children():
            w.destroy()

    # ── 토큰 입력 화면 ───────────────────────────────────────
    def _build_token_screen(self):
        self._clear()
        self.root.geometry("360x400")

        frame = tk.Frame(self.root, bg=BG)
        frame.pack(expand=True, fill="both", padx=32, pady=24)

        # 로고 영역
        logo_box = tk.Frame(frame, bg=GREEN, width=64, height=64)
        logo_box.pack()
        logo_box.pack_propagate(False)
        tk.Label(logo_box, text="🦷", font=("", 28), bg=GREEN).pack(expand=True)

        tk.Label(frame, text="DenJOY 덴트웹 에이전트",
                 font=("Malgun Gothic", 14, "bold"), bg=BG, fg=TEXT).pack(pady=(12, 2))
        tk.Label(frame, text="병원 PC에서 덴트웹 데이터를 자동 수집합니다",
                 font=("Malgun Gothic", 9), bg=BG, fg=TEXT_MUTED).pack()

        # 토큰 입력
        tk.Label(frame, text="에이전트 토큰", font=("Malgun Gothic", 10, "bold"),
                 bg=BG, fg=TEXT, anchor="w").pack(fill="x", pady=(24, 4))
        self._token_var = tk.StringVar()
        entry = tk.Entry(frame, textvariable=self._token_var, font=("Consolas", 10),
                         bg=CARD, fg=TEXT, insertbackground=TEXT,
                         relief="flat", bd=0, highlightthickness=1,
                         highlightbackground=BORDER, highlightcolor=GREEN)
        entry.pack(fill="x", ipady=8, ipadx=8)
        entry.insert(0, "앱 설정에서 복사한 토큰 붙여넣기")
        entry.configure(fg=TEXT_MUTED)
        entry.bind("<FocusIn>", lambda e: self._clear_placeholder(entry))
        entry.bind("<FocusOut>", lambda e: self._restore_placeholder(entry))

        # 자동 실행 토글
        self._autostart_var = tk.BooleanVar(value=True)
        toggle_row = tk.Frame(frame, bg=BG)
        toggle_row.pack(fill="x", pady=(16, 0))

        tk.Label(toggle_row, text="컴퓨터 시작 시 자동 실행",
                 font=("Malgun Gothic", 10), bg=BG, fg=TEXT
                 ).pack(side="left")
        ToggleSwitch(toggle_row, self._autostart_var, bg=BG).pack(side="right")

        # 시작 버튼
        self._start_btn = tk.Button(
            frame, text="시작하기",
            font=("Malgun Gothic", 11, "bold"),
            bg=GREEN, fg="#fff", activebackground=GREEN_DARK,
            relief="flat", bd=0, cursor="hand2",
            command=self._on_start
        )
        self._start_btn.pack(fill="x", pady=(20, 0), ipady=10)

    def _clear_placeholder(self, entry):
        if entry.get() == "앱 설정에서 복사한 토큰 붙여넣기":
            entry.delete(0, "end")
            entry.configure(fg=TEXT)

    def _restore_placeholder(self, entry):
        if not entry.get():
            entry.insert(0, "앱 설정에서 복사한 토큰 붙여넣기")
            entry.configure(fg=TEXT_MUTED)

    def _on_start(self):
        token = self._token_var.get().strip()
        if not token or token == "앱 설정에서 복사한 토큰 붙여넣기":
            messagebox.showwarning("토큰 필요", "에이전트 토큰을 입력해주세요.")
            return

        self._start_btn.configure(state="disabled", text="연결 중...")
        self.root.update()

        cfg = {**DEFAULTS, "agent_token": token}
        try:
            api = ApiClient(cfg["server_url"], token)
            api.claim_run()  # 연결 확인
        except Exception as e:
            self._start_btn.configure(state="normal", text="시작하기")
            messagebox.showerror("연결 실패", f"토큰이 올바르지 않거나 서버에 연결할 수 없습니다.\n\n{e}")
            return

        # config.json 저장
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)

        # 자동 시작 설정
        if self._autostart_var.get():
            _set_autostart(True)

        self._build_main_screen(cfg)

    # ── 메인 화면 ────────────────────────────────────────────
    def _build_main_screen(self, cfg: dict):
        self._clear()
        self.root.geometry("400x520")

        for key, val in DEFAULTS.items():
            cfg.setdefault(key, val)
        self.cfg = cfg
        self.api = ApiClient(cfg["server_url"], cfg["agent_token"])
        self.runner = DentwebRunner(cfg)
        self.log = AgentLogger(cfg.get("log_file", "agent.log"), cfg.get("log_max_lines", 1000))

        pad = dict(padx=16, pady=0)

        # 헤더
        header = tk.Frame(self.root, bg=CARD, pady=14)
        header.pack(fill="x")
        tk.Label(header, text="● 서버 연결됨", font=("Malgun Gothic", 10),
                 bg=CARD, fg=GREEN).pack(side="left", padx=16)
        tk.Button(header, text="로그아웃", font=("Malgun Gothic", 9),
                  bg=CARD, fg=TEXT_MUTED, relief="flat", bd=0,
                  cursor="hand2", command=self._logout).pack(side="right", padx=16)

        # 최근 실행
        self._last_run_var = tk.StringVar(value="최근 실행: 기록 없음")
        tk.Label(self.root, textvariable=self._last_run_var,
                 font=("Malgun Gothic", 9), bg=BG, fg=TEXT_MUTED, anchor="w"
                 ).pack(fill="x", padx=16, pady=(12, 0))

        # 버튼 영역 — side="bottom" 으로 먼저 배치해야 log_frame 확장에 밀리지 않음
        btn_bot = tk.Frame(self.root, bg=BG)
        btn_bot.pack(side="bottom", fill="x", padx=16, pady=(0, 16))

        tk.Button(btn_bot, text="테스트",
                  font=("Malgun Gothic", 10),
                  bg=AMBER, fg="#000", activebackground="#d97706",
                  relief="flat", bd=0, cursor="hand2",
                  command=self._open_test
                  ).pack(side="left", fill="x", expand=True, ipady=8, padx=(0, 6))

        tk.Button(btn_bot, text="좌표 설정",
                  font=("Malgun Gothic", 10),
                  bg=CARD, fg=TEXT,
                  relief="flat", bd=0, cursor="hand2",
                  highlightthickness=1, highlightbackground=BORDER,
                  command=self._open_coord_settings
                  ).pack(side="left", fill="x", expand=True, ipady=8)

        btn_top = tk.Frame(self.root, bg=BG)
        btn_top.pack(side="bottom", fill="x", padx=16, pady=(0, 6))

        tk.Button(btn_top, text="지금 실행",
                  font=("Malgun Gothic", 10, "bold"),
                  bg=GREEN, fg="#fff", activebackground=GREEN_DARK,
                  relief="flat", bd=0, cursor="hand2",
                  command=self._run_now
                  ).pack(fill="x", ipady=8)

        # 활동 로그
        log_frame = tk.Frame(self.root, bg=CARD, bd=0, highlightthickness=1,
                             highlightbackground=BORDER)
        log_frame.pack(fill="both", expand=True, padx=16, pady=10)
        self._log_text = tk.Text(log_frame, bg=CARD, fg=TEXT_MUTED,
                                 font=("Consolas", 9), relief="flat",
                                 state="disabled", wrap="word")
        self._log_text.pack(fill="both", expand=True, padx=8, pady=8)

        self._append_log("에이전트 시작 - 서버 폴링 중...")
        self._start_polling()

    def _append_log(self, msg: str):
        ts = time.strftime("%H:%M:%S")
        line = f"[{ts}] {msg}\n"
        self._log_text.configure(state="normal")
        self._log_text.insert("end", line)
        self._log_text.see("end")
        self._log_text.configure(state="disabled")

    # ── 폴링 ─────────────────────────────────────────────────
    def _start_polling(self):
        self._running = True
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()

    def _poll_loop(self):
        poll_sec = self.cfg.get("poll_interval_seconds", 30)
        while self._running:
            try:
                result = self.api.claim_run()
                if result.get("should_run"):
                    self._append_log(f"실행 시작: {result.get('reason', '')}")
                    self._do_run()
            except Exception as e:
                self._append_log(f"폴링 오류: {e}")
            time.sleep(poll_sec)

    def _do_run(self):
        try:
            excel_path = self.runner.download_excel()
            if not excel_path:
                self.api.report_run("no_data", "Excel 파일을 찾을 수 없습니다")
                self._append_log("데이터 없음")
                return
            upload_url = f"{self.cfg['server_url']}/dentweb-upload"
            result = self.api.upload_file(upload_url, excel_path)
            if result.get("success"):
                inserted = result.get("inserted", 0)
                self.api.report_run("success", f"{inserted}건 업로드")
                self._append_log(f"완료: {inserted}건 업로드")
            else:
                err = result.get("error", "업로드 실패")
                self.api.report_run("failed", err)
                self._append_log(f"업로드 실패: {err}")
            self.runner.cleanup(excel_path)
        except Exception as e:
            self.api.report_run("failed", str(e)[:500])
            self._append_log(f"오류: {e}")

    def _run_now(self):
        threading.Thread(target=self._do_run, daemon=True).start()

    # ── 테스트 ───────────────────────────────────────────────
    def _open_test(self):
        TestWindow(self.root, self.cfg)

    # ── 좌표 설정 ────────────────────────────────────────────
    def _open_coord_settings(self):
        CoordSettingsWindow(self.root, self.cfg)

    # ── 로그아웃 ─────────────────────────────────────────────
    def _logout(self):
        if messagebox.askyesno("로그아웃", "로그아웃하면 config.json이 삭제됩니다.\n계속하시겠습니까?"):
            self._running = False
            try:
                os.remove(CONFIG_PATH)
            except Exception:
                pass
            self._build_token_screen()

    def _on_close(self):
        self._running = False
        self.root.destroy()

    def run(self):
        self.root.mainloop()


# ── 단계 정의 (테스트 + 좌표설정 공용) ──────────────────────────
STEPS = [
    ("경영/통계 메뉴",           "btn_stats",                  "click"),
    ("임플란트 수술통계",         "btn_implant",                "click"),
    ("엑셀저장 버튼",             "btn_export",                 "click"),
    ("덴트웹 에이전트 폴더",       "save_dialog_agent_folder",   "double"),
    ("exports 폴더",              "save_dialog_exports_folder", "double"),
    ("저장(S) 버튼",              "save_dialog_save_button",    "click"),
]


# ── 단계별 테스트 창 ─────────────────────────────────────────
class TestWindow:
    CANVAS_W = 560
    CANVAS_H = 380

    def __init__(self, parent, cfg: dict):
        self.cfg = cfg
        self.coords = {k: dict(v) for k, v in cfg.get("coords", {}).items()}
        self.step_idx = 0
        self._photo = None
        self._screen_size = None
        self._last_screenshot = None

        win = tk.Toplevel(parent)
        win.title("단계별 테스트")
        win.geometry("600x660")
        win.configure(bg=BG)
        win.grab_set()
        self.win = win
        self.parent = parent

        # ── 상단: 단계 네비게이션 ──────────────────────────────
        nav = tk.Frame(win, bg=BG)
        nav.pack(fill="x", padx=16, pady=(16, 0))

        self._prev_btn = tk.Button(nav, text="◀", font=("Malgun Gothic", 11),
                                   bg=CARD, fg=TEXT, relief="flat", bd=0,
                                   cursor="hand2", command=self._prev_step,
                                   width=3, padx=4)
        self._prev_btn.pack(side="left")

        self._step_label = tk.Label(nav, text="", font=("Malgun Gothic", 11, "bold"),
                                    bg=BG, fg=TEXT)
        self._step_label.pack(side="left", padx=10, expand=True)

        self._next_btn = tk.Button(nav, text="▶", font=("Malgun Gothic", 11),
                                   bg=CARD, fg=TEXT, relief="flat", bd=0,
                                   cursor="hand2", command=self._next_step,
                                   width=3, padx=4)
        self._next_btn.pack(side="right")

        # ── 좌표 표시 ──────────────────────────────────────────
        self._coord_var = tk.StringVar()
        tk.Label(win, textvariable=self._coord_var,
                 font=("Consolas", 9), bg=BG, fg=TEXT_MUTED
                 ).pack(anchor="w", padx=16, pady=(4, 0))

        # ── 스크린샷 캔버스 ────────────────────────────────────
        canvas_wrap = tk.Frame(win, bg=BORDER, padx=1, pady=1)
        canvas_wrap.pack(padx=16, pady=8)
        self._canvas = tk.Canvas(canvas_wrap, bg="#111",
                                 width=self.CANVAS_W, height=self.CANVAS_H,
                                 cursor="crosshair")
        self._canvas.pack()
        self._canvas.bind("<Button-1>", self._on_canvas_click)

        # 캔버스 안내 문구
        self._canvas.create_text(
            self.CANVAS_W // 2, self.CANVAS_H // 2,
            text="단계 실행 후 스크린샷이 표시됩니다\n스크린샷에서 클릭 → 해당 좌표로 업데이트",
            fill=TEXT_MUTED, font=("Malgun Gothic", 10), justify="center"
        )

        tk.Label(win, text="스크린샷에서 클릭하면 해당 위치로 좌표가 업데이트됩니다",
                 font=("Malgun Gothic", 8), bg=BG, fg=TEXT_MUTED).pack()

        # ── 액션 버튼 ──────────────────────────────────────────
        btn_row = tk.Frame(win, bg=BG)
        btn_row.pack(fill="x", padx=16, pady=(8, 4))

        self._run_btn = tk.Button(btn_row, text="▶  이 단계 실행",
                                  font=("Malgun Gothic", 10, "bold"),
                                  bg=GREEN, fg="#fff", activebackground=GREEN_DARK,
                                  relief="flat", bd=0, cursor="hand2",
                                  command=self._run_step)
        self._run_btn.pack(side="left", fill="x", expand=True, ipady=8, padx=(0, 6))

        tk.Button(btn_row, text="좌표 초기화",
                  font=("Malgun Gothic", 10),
                  bg=CARD, fg=RED,
                  relief="flat", bd=0, cursor="hand2",
                  highlightthickness=1, highlightbackground=BORDER,
                  command=self._reset_coord
                  ).pack(side="left", fill="x", expand=True, ipady=8)

        # ── 저장 ───────────────────────────────────────────────
        tk.Button(win, text="저장",
                  font=("Malgun Gothic", 11, "bold"),
                  bg=GREEN, fg="#fff", activebackground=GREEN_DARK,
                  relief="flat", bd=0, cursor="hand2",
                  command=self._save
                  ).pack(fill="x", padx=16, pady=(4, 16), ipady=10)

        self._update_step_ui()

    def _update_step_ui(self):
        label, key, click_type = STEPS[self.step_idx]
        total = len(STEPS)
        type_str = "더블클릭" if click_type == "double" else "클릭"
        self._step_label.configure(text=f"[{self.step_idx + 1}/{total}]  {label}  ({type_str})")
        coord = self.coords.get(key, {"x": 0, "y": 0})
        x, y = coord.get("x", 0), coord.get("y", 0)
        self._coord_var.set(f"현재 좌표: X={x}, Y={y}  {'(이미지 인식 사용)' if x == 0 and y == 0 else ''}")
        self._prev_btn.configure(state="normal" if self.step_idx > 0 else "disabled")
        self._next_btn.configure(state="normal" if self.step_idx < len(STEPS) - 1 else "disabled")

    def _prev_step(self):
        if self.step_idx > 0:
            self.step_idx -= 1
            self._update_step_ui()

    def _next_step(self):
        if self.step_idx < len(STEPS) - 1:
            self.step_idx += 1
            self._update_step_ui()

    def _run_step(self):
        self._run_btn.configure(state="disabled", text="실행 중...")
        self.win.update()

        _, key, click_type = STEPS[self.step_idx]
        coord = self.coords.get(key, {"x": 0, "y": 0})
        x, y = int(coord.get("x", 0)), int(coord.get("y", 0))

        # 창 숨기기 (스크린샷에 포함되지 않도록)
        self.win.withdraw()
        self.win.update()
        time.sleep(0.8)

        click_x, click_y = None, None
        try:
            if x != 0 or y != 0:
                if click_type == "double":
                    pyautogui.doubleClick(x, y)
                else:
                    pyautogui.click(x, y)
                click_x, click_y = x, y
            else:
                # 이미지 인식 시도
                img_path = os.path.join(
                    os.path.dirname(os.path.abspath(__file__)), "images", f"{key}.png"
                )
                if os.path.exists(img_path):
                    try:
                        loc = pyautogui.locateOnScreen(img_path, confidence=0.8)
                        if loc:
                            c = pyautogui.center(loc)
                            click_x, click_y = int(c.x), int(c.y)
                            if click_type == "double":
                                pyautogui.doubleClick(click_x, click_y)
                            else:
                                pyautogui.click(click_x, click_y)
                    except Exception:
                        pass

            time.sleep(0.5)
            screenshot = pyautogui.screenshot()
        except Exception as e:
            screenshot = None
            messagebox.showerror("오류", str(e), parent=self.win)
        finally:
            self.win.deiconify()
            self.win.lift()
            self.win.focus_force()

        if screenshot:
            self._display_screenshot(screenshot, click_x, click_y)

        self._run_btn.configure(state="normal", text="▶  이 단계 실행")

    def _display_screenshot(self, pil_img, click_x=None, click_y=None):
        try:
            from PIL import Image, ImageDraw, ImageTk
        except ImportError:
            messagebox.showwarning("PIL 없음", "Pillow가 설치되지 않아 스크린샷을 표시할 수 없습니다.", parent=self.win)
            return

        sw, sh = pil_img.size
        self._screen_size = (sw, sh)
        scale_x = self.CANVAS_W / sw
        scale_y = self.CANVAS_H / sh

        resized = pil_img.resize((self.CANVAS_W, self.CANVAS_H), Image.LANCZOS)

        if click_x is not None and click_y is not None:
            draw = ImageDraw.Draw(resized)
            cx = int(click_x * scale_x)
            cy = int(click_y * scale_y)
            r = 14
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline="#ff3030", width=3)
            draw.line([cx - r - 6, cy, cx + r + 6, cy], fill="#ff3030", width=2)
            draw.line([cx, cy - r - 6, cx, cy + r + 6], fill="#ff3030", width=2)

        self._photo = ImageTk.PhotoImage(resized)
        self._last_screenshot = pil_img
        self._canvas.delete("all")
        self._canvas.create_image(0, 0, anchor="nw", image=self._photo)

    def _on_canvas_click(self, event):
        """스크린샷 클릭 → 해당 화면 좌표로 업데이트"""
        if self._screen_size is None:
            return
        sw, sh = self._screen_size
        scale_x = self.CANVAS_W / sw
        scale_y = self.CANVAS_H / sh
        screen_x = int(event.x / scale_x)
        screen_y = int(event.y / scale_y)

        _, key, _ = STEPS[self.step_idx]
        self.coords[key] = {"x": screen_x, "y": screen_y}
        self._update_step_ui()

        if self._last_screenshot:
            self._display_screenshot(self._last_screenshot, screen_x, screen_y)

    def _reset_coord(self):
        _, key, _ = STEPS[self.step_idx]
        self.coords[key] = {"x": 0, "y": 0}
        self._update_step_ui()

    def _save(self):
        self.cfg["coords"] = self.coords
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(self.cfg, f, indent=2, ensure_ascii=False)
        messagebox.showinfo("저장 완료", "좌표 설정이 저장되었습니다.", parent=self.win)
        self.win.destroy()


# ── 좌표 설정 창 ─────────────────────────────────────────────
class CoordSettingsWindow:
    """단계별 좌표 설정 — 마우스 캡처 방식 (5초 카운트다운)"""

    COUNTDOWN = 5  # 캡처까지 대기 초

    def __init__(self, parent, cfg: dict):
        self.cfg = cfg
        self.coords = {k: dict(v) for k, v in cfg.get("coords", {}).items()}
        self._coord_vars: dict[str, tuple[tk.StringVar, tk.StringVar]] = {}

        win = tk.Toplevel(parent)
        win.title("좌표 설정")
        win.geometry("440x520")
        win.configure(bg=BG)
        win.attributes("-topmost", True)
        # grab_set() 제거 — after() 체이닝 차단의 근본 원인
        self.win = win
        self._win_geometry = "440x520"  # 원위치 복원용

        tk.Label(win, text="단계별 좌표 설정",
                 font=("Malgun Gothic", 13, "bold"), bg=BG, fg=TEXT
                 ).pack(pady=(16, 2))
        tk.Label(win,
                 text="캡처 버튼 클릭 → 창이 사라짐 → 5초 안에 마우스를 목표 위치로 이동",
                 font=("Malgun Gothic", 9), bg=BG, fg=TEXT_MUTED, wraplength=400
                 ).pack(pady=(0, 10))

        scroll_frame = tk.Frame(win, bg=BG)
        scroll_frame.pack(fill="both", expand=True, padx=16)

        for i, (label, key, click_type) in enumerate(STEPS):
            row = tk.Frame(scroll_frame, bg=CARD, pady=8, padx=12)
            row.pack(fill="x", pady=3)
            row.columnconfigure(1, weight=1)

            # 단계 이름 + 뱃지
            type_badge = "더블클릭" if click_type == "double" else "클릭"
            badge_color = AMBER if click_type == "double" else GREEN
            tk.Label(row, text=f"{i+1}. {label}",
                     font=("Malgun Gothic", 10, "bold"), bg=CARD, fg=TEXT
                     ).grid(row=0, column=0, sticky="w")
            tk.Label(row, text=type_badge, font=("Malgun Gothic", 8),
                     bg=badge_color, fg="#000", padx=5
                     ).grid(row=0, column=1, sticky="w", padx=(8, 0))

            # 현재 좌표 표시 (읽기 전용)
            coord = self.coords.get(key, {"x": 0, "y": 0})
            x_var = tk.StringVar(value=str(coord.get("x", 0)))
            y_var = tk.StringVar(value=str(coord.get("y", 0)))
            self._coord_vars[key] = (x_var, y_var)

            info_frame = tk.Frame(row, bg=CARD)
            info_frame.grid(row=1, column=0, columnspan=3, sticky="ew", pady=(6, 0))
            info_frame.columnconfigure(1, weight=1)

            tk.Label(info_frame, text="X:", font=("Malgun Gothic", 9), bg=CARD, fg=TEXT_MUTED
                     ).pack(side="left")
            tk.Entry(info_frame, textvariable=x_var, width=6,
                     font=("Consolas", 9), bg=BG, fg=TEXT, relief="flat",
                     insertbackground=TEXT
                     ).pack(side="left", padx=(2, 8))
            tk.Label(info_frame, text="Y:", font=("Malgun Gothic", 9), bg=CARD, fg=TEXT_MUTED
                     ).pack(side="left")
            tk.Entry(info_frame, textvariable=y_var, width=6,
                     font=("Consolas", 9), bg=BG, fg=TEXT, relief="flat",
                     insertbackground=TEXT
                     ).pack(side="left", padx=(2, 8))

            # 캡처 버튼
            capture_btn = tk.Button(
                info_frame, text="📍 캡처",
                font=("Malgun Gothic", 9, "bold"),
                bg=AMBER, fg="#000", activebackground="#d97706",
                relief="flat", bd=0, cursor="hand2",
                command=lambda k=key, xv=x_var, yv=y_var: self._start_capture(k, xv, yv)
            )
            capture_btn.pack(side="left", padx=(4, 0), ipady=3, ipadx=6)

        # 저장 버튼
        tk.Button(win, text="저장",
                  font=("Malgun Gothic", 11, "bold"),
                  bg=GREEN, fg="#fff", activebackground=GREEN_DARK,
                  relief="flat", bd=0, cursor="hand2",
                  command=self._save
                  ).pack(side="bottom", fill="x", padx=16, pady=16, ipady=10)

    def _start_capture(self, key: str, x_var: tk.StringVar, y_var: tk.StringVar):
        """카운트다운 오버레이 → 마우스 위치 캡처 후 좌표 저장.

        설계 원칙:
        - grab_set() 없음 — after() 체이닝 차단 방지
        - withdraw() 대신 화면 밖 이동 — 이벤트 루프 유지
        - overlay.after() 체이닝만 사용 — threading 없음
        - n=0 도달 시 메인 스레드에서 pyautogui.position() 직접 호출
        """
        # 화면 밖으로 이동 (withdraw/iconify 대신) — 이벤트 루프 중단 없음
        self.win.geometry("-2000+0")
        self.win.update_idletasks()

        # 오버레이: 화면 하단 중앙, 항상 최상위, 테두리 없음
        overlay = tk.Toplevel()
        overlay.overrideredirect(True)
        overlay.attributes("-topmost", True)
        overlay.configure(bg="#1e1e2e")

        sw = overlay.winfo_screenwidth()
        sh = overlay.winfo_screenheight()
        ow, oh = 240, 100
        ox = sw // 2 - ow // 2
        oy = sh - oh - 60  # 하단 60px 여백
        overlay.geometry(f"{ow}x{oh}+{ox}+{oy}")

        count_var = tk.StringVar(value=str(self.COUNTDOWN))
        tk.Label(
            overlay, textvariable=count_var,
            font=("Malgun Gothic", 42, "bold"), bg="#1e1e2e", fg=GREEN,
        ).pack(pady=(4, 0))
        tk.Label(
            overlay, text="마우스를 목표 위치로 이동하세요",
            font=("Malgun Gothic", 9), bg="#1e1e2e", fg=TEXT_MUTED,
        ).pack()
        overlay.update()

        def tick(n: int):
            if n > 0:
                count_var.set(str(n))
                overlay.update_idletasks()
                # overlay 기준 after() — grab 없는 Toplevel이므로 항상 실행됨
                overlay.after(1000, tick, n - 1)
            else:
                # n=0: 메인 스레드에서 좌표 캡처 (StringVar.set 안전)
                try:
                    x, y = pyautogui.position()
                except Exception:
                    x, y = 0, 0

                x_var.set(str(x))
                y_var.set(str(y))
                self.coords[key] = {"x": x, "y": y}

                overlay.destroy()

                # 창 원위치 복원 (화면 안, 중앙)
                self.win.geometry(self._win_geometry)
                self.win.update_idletasks()
                # grab_set() 없이 포커스만 올림
                self.win.lift()
                self.win.focus_force()

        tick(self.COUNTDOWN)

    def _save(self):
        # 수동 입력값도 반영
        for key, (x_var, y_var) in self._coord_vars.items():
            try:
                x, y = int(x_var.get()), int(y_var.get())
            except ValueError:
                x, y = 0, 0
            self.coords[key] = {"x": x, "y": y}

        self.cfg["coords"] = self.coords
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(self.cfg, f, indent=2, ensure_ascii=False)
        messagebox.showinfo("저장 완료", "좌표 설정이 저장되었습니다.", parent=self.win)
        self.win.destroy()


# ── 유틸 ─────────────────────────────────────────────────────
def resource_path(relative: str) -> str:
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, relative)


def _set_autostart(enable: bool):
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0, winreg.KEY_SET_VALUE
        )
        name = "DenJOY DentWeb Agent"
        if enable:
            exe = sys.executable if getattr(sys, "frozen", False) else os.path.abspath(__file__)
            winreg.SetValueEx(key, name, 0, winreg.REG_SZ, f'"{exe}"')
        else:
            try:
                winreg.DeleteValue(key, name)
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception:
        pass


if __name__ == "__main__":
    app = AgentApp()
    app.run()
