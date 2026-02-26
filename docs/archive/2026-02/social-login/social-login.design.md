# Design: social-login

## Overview
Supabase OAuth를 이용한 Google / Kakao 소셜 로그인 연동.

## Architecture

### Auth Flow
```
[사용자] → 소셜 버튼 클릭
  → signInWithSocial(provider) / linkSocialProvider(provider)
  → supabase.auth.signInWithOAuth / linkIdentity
  → [OAuth Provider] 리다이렉트
  → Supabase callback URL 처리
  → detectSessionInUrl: true → 자동 세션 감지
  → onAuthStateChange SIGNED_IN → 기존 앱 로그인 흐름
```

## Component Design

### 1. authService.ts — New Methods

```ts
// 로그인 페이지용: OAuth 리다이렉트 시작
signInWithSocial(provider: 'google' | 'kakao'): Promise<{ success: boolean; error?: string }>
  → supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })

// 기존 계정에 소셜 연동 추가
linkSocialProvider(provider: 'google' | 'kakao'): Promise<{ success: boolean; error?: string }>
  → supabase.auth.linkIdentity({ provider, options: { redirectTo: window.location.origin } })

// 연동 해제
unlinkSocialProvider(identityId: string): Promise<{ success: boolean; error?: string }>
  → supabase.auth.unlinkIdentity({ identity: { id: identityId, ... } })

// 연동된 계정 목록 조회
getLinkedIdentities(): Promise<{ id: string; provider: string }[]>
  → supabase.auth.getUserIdentities() → identities[]
```

### 2. AuthForm.tsx — 로그인 폼 소셜 버튼

위치: `</form>` 직후, 이메일 찾기 링크 직전

```
[로그인 시작하기]
</form>
──── 또는 ────  (구분선)
[G Google로 로그인]
[K 카카오로 로그인]
[아이디(이메일) 찾기 | 비밀번호 찾기]
```

- 회원가입(register) 폼에는 버튼 없음
- loading state 지원
- 에러 시 showToast('에러 메시지', 'error')

### 3. UserProfile.tsx — 보안 탭 소셜 연동 섹션

위치: 신뢰 기기 섹션 ~ 마지막 로그인 섹션 사이

```
[비밀번호]
[2단계 인증]
[신뢰 기기]
──────────────
[소셜 계정 연동]
  Google  [연동됨 · 해제하기] | [연동하기]
  Kakao   [연동됨 · 해제하기] | [연동하기]
──────────────
[마지막 로그인]
[회원 탈퇴]
```

State:
- `linkedIdentities: { id: string; provider: string }[]`
- 보안 탭 진입 시 `getLinkedIdentities()` 호출
- OAuth 리다이렉트 복귀 감지 (`#access_token` or `?provider_token`) → toast 표시

## Callback Handling
- `supabaseClient.ts`의 `detectSessionInUrl: true` 로 자동 처리
- `onAuthStateChange SIGNED_IN` → 기존 앱 로그인 흐름 그대로

## Error Handling
- 연동 실패 → `showToast(error, 'error')`
- 마지막 연동 해제 불가 (본인 계정 보호) → Supabase 자체 에러 처리

## Validation Checklist
- [ ] 로그인 페이지 Google/Kakao 버튼 렌더링
- [ ] 회원가입 폼에 버튼 없음 확인
- [ ] UserProfile 보안 탭 소셜 연동 섹션 렌더링
- [ ] 연동/해제 버튼 상태 (linked vs unlinked)
- [ ] 보안 탭 진입 시 getLinkedIdentities() 호출
- [ ] TypeScript 에러 없음

## Status
- Created: 2026-02-25
- Phase: do (implemented)
