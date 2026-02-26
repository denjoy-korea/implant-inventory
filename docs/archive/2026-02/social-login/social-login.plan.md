# Plan: social-login

## Feature Summary
Google / Kakao 소셜 로그인 연동.
이메일 가입은 유지하되, 가입 후 Google/Kakao를 연동해 간편 로그인 가능하게.

## Background / Problem
현재 인증은 100% 이메일/비밀번호 기반.
소셜 계정으로도 로그인하고 싶다는 사용자 요청.

## Goal
- 로그인 폼에 Google · Kakao 버튼 추가 (회원가입 폼은 이메일 유지)
- 이미 가입한 사용자가 프로필 보안 탭에서 소셜 계정 연동/해제 가능
- Supabase OAuth 리다이렉트 후 기존 세션 흐름 유지

## Scope

### In Scope
- `services/authService.ts`: signInWithSocial / linkSocialProvider / unlinkSocialProvider / getLinkedIdentities 메서드
- `components/AuthForm.tsx`: 로그인 폼 하단 소셜 버튼 2개 (Google, Kakao)
- `components/UserProfile.tsx`: 보안 탭 소셜 계정 연동 섹션

### Out of Scope
- 회원가입 소셜 버튼 (이메일 가입 유지)
- 신규 소셜 전용 계정 생성 플로우

## Prerequisites (사용자 직접 설정)
1. Supabase Dashboard > Authentication > Providers: Google, Kakao 활성화
2. Supabase Authentication URL Configuration: Redirect URL 등록
3. Google Cloud Console: OAuth 동의 화면 + 승인된 Redirect URI
4. Kakao Developers: 카카오 로그인 활성화 + Redirect URI 등록

## Implementation Files
| File | Change |
|------|--------|
| `services/authService.ts` | 4개 메서드 추가 |
| `components/AuthForm.tsx` | 소셜 로그인 버튼 2개 (login only) |
| `components/UserProfile.tsx` | 소셜 연동 섹션 추가 (security tab) |

## Status
- Created: 2026-02-25
- Phase: do (implemented)
