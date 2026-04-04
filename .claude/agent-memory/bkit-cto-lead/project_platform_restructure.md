---
name: DenJOY Platform Restructure PDCA
description: PDCA for restructuring implant-inventory into a 3-tier DenJOY platform (brand portal / solution landing / operational app)
type: project
---

DenJOY Platform Restructure PDCA started 2026-04-04, Design phase completed.

**Why:** denjoy.info is evolving from a single inventory app to a multi-service brand hub. The codebase has accumulated routing duality (hash + pathname), dual headers, inventory-locked login flow, and identity/SEO artifacts that all assume a single product.

**How to apply:** Design document at `docs/02-design/denjoy-platform-restructure.design.md` defines 10 diagnosed problems (P0-1 through P2-10) with file:line evidence, a 3-tier AppLayer architecture (`brand | solution | service-hub | operational`), and P0/P1/P2 execution plans totaling ~690 estimated LOC.

Key decisions:
- `AppLayer` enum replaces `isBrandPage` / `isServiceHubView` boolean soup in PublicAppShell.tsx
- Brand pages move to pathname routing; dashboard stays hash-based
- Login decoupled from inventory data loading (MyPage as service launcher)
- `homepage` entitlement renamed to `hospital_homepage` to avoid collision with View type
- Analytics expanded to track brand portal pages
