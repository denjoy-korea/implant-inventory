# bkit-report-generator Memory

## Report Structure Standards

### Completion Report Template (Act Phase)
Used for `/pdca report {feature}` after Check phase (Match Rate ≥90%).

**Key sections (in order):**
1. **Executive Summary** — Feature overview + key results box (Match Rate, scope, test pass %)
2. **Related Documents** — Plan, Design, Check links with status badges
3. **Requirements Completion Matrix** — Must + Should split, with implementation details
4. **Implementation Details by Phase** — Phase-based breakdown with file count
5. **Technical Decisions & Rationale** — Why we chose approach A over B
6. **Quality Metrics** — Completion %, code impact, regressions
7. **Lessons Learned** — Keep/Problem/Try (KPT retrospective)
8. **Remaining Scope** — Phase 4+, Won't items clearly marked
9. **Next Steps** — Immediate checklist + next PDCA cycle table
10. **Changelog** — v1.0.0 with Added/Changed/Fixed sections
11. **Success Criteria** — Verification checklist
12. **Version History** — Single entry for report version

**Match Rate box template:**
```
┌────────────────────────────────────────────────────┐
│  MATCH RATE: {N}% {✅ or ⚠️} ({X}/{Y} requirements)  │
├────────────────────────────────────────────────────┤
│  ✅ Phase 1: {count} items + framework              │
│  ✅ Phase 2: {count} items                          │
│  ✅ Phase 3: {count} items                          │
│  ✅ Bonus: {count} items (scope expansion)         │
│                                                    │
│  Test Pass Rate: {N}%                              │
│  Code Quality: X TypeScript errors                 │
└────────────────────────────────────────────────────┘
```

## modal-accessibility Report Pattern

**Specific to this feature (2026-03-05):**
- Scope: 33 modals + R-12~R-15 bonus items (alerts, confirms, keyboard)
- Match Rate: 100% (16/16 items: R-01~R-11, R-13~R-15)
- Phase structure: Phase 1 (12 core) → Phase 2 (10 admin) → Phase 3 (11 legacy)
- ModalShell component: Single source of truth for ARIA + focus + ESC
- R-10 deferred: aria-label standardization (Phase 4 out of scope)

**Lessons:**
- bkit PDCA discipline (Plan + Analysis) → 100% match on first attempt
- Component-based accessibility (ModalShell) beats hook-based approach for nested modals
- Phase-based migration (core → admin → legacy) reduces regression risk
- Code analyzer (AST-based) better than manual grep for PDCA Check

## Report Generation Tips

1. **Always read Plan + Analysis first** — Use their findings to build Requirements Completion Matrix
2. **Match Rate ≥90% before Report** — Report is final deliverable after Check passes
3. **List all changes by file** — Implementation Details section should name every modified file
4. **Technical Decisions section** — Include "why not?" comparisons (Option A vs B vs C)
5. **Lessons Learned (KPT)** — Keep (positive), Problem (what didn't work), Try (next time)
6. **Next Steps table** — Include priority, start date, owner for each follow-up
7. **Changelog v1.0.0** — Added/Changed/Fixed always match actual code changes
8. **Success Criteria checklist** — Design Match Rate ≥90%, TypeScript clean, tests pass, zero regressions

## valuation-narrowing Report Pattern (2026-03-05)

**Scope**: 3 Workstreams (WS3 Funnel / WS4 Release / WS5 Dataroom) with 15 requirements
- Match Rate: 90.0% (13.5/15: 12 PASS, 3 PARTIAL, 0 FAIL)
- WS3: 91.7% (5.5/6) — Pre-built snapshot + analytics + quality template
- WS4: 100% (3/3) — Test suite updates + verify:premerge 3× Green + verify:release Green
- WS5: 83.3% (5/6) — Dataroom structure complete except MRR (blocked) + PII redaction (legal pending)

**Key pattern**: Multi-workstream feature requires Requirements Completion Matrix split by phase/workstream
**Dataroom note**: Design said folders 01-commercial/02-legal/03-security, but implementation uses specific functional names (01-contracts, 02-billing-reconciliation, etc.) — documented as intentional in Analysis

## pricing-overhaul Report Pattern (2026-03-08)

**Scope**: 4 Milestones (M1 코드 정합성 + M2 화면 잠금 + M3 pricingData + M4 신규 기능) with 23 requirements
- Match Rate: 97.8% (22/23: 22 PASS, 1 CHANGED, 0 FAIL, 0 DEFERRED)
- M1: 100% (7/7) — Types, Services, FeatureGate, UI Gating, PricingPaymentModal, useFileUpload, toss-payment-confirm
- M2: 100% (6/6) — Sidebar, SurgeryDashboard (viewMonths clamp + charts + banner), FailManager, InventoryManager
- M3: 100% (4/4) — pricingData import + differentiation + comparisonCategories + formatPrice dedup
- M4: 91.7% (5.5/6) — SimpleOrderCopyButton (PASS), EXTRA_USER_PRICING (CHANGED: single constant instead of object), extra_user_count (PASS), DowngradeMemberSelectModal (PASS), planService.suspendMembersForDowngrade (PASS), OrderLowStockSection integration (PASS)

**Key insights**:
- v1 → v2 → v3: 79.4% → 97.1% (M1-M3 only) → 97.8% (full). v2/v3 DEFERRED 2건 모두 해소 (SO-01 SimpleOrderCopy, BU-03 DowngradeMember)
- IM-01 (brand_analytics FeatureGate): v2 CHANGED → v3 PASS. 정확한 위치는 InventoryManager.tsx L397-414 조건부 렌더링 + SectionLockCard fallback
- BU-01 (EXTRA_USER_PRICING): yearlyPrice 4000 미포함. 현재 Business 연간 결제 시나리오 없으므로 수용. 설계 문서 업데이트 필요 (Low priority)
- viewMonths clamp: 설계의 canViewDataFrom() 호출 대신 슬라이더 인덱스 방식 (더 효율적). 동일 결과, 더 간결한 구현
- SimpleOrderCopyButton props: 설계의 `items: OrderItem[]` 대신 `groupedLowStock: [string, LowStockEntry[]][]` (OrderLowStockSection에서 이미 그룹화, 중복 제거)
- DowngradeMemberSelectModal: 설계의 "추가 사용자 과금" 안내 대신 "다운그레이드 멤버 선택" 모달. 더 포괄적인 다운그레이드 경험 제공 (2단계 플로우: ConfirmModal → SelectModal)
- Positive additions: SectionLockCard intra-section lock cards, pricingData FAQ/FINDER_QUESTIONS 동적화, planService.reactivateReadonlyMembers 업그레이드 시 멤버 복구

**Test Results**: 138/138 PASS, TypeScript clean, verify:premerge ✅

## security-hardening Report Pattern (2026-03-12)

**Scope**: SECURITY DEFINER function audit (5 functions, 5 vulnerabilities: 3 Critical, 1 High, 1 Medium)
- Match Rate: 100% (5/5 vulnerabilities remediated, 6/6 design requirements)
- Single migration: `20260312220000_security_definer_revoke_hardening.sql` (182 lines)
- Pattern enforcement: REVOKE ALL → explicit GRANT to role (standard SECURITY DEFINER pattern)

**Vulnerability Remediation Matrix Format**:
- P-level priority (P0=immediate, P1=short-term, P2=deferred)
- C/H/M severity codes (Critical/High/Medium)
- Function name, Issue, Fix Applied, Verification columns
- Root cause analysis for each item

**Key insights**:
- Permission regressions caught by function signature audit (post-migration review)
- SECURITY DEFINER pattern: REVOKE ALL → explicit GRANT prevents accidental permission creep
- Admin role check in plpgsql wrapper (for aggregates, not row-based functions)
- Audit logging via operation_logs table (centralized trail, not separate tables)

**Next cycle action**: Add `checkSecurityDefinerPattern()` lint rule to catch REVOKE omissions automatically

## order-return-remodel Report Pattern (2026-03-12)

**Scope**: 6 functional requirements (F-01 through F-06) — UX enhancement + core feature
- Match Rate: 94.1% (32/34: 25 PASS [F-02-F-06], 2 FAIL [F-01 integration/LOC], 7 PASS [F-06 deep])
- Core feature F-06: actual_received_qty tracking (100% complete end-to-end)
- F-01 deferred: useOrderManagerModals hook exists but not wired (tech debt accepted)
- Code growth: +469 LOC net (11 files modified/created)

**Key insights**:
- F-06 works independently from F-01 code structure refactoring (feature isolation principle)
- Design-first rigor → 94% match on first implementation attempt
- Tech debt acknowledged in report: deferred F-01 and OrderManager LOC (< 350 target not met)
- Partial completion acceptable when core feature 100% complete (gate: ≥90% match)
- NULL default on DB column enables backward compatibility (no migration needed for legacy data)

**Stock adjustment formula**: `diff = requested - actual; if diff > 0, restore diff to inventory`
- Counterintuitive at first but correct semantics: "how much surplus did we recover?"
- Implementation uses positive number = surplus restored (matches use case)

**Files to Reference**
- Report template: `/Users/mac/.claude/plugins/cache/bkit-marketplace/bkit/1.5.8/templates/report.template.md`
- Plan: `docs/01-plan/features/{feature}.plan.md`
- Analysis: `docs/03-analysis/features/{feature}.analysis.md`
- Output: `docs/04-report/features/{feature}.report.md`
- pricing-overhaul Report: `docs/04-report/features/pricing-overhaul.report.md`
- security-hardening Report: `docs/04-report/features/security-hardening.report.md`
- order-return-remodel Report: `docs/04-report/features/order-return-remodel.report.md`
