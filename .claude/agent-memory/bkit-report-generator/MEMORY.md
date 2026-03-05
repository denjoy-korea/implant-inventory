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

## Files to Reference
- Report template: `/Users/mac/.claude/plugins/cache/bkit-marketplace/bkit/1.5.8/templates/report.template.md`
- Plan: `docs/01-plan/features/{feature}.plan.md`
- Analysis: `docs/03-analysis/features/{feature}.analysis.md`
- Output: `docs/04-report/features/{feature}.report.md`
