# Legal Terms Version History

## v2026.02.23

적용 범위:
- `components/shared/LegalModal.tsx`
- `utils/trialPolicy.ts`
- `utils/businessInfo.ts`
- `components/shared/PublicInfoFooter.tsx`

주요 변경:
1. SaaS 구독형 조항 구조화
   - 자동갱신
   - 해지/환불
   - 청약철회
   - 서비스 변경/중단
   - 책임 범위
   - 분쟁처리 및 관할

2. 무료체험/데이터 정책 단일화
   - 체험 기간, 미구독 시 데이터 삭제, 구독/Free 전환 시 데이터 유지 정책을 공통 상수로 정리

3. 사업자 정보 단일 소스화
   - 대표자, 사업자번호, 통신판매업 신고번호, 대표 이메일을 `utils/businessInfo.ts`로 통합

4. 공개 페이지 약관 접근성 강화
   - 공통 푸터를 통해 이용약관/개인정보처리방침 링크를 일관 제공

검토 메모:
- 정책 문구 충돌 방지를 위해 체험/보존/삭제 핵심 카피는 상수 재사용을 원칙으로 유지한다.

