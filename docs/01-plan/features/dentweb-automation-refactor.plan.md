# Plan: 덴트웹 자동화 전면 재설계

> 병원 PC에서 Python 에이전트가 덴트웹(Windows EMR)의 수술기록을 자동으로 추출하고,
> Supabase로 직접 전송해 surgery_records에 적재하는 엔드-투-엔드 자동화 시스템.
> 기존 서버 코드의 보안·아키텍처 결함을 해소하고, Python 에이전트를 새로 설계한다.

## 1. 배경 및 목적

### 전체 시스템 구조

```
[병원 PC]
  덴트웹 (Windows EMR)  ←──  pyautogui 화면 자동화
       ↓ Excel 다운로드 (로컬 임시 저장)
  Python 에이전트
       ↓ HTTP POST (requests)
[Supabase]
  dentweb-upload Edge Function
       ↓ 파싱 + 암호화
  surgery_records 테이블

[재고관리 앱 PWA] ←── 설정 제어판 (ON/OFF, 간격, 수동 실행, 상태 표시)
       ↓ Supabase JWT
  dentweb-automation Edge Function ←── Python 에이전트 폴링 (claim_run / report_run)
```

### 구성 요소별 역할

| 구성 요소 | 위치 | 역할 |
|---------|------|------|
| **Python 에이전트** | 병원 PC (백그라운드) | pyautogui로 덴트웹 클릭 자동화 → Excel 다운로드 → Supabase로 HTTP 전송 |
| **dentweb-upload** | Supabase Edge Function | Excel 수신 → 파싱 → 암호화 → surgery_records 적재 |
| **dentweb-automation** | Supabase Edge Function | 에이전트 제어 API (설정 조회/저장, 실행 신호, 상태 보고) |
| **재고관리 앱 UI** | PWA (브라우저) | 자동화 설정 제어판 — ON/OFF, 간격, 수동 실행 버튼, 상태 표시 |

### 현재 상태 (AS-IS)

| 구성요소 | 파일 | 상태 | 주요 문제 |
|---------|------|------|---------|
| 자동화 제어 API | `supabase/functions/dentweb-automation/index.ts` | 구현됨 | `report_run` 권한 미검증, `claim_run` 상태 전이 없음 |
| Excel 업로드 API | `supabase/functions/dentweb-upload/index.ts` | 구현됨 | 단일 전역 토큰으로 임의 hospital_id 주입 가능 |
| 프론트 서비스 | `services/dentwebAutomationService.ts` | 구현됨 | 에이전트 전용 액션이 클라이언트에 노출 |
| 설정 UI | `components/SettingsHub.tsx` | 구현됨 | `formatDateTime` 미정의, 상태 영문 노출 |
| 가이드 모달 | `components/inventory/DentwebGuideModal.tsx` | 구현됨 | 타이틀 이중 렌더링 |
| **Python 에이전트** | 미존재 | **미구현** | 전체 신규 개발 필요 |

### 재설계 목표

1. **Python 에이전트 신규 개발**: pyautogui 기반 덴트웹 자동화 + HTTP 업로드
2. **보안 강화**: 단일 전역 토큰 제거, 에이전트 토큰 인증 체계 구축
3. **상태 기계 명확화**: `idle → running → success/no_data/failed`
4. **프론트 버그 수정**: formatDateTime, 한글 상태, 타이틀 중복
5. **문서화**: CLAUDE.md 배포 규칙 + 에이전트 설치 가이드

---

## 2. 기능 요구사항

### FR-01: Python 에이전트 (신규)

병원 PC에서 백그라운드로 동작하는 Python 프로그램.

#### 동작 흐름
```
1. 시작 시 config.json에서 설정 로드 (서버 URL, 에이전트 토큰)
2. 주기적으로 dentweb-automation API에 claim_run 폴링
3. should_run: true 수신 시:
   a. pyautogui로 덴트웹 활성화
   b. 경영/통계 → 임플란트 수술통계 → 기간 설정 → 엑셀 다운로드
   c. 다운로드된 Excel 파일을 dentweb-upload로 HTTP POST
   d. report_run으로 결과 보고 (success / no_data / failed)
   e. 로컬 임시 파일 삭제
4. should_run: false → 다음 폴링까지 대기
```

#### 기술 스택
- Python 3.11+
- `pyautogui`: 화면 좌표 기반 클릭 자동화
- `pyautogui.locateOnScreen()`: 이미지 인식으로 좌표 보정 (해상도 변경 대응)
- `requests`: HTTP 파일 업로드
- `PyInstaller`: .exe 패키징 (설치 편의)

#### 설정 파일 (`config.json`)
```json
{
  "server_url": "https://<project>.supabase.co/functions/v1",
  "agent_token": "에이전트 토큰 (앱에서 발급)",
  "poll_interval_seconds": 30,
  "download_dir": "C:\\Users\\<user>\\Downloads",
  "dentweb_window_title": "DentWeb"
}
```

#### 에러 핸들링
- 덴트웹 창을 찾지 못함 → `failed` + "덴트웹 미실행" 메시지
- 다운로드 타임아웃 → `failed` + "다운로드 실패" 메시지
- 서버 전송 실패 → 로컬 재시도 큐 (최대 3회)
- 예외 발생 → `failed` + traceback 요약 메시지

#### 배포
- PyInstaller로 단일 .exe 빌드
- 병원 IT 담당자가 설치 + config.json 작성
- Windows 시작 프로그램 등록 (자동 실행)

### FR-02: 인증 아키텍처 재설계

#### dentweb-upload 인증

**현재**: 3가지 인증 경로 (토큰맵, 단일 전역 토큰, JWT)
**목표**: 2가지로 축소

| 경로 | 사용처 | hospital_id 결정 |
|------|--------|----------------|
| **에이전트 토큰** | Python 에이전트 | `dentweb_automation_settings.agent_token` → hospital_id 조회 |
| **JWT** | 앱 UI 수동 업로드 | JWT sub → profiles → hospital_id |

- 단일 전역 토큰(`DENTWEB_UPLOAD_TOKEN`) **완전 제거**
- 토큰맵(`DENTWEB_UPLOAD_TOKEN_MAP`) → 에이전트 토큰으로 대체
- **hospital_id는 항상 서버가 결정** — form-data 값은 무시 또는 일치 검증만

#### dentweb-automation 인증

| 액션 | 호출자 | 인증 |
|------|--------|------|
| `get_state` | 앱 UI (사용자) | Supabase JWT |
| `save_settings` | 앱 UI (master) | Supabase JWT + master 체크 |
| `request_run` | 앱 UI (사용자) | Supabase JWT |
| `generate_token` | 앱 UI (master) | Supabase JWT + master 체크 |
| `claim_run` | Python 에이전트 | **에이전트 토큰** |
| `report_run` | Python 에이전트 | **에이전트 토큰** |

### FR-03: 상태 기계 (State Machine)

```
idle (대기중)
  ↓ claim_run (enabled + interval_due) OR (manual_run_requested)
running (실행중)     ← claimed_at 기록
  ↓ report_run
success (성공) | no_data (데이터없음) | failed (실패)
  → idle (다음 주기 대기)

stale 보호:
  running 상태가 stale_timeout_minutes 초과 시 → 자동으로 failed 전환
```

**claim_run 응답**:
```json
{
  "ok": true,
  "should_run": true,
  "reason": "manual_request" | "interval_due",
  "upload_url": "https://.../functions/v1/dentweb-upload"
}
```

### FR-04: 에이전트 토큰 관리 (앱 UI)

- **발급**: master가 "토큰 생성" 버튼 클릭 → 서버가 `crypto.randomUUID()` 생성
- **표시**: 생성 직후 한 번만 전문 표시 + 복사 버튼
- **재발급**: 기존 토큰 무효화 + 새 토큰 생성 (확인 모달)
- **마스킹**: 이후 조회 시 `****-****-****-ab12` 형태

### FR-05: 프론트 버그 수정

| 버그 | 파일 | 수정 |
|------|------|------|
| `formatDateTime` 미정의 | `SettingsHub.tsx` | 함수 추가: ISO → `YYYY.MM.DD HH:mm` |
| `lastStatus` 영문 | `SettingsHub.tsx` | 한글 맵: `idle→대기중`, `running→실행중`, `success→성공`, `no_data→데이터없음`, `failed→실패` |
| 타이틀 이중 렌더링 | `DentwebGuideModal.tsx` | `ModalShell` title prop 활용, 내부 `<h3>` 제거 |

### FR-06: CLAUDE.md 배포 규칙 완비

```bash
npx supabase functions deploy dentweb-upload --no-verify-jwt
```

---

## 3. 비기능 요구사항

### NFR-01: 보안
- hospital_id는 항상 서버(에이전트 토큰 조회 or JWT→profiles)에서 결정
- 에이전트 토큰: `crypto.randomUUID()` (128bit)
- 타이밍 어택 방지: `timingSafeEquals` 유지
- 에이전트 토큰은 DB 평문 저장 (재발급 가능해야 하므로)
- `agent_token` 컬럼: RLS로 일반 사용자 SELECT 시 마스킹

### NFR-02: 하위 호환
- `DENTWEB_UPLOAD_TOKEN` (단일 전역 토큰): 즉시 제거 (에이전트 미배포 상태)
- `DENTWEB_UPLOAD_TOKEN_MAP`: 에이전트 토큰으로 대체 후 제거

### NFR-03: 플랜 게이팅
- 기존과 동일: Plus / Business / Ultimate만 접근
- `claim_run`, `report_run` 에이전트 액션도 플랜 체크 유지

### NFR-04: Python 에이전트 안정성
- 화면 좌표 하드코딩 최소화 → `locateOnScreen()` 이미지 매칭 병행
- 네트워크 오류 시 재시도 (exponential backoff, 최대 3회)
- 에이전트 크래시 시 Windows 서비스 자동 재시작
- 로그: 로컬 파일 + 마지막 N건 서버 report_run에 포함

---

## 4. DB 설계

### 변경: `dentweb_automation_settings`

```sql
-- last_status 기존 CHECK 제약 변경 ('running' 추가)
ALTER TABLE dentweb_automation_settings
  DROP CONSTRAINT IF EXISTS dentweb_automation_settings_last_status_check;
ALTER TABLE dentweb_automation_settings
  ADD CONSTRAINT dentweb_automation_settings_last_status_check
    CHECK (last_status IN ('idle', 'running', 'success', 'no_data', 'failed'));

-- 신규 컬럼
ALTER TABLE dentweb_automation_settings
  ADD COLUMN claimed_at TIMESTAMPTZ NULL,
  ADD COLUMN agent_token TEXT NULL,
  ADD COLUMN stale_timeout_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (stale_timeout_minutes BETWEEN 5 AND 120);
```

**RLS 정책**:
- `agent_token`: 일반 사용자 SELECT 시 뷰 또는 마스킹 함수로 제한
- 에이전트 액션은 Edge Function 내부 `service_role` 클라이언트 사용

---

## 5. 구현 범위

### Phase 1: 서버 보안 수정 (Critical)
- [ ] `dentweb-upload`: 단일 전역 토큰 경로 제거
- [ ] `dentweb-upload`: 에이전트 토큰 → hospital_id 조회 로직 추가
- [ ] `dentweb-upload`: hospital_id 서버 결정 로직 단순화
- [ ] `dentweb-automation`: 에이전트 토큰 인증 분리 (`claim_run`, `report_run`)
- [ ] `dentweb-automation`: `running` 상태 + `claimed_at` 전이
- [ ] `dentweb-automation`: stale claim 자동 복구 (claim_run 시 체크)
- [ ] `dentweb-automation`: `generate_token` 액션 추가
- [ ] DB 마이그레이션: `claimed_at`, `agent_token`, `stale_timeout_minutes`

### Phase 2: 프론트 수정
- [ ] `SettingsHub.tsx`: `formatDateTime` 함수 추가
- [ ] `SettingsHub.tsx`: `lastStatus` 한글 레이블
- [ ] `SettingsHub.tsx`: 에이전트 토큰 발급/복사/재발급 UI
- [ ] `DentwebGuideModal.tsx`: 타이틀 이중 렌더링 수정
- [ ] `dentwebAutomationService.ts`: `claim_run`/`report_run` 노출 제거, `generateToken` 추가

### Phase 3: Python 에이전트 개발
- [ ] 프로젝트 구조: `agent/` 디렉토리 신규
- [ ] `agent/config.py`: config.json 로드
- [ ] `agent/api_client.py`: claim_run, report_run, upload HTTP 클라이언트
- [ ] `agent/dentweb_automation.py`: pyautogui 덴트웹 클릭 시퀀스
- [ ] `agent/main.py`: 메인 루프 (폴링 → 자동화 → 업로드 → 보고)
- [ ] `agent/images/`: locateOnScreen용 참조 이미지
- [ ] PyInstaller 빌드 스크립트
- [ ] 에이전트 설치 가이드 문서

### Phase 4: 문서/배포 정비
- [ ] CLAUDE.md `dentweb-upload` 배포 규칙 확인
- [ ] 에이전트 설치 가이드: `docs/guide/dentweb-agent-setup.md`

---

## 6. 영향 분석

### 변경 파일

| 파일 | 변경 유형 | 내용 |
|------|---------|------|
| `supabase/functions/dentweb-upload/index.ts` | 수정 | 단일토큰 제거, 에이전트 토큰 인증 추가 |
| `supabase/functions/dentweb-automation/index.ts` | 수정 | 에이전트 토큰 인증, 상태 기계, generate_token |
| `supabase/migrations/YYYYMMDDHHMMSS_*.sql` | 신규 | 컬럼 추가 + CHECK 제약 변경 |
| `services/dentwebAutomationService.ts` | 수정 | claim_run/report_run 제거, generateToken 추가 |
| `components/SettingsHub.tsx` | 수정 | formatDateTime, 한글 상태, 에이전트 토큰 UI |
| `components/inventory/DentwebGuideModal.tsx` | 수정 | 타이틀 이중 수정 |
| `CLAUDE.md` | 확인 | dentweb-upload 배포 규칙 |
| `agent/**` | **신규** | Python 에이전트 전체 |

### 의존성
- 기존 `timingSafeEquals` 유틸 유지
- `ALLOWED_PLANS` 플랜 게이팅 유지
- `PATIENT_DATA_KEY` 암호화 로직 무변경
- Python: `pyautogui`, `requests`, `Pillow` (이미지 인식용)

---

## 7. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 덴트웹 UI 업데이트 시 좌표/이미지 깨짐 | 높음 | locateOnScreen 이미지 매칭 + 좌표 fallback 이중화 |
| 병원별 화면 해상도 차이 | 중간 | 상대 좌표 + 이미지 인식으로 보정 |
| 에이전트 토큰 유출 | 높음 | 재발급 기능, 병원별 격리 (1 토큰 = 1 병원) |
| 단일 전역 토큰 즉시 제거 | 낮음 | 에이전트 미배포 상태 → 안전 |
| pyautogui 권한 문제 (UAC) | 중간 | 관리자 권한으로 실행 안내, 설치 가이드 포함 |
| 덴트웹 미실행 시 에이전트 실패 | 낮음 | 창 감지 실패 → failed 보고 + 다음 주기 재시도 |

---

## 8. 완료 기준

### 서버/프론트 (Phase 1-2)
- [ ] 단일 전역 토큰 경로 코드 없음 (grep `DENTWEB_UPLOAD_TOKEN` → 0건)
- [ ] `claim_run`을 JWT로 호출 시 401 반환
- [ ] `report_run`을 JWT로 호출 시 401 반환
- [ ] `claim_run` 성공 후 `last_status = 'running'` 확인
- [ ] stale timeout 후 `last_status = 'failed'` 자동 복구 확인
- [ ] `formatDateTime` TypeScript 빌드 오류 없음
- [ ] DentwebGuideModal 타이틀 DOM에서 1회만 렌더링
- [ ] CLAUDE.md에 `dentweb-upload --no-verify-jwt` 명시

### Python 에이전트 (Phase 3)
- [ ] config.json 로드 → 서버 연결 확인
- [ ] claim_run 폴링 → should_run: true 수신 시 자동화 시작
- [ ] 덴트웹 Excel 다운로드 → dentweb-upload 전송 → 성공 응답
- [ ] report_run으로 결과 보고 완료
- [ ] PyInstaller .exe 빌드 → 다른 PC에서 실행 확인
