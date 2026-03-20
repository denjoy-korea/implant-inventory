# 프로젝트 기본 지침

## 기술 스택
- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth, DB, Edge Functions)
- 배포: Vercel

## UI 구현 규칙

### UI 스타일 가이드 (필수 참조)
새 컴포넌트 작성 또는 UI 수정 시 반드시 `/ui-style` 스킬을 참조합니다.

- 컬러, 타이포그래피, 버튼, 모달, 배지, 테이블, 토스트, 애니메이션 등 전체 패턴 수록
- 자세한 구현 패턴: `.claude/commands/ui-style.md`

### 툴팁 / 설명글
"설명글 달아줘", "마우스 올리면 설명", "툴팁", "hover 설명" 등의 요청이 들어오면
반드시 `/tooltip` 스킬을 참조하여 구현합니다.

- HTML `title` 속성 **금지** (브라우저 딜레이 제어 불가)
- Tailwind CSS `group-hover` 커스텀 툴팁 **필수** (즉시 표시)
- 기본 방향: **아래 (`top-full mt-2`)** — 화면 상단 요소가 잘리지 않도록
- 화면 하단 요소에는 위 방향(`bottom-full mb-2`) 사용
- 자세한 구현 패턴: `.claude/commands/tooltip.md`

## SQL Migration 규칙

### Source of Truth
- **정식 경로**: `supabase/migrations/` (타임스탬프식 `YYYYMMDDHHMMSS_description.sql`)
- `supabase/*.sql` (루트 000-048): 레거시, 동결 상태 — 수정 금지
- `supabase/_archive/`: 대체된 파일 보관소 — 실행 대상 아님
- 상세: `supabase/README.md`

### 타임스탬프 중복 금지
- 신규 마이그레이션 생성 시 기존 파일과 타임스탬프 충돌 여부 반드시 확인
- `ls supabase/migrations/` 로 기존 타임스탬프 확인 후 생성
- 같은 타임스탬프 2개 이상 존재 시 Supabase CLI가 하나만 적용 (CRITICAL)

## Edge Function 배포 규칙

### `verify_jwt = false` 함수 배포 규칙
`config.toml`에 `verify_jwt = false`가 있는 함수는 반드시 `--no-verify-jwt` 플래그로 배포:
```bash
npx supabase functions deploy crypto-service --no-verify-jwt
npx supabase functions deploy notify-signup --no-verify-jwt
npx supabase functions deploy notify-withdrawal --no-verify-jwt
npx supabase functions deploy holiday-proxy --no-verify-jwt
npx supabase functions deploy dentweb-automation --no-verify-jwt
npx supabase functions deploy dentweb-upload --no-verify-jwt
npx supabase functions deploy toss-payment-confirm --no-verify-jwt
npx supabase functions deploy toss-payment-refund --no-verify-jwt
npx supabase functions deploy notify-hospital-slack --no-verify-jwt
npx supabase functions deploy xlsx-generate --no-verify-jwt
```
- 이유: `verify_jwt = false`가 config.toml에 있어도 클라우드 배포 시 CLI 플래그로 명시해야 반영됨
- 플래그 누락 시 Supabase 게이트웨이가 모든 요청을 401 차단 (함수 코드가 실행되지 않음)
- 해당 함수: `crypto-service`, `notify-signup`, `notify-withdrawal`, `holiday-proxy`, `dentweb-automation`, `dentweb-upload`, `toss-payment-confirm`, `toss-payment-refund`, `notify-hospital-slack`

### 모달 헤더 컬러 코딩 규칙
모달의 기능 유형에 따라 헤더 액센트 컬러를 일관되게 사용합니다:

| 컬러 | Tailwind 클래스 | 적용 맥락 | 예시 |
|------|----------------|----------|------|
| Amber (경고/미등록) | `bg-amber-50`, `text-amber-700`, `border-amber-100` | 미등록 항목, 주의가 필요한 데이터 | UnregisteredDetailModal |
| Rose (오류/수정) | `bg-rose-50`, `text-rose-700`, `border-rose-100` | 오류 수정, 수동 수정, 삭제/반품 | ManualFixModal, FailReturnModal |
| Indigo (기본/실사) | `bg-indigo-50`, `text-indigo-700`, `border-indigo-100` | 기본 조회, 실사 관련 | AuditHistoryModal, BaseStockModal |
| Teal (반품 후보) | `bg-teal-50`, `text-teal-700`, `border-teal-100` | 반품 후보 선택 | ReturnCandidateModal |
| Slate (중립) | `bg-slate-50`, `text-slate-700`, `border-slate-200` | 중립적 정보 조회 | 기타 정보성 모달 |

- 드래그 인디케이터(모바일 bottom-sheet) 색상도 헤더 컬러와 맞춤: `bg-amber-200`, `bg-rose-200`, `bg-slate-200` 등

## 도메인 맥락
- 치과 임플란트 재고 관리 SaaS (DenJOY / DentWeb)
- 병원(hospital) 단위로 데이터 격리
- 주요 기능: 수술기록, 재고, 발주, FAIL 관리, 실사, 대시보드
