#!/usr/bin/env python3
from __future__ import annotations

import time

import pyautogui


def main() -> None:
    print("마우스를 원하는 위치에 올리고 Ctrl+C로 종료하세요.")
    while True:
        x, y = pyautogui.position()
        print(f"\rX={x:4d}  Y={y:4d}", end="", flush=True)
        time.sleep(0.2)


if __name__ == "__main__":
    main()
