# Design: 병원 워크스페이스 인테그레이션

> Plan 문서: `docs/01-plan/features/hospital-integrations.plan.md`

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│  SettingsHub (카드 그리드)                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ 로우데이터  │ │ 데이터설정  │ │ 구성원관리  │ ...          │
│  └────────────┘ └────────────┘ └────────────┘               │
│  ┌────────────────────────────────────────────┐             │
│  │ 🔗 인테그레이션 카드 (연결됨: 2/3)          │ ← 신규     │
│  └────────────────────────────────────────────┘             │
├─────────────────────────────────────────────────────────────┤
│  IntegrationManager (모달)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │  Notion   │ │  Slack   │ │  Solapi  │                    │
│  │ ● 연결됨  │ │ ○ 미연결  │ │ ● 연결됨  │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│       ↕ 클릭 시 폼 토글                                      │
│  ┌─────────────────────────────────────┐                    │
│  │ API Token: ●●●●●●●●abc             │                    │
│  │ Database ID: _________________      │                    │
│  │ [연결 테스트]  [저장]  [연결 해제]    │                    │
│  └─────────────────────────────────────┘                    │
├─────────────────────────────────────────────────────────────┤
│  integrationService.ts                                      │
│  ├─ getIntegrations(hospitalId)                             │
│  ├─ upsertIntegration(hospitalId, provider, config)         │
│  ├─ deleteIntegration(hospitalId, provider)                 │
│  └─ testIntegration(provider, config)                       │
├─────────────────────────────────────────────────────────────┤
│  Supabase                                                    │
│  ├─ hospital_integrations (RLS: hospital_id 격리)            │
│  └─ Edge Function: test-integration (연결 테스트)            │
└─────────────────────────────────────────────────────────────┘
```

## 2. DB 설계

### 2.1 hospital_integrations 테이블

```sql
CREATE TABLE IF NOT EXISTS public.hospital_integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL CHECK (provider IN ('notion', 'slack', 'solapi')),
  config      TEXT NOT NULL,              -- ENCv2: 암호화된 JSON blob
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, provider)
);

-- 인덱스
CREATE INDEX idx_hospital_integrations_hospital
  ON public.hospital_integrations(hospital_id);

-- RLS
ALTER TABLE public.hospital_integrations ENABLE ROW LEVEL SECURITY;

-- 같은 병원 마스터만 CRUD
CREATE POLICY "hospital_master_select" ON public.hospital_integrations
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

CREATE POLICY "hospital_master_insert" ON public.hospital_integrations
  FOR INSERT WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

CREATE POLICY "hospital_master_update" ON public.hospital_integrations
  FOR UPDATE USING (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

CREATE POLICY "hospital_master_delete" ON public.hospital_integrations
  FOR DELETE USING (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

GRANT ALL ON public.hospital_integrations TO authenticated;
```

### 2.2 config JSON 구조 (암호화 전 원본)

```typescript
// Notion
{
  "api_token": "ntn_xxxxxxxxxxxx",
  "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}

// Slack
{
  "webhook_url": "https://hooks.slack.com/services/T.../B.../xxx"
}

// Solapi
{
  "api_key": "NCS...",
  "api_secret": "xxx..."
}
```

## 3. 타입 정의

### 3.1 types.ts 변경

```typescript
// --- 추가 ---

/** 인테그레이션 서비스 제공자 */
export type IntegrationProvider = 'notion' | 'slack' | 'solapi';

/** DB 행 타입 */
export interface HospitalIntegration {
  id: string;
  hospital_id: string;
  provider: IntegrationProvider;
  config: string;          // 암호화된 JSON
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 복호화된 설정 (프론트에서 사용) */
export interface NotionConfig {
  api_token: string;
  database_id: string;
}

export interface SlackConfig {
  webhook_url: string;
}

export interface SolapiConfig {
  api_key: string;
  api_secret: string;
}

export type IntegrationConfig = NotionConfig | SlackConfig | SolapiConfig;

// --- PlanFeature 추가 ---
export type PlanFeature =
  | ... (기존 값들)
  | 'integrations';     // 신규
```

### 3.2 PLAN_LIMITS 변경

```typescript
// plus 플랜에 'integrations' 추가
plus: {
  features: [
    ...기존,
    'integrations',    // Plus 이상에서 사용 가능
  ],
},
// business, ultimate에도 추가
```

## 4. 서비스 레이어 설계

### 4.1 integrationService.ts (신규)

```typescript
// services/integrationService.ts
import { supabase } from './supabaseClient';
import { encryptPatientInfo, decryptPatientInfo } from './cryptoUtils';
import { IntegrationProvider, HospitalIntegration, IntegrationConfig } from '../types';

export const integrationService = {
  /** 병원의 모든 인테그레이션 조회 (config는 암호화 상태) */
  async getIntegrations(hospitalId: string): Promise<HospitalIntegration[]> {
    const { data, error } = await supabase
      .from('hospital_integrations')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('provider');

    if (error) {
      console.error('[integrationService] getIntegrations failed:', error);
      return [];
    }
    return data ?? [];
  },

  /** 인테그레이션 설정 저장 (upsert) */
  async upsertIntegration(
    hospitalId: string,
    provider: IntegrationProvider,
    config: IntegrationConfig,
  ): Promise<boolean> {
    // 1. config JSON을 암호화
    const encrypted = await encryptPatientInfo(JSON.stringify(config));

    // 2. upsert (hospital_id + provider unique)
    const { error } = await supabase
      .from('hospital_integrations')
      .upsert(
        {
          hospital_id: hospitalId,
          provider,
          config: encrypted,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hospital_id,provider' }
      );

    if (error) {
      console.error('[integrationService] upsertIntegration failed:', error);
      return false;
    }
    return true;
  },

  /** 인테그레이션 연결 해제 (행 삭제) */
  async deleteIntegration(
    hospitalId: string,
    provider: IntegrationProvider,
  ): Promise<boolean> {
    const { error } = await supabase
      .from('hospital_integrations')
      .delete()
      .eq('hospital_id', hospitalId)
      .eq('provider', provider);

    if (error) {
      console.error('[integrationService] deleteIntegration failed:', error);
      return false;
    }
    return true;
  },

  /** 암호화된 config 복호화 */
  async decryptConfig<T extends IntegrationConfig>(
    encryptedConfig: string,
  ): Promise<T | null> {
    try {
      const json = await decryptPatientInfo(encryptedConfig);
      return JSON.parse(json) as T;
    } catch (err) {
      console.error('[integrationService] decryptConfig failed:', err);
      return null;
    }
  },

  /** 연결 테스트 (Edge Function 호출) */
  async testConnection(
    provider: IntegrationProvider,
    config: IntegrationConfig,
  ): Promise<{ ok: boolean; message: string }> {
    const { data, error } = await supabase.functions.invoke('test-integration', {
      body: { provider, config },
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    return data as { ok: boolean; message: string };
  },
};
```

## 5. 컴포넌트 설계

### 5.1 SettingsHub.tsx 변경

카드 그리드에 인테그레이션 카드를 추가한다. 거래처 관리 카드와 같은 패턴으로 모달을 연다.

```
카드 그리드:
  ┌──────────────┐ ┌──────────────┐
  │ 로우데이터    │ │ 데이터 설정   │
  ├──────────────┤ ├──────────────┤
  │ 구성원 관리   │ │ 감사 로그     │
  ├──────────────┤ ├──────────────┤
  │ 거래처 관리   │ │ 🔗 인테그레이션│  ← 신규
  └──────────────┘ └──────────────┘
```

**조건:** `isMaster && !isStaff && hospitalId && canAccess(plan, 'integrations')`

**카드 내용:**
- 아이콘: 링크/연결 아이콘
- 제목: "인테그레이션"
- 설명: "노션, 슬랙, 솔라피 등 외부 서비스와 연동합니다."
- 연결 상태 뱃지: "N개 연결됨" (연결된 서비스 수)
- 플랜 잠금: Plus 미만 시 잠금 표시

**인테그레이션 상태 로딩:**
- SettingsHub 마운트 시 `integrationService.getIntegrations(hospitalId)` 호출
- 연결된 서비스 수 계산하여 카드에 표시

### 5.2 IntegrationManager.tsx (신규)

모달 형태의 인테그레이션 관리 컴포넌트.

```
┌─ 모달 헤더 ─────────────────────────────────────┐
│ 🔗 인테그레이션        [X]                       │
│ 외부 서비스를 연동합니다                          │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ Notion ──────────────────────────────┐      │
│  │ 📝 Notion                    ● 연결됨  │      │
│  │ 상담 예약, 수술 기록 동기화             │      │
│  │                                        │      │
│  │ ▼ (펼침 시)                             │      │
│  │ API Token: ●●●●●●●●●abc   [👁]        │      │
│  │ Database ID: abc123...                 │      │
│  │ [연결 테스트]  [저장]  [연결 해제]       │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  ┌─ Slack ───────────────────────────────┐      │
│  │ 💬 Slack                     ○ 미연결  │      │
│  │ 재고·수술 알림 전송                     │      │
│  │                              [연결]    │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  ┌─ Solapi ──────────────────────────────┐      │
│  │ 📱 Solapi                    ○ 미연결  │      │
│  │ SMS·알림톡 발송                        │      │
│  │                              [연결]    │      │
│  └────────────────────────────────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface IntegrationManagerProps {
  hospitalId: string;
  onClose: () => void;
  onIntegrationCountChange?: (count: number) => void;
}
```

**State:**
```typescript
const [integrations, setIntegrations] = useState<HospitalIntegration[]>([]);
const [loading, setLoading] = useState(true);
const [expandedProvider, setExpandedProvider] = useState<IntegrationProvider | null>(null);

// 폼 상태 (펼친 서비스용)
const [formConfig, setFormConfig] = useState<Record<string, string>>({});
const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
const [isTesting, setIsTesting] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

**서비스 정의 (상수):**
```typescript
const PROVIDERS: {
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: JSX.Element;          // SVG 아이콘
  fields: { key: string; label: string; placeholder: string; type: 'text' | 'secret' }[];
}[] = [
  {
    id: 'notion',
    name: 'Notion',
    description: '상담 예약, 수술 기록 동기화',
    icon: <NotionIcon />,
    fields: [
      { key: 'api_token', label: 'API Token', placeholder: 'ntn_...', type: 'secret' },
      { key: 'database_id', label: 'Database ID', placeholder: 'xxxxxxxx-xxxx-...', type: 'text' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: '재고·수술 알림 전송',
    icon: <SlackIcon />,
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', type: 'secret' },
    ],
  },
  {
    id: 'solapi',
    name: 'Solapi',
    description: 'SMS·알림톡 발송',
    icon: <SolapiIcon />,
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'NCS...', type: 'secret' },
      { key: 'api_secret', label: 'API Secret', placeholder: '', type: 'secret' },
    ],
  },
];
```

**동작 흐름:**

1. **마운트**: `integrationService.getIntegrations(hospitalId)` → 연결 상태 표시
2. **카드 클릭**: `expandedProvider` 토글 → 폼 영역 표시
   - 연결된 서비스: config 복호화 → 마스킹된 값으로 폼 채움
   - 미연결 서비스: 빈 폼
3. **연결 테스트**: `integrationService.testConnection()` → 결과 표시
4. **저장**: `integrationService.upsertIntegration()` → 목록 갱신
5. **연결 해제**: 확인 모달 → `integrationService.deleteIntegration()` → 목록 갱신

### 5.3 마스킹 유틸

```typescript
/** 시크릿 값 마스킹 (마지막 4자만 표시) */
function maskSecret(value: string): string {
  if (value.length <= 4) return '●'.repeat(value.length);
  return '●'.repeat(value.length - 4) + value.slice(-4);
}
```

## 6. Edge Function 설계

### 6.1 test-integration (신규, Phase 2)

```
POST /functions/v1/test-integration
Authorization: Bearer <jwt>

Body:
{
  "provider": "notion" | "slack" | "solapi",
  "config": { ... }   // 평문 config
}

Response:
{
  "ok": true,
  "message": "Notion 데이터베이스 연결 성공 (필드 12개)"
}
or
{
  "ok": false,
  "message": "API Token이 유효하지 않습니다."
}
```

**서비스별 테스트 로직:**

| Provider | 테스트 방법 | 성공 조건 |
|----------|-----------|----------|
| Notion | `GET https://api.notion.com/v1/databases/{db_id}` (Bearer token) | 200 OK |
| Slack | `POST webhook_url` with `{"text": "🔗 DenJOY 연결 테스트"}` | 200 OK |
| Solapi | `GET https://api.solapi.com/cash/v1/balance` (HMAC 인증) | 200 OK |

## 7. 구현 순서

### Step 1: 타입 + 플랜 변경
- `types.ts`: `IntegrationProvider`, `HospitalIntegration`, config 타입, `PlanFeature` 추가
- `types.ts`: `PLAN_LIMITS` — plus/business/ultimate에 `'integrations'` 추가

### Step 2: DB 마이그레이션
- `supabase/migrations/YYYYMMDDHHMMSS_create_hospital_integrations.sql`

### Step 3: integrationService.ts
- CRUD + 암호화/복호화 + 연결 테스트 호출

### Step 4: IntegrationManager.tsx
- 모달 UI + 서비스 카드 + 폼 + 마스킹

### Step 5: SettingsHub.tsx 변경
- 인테그레이션 카드 추가 + 모달 연결 + 연결 상태 표시

### Step 6: Edge Function (Phase 2)
- `supabase/functions/test-integration/index.ts`

## 8. 제약 조건

- `cryptoUtils.ts`의 `encryptPatientInfo`/`decryptPatientInfo`는 Edge Function `crypto-service` 호출 기반이므로, config 암/복호화 시 네트워크 비용 발생. 목록 조회 시에는 암호화 상태로 가져오고, 개별 편집 시에만 복호화.
- SettingsHub는 이미 700줄이므로, IntegrationManager는 별도 파일로 분리.
- 모달 패턴은 거래처 관리 모달(`showVendorModal`)과 동일한 디자인 시스템 사용.
- `DashboardTab`에 새 탭을 추가하지 않음 — 모달 방식으로 처리하여 라우팅 변경 최소화.
