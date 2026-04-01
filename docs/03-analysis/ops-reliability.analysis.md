# ops-reliability Gap Analysis Report

> **Date**: 2026-03-31
> **Design Doc**: [ops-reliability.design.md](../02-design/features/ops-reliability.design.md)
> **Match Rate**: **100%** (16/16 PASS)

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

---

## FR별 상세 결과

| FR | 설명 | 파일 | 판정 |
|----|------|------|:----:|
| FR-01 | `!window.TossPayments` billing 취소 처리 | `tossPaymentService.ts:277-285` | PASS |
| FR-02 | ChunkLoad 무한 리로드 방어 (3회 제한) | `index.tsx:17-31` | PASS |
| FR-03 | 로그인 타임아웃 race condition 플래그 | `authService.ts:148,489,496,1041-1045` + `useAppState.ts:559-562` | PASS |
| FR-04 | smoke 게이트 6개 함수 커버리지 확장 | `check-edge-functions.mjs:50-58` + `smoke-auto.mjs:15` | PASS |

**Total: 16/16 check items PASS — 0 FAIL, 0 PARTIAL, 0 MISSING**

---

## 검증 세부 사항

### FR-01 PASS
- `.update({ payment_status: 'cancelled' })` — 명세 일치
- `.eq('id', billingId).eq('payment_status', 'pending')` — 조건 일치

### FR-02 PASS
- `sessionStorage.getItem('_chunkReloadCount')` 카운터 — 명세 일치
- `count >= 3` 시 `return` + `console.error` — 명세 일치
- `try-catch` fallback 존재 — 명세 일치

### FR-03 PASS
- 모듈 레벨 `let _loginTimedOut = false` — 명세 일치
- `signIn()` 진입 시 `_loginTimedOut = false` 초기화 — 명세 일치
- 타임아웃 콜백 내 `_loginTimedOut = true` — 명세 일치
- `consumeLoginTimedOut()` 메서드 (consume + reset) — 명세 일치
- `useAppState.ts` SIGNED_IN 핸들러: `consumeLoginTimedOut()` → `signOut()` + `return` — 명세 일치

### FR-04 PASS
- `toss-payment-confirm {}`, `crypto-service { action: 'ping' }`, `notify-signup { _probe: true }`, `auth-send-email {}` — 4개 모두 명세 일치
- `smoke-auto.mjs` 설명 문구 6개 함수 포함 — 명세 일치

---

## 결론

Design 문서의 모든 명세가 구현에 정확히 반영되었습니다.
추가/변경/누락 항목 없음. 코드 변경량도 Design 예상 범위(~30줄) 이내입니다.
