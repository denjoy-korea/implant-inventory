---
name: 강의 다시보기 기능 진행 상태
description: Google Drive 기반 강의 다시보기 기능 — 구현 완료, SA 설정 및 배포 보류 중
type: project
---

강의 다시보기 기능 절반 완료 상태로 보류 중.

**Why:** Google Service Account 설정이 복잡하여 다음 세션으로 미룸.

**How to apply:** 다음 세션에 "강의 다시보기 이어서" 요청 시 `docs/course-lecture-replay-setup.md` 참조하여 Google SA 설정부터 재개.

## 완료된 것
- DB 마이그레이션 적용 완료 (`course_enrollments`, `course_replay_videos`, `get_my_completed_courses` RPC)
- Edge Function 코드: `supabase/functions/get-lecture-video-url/index.ts` (미배포)
- 프론트엔드: `hooks/useCourseLectures.ts`, `components/CourseLectureReplay.tsx`, MyPage "강의" 탭

## 남은 것
1. Google Service Account 생성 + JSON 키 발급
2. `npx supabase secrets set` 으로 SA 크리덴셜 등록
3. `npx supabase functions deploy get-lecture-video-url`
4. Google Drive에 영상 업로드 → `course_replay_videos` 테이블에 file_id 등록
5. 수강생 `course_enrollments`에 수료 기록 등록
