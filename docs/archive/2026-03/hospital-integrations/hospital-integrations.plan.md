# Plan: 병원 워크스페이스 인테그레이션

> 병원 설정 화면에서 노션/슬랙/솔라피 API 키를 등록하여 앱 내에서 서드파티 서비스를 연동하는 기능

## 1. 배경 및 목적

### 현재 상태
- `system_integrations` 테이블: 시스템 어드민 전용 (병원 격리 없음)
- 시스템 어드민 레벨에서만 Notion 연동 가능 (SystemAdminIntegrationsTab)
- 병원 워크스페이스 SettingsHub에는 인테그레이션 관련 UI 없음

### 목표
- 각 병원 마스터 관리자가 자체적으로 Notion, Slack, Solapi API 키를 등록
- 등록된 키로 앱 내에서 해당 서비스 기능을 바로 사용
- 병원 단위 데이터 격리 (RLS) 유지

### 대상 서비스

| 서비스 | 용도 | 필요 키 |
|--------|------|---------|
| **Notion** | 상담 예약 DB 연동, 수술 기록 동기화 등 | API Token + Database ID |
| **Slack** | 재고 알림, 수술 알림 등 채널 알림 | Webhook URL (or Bot Token + Channel ID) |
| **Solapi** | 환자/원내 SMS/알림톡 발송 | API Key + API Secret |

## 2. 기능 요구사항

### FR-01: 인테그레이션 카드 (SettingsHub)
- SettingsHub 카드 그리드에 "인테그레이션" 카드 추가
- 클릭 시 인테그레이션 관리 모달 또는 전용 화면으로 진입
- Master 전용 기능, 플랜 게이팅 적용 (Business 이상)

### FR-02: 서비스별 연동 카드 UI
- 서비스별 카드 형태로 표시 (Notion, Slack, Solapi)
- 각 카드에 서비스 로고/아이콘 + 연결 상태 표시
  - 미연결: 회색 배지 + "연결" 버튼
  - 연결됨: 초록색 배지 + "수정/해제" 버튼
- 카드 클릭 또는 "연결" 클릭 시 설정 폼 표시

### FR-03: API 키 등록 폼
- **Notion**: API Token (마스킹 표시) + Database ID (선택적 복수 등록)
- **Slack**: Incoming Webhook URL (마스킹 표시)
- **Solapi**: API Key + API Secret (둘 다 마스킹 표시)
- 연결 테스트 버튼 (키 유효성 검증)
- 저장/취소/연결 해제 액션

### FR-04: 키 암호화 저장
- 기존 `cryptoUtils.ts`의 `encryptPatientInfo`/`decryptPatientInfo` 활용
- DB에는 암호화된 값만 저장
- 복호화는 서버 사이드(Edge Function) 또는 프론트에서 수행 (기존 패턴 따름)

### FR-05: 연결 테스트
- **Notion**: API Token으로 Database 메타데이터 조회 시도
- **Slack**: Webhook URL로 테스트 메시지 전송
- **Solapi**: API 인증 확인 (잔액 조회 등)
- Edge Function을 통해 서버 사이드에서 실행 (CORS 회피)

### FR-06: 연동 상태 표시
- SettingsHub 카드에 연동 서비스 수 뱃지 표시 (예: "3개 연결됨")
- 인테그레이션 화면에서 각 서비스별 연결/미연결 상태

## 3. 비기능 요구사항

### NFR-01: 보안
- API 키/시크릿은 반드시 암호화 저장
- RLS로 병원 단위 접근 통제
- 프론트엔드에서 평문 키 노출 최소화 (마스킹)
- Edge Function에서 키 사용 시 암복호화

### NFR-02: 확장성
- 향후 서비스 추가 시 서비스 타입만 추가하면 되는 구조
- `hospital_integrations` 테이블의 `provider` 컬럼으로 서비스 구분

### NFR-03: 플랜 게이팅
- `PlanFeature`에 `'integrations'` 추가
- Business 이상 플랜에서 접근 가능

## 4. DB 설계 (개요)

```sql
-- hospital_integrations: 병원별 서드파티 연동 설정
CREATE TABLE hospital_integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,           -- 'notion' | 'slack' | 'solapi'
  config      TEXT NOT NULL,           -- 암호화된 JSON (키, 시크릿 등)
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, provider)        -- 병원당 서비스 1개
);
```

## 5. 구현 범위

### Phase 1 (MVP)
- [ ] `hospital_integrations` 테이블 + RLS 마이그레이션
- [ ] SettingsHub에 인테그레이션 카드 추가
- [ ] 인테그레이션 관리 모달 UI (3개 서비스 카드)
- [ ] API 키 등록/수정/삭제 CRUD
- [ ] 키 암호화/복호화
- [ ] `integrationService.ts` 서비스 레이어

### Phase 2 (연결 테스트 + 실사용)
- [ ] Edge Function: `test-integration` (연결 테스트)
- [ ] Notion: DB 스키마 조회 + 필드 매핑
- [ ] Slack: 웹훅 알림 발송 연동
- [ ] Solapi: SMS/알림톡 발송 연동

### Phase 3 (고도화)
- [ ] 서비스별 상세 설정 (Notion 필드 매핑, Slack 채널 선택 등)
- [ ] 연동 사용 로그 / 감사 로그 연계
- [ ] 연동 오류 알림 (키 만료, 권한 변경 등)

## 6. 영향 분석

### 변경 파일
| 파일 | 변경 내용 |
|------|----------|
| `types.ts` | `PlanFeature`에 `'integrations'` 추가, `IntegrationProvider` 타입 |
| `services/planService.ts` | Business 플랜에 `integrations` 기능 추가 |
| `components/SettingsHub.tsx` | 인테그레이션 카드 추가 |
| `services/integrationService.ts` | **신규** - CRUD + 암호화 로직 |
| `components/IntegrationManager.tsx` | **신규** - 인테그레이션 관리 모달 |
| `supabase/migrations/` | **신규** - hospital_integrations 테이블 |

### 의존성
- 기존 `cryptoUtils.ts` 암호화 유틸
- `hospitalService.ts` 병원 컨텍스트
- `planService.ts` 플랜 게이팅

## 7. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| API 키 유출 | 높음 | 암호화 저장 + RLS + 마스킹 UI |
| Webhook URL 악용 | 중간 | 연결 테스트 시 rate limiting |
| 서드파티 API 변경 | 낮음 | 연결 테스트로 사전 감지 |
| 플랜 다운그레이드 시 | 낮음 | 연동 비활성화 (데이터 보존) |
