# 프로젝트 기본 지침

## 기술 스택
- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth, DB, Edge Functions)
- 배포: Vercel

## UI 구현 규칙

### 툴팁 / 설명글
"설명글 달아줘", "마우스 올리면 설명", "툴팁", "hover 설명" 등의 요청이 들어오면
반드시 `/tooltip` 스킬을 참조하여 구현합니다.

- HTML `title` 속성 **금지** (브라우저 딜레이 제어 불가)
- Tailwind CSS `group-hover` 커스텀 툴팁 **필수** (즉시 표시)
- 기본 방향: **아래 (`top-full mt-2`)** — 화면 상단 요소가 잘리지 않도록
- 화면 하단 요소에는 위 방향(`bottom-full mb-2`) 사용
- 자세한 구현 패턴: `.claude/commands/tooltip.md`

## Edge Function 배포 규칙

### crypto-service 배포
`crypto-service`는 반드시 `--no-verify-jwt` 플래그 포함:
```bash
npx supabase functions deploy crypto-service --no-verify-jwt
```
- 이유: `verify_jwt = false`가 config.toml에 있어도 클라우드 배포 시 CLI 플래그로 명시해야 반영됨
- 플래그 누락 시 Supabase 게이트웨이가 모든 요청을 401 차단 (함수 코드가 실행되지 않음)

## 도메인 맥락
- 치과 임플란트 재고 관리 SaaS (DenJOY / DentWeb)
- 병원(hospital) 단위로 데이터 격리
- 주요 기능: 수술기록, 재고, 발주, FAIL 관리, 실사, 대시보드
