# Gap Analysis: reply-inquiry

- **Date**: 2026-02-22
- **Match Rate**: 100% (10/10)
- **Status**: PASS

## Verification Results

| # | Criteria | Result |
|---|---|:---:|
| 1 | Edge Function — 7 input fields 처리 | PASS |
| 2 | JWT 검증 + admin role 확인 | PASS |
| 3 | Gmail SMTP 이메일 발송 (denomailer) | PASS |
| 4 | contact_inquiries status 'in_progress' + admin_note 업데이트 | PASS |
| 5 | contactService.replyInquiry() 메서드 | PASS |
| 6 | 3개 state 변수 (replyModal, replyMessage, replySending) | PASS |
| 7 | handleSendReply 핸들러 | PASS |
| 8 | mailto → button 교체 | PASS |
| 9 | 모달 UI (수신자/병원/담당자/원본/textarea/버튼) | PASS |
| 10 | 성공/실패 toast + 모달 닫기 | PASS |

## Implementation Notes

- 이메일 공급자: Resend → Gmail SMTP (denomailer@1.1.0) 로 변경 (설계 대비 변경, 기능 동일)
- `verify_jwt: false` 로 배포 — 함수 내부에서 직접 JWT 검증
- CORS, 입력값 검증, 환경변수 체크 추가 (계획 외 하드닝)

## Files Verified

- `supabase/functions/reply-inquiry/index.ts` (v5)
- `services/contactService.ts` (lines 214-227)
- `components/SystemAdminDashboard.tsx` (lines 95-97, 264-288, 2806-2870)
