# KoreFi prototype data contract

## Scope and source of truth

The prototype's real-data backend uses **one read-only application path** to Neon. The primary financial view is **Square POS**:

- `square.transactions`: one row per Square transaction ID, grouping original item/event lines and computing `gross_sales`, `net_sales`, `discounts`, `tax`, `quantity`.
- `square.item_sales_detail`: granular item/event observations. Date and location filters are applied to `business_date` and `core_location_id`.
- Source dates were reported as `Asia/Calcutta`; `business_date` has already been normalized to `America/Los_Angeles`. Do not normalize twice.
- Five Square locations are mapped to `core.locations`. **Square's location identifiers are provisional names**, not official Square API location IDs.

Payout ledger entries are sourced separately from `doordash.financial_payout_summary`, `grubhub.deposits`, `uber_eats.payout_summary`. They are grouped/displayed using *payout date*. Bank credit confirmation and reconciliation state are **not derived** from these records.

`core.platform_locations` maps external platform store IDs to the shared location dimension.

## Terms

| Term | Calculation / interpretation |
| --- | --- |
| Net sales | Sum of `square.transactions.net_sales` for selected Square business dates, location and channel |
| Gross sales | Sum of `square.transactions.gross_sales` on same grain |
| Discount | Sum of `square.transactions.discounts` (often negative) |
| Orders | Count of grouped Square transactions marked as a `Payment` event |
| Average order value | Net sales / grouped payment transactions. Methodology may differ from Square's UI; validate before labeling it a certified Square AOV |
| Taxes | Sum of Square `tax`; not necessarily the amount remitted by the merchant |
| Channel mix | Classified from Square `channel` strings; unknown values treated as `In-store / POS`, pending a reviewed mapping |
| Payouts | Sum of platform-reported payout records in selected payout dates, not bank deposits |
| Reconciliation | **Not yet implemented**; no variance claimed without order-/bank-level evidence |

## Coverage and risk flags

- Square detail: 82,577 item/event rows, 52,016 unique transactions, five location names; business date 2026-04-06 through 2026-10-06. All 82,577 rows mapped to a provisional KoreFi location ID. Original source gross $692,126.33, discounts -$17,331.97, net $674,794.36, tax $290.51.
- Square summary: gross $692,831.60, refund -$705.27, same net sales/tax/discounts when adjusting for refunds. Do not confuse gross before and after returns.
- DoorDash: orders/financial detail through 2026-10-04. Four LA stores.
- Grubhub: orders through 2026-10-05. Four LA stores.
- Uber Eats: order history through 2026-07-31; payment detail and payout summaries through 2026-09-30. Payment and payout date fields are `DD/MM/YYYY` strings and MUST be parsed as dates, not compared lexicographically. Financial reporting does not imply newer order-history rows.
- Toast: historical Koreatown data only, through 2026-07-28. Do **not** add Toast and Square revenue.
- QuickBooks: **Odd One Out Tea Koreatown LLC**, one company; no native Class/Department dimension. Never allocate those ledger amounts across all stores without store-level evidence.

## Demo vs. live mode

- Without `DATABASE_URL`, the app returns **deterministic simulated transactions and totals** (visibly labeled).
- With `DATABASE_URL`, all financial responses require `KOREFI_PREVIEW_ACCESS_KEY` sent as a bearer token in the request header. Responses are `Cache-Control: private, no-store`.
- Do not store secret keys in source control. Do not use a public default database credential. Use a dedicated **read-only** database role with SELECT on only the required view/tables, ideally behind SSO and per-tenant authorization.
- The current access-key gate is **prototype only**, not production multi-tenant auth. Avoid deploying with real restaurant data to a public URL until proper authorization, isolation, logging, and PII handling are reviewed.
