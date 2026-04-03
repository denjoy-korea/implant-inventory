# 강의 다시보기 기능 — 구현 현황 및 다음 단계

## 현재 상태 (2026-04-04 완료)

### 완료된 것
- [x] DB 마이그레이션 적용 완료 (`20260404200000_course_replay_system.sql`)
  - `course_enrollments` 테이블 (수료 기록)
  - `course_replay_videos` 테이블 (Google Drive 영상 목록)
  - RLS 정책 (수료한 사용자만 영상 조회 가능)
  - `get_my_completed_courses()` RPC 함수
- [x] Edge Function 코드 작성 (`supabase/functions/get-lecture-video-url/index.ts`)
- [x] 프론트엔드 구현
  - `hooks/useCourseLectures.ts`
  - `components/CourseLectureReplay.tsx`
  - `components/MyPage.tsx` — "강의" 탭 추가

### 아직 안 된 것 (다음 세션에서 진행)
- [ ] Google Service Account 생성
- [ ] Supabase Secrets 등록
- [ ] Edge Function 배포
- [ ] Google Drive에 영상 업로드 후 파일 ID 등록

---

## 다음 세션 진행 순서

### 1단계 — Google Service Account 만들기 (5분)

1. https://console.cloud.google.com 접속
2. 프로젝트 생성 (이름 예: `denjoy-lecture`)
3. **API 및 서비스 → 라이브러리 → "Google Drive API" 검색 → 사용 설정**
4. **IAM 및 관리자 → 서비스 계정 → 서비스 계정 만들기**
5. 이름: `lecture-video-reader` → 완료
6. 만들어진 계정 클릭 → **키 탭 → 키 추가 → JSON → 다운로드**

JSON 파일 안에서 필요한 값:
```
client_email  →  GOOGLE_SERVICE_ACCOUNT_EMAIL
private_key   →  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
```

### 2단계 — Supabase Secrets 등록

프로젝트 경로(`implant-inventory`)에서 실행:
```bash
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@yyy.iam.gserviceaccount.com
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3단계 — Edge Function 배포

```bash
npx supabase functions deploy get-lecture-video-url
```

### 4단계 — Google Drive 영상 업로드

1. Google Drive에 폴더 생성 (예: `DenJOY 강의 영상`)
2. 영상 파일(MP4 권장) 업로드
3. 폴더 우클릭 → **공유 → 서비스 계정 이메일 추가 → 뷰어 권한**
4. 각 영상 파일의 ID 복사 (Drive URL의 `/d/XXXXX/` 부분)

### 5단계 — DB에 영상 데이터 등록

Supabase 대시보드 SQL Editor에서:
```sql
-- 시즌 ID 확인
SELECT id, season_label FROM course_seasons;

-- 영상 등록
INSERT INTO course_replay_videos (season_id, title, drive_file_id, duration_minutes, sort_order)
VALUES
  ('시즌-UUID', '1강. 덴트웹 입력 구조 이해', 'Google-Drive-File-ID', 45, 1),
  ('시즌-UUID', '2강. 재고 자동 산출 원리',   'Google-Drive-File-ID', 38, 2);
```

### 6단계 — 수료 기록 등록 (수강생에게 접근 권한 부여)

```sql
-- 사용자 ID 확인 (이메일로 검색)
SELECT id FROM auth.users WHERE email = 'student@example.com';

-- 수료 기록 등록
INSERT INTO course_enrollments (user_id, season_id, completed_at, granted_by)
VALUES ('사용자-UUID', '시즌-UUID', now(), '어드민-UUID');
```

---

## 아키텍처 요약

```
[영상 파일]  Google Drive (Private)
                    ↑ Service Account만 접근
[서버]       Supabase Edge Function (get-lecture-video-url)
             - JWT 인증 확인
             - course_enrollments 수료 여부 확인
             - Google SA → 1시간짜리 임시 URL 발급
                    ↓
[프론트]     MyPage → "강의" 탭 → CourseLectureReplay
             - HTML5 <video> 태그로 재생
             - 다운로드 버튼 숨김, PiP 비활성화
             - URL 만료 5분 전 자동 갱신
```

## 보안 포인트
- Google Drive 영상 파일은 **Private** — 직접 URL 공유 불가
- 임시 URL은 **1시간 후 만료** — 공유해도 곧 사용 불가
- 수료 기록 없는 사용자는 Edge Function에서 **403 차단**
- RLS로 DB 레벨에서도 이중 차단
