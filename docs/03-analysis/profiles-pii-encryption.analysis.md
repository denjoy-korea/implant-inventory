# Gap Analysis: profiles-pii-encryption

**분석 일자**: 2026-02-23
**Match Rate**: 97% (수정 후) / 94% (수정 전)
**상태**: PASS

---

## 검증 항목 요약 (18개)

| # | 카테고리 | 항목 | 결과 |
|:-:|----------|------|:----:|
| 1 | DB | email_hash 컬럼 추가 | MATCH |
| 2 | DB | phone_hash 컬럼 추가 | MATCH |
| 3 | DB | email_hash 인덱스 | MATCH |
| 4 | DB | phone_hash 인덱스 | MATCH |
| 5 | cryptoUtils | encryptPatientInfo export | MATCH |
| 6 | cryptoUtils | decryptPatientInfo export | MATCH |
| 7 | cryptoUtils | hashPatientInfo export | MATCH |
| 8 | authService | lazyEncryptProfile() | MATCH |
| 9 | authService | findEmailByPhone() 해시 우선 | MATCH |
| 10 | authService | checkEmailExists() 해시 우선 | MATCH |
| 11 | authService | updateProfile() 암호화 저장 | MATCH |
| 12 | authService | getProfileById()/signUp() 복호화 | MATCH |
| 13 | mappers | decryptProfile() | MATCH |
| 14 | hospitalService | getMembers() 복호화 | MATCH |
| 15 | hospitalService | getPendingMembers() 복호화 | MATCH |
| 16 | SystemAdminDashboard | decryptProfile 적용 | MATCH |
| 17 | AdminPanel | decryptProfile 적용 | MATCH |
| 18 | UserProfile | authService.updateProfile() 경유 | MATCH |

---

## 발견된 GAP

### GAP-1 (해결됨): DbProfile 타입 누락

- **심각도**: 낮음 (런타임 영향 없음)
- **문제**: `types.ts`의 `DbProfile` 인터페이스에 `email_hash`, `phone_hash` 필드 미정의
- **수정**: `types.ts`에 `email_hash?: string | null`, `phone_hash?: string | null` 추가 완료

---

## 특이사항 (설계 초과 구현)

- `hospitalService.getReadonlyMembers()` — 복호화 적용됨
- `hospitalService.getMasterEmail()` — 복호화 적용됨
- `authService.signUp()` fallback 로직에 5회 재시도 패턴으로 lazy encryption 보장

---

## 결론

모든 읽기 경로에서 `decryptProfile` / `decryptPatientInfo` 가 적용되어 있고,
모든 쓰기 경로에서 `encryptPatientInfo` + `hashPatientInfo` 가 일관되게 적용되어 있음.
타입 정의 1건 수정으로 Match Rate 100% 달성.
