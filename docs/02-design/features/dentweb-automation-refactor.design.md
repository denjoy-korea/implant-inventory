# Design: 덴트웹 자동화 전면 재설계

> Plan: `docs/01-plan/features/dentweb-automation-refactor.plan.md`

## 1. 시스템 아키텍처

### 1.1 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                         병원 PC                              │
│                                                             │
│  ┌──────────────┐      pyautogui       ┌──────────────┐    │
│  │   Python      │ ──── 클릭 자동화 ──→ │   덴트웹      │    │
│  │   에이전트     │ ←── Excel 파일 ──── │   (EMR)       │    │
│  └──────┬───────┘                      └──────────────┘    │
│         │ HTTP                                              │
│  ┌──────┴───────┐                                          │
│  │   PWA 브라우저 │ ← 사용자 조작 (설정/수동실행/상태확인)     │
│  └──────┬───────┘                                          │
└─────────┼───────────────────────────────────────────────────┘
          │ HTTPS
┌─────────┼───────────────────────────────────────────────────┐
│         ▼          Supabase                                 │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │ dentweb-automation│    │ dentweb-upload    │              │
│  │ (제어 API)        │    │ (Excel 수신)      │              │
│  └────────┬─────────┘    └────────┬─────────┘              │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────────────────────────────┐               │
│  │      dentweb_automation_settings        │               │
│  │      surgery_records                     │               │
│  │      (PostgreSQL + RLS)                  │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 인증 흐름

```
[PWA 사용자]
  Bearer <Supabase JWT>
    → dentweb-automation (get_state, save_settings, request_run, generate_token)
    → dentweb-upload (수동 업로드)

[Python 에이전트]
  Bearer <agent_token>
    → dentweb-automation (claim_run, report_run)
    → dentweb-upload (자동 업로드)
```

**인증 판별 로직**: JWT는 3-part dot-separated 형태, agent_token은 UUID 형태.
Edge Function에서 토큰 형태로 분기.

---

## 2. API 상세 설계

### 2.1 dentweb-automation Edge Function

**URL**: `POST /functions/v1/dentweb-automation`
**config.toml**: `verify_jwt = true` (유지)

> 주의: `verify_jwt = true`이므로 Supabase 게이트웨이가 JWT를 검증함.
> 에이전트 토큰 요청은 JWT가 아니므로 게이트웨이에서 차단됨.
> **해결**: `verify_jwt = false`로 변경하고, Edge Function 내부에서 직접 인증 처리.

**config.toml 변경**:
```toml
[functions.dentweb-automation]
verify_jwt = false
```

> CLAUDE.md에 `dentweb-automation --no-verify-jwt` 배포 규칙 추가 필요.

#### 공통 요청 형식

```typescript
// Authorization 헤더
// JWT 사용자:  "Bearer eyJhbGci..."
// 에이전트:    "Bearer 550e8400-e29b-41d4-a716-446655440000"

interface RequestBody {
  action: string;
  [key: string]: unknown;
}
```

#### 인증 분기 로직

```typescript
function isAgentToken(token: string): boolean {
  // UUID v4 형태: 8-4-4-4-12 hex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
}

// 분기:
const token = getBearerToken(req);
if (isAgentToken(token)) {
  // agent_token → dentweb_automation_settings에서 hospital_id 조회
  return resolveAgentContext(admin, token);
} else {
  // JWT → profiles에서 hospital_id 조회 (기존 로직)
  return resolveHospitalContext(admin, req);
}
```

#### Action: `get_state` (사용자 JWT)

상태 조회. 모든 병원 멤버 접근 가능.

```
Request:  { "action": "get_state" }
Response: {
  "ok": true,
  "state": {
    "hospital_id": "uuid",
    "enabled": true,
    "interval_minutes": 60,
    "manual_run_requested": false,
    "last_run_at": "2026-03-06T12:00:00Z",
    "last_status": "success",        // idle|running|success|no_data|failed
    "last_message": null,
    "has_agent_token": true,          // 토큰 존재 여부만 (평문 노출 X)
    "agent_token_masked": "****-****-****-ab12"
  }
}
```

#### Action: `save_settings` (사용자 JWT, master 전용)

```
Request:  { "action": "save_settings", "enabled": true, "interval_minutes": 120 }
Response: { "ok": true, "state": { ... } }
Error:    { "ok": false, "error": "forbidden" }  // master가 아닌 경우
```

#### Action: `request_run` (사용자 JWT)

수동 실행 요청. 모든 병원 멤버 접근 가능.

```
Request:  { "action": "request_run" }
Response: { "ok": true, "state": { ... } }
```

#### Action: `generate_token` (사용자 JWT, master 전용)

에이전트 토큰 생성/재발급. 기존 토큰이 있으면 무효화 후 새로 생성.

```
Request:  { "action": "generate_token" }
Response: {
  "ok": true,
  "agent_token": "550e8400-e29b-41d4-a716-446655440000",   // 평문 (1회 한정)
  "state": { ... }
}
```

#### Action: `claim_run` (에이전트 토큰)

에이전트가 실행 여부를 폴링. **stale 보호** 포함.

```
Request:  { "action": "claim_run" }
Response: {
  "ok": true,
  "should_run": true,
  "reason": "manual_request" | "interval_due",
  "upload_url": "https://<project>.supabase.co/functions/v1/dentweb-upload"
}
```

**서버 로직**:
1. `last_status = 'running'` AND `claimed_at + stale_timeout_minutes < now()`
   → 자동으로 `last_status = 'failed'`, `last_message = 'stale claim timeout'` 복구
2. `manual_run_requested = true` → `should_run = true`, reason = `manual_request`
3. `enabled = true` AND `isDueNow()` → `should_run = true`, reason = `interval_due`
4. `should_run = true` 시:
   - `last_status = 'running'`
   - `claimed_at = now()`
   - `manual_run_requested = false` (manual인 경우)

#### Action: `report_run` (에이전트 토큰)

에이전트가 실행 결과를 보고.

```
Request:  {
  "action": "report_run",
  "status": "success" | "no_data" | "failed",
  "message": "3건 업로드 완료"               // 최대 1000자
}
Response: { "ok": true, "state": { ... } }
```

**서버 로직**:
- `last_status` != `running` → 에러 (claim 없이 report 불가)
- `last_run_at = now()`
- `last_status = status`
- `last_message = message`
- `claimed_at = null`

---

### 2.2 dentweb-upload Edge Function

**URL**: `POST /functions/v1/dentweb-upload`
**config.toml**: `verify_jwt = false` (유지, `--no-verify-jwt` 배포 필수)

#### 인증 변경

**제거할 것**:
- `DENTWEB_UPLOAD_TOKEN` (단일 전역 토큰) 환경변수 참조
- `isSingleTokenAuthorized` 로직
- `DENTWEB_UPLOAD_TOKEN_MAP` 환경변수 참조
- `parseTokenMap()`, `resolveHospitalIdByToken()` 함수

**추가할 것**:
- `resolveHospitalIdFromAgentToken()`: DB에서 agent_token → hospital_id 조회

```typescript
async function resolveHospitalIdFromAgentToken(
  admin: SupabaseClient,
  token: string,
): Promise<string | null> {
  if (!isAgentToken(token)) return null;

  const { data, error } = await admin
    .from("dentweb_automation_settings")
    .select("hospital_id")
    .eq("agent_token", token)  // timingSafeEquals는 DB 레벨에서 불가 → 후보 조회 후 앱에서 비교
    .maybeSingle();

  if (error || !data) return null;
  return data.hospital_id;
}
```

> **보안 고려**: DB의 `=` 연산자는 timing-safe하지 않음.
> 대안: 전체 행 조회 후 앱에서 `timingSafeEquals` 비교.
> 실용성: 에이전트 토큰이 UUID(128bit)이므로 brute-force 불가능 → DB `=` 허용.

#### 인증 분기

```typescript
const token = getBearerToken(req);
let hospitalId: string | null = null;

// 1. 에이전트 토큰 시도
if (isAgentToken(token)) {
  hospitalId = await resolveHospitalIdFromAgentToken(adminClient, token);
}

// 2. JWT 시도 (에이전트 토큰이 아니거나 매칭 실패 시)
if (!hospitalId && isLikelyJwt(token)) {
  hospitalId = await resolveHospitalIdFromJwt(supabaseUrl, supabaseAnonKey, adminClient, token);
}

if (!hospitalId) {
  return jsonResponse({ success: false, error: "Unauthorized" }, 401, corsHeaders);
}

// form-data hospital_id는 일치 검증만 (불일치 시 403)
const requestedHospitalId = str(formData.get("hospital_id"));
if (requestedHospitalId && requestedHospitalId !== hospitalId) {
  return jsonResponse({ success: false, error: "hospital_id mismatch" }, 403, corsHeaders);
}
```

---

## 3. DB 설계 상세

### 3.1 마이그레이션 SQL

**파일**: `supabase/migrations/20260306120000_dentweb_automation_agent_token.sql`

```sql
-- 1. last_status CHECK 제약 변경 ('running' 추가)
ALTER TABLE public.dentweb_automation_settings
  DROP CONSTRAINT IF EXISTS dentweb_automation_settings_last_status_check;

ALTER TABLE public.dentweb_automation_settings
  ADD CONSTRAINT dentweb_automation_settings_last_status_check
    CHECK (last_status IN ('idle', 'running', 'success', 'no_data', 'failed'));

-- 2. 신규 컬럼
ALTER TABLE public.dentweb_automation_settings
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL;

ALTER TABLE public.dentweb_automation_settings
  ADD COLUMN IF NOT EXISTS agent_token TEXT NULL;

ALTER TABLE public.dentweb_automation_settings
  ADD COLUMN IF NOT EXISTS stale_timeout_minutes INTEGER NOT NULL DEFAULT 30;

ALTER TABLE public.dentweb_automation_settings
  ADD CONSTRAINT dentweb_automation_settings_stale_timeout_check
    CHECK (stale_timeout_minutes BETWEEN 5 AND 120);

-- 3. agent_token 유니크 인덱스 (lookup 성능 + 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dentweb_auto_agent_token
  ON public.dentweb_automation_settings(agent_token)
  WHERE agent_token IS NOT NULL;

-- 4. RLS: agent_token 컬럼은 기존 SELECT 정책으로 이미 보호됨
--    (hospital 멤버만 읽을 수 있고, 마스킹은 Edge Function 응답에서 처리)
```

### 3.2 변경 후 테이블 스키마

```
dentweb_automation_settings
├── hospital_id           UUID PK  (FK → hospitals)
├── enabled               BOOLEAN  DEFAULT false
├── interval_minutes      INTEGER  DEFAULT 60  CHECK(5~1440)
├── manual_run_requested  BOOLEAN  DEFAULT false
├── manual_run_requested_at TIMESTAMPTZ NULL
├── last_run_at           TIMESTAMPTZ NULL
├── last_status           TEXT     DEFAULT 'idle'  CHECK(idle|running|success|no_data|failed)
├── last_message          TEXT     NULL
├── claimed_at            TIMESTAMPTZ NULL          ← 신규
├── agent_token           TEXT     NULL  UNIQUE     ← 신규
├── stale_timeout_minutes INTEGER DEFAULT 30        ← 신규
├── created_at            TIMESTAMPTZ
└── updated_at            TIMESTAMPTZ (trigger)
```

---

## 4. 시퀀스 다이어그램

### 4.1 자동 실행 (주기 기반)

```
Python Agent              dentweb-automation        dentweb-upload          DB
    │                           │                       │                    │
    │── claim_run ─────────────→│                       │                    │
    │   Bearer <agent_token>    │── stale 체크 ────────→│                    │
    │                           │← running 전이 ────────│                    │
    │←── should_run: true ──────│                       │                    │
    │                           │                       │                    │
    │── pyautogui 덴트웹 ──→ Excel 다운로드             │                    │
    │                           │                       │                    │
    │── POST file ─────────────────────────────────────→│                    │
    │   Bearer <agent_token>    │                       │── agent_token      │
    │                           │                       │   → hospital_id ──→│
    │                           │                       │← 파싱 + 저장 ──────│
    │←── success: inserted: 5 ─────────────────────────│                    │
    │                           │                       │                    │
    │── report_run ────────────→│                       │                    │
    │   status: success         │── 상태 업데이트 ──────→│                    │
    │   message: "5건 업로드"    │                       │                    │
    │←── ok ───────────────────│                       │                    │
```

### 4.2 수동 실행 (PWA에서 트리거)

```
PWA User                  dentweb-automation        Python Agent
    │                           │                       │
    │── request_run ───────────→│                       │
    │   Bearer <JWT>            │── manual_run_requested │
    │←── ok ───────────────────│    = true              │
    │                           │                       │
    │                           │←── claim_run ─────────│
    │                           │    Bearer <agent>     │
    │                           │── should_run: true ──→│
    │                           │   reason: manual      │
    │                           │                       │── 자동화 시작...
```

### 4.3 에이전트 토큰 발급

```
PWA Master                dentweb-automation              DB
    │                           │                          │
    │── generate_token ────────→│                          │
    │   Bearer <JWT>            │── crypto.randomUUID() ──→│
    │   (master 검증)           │   UPDATE agent_token     │
    │                           │←─────────────────────────│
    │←── agent_token: "550e..." │                          │
    │   (평문, 1회 한정 표시)     │                          │
```

---

## 5. Python 에이전트 설계

### 5.1 디렉토리 구조

```
agent/
├── main.py                  # 진입점 + 메인 루프
├── config.py                # config.json 로드/검증
├── api_client.py            # HTTP 클라이언트 (claim_run, report_run, upload)
├── dentweb_runner.py        # pyautogui 덴트웹 자동화 시퀀스
├── file_watcher.py          # 다운로드 폴더 감시 (새 Excel 감지)
├── logger.py                # 로컬 파일 로그 + 최근 N건 버퍼
├── images/                  # locateOnScreen용 참조 이미지
│   ├── btn_stats.png        # "경영/통계" 메뉴 버튼
│   ├── btn_implant.png      # "임플란트 수술통계" 메뉴
│   ├── btn_export.png       # "엑셀 다운로드" 버튼
│   └── ...
├── config.example.json      # 설정 예시
├── requirements.txt         # pyautogui, requests, Pillow
└── build.bat                # PyInstaller 빌드 스크립트
```

### 5.2 config.json 스키마

```json
{
  "server_url": "https://<project-ref>.supabase.co/functions/v1",
  "agent_token": "<UUID from app>",
  "poll_interval_seconds": 30,
  "download_dir": "C:\\Users\\<user>\\Downloads",
  "dentweb_window_title": "DentWeb",
  "click_delay_ms": 300,
  "download_timeout_seconds": 30,
  "max_retries": 3,
  "log_file": "agent.log",
  "log_max_lines": 1000
}
```

### 5.3 main.py 메인 루프

```python
import time
import traceback
from config import load_config
from api_client import ApiClient
from dentweb_runner import DentwebRunner
from logger import AgentLogger

def main():
    cfg = load_config("config.json")
    api = ApiClient(cfg["server_url"], cfg["agent_token"])
    runner = DentwebRunner(cfg)
    log = AgentLogger(cfg.get("log_file", "agent.log"))

    log.info("에이전트 시작")

    while True:
        try:
            result = api.claim_run()
            if not result.get("should_run"):
                time.sleep(cfg["poll_interval_seconds"])
                continue

            log.info(f"실행 시작: reason={result.get('reason')}")
            upload_url = result.get("upload_url", f"{cfg['server_url']}/dentweb-upload")

            # 1. 덴트웹 자동화 → Excel 다운로드
            excel_path = runner.download_excel()
            if not excel_path:
                api.report_run("no_data", "Excel 파일을 찾을 수 없습니다")
                continue

            # 2. 서버로 업로드
            upload_result = api.upload_file(upload_url, excel_path)
            if upload_result.get("success"):
                inserted = upload_result.get("inserted", 0)
                skipped = upload_result.get("skipped", 0)
                api.report_run("success", f"{inserted}건 업로드, {skipped}건 스킵")
                log.info(f"완료: {inserted}건 업로드")
            else:
                api.report_run("failed", upload_result.get("error", "업로드 실패"))

            # 3. 임시 파일 정리
            runner.cleanup(excel_path)

        except Exception as e:
            log.error(f"에러: {e}\n{traceback.format_exc()}")
            try:
                api.report_run("failed", str(e)[:1000])
            except Exception:
                pass

        time.sleep(cfg["poll_interval_seconds"])

if __name__ == "__main__":
    main()
```

### 5.4 api_client.py

```python
import requests
from typing import Optional

class ApiClient:
    def __init__(self, server_url: str, agent_token: str):
        self.automation_url = f"{server_url}/dentweb-automation"
        self.agent_token = agent_token
        self.headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json",
        }

    def claim_run(self) -> dict:
        resp = requests.post(
            self.automation_url,
            json={"action": "claim_run"},
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    def report_run(self, status: str, message: str = "") -> dict:
        resp = requests.post(
            self.automation_url,
            json={"action": "report_run", "status": status, "message": message},
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    def upload_file(self, upload_url: str, file_path: str) -> dict:
        with open(file_path, "rb") as f:
            resp = requests.post(
                upload_url,
                headers={"Authorization": f"Bearer {self.agent_token}"},
                files={"file": (file_path.split("\\")[-1], f)},
                timeout=60,
            )
        resp.raise_for_status()
        return resp.json()
```

### 5.5 dentweb_runner.py (핵심 자동화)

```python
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

    def _find_and_click(self, image_name: str, fallback_xy: tuple = None) -> bool:
        """이미지 인식 우선, 실패 시 fallback 좌표 사용"""
        image_path = os.path.join(os.path.dirname(__file__), "images", image_name)
        try:
            location = pyautogui.locateOnScreen(image_path, confidence=0.8)
            if location:
                pyautogui.click(pyautogui.center(location))
                time.sleep(self.click_delay)
                return True
        except Exception:
            pass

        if fallback_xy:
            pyautogui.click(*fallback_xy)
            time.sleep(self.click_delay)
            return True
        return False

    def _activate_dentweb(self) -> bool:
        """덴트웹 창을 포그라운드로 활성화"""
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

    def download_excel(self) -> str | None:
        """덴트웹 자동화 시퀀스 → Excel 파일 경로 반환"""
        if not self._activate_dentweb():
            return None

        # 클릭 시퀀스 (이미지 인식 + fallback 좌표)
        # 실제 좌표는 병원별 config 또는 이미지 매칭으로 결정
        steps = [
            ("btn_stats.png", None),        # 경영/통계 메뉴
            ("btn_implant.png", None),       # 임플란트 수술통계
            ("btn_export.png", None),        # 엑셀 다운로드
        ]

        for image, fallback in steps:
            if not self._find_and_click(image, fallback):
                return None

        return self._wait_for_download()

    def cleanup(self, file_path: str):
        """임시 파일 삭제"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass
```

---

## 6. 프론트엔드 변경 상세

### 6.1 dentwebAutomationService.ts 변경

```typescript
// 제거: claim_run, report_run 관련 타입/메서드 (에이전트 전용)
// 추가: generateToken, 상태 타입에 'running' 추가

export type DentwebRunStatus = 'idle' | 'running' | 'success' | 'no_data' | 'failed';

export interface DentwebAutomationState {
  // 기존 필드 유지
  hospitalId: string;
  enabled: boolean;
  intervalMinutes: number;
  manualRunRequested: boolean;
  lastRunAt: string | null;
  lastStatus: DentwebRunStatus;
  lastMessage: string | null;
  updatedAt: string;
  // 신규 필드
  hasAgentToken: boolean;
  agentTokenMasked: string | null;
}

export const dentwebAutomationService = {
  getState(): Promise<DentwebAutomationState | null>;
  saveSettings(enabled: boolean, intervalMinutes: number): Promise<Result>;
  requestRun(): Promise<Result>;
  generateToken(): Promise<{ ok: boolean; agentToken?: string; error?: string }>;
  // claim_run, report_run 제거 (에이전트만 사용)
};
```

### 6.2 SettingsHub.tsx 변경

#### lastStatus 한글 레이블 맵

```typescript
const STATUS_LABELS: Record<DentwebRunStatus, string> = {
  idle: '대기중',
  running: '실행중',
  success: '성공',
  no_data: '데이터없음',
  failed: '실패',
};

const STATUS_COLORS: Record<DentwebRunStatus, string> = {
  idle: 'text-slate-500',
  running: 'text-blue-600',
  success: 'text-emerald-600',
  no_data: 'text-slate-600',
  failed: 'text-rose-600',
};
```

#### 에이전트 토큰 UI (SettingsHub 덴트웹 자동화 카드 내부)

```
┌─────────────────────────────────────────────┐
│  에이전트 토큰                                │
│  ┌─────────────────────────────────┐        │
│  │ ****-****-****-ab12     [복사]   │        │
│  └─────────────────────────────────┘        │
│  [토큰 재발급]                               │
│                                             │
│  토큰이 없는 경우:                            │
│  [에이전트 토큰 생성]                         │
│                                             │
│  생성 직후 (1회):                             │
│  ┌─────────────────────────────────┐        │
│  │ 550e8400-e29b-41d4-...  [복사]   │        │
│  └─────────────────────────────────┘        │
│  ⚠ 이 토큰은 다시 표시되지 않습니다.           │
│    에이전트 config.json에 붙여넣으세요.        │
└─────────────────────────────────────────────┘
```

- 토큰 생성 후 `newlyGeneratedToken` 로컬 상태에 보관
- 화면 이동 또는 새로고침 시 소멸 (다시 표시 불가)
- 재발급 시 `ConfirmModal`로 "기존 에이전트 연결이 끊어집니다" 경고

---

## 7. CLAUDE.md 변경사항

```markdown
### `verify_jwt = false` 함수 배포 규칙
npx supabase functions deploy crypto-service --no-verify-jwt
npx supabase functions deploy notify-signup --no-verify-jwt
npx supabase functions deploy notify-withdrawal --no-verify-jwt
npx supabase functions deploy holiday-proxy --no-verify-jwt
npx supabase functions deploy dentweb-upload --no-verify-jwt
npx supabase functions deploy dentweb-automation --no-verify-jwt

- 해당 함수: `crypto-service`, `notify-signup`, `notify-withdrawal`,
  `holiday-proxy`, `dentweb-upload`, `dentweb-automation`
```

---

## 8. 구현 순서

```
Phase 1: 서버 보안 (예상 작업량: 중)
  1-1. DB 마이그레이션 적용
  1-2. dentweb-automation: 에이전트 토큰 인증 + 상태 기계 + generate_token
  1-3. dentweb-automation: config.toml verify_jwt = false 변경
  1-4. dentweb-upload: 단일토큰 제거, 에이전트 토큰 인증 추가
  1-5. CLAUDE.md 배포 규칙 업데이트

Phase 2: 프론트 수정 (예상 작업량: 소)
  2-1. dentwebAutomationService.ts: API 변경 반영
  2-2. SettingsHub.tsx: 한글 상태 + 에이전트 토큰 UI
  2-3. typecheck + 빌드 확인

Phase 3: Python 에이전트 (예상 작업량: 대)
  3-1. agent/ 디렉토리 + config, api_client, logger
  3-2. dentweb_runner: pyautogui 시퀀스 (이미지 + 좌표)
  3-3. main.py: 메인 루프 통합
  3-4. PyInstaller 빌드 + 테스트
  3-5. 설치 가이드 작성

Phase 4: 문서 (예상 작업량: 소)
  4-1. 에이전트 설치 가이드
  4-2. CLAUDE.md 최종 확인
```

---

## 9. Plan 이슈 정정

Plan 작성 시 발견한 이슈 중 실제로는 문제가 아닌 항목:

| Plan 이슈 | 실제 상태 | 결론 |
|----------|---------|------|
| `formatDateTime` 미정의 | `SettingsHub.tsx:16`에 정의됨 | 버그 아님, Design에서 제외 |
| DentwebGuideModal 타이틀 이중 | `ModalShell`의 `title` prop은 ARIA 전용 (시각적 렌더링 없음) | 버그 아님, Design에서 제외 |
| `dentweb-automation` verify_jwt = true | 에이전트 토큰(non-JWT) 접근 불가 | **실제 문제** → `false`로 변경 필요 |
