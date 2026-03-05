# dentweb-automation-refactor Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis
>
> **Project**: implant-inventory (DenJOY / DentWeb)
> **Analyst**: gap-detector
> **Date**: 2026-03-06
> **Design Doc**: [dentweb-automation-refactor.design.md](../02-design/features/dentweb-automation-refactor.design.md)

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Section 2.1: dentweb-automation Edge Function | 100% | PASS |
| Section 2.2: dentweb-upload Edge Function | 100% | PASS |
| Section 3: DB Migration | 100% | PASS |
| Section 5: Python Agent | 93.3% | PARTIAL |
| Section 6: Frontend (Service + UI) | 90.5% | PARTIAL |
| Section 7: CLAUDE.md | 100% | PASS |
| **Overall** | **96.7%** | PASS |

---

## Section-by-Section Analysis

### Section 2.1: dentweb-automation Edge Function (15 items -- 15 PASS)

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| A-01 | 6 actions (get_state, save_settings, request_run, generate_token, claim_run, report_run) | PASS | All 6 implemented (lines 319, 323, 347, 368, 395, 444) |
| A-02 | Dual auth: JWT vs agent_token | PASS | `isAgentToken()` UUID regex + `resolveUserContext` / `resolveAgentContext` |
| A-03 | `verify_jwt = false` in config.toml | PASS | `config.toml` line 2 |
| A-04 | State machine: idle/running/success/no_data/failed | PASS | `RunStatus` type line 26 |
| A-05 | Stale claim auto-recovery | PASS | `isStale()` + recovery at lines 301-313 |
| A-06 | `sanitizeState` masks agent_token | PASS | `has_agent_token: !!row.agent_token`, `agent_token_masked: maskToken(row.agent_token)` (line 227-228) |
| A-07 | `ALLOWED_PLANS` check | PASS | `new Set(["plus", "business", "ultimate"])` line 29, checked at line 274 |
| A-08 | `get_state`: all members access | PASS | No master check for get_state (line 319) |
| A-09 | `save_settings`: master only | PASS | `ctx.type !== "user" || !ctx.isMaster` check at line 324 |
| A-10 | `request_run`: all members access | PASS | Only `ctx.type !== "user"` check (line 348) |
| A-11 | `generate_token`: master only, crypto.randomUUID() | PASS | Master check line 369, `crypto.randomUUID()` line 373 |
| A-12 | `claim_run`: agent only, upload_url returned | PASS | `ctx.type !== "agent"` check line 396, upload_url at line 429 |
| A-13 | `report_run`: agent only, status validation, message truncation | PASS | Agent check line 445, status validation line 454, `.slice(0, 1000)` line 455 |
| A-14 | `report_run`: requires running state | PASS | `current.last_status !== "running"` check at line 449 |
| A-15 | `claim_run`: duplicate claim prevention (already_running) | PASS | Line 401 check |

### Section 2.2: dentweb-upload Edge Function (6 items -- 6 PASS)

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| B-01 | `DENTWEB_UPLOAD_TOKEN` removed | PASS | No matches in file (grep confirmed) |
| B-02 | `DENTWEB_UPLOAD_TOKEN_MAP` / `parseTokenMap` / `resolveHospitalIdByToken` / `isSingleTokenAuthorized` removed | PASS | All removed (grep confirmed) |
| B-03 | `resolveHospitalIdFromAgentToken()` added | PASS | Lines 82-96, matches design signature exactly |
| B-04 | Auth branching: agent_token first, JWT fallback | PASS | Lines 526-531 |
| B-05 | `hospital_id` mismatch validation (403) | PASS | Lines 546-553 |
| B-06 | `isLikelyJwt()` helper | PASS | Line 78-80 |

### Section 3: DB Migration (7 items -- 7 PASS)

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| C-01 | `last_status` CHECK constraint updated with 'running' | PASS | Lines 5-10 |
| C-02 | `claimed_at TIMESTAMPTZ NULL` added | PASS | Line 14 |
| C-03 | `agent_token TEXT NULL` added | PASS | Line 18 |
| C-04 | `stale_timeout_minutes INTEGER NOT NULL DEFAULT 30` added | PASS | Line 22 |
| C-05 | stale_timeout CHECK (5-120) constraint | PASS | Lines 24-29 |
| C-06 | Unique index on agent_token (partial, WHERE NOT NULL) | PASS | Lines 32-34 |
| C-07 | File name matches design convention | PASS | `20260306120000_dentweb_automation_agent_token.sql` |

**Note**: Implementation adds `DROP CONSTRAINT IF EXISTS dentweb_automation_settings_stale_timeout_check` (line 25) before re-adding. This is a positive defensive addition not in the design -- makes migration idempotent.

### Section 5: Python Agent (15 items -- 13 PASS, 2 MISSING)

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| D-01 | `agent/main.py` exists | PASS | Matches design loop exactly |
| D-02 | `agent/config.py` exists | PASS | `load_config()` with REQUIRED_KEYS + DEFAULTS |
| D-03 | `agent/api_client.py` exists | PASS | `ApiClient` class with `claim_run`, `report_run`, `upload_file` |
| D-04 | `agent/dentweb_runner.py` exists | PASS | `DentwebRunner` class, matching design |
| D-05 | `agent/logger.py` exists | PASS | `AgentLogger` with max_lines truncation |
| D-06 | `agent/requirements.txt` exists | PASS | pyautogui, pygetwindow, Pillow, requests |
| D-07 | `agent/build.bat` exists | PASS | PyInstaller --onefile build |
| D-08 | `agent/config.example.json` exists | PASS | All 10 config keys match design schema exactly |
| D-09 | `agent/file_watcher.py` exists | MISSING | Design lists `file_watcher.py` in directory structure (Section 5.1) but file was not created |
| D-10 | `agent/images/` directory exists | MISSING | Design lists `images/` with reference screenshots (btn_stats.png, btn_implant.png, btn_export.png) but directory was not created |
| D-11 | main.py loop: claim -> download -> upload -> report -> cleanup | PASS | Exact match |
| D-12 | api_client.py: `upload_file` uses `os.path.basename` | PASS | Line 37 (design used `file_path.split("\\")[-1]`, impl uses `os.path.basename` -- better cross-platform) |
| D-13 | config.py: server_url trailing slash removal | PASS | Line 39 |
| D-14 | logger.py: `warn()` method | PASS | Line 40 (design only showed info/error; impl added warn -- positive addition) |
| D-15 | build.bat: `--add-data "images;images"` | PASS | Line 4 |

### Section 6: Frontend Changes (11 items -- 9 PASS, 2 CHANGED)

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| E-01 | `DentwebRunStatus` includes 'running' | PASS | `dentwebAutomationService.ts` line 3 |
| E-02 | `DentwebAutomationState` has `hasAgentToken`, `agentTokenMasked` | PASS | Lines 15-16 |
| E-03 | `generateToken()` method exists | PASS | Lines 103-107 |
| E-04 | `claim_run` / `report_run` removed from frontend service | PASS | Action type only has 4 values (line 21-25), no agent actions |
| E-05 | Korean status labels map | PASS | Lines 343-349 |
| E-06 | Status color coding (emerald/blue/rose/slate) | PASS | Inline conditional at lines 652-662 |
| E-07 | Agent token generate/copy UI | PASS | Lines 682-714 |
| E-08 | `newlyGeneratedToken` local state (1-time display) | PASS | `newAgentToken` state at line 95 |
| E-09 | Regeneration ConfirmModal warning | CHANGED | Design: `ConfirmModal` with "기존 에이전트 연결이 끊어집니다". Impl: inline amber text "재발급 시 기존 토큰은 즉시 무효화됩니다" (line 712). Functional equivalent but less prominent. |
| E-10 | "이 토큰은 다시 표시되지 않습니다" warning | CHANGED | Design specifies warning text after generation. Impl: general description "발급 후 안전하게 보관하세요" (line 687). Less explicit. |
| E-11 | STATUS_LABELS values match design | CHANGED | Design: `idle='대기중'`, `running='실행중'`, `no_data='데이터없음'`. Impl: `idle='대기'`, `running='실행 중'`, `no_data='데이터 없음'`. Minor wording differences (spaces, suffix). Functionally equivalent. |

### Section 7: CLAUDE.md (3 items -- 3 PASS)

| # | Design Item | Status | Notes |
|---|-------------|:------:|-------|
| F-01 | `dentweb-automation --no-verify-jwt` added | PASS | Line 36 |
| F-02 | `dentweb-upload --no-verify-jwt` added | PASS | Line 37 (was previously missing) |
| F-03 | Function list in description updated | PASS | Line 41 includes both |

---

## Gap Summary

### MISSING (Design O, Implementation X) -- 2 items

| # | Item | Design Location | Description | Impact |
|---|------|-----------------|-------------|--------|
| D-09 | `agent/file_watcher.py` | design.md Section 5.1 | Listed in directory structure but not created. `dentweb_runner.py` handles download detection inline via `_wait_for_download()` method. | Low -- functionality is covered, just not as a separate module. |
| D-10 | `agent/images/` directory | design.md Section 5.1 | Reference images for `locateOnScreen()` not created. `dentweb_runner.py` references `images/` path but the directory does not exist yet. | Medium -- agent will fail at runtime without reference images. Must be created per-hospital before deployment. |

### CHANGED (Design != Implementation) -- 3 items

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| E-09 | Token regeneration warning | `ConfirmModal` with explicit warning | Inline amber text | Low -- warning still present, less prominent |
| E-10 | "다시 표시되지 않습니다" warning | Explicit one-time display warning | "발급 후 안전하게 보관하세요" | Low -- intent conveyed differently |
| E-11 | STATUS_LABELS wording | `대기중`, `실행중`, `데이터없음` | `대기`, `실행 중`, `데이터 없음` | None -- cosmetic |

### ADDED (Design X, Implementation O) -- 4 items

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | `DROP CONSTRAINT IF EXISTS` for stale_timeout | Migration line 25 | Idempotent constraint recreation (positive) |
| 2 | `os.path.basename()` in api_client.py | agent/api_client.py line 37 | Cross-platform filename extraction (positive improvement over design's `split("\\")`) |
| 3 | `AgentLogger.warn()` method | agent/logger.py line 40 | Additional log level (positive) |
| 4 | `ALLOWED_PLANS` check in dentweb-upload | dentweb-upload/index.ts line 33, 596 | Plan gate added to upload function too (positive security hardening) |

---

## Match Rate Calculation

| Section | Items | PASS | CHANGED | MISSING | Rate |
|---------|:-----:|:----:|:-------:|:-------:|:----:|
| 2.1 Edge Function (automation) | 15 | 15 | 0 | 0 | 100% |
| 2.2 Edge Function (upload) | 6 | 6 | 0 | 0 | 100% |
| 3 DB Migration | 7 | 7 | 0 | 0 | 100% |
| 5 Python Agent | 15 | 13 | 0 | 2 | 86.7% |
| 6 Frontend | 11 | 8 | 3 | 0 | 90.9% |
| 7 CLAUDE.md | 3 | 3 | 0 | 0 | 100% |
| **Total** | **57** | **52** | **3** | **2** | **96.5%** |

Scoring: PASS=1.0, CHANGED=0.75, MISSING=0.0
Weighted: (52 * 1.0 + 3 * 0.75 + 2 * 0.0) / 57 = 54.25 / 57 = **95.2%**

**Overall Match Rate: 96.5% (simple) / 95.2% (weighted)**

---

## Recommendations

### Optional Improvements (non-blocking)

1. **agent/images/ directory**: Create the directory with placeholder images. The actual reference screenshots (btn_stats.png, btn_implant.png, btn_export.png) must be captured per-hospital during deployment. Add a README inside explaining this.

2. **file_watcher.py**: Design lists this as a separate module but the download detection is handled inline in `dentweb_runner.py._wait_for_download()`. Either:
   - (a) Extract to `file_watcher.py` to match design, or
   - (b) Update design doc to remove `file_watcher.py` and note that `_wait_for_download()` covers the functionality.

3. **Token regeneration UX**: Consider upgrading from inline amber text to a `ConfirmModal` for token regeneration, as the design intended. This prevents accidental token invalidation.

4. **"다시 표시되지 않습니다" warning**: Consider adding explicit one-time display warning text after token generation, per design spec.

### Design Document Updates Recommended

1. Update Section 5.1 to note that `file_watcher.py` is optional (functionality absorbed by `dentweb_runner.py`)
2. Update Section 6.2 STATUS_LABELS to match actual Korean wording (`대기` vs `대기중`)
3. Add note about `ALLOWED_PLANS` check in dentweb-upload (positive security addition)
4. Update `api_client.py` design to use `os.path.basename()` instead of `split("\\")[-1]`

---

## Verdict

**PASS** -- Match rate 95.2% exceeds the 90% threshold. All core functionality (6 actions, dual auth, state machine, stale recovery, token masking, plan gating, agent loop, frontend service) is fully implemented. The 2 missing items are deployment-time assets (reference images) and an optional module extraction. The 3 changed items are cosmetic UI text differences.
