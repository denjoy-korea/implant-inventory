# Hospital Multi-Service Platform Design

> Date: 2026-04-03  
> Scope: `implant-inventory` Supabase 확장, 부모 서비스 `denjoy-homepage`, 형제 서비스 `hr-denjoy`

## 1. 결론

공통 조직 키는 새로 만들지 않고 **`implant-inventory`의 `hospitals.id` UUID** 를 기준으로 삼는다.

- `auth.users.id` 는 사람 계정 키다.
- `hospitals.id` 는 병원 단위 B2B 워크스페이스 키다.
- 확장 서비스 대부분이 병원 단위라면, 추가 결제와 entitlement는 `hospital_id` 에 붙이는 것이 가장 자연스럽다.
- 강의는 예외적 B2C 서비스이므로 병원 entitlement와 분리한다.

즉 목표 구조는 아래다.

1. 로그인은 공통 `auth.users`
2. 서비스 이용권은 `hospital_id`
3. 각 솔루션은 자기 도메인 테이블을 유지하되 같은 `hospital_id` 를 참조

## 2. 현재 상태

### `implant-inventory`

- 중심 엔터티: `hospitals`, `profiles`, `billing_history`
- 결제/플랜/권한/JWT claims 모두 `hospital_id` 기반
- 이 프로젝트가 현재 가장 강한 B2B 기준축이다

### `denjoy-homepage`

- 로그인 포털 역할
- `/solutions` 에서 현재 `implant-inventory` 를 live 솔루션으로 노출
- 아직 병원 워크스페이스 모델은 약하고, 사용자 계정 중심

### `hr-denjoy`

- 중심 엔터티: `businesses`, `workers`, `profiles`
- 현재는 `business_id` 워크스페이스 모델
- 개념적으로는 병원 단위 B2B 와 거의 같지만, 키 이름이 다르다

## 3. 핵심 설계

### 공통 원칙

- 부모 포털과 형제 서비스는 같은 Supabase Auth 계정을 쓴다.
- 병원 단위 유료 권한은 모두 `hospital_id` 에 매단다.
- 서비스 추가 결제는 "사용자 업그레이드"가 아니라 "병원 워크스페이스 entitlement 추가"로 본다.

### 새 공통 레이어

- `service_catalog`
  - DenJOY 안에 어떤 서비스가 있는지 정의
  - `homepage`, `implant_inventory`, `hr`, `consulting`, `insurance_claims`, `lectures`
- `hospital_service_subscriptions`
  - 병원이 어떤 서비스를 사용 가능한지 저장
  - 추가 결제 후 이 테이블에 entitlement가 반영됨
- `billing_service_lines`
  - 기존 `billing_history` 헤더 아래에 서비스별 결제 line item 저장
  - 현재 `billing_history` 구조를 깨지 않고 멀티서비스 결제로 확장 가능

### JWT claim

기존:

- `app_metadata.hospital_id`

확장:

- `app_metadata.hospital_id`
- `app_metadata.service_codes`

이렇게 되면 부모 홈페이지가 로그인 직후 "이 병원이 어떤 솔루션을 쓸 수 있는지" 바로 판단할 수 있다.

## 4. 왜 `hospital_id` 가 맞는가

`implant-inventory` 에서는 이미 아래가 모두 `hospital_id` 중심이다.

- 플랜
- 결제
- 멤버 권한
- RLS
- JWT claims

여기서 별도 `workspace_id` 나 `organization_id` 를 새로 만들면:

- 기존 결제 흐름과 중복 축이 생기고
- current service 와 sibling service 의 entitlement가 분리되며
- 운영 데이터 정합성이 더 어려워진다

반대로 `hospital_id` 를 공통 키로 두면:

- 추가 결제 후 서비스 활성화가 간단해지고
- 부모 서비스에서 솔루션 런처를 만들기 쉬워지고
- 병원 단위 계약/B2B 과금 구조와 맞는다

## 5. HR 연결 방식

HR 프로젝트는 현재 `businesses.id` 를 쓴다. 그대로 두면 공통 entitlement와 키가 분리된다.

권장 연결 방식:

1. HR DB에 `hospital_id` 컬럼을 추가한다.
2. 한 `business` 는 한 `hospital_id` 와 1:1 로 연결한다.
3. 이후 HR의 권한 검증은 `business_id` 내부 로직을 유지하되, 서비스 접근 여부는 `hospital_id` 기준으로 확인한다.

즉:

- 도메인 키: `business_id`
- 플랫폼 키: `hospital_id`

이중 구조가 된다.

## 6. 부모 홈페이지 연결 방식

부모 홈페이지는 포털/런처가 되므로 아래 순서가 적절하다.

1. 로그인 후 `auth.users` 세션 획득
2. JWT의 `hospital_id`, `service_codes` 확인
3. `service_codes` 기준으로 솔루션 카드 활성/비활성 처리
4. 비활성 서비스는 결제/문의 CTA로 연결
5. 활성 서비스는 각 서비스 URL로 SSO 진입

단, 홈페이지 자체가 병원별 홈페이지 제작/운영 서비스라면 그것도 별도 `homepage` entitlement로 관리한다.

## 7. 강의는 왜 분리해야 하는가

강의는 병원 전체 계약보다 개인 구매 가능성이 높다.

따라서:

- 강의 catalog 항목은 유지
- 하지만 `hospital_service_subscriptions` 에 넣지 않는다
- 추후 `user_service_subscriptions` 같은 별도 B2C 테이블로 관리한다

즉 병원 B2B entitlement와 개인 B2C entitlement를 한 테이블에 섞지 않는다.

## 8. 중요한 충돌 포인트

세 프로젝트를 같은 Supabase 프로젝트로 합칠 때 가장 먼저 보는 문제는 **중복된 `profiles`/워크스페이스 테이블 이름** 이다.

- `implant-inventory` 는 `public.profiles`, `public.hospitals`
- `hr-denjoy` 도 `public.profiles`, `public.businesses`

따라서 실제 통합 단계에서는 둘 중 하나가 필요하다.

1. 서비스별 별도 schema 사용
   - 예: `inventory.*`, `hr.*`, `portal.*`
2. 공통 멤버십 테이블로 재정렬
   - 예: `workspace_members`, `hospital_members`

이번 변경은 먼저 entitlement 축을 깔고, 도메인 테이블 통합은 다음 단계로 미룬다.

## 9. 이번 변경 범위

- `service_catalog` 추가
- `hospital_service_subscriptions` 추가
- `billing_service_lines` 추가
- 현재 `implant_inventory` 서비스 entitlement 자동 backfill
- JWT hook 에 `service_codes` 추가
- 프론트엔드에서 entitlement를 읽는 타입/서비스 추가

## 10. 다음 단계

1. 부모 홈페이지에서 공통 로그인 후 `service_codes` 기반 솔루션 런처 UI 추가
2. 결제 생성 시 `billing_service_lines` 를 함께 생성하도록 확장
3. `process_payment_callback` 이 서비스별 entitlement를 반영하도록 분기
4. HR 쪽에 `hospital_id` 매핑 추가
5. 장기적으로 HR/홈페이지를 같은 Supabase 프로젝트로 넣을 경우 schema 분리 전략 확정
