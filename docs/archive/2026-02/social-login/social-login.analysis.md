# Gap Analysis: social-login

**Date**: 2026-02-26
**Match Rate**: 97% ✅ PASS

---

## 체크리스트 결과

| # | 요구사항 | 파일 | 결과 |
|---|---------|------|:----:|
| 1 | `signInWithSocial(provider)` → `signInWithOAuth` | authService.ts:819 | ✅ |
| 2 | `linkSocialProvider(provider)` → `linkIdentity` | authService.ts:831 | ✅ |
| 3 | `unlinkSocialProvider(identityId)` → `unlinkIdentity` | authService.ts:845 | ✅ |
| 4 | `getLinkedIdentities()` → `getUserIdentities` | authService.ts:851 | ✅ |
| 5 | 로그인 폼 Google 버튼 | AuthForm.tsx:1107 | ✅ |
| 6 | 로그인 폼 Kakao 버튼 | AuthForm.tsx:1123 | ✅ |
| 7 | 회원가입 폼에 버튼 없음 | AuthForm.tsx | ✅ |
| 8 | 구분선 "── 또는 ──" | AuthForm.tsx:1101 | ✅ |
| 9 | 보안 탭 소셜 연동 섹션 | UserProfile.tsx:862 | ✅ |
| 10 | 보안 탭 진입 시 `getLinkedIdentities()` 호출 | UserProfile.tsx:313 | ✅ |
| 11 | Google 연동 상태 표시 | UserProfile.tsx:866 | ✅ |
| 12 | Kakao 연동 상태 표시 | UserProfile.tsx:866 | ✅ |
| 13 | 연동하기 → `linkSocialProvider` | UserProfile.tsx:917 | ✅ |
| 14 | 해제하기 → `unlinkSocialProvider` | UserProfile.tsx:898 | ✅ |
| 15 | `detectSessionInUrl: true` in supabaseClient.ts | supabaseClient.ts | ✅ |

---

## Gaps

### 1. 소셜 버튼 loading state 미구현 (Low / 비기능적)
- Design: "loading state 지원" 명시
- 구현: 단순 onClick, disabled/loading 없음
- **영향 없음**: `signInWithOAuth`는 즉시 브라우저 리다이렉트 → 사용자가 로딩 상태를 볼 시간이 없음

### 2. "해제하기" vs "해제" (Cosmetic)
- Design: "해제하기"
- 구현(UserProfile.tsx:910): "해제"
- 기능 동일, 텍스트만 다름

---

## Design 초과 구현 (5개)

| 항목 | 위치 | 설명 |
|------|------|------|
| OAuth 리다이렉트 콜백 감지 | useAppState.ts:336 | `?link_success=<provider>` 파라미터 처리 |
| 프로필 모달 자동 오픈 | useAppState.ts:395 | 연동 성공 후 프로필 모달 자동 열기 |
| 보안 탭 자동 선택 | UserProfile.tsx:233 | `_link_success_provider` localStorage → 보안 탭 pre-select |
| 연동 완료 토스트 | UserProfile.tsx:297 | "{provider} 계정 연동이 완료되었습니다" |
| 안내 문구 | AuthForm.tsx:1137 | 로그인 후 보안 탭에서 연동 가이드 |

---

## 점수 요약

| 항목 | 점수 |
|------|:----:|
| Design Match | 97% |
| Architecture Compliance | 100% |
| **Overall** | **97% ✅ PASS** |

---

## 권고 사항

Match Rate >= 90% — 필수 수정 없음.

| 우선순위 | 항목 |
|---------|------|
| Low | 소셜 버튼 loading state (선택적, 기능 영향 없음) |
| Cosmetic | "해제" → "해제하기" 텍스트 통일 |
