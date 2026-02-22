# Project Changelog

All notable changes to the DenJOY (implant-inventory) project are documented here.

---

## [2026-02-22] - feature-showcase Landing Page Redesign

### Added
- 6-card Bento Grid layout for KEY FEATURES section (replaces old 3-card layout)
- New feature cards:
  - Card 2: 수술 통계 & 임학 분석 (emerald accent, NEW badge)
  - Card 4: 스마트 발주 추천 (amber accent)
  - Card 5: 재고 실사 & 불일치 감지 (sky accent)
- Section subtitle: "치과 임플란트 관리의 모든 것을 하나로"
- Stat chips to Card 1 (3 metrics: "업로드 후 30초", "14개 브랜드", "실시간 알림")
- Horizontal layout for Card 6 (wide card with stat numbers on right)

### Changed
- Grid layout: `md:grid-cols-3` with responsive `md:row-span-2` and `md:col-span-3`
- Card 1: Added `flex flex-col` for proper vertical spacing with stat chips at bottom
- Card 3: Improved copy from "FAIL 관리 & 발주 추적" to "FAIL 완전 추적"
- Card 6: Changed to horizontal layout with stats sidebar on md+

### Fixed
- N/A (100% design match, perfect implementation)

### Deployment
- **Status**: ✅ Deployed to production
- **URL**: https://inventory.denjoy.info
- **Build**: Passed (npm run build)
- **Design Match**: 100%

### Details
- **Feature**: feature-showcase
- **Phase**: PDCA Complete (Plan ✅ → Design ✅ → Do ✅ → Check ✅ → Act ✅)
- **Duration**: Single session
- **Files Modified**: 1 (components/LandingPage.tsx, lines 343-483)
- **Report**: [feature-showcase.report.md](features/feature-showcase.report.md)

---

## Project Information

| Item | Value |
|------|-------|
| Project Name | DenJOY - 치과 임플란트 재고관리 SaaS |
| Repository | implant-inventory |
| Stack | React + TypeScript + Vite + Tailwind CSS |
| Deployment | Vercel (https://inventory.denjoy.info) |
| Current Version | 0.0.0 |

---

## PDCA Completion Summary

### Completed Features

| Feature | Plan | Design | Implementation | Check | Status | Report |
|---------|------|--------|----------------|-------|--------|--------|
| feature-showcase | ✅ | ✅ | ✅ | ✅ | Complete | [link](features/feature-showcase.report.md) |

### Metrics

| Metric | Value |
|--------|-------|
| Total Features Completed | 1 |
| Average Design Match Rate | 100% |
| Build Status | Passing |
| Deployment Status | Live |

---

**Last Updated**: 2026-02-22
**Changelog Version**: 1.0
