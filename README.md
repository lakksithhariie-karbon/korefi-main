# KoreFi — Financial & Restaurant Intelligence

A working **multi-page restaurant performance dashboard prototype**, inspired by best practices across financial reconciliation, sales analytics, payout tracking, and business intelligence products.

Built with **Next.js 15, React 19, TypeScript, Recharts, and custom responsive CSS**.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**No environment variables are needed** to explore the demo: filters, charts, page navigation, payouts, tables, detail drawers and CSV exports all work using explicitly labeled *synthetic* financial data.

### Preview live data from KoreFi's Neon database

This public repository intentionally includes **no credentials or raw transaction exports**. Live finance data must be served only through a protected environment.

1. Provision a separate **SELECT-only** Postgres role for the necessary `square`, `core`, `doordash`, `grubhub` and `uber_eats` tables; do not deploy with the database owner role.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` to the protected read-only database connection string.
4. Set `KOREFI_PREVIEW_ACCESS_KEY` to a unique high-entropy value that isn't used anywhere else.
5. Restart the app. Enter the preview access key in the app to authorize aggregated report queries.

```bash
npm run typecheck
npm run build
```

**Security:** The bearer preview key is a development-only gate, **not** multi-tenant authorization. Do not make real customer financial data publicly accessible. Production launch requires organization/restaurant-level auth, permissions, logging, audit trails, secret management, PII minimization, and an authorization review. Never commit `.env.local`.

## Screens in this build

| Page | What's working |
| --- | --- |
| **Overview** | Source-aware net sales, orders, average order value, partner payouts, revenue trend, channel mix, locations, insight notes |
| **Sales analytics** | Filterable business-date sales, item/channel breakdowns, CSV export |
| **Payouts** | Payout-date ledger, partner/store selection, search, pagination and drill-down |
| **Reconciliation** | Honest evidence workflow — source availability vs. missing order-link and bank-match steps |
| **Menu performance** | Top items by sales and units, category leaders |
| **Locations** | Five-store ranking, location drilldowns |
| **Data sources** | Freshness, store coverage and source-limit explanations |

Common navigation includes **7/30/90 day presets, a custom range, location selector, channel selector, refresh and CSV export**. The interface is responsive on desktop, tablet and mobile.

## How financial figures are treated

**Canonical Square sales** include in-store, direct/kiosk and partner-delivered orders that flow into POS. Sales from DoorDash, Uber Eats and Grubhub are therefore **not added again**. Partner payouts are recorded in separate settlement ledgers and use payout dates, which differ from business/order dates.

This version does not claim that partner payout reports match bank deposits. That is a future matching/investigation layer.

- Square: 82,577 line/event rows and 52,016 grouped transactions, five locations, California business dates through October 6, 2026.
- DoorDash and Grubhub: primarily the four LA stores; exports through early October.
- Uber Eats: order history through July 31, 2026; payment/payout financial reports through September 30, 2026. Source report dates must be parsed from DD/MM/YYYY, not compared as plain text.
- Toast: Koreatown only, older exports.
- QuickBooks: one legal entity (Koreatown LLC); **not** automatically allocated to all five stores.

Read [Data contract](docs/DATA_CONTRACT.md) for metric definitions and [Competitor research](docs/COMPETITOR_RESEARCH.md) for product and UX research sources.

## Architecture

```text
             React dashboard (filters/charts/tables)
                           │
              GET /api/dashboard
            ┌──────────────┴──────────────┐
     No DATABASE_URL             DATABASE_URL set
     synthetic preview           preview bearer key required
                                     │
                                  Neon (pg)
                            read-only SQL aggregates
                             Square / partner payouts
```

- Server-side SQL uses parameterized date, location and channel filters.
- HTTP JSON responses use `private, no-store`.
- When the live database is configured, the API does not silently fall back to invented financial data.
- Demo mode is visibly labeled on every screen; source-health metadata describe observed historical exports, **not live integrations**.

## Next iterations

1. Replace preview key with real user/workspace authentication and multi-tenant isolation.
2. Validate accounting signs and refund semantics per report before certifying calculations.
3. Add order-to-payout identifiers and bank deposit matching.
4. Add saved dashboard views, comparisons and user-customizable reports.
5. Connect supported live POS and 3PD APIs.
6. Add test fixtures and route-level integration tests.

Design inspiration: [KoreFi Figma captures](https://www.figma.com/design/AypXwJhURCv3eEiLlGsNkT/Captures.?node-id=194-2).

**Development**: work is maintained on `feat/finance-intelligence-prototype` and reviewed through a pull request before merging into `main`.
