# Competitor dashboard research

Research date: October 2026. These pages informed **workflow design**, not a reproduction of any competitor's interface. Source screenshots are third-party content and are deliberately **not committed** to this public repository.

## Reference mapping

| Product | Source | Interaction / information architecture inspiration |
| --- | --- | --- |
| Superorder | [Financials](https://help.superorder.com/articles/477735-financials) | Revenue versus payouts; platform mix; fee and deduction disclosures |
| ChowNow | [Sales Trends](https://get.chownow.com/restaurant-support/how-do-i-view-sales-trends-on-the-dashboard/) | Trend-period comparisons and filterable performance |
| ChowNow | [Sales Analytics](https://get.chownow.com/restaurant-support/how-to-view-sales-analytics-on-the-dashboard/) | Sales summaries, order value, location and date selection |
| Nory | [Business Intelligence](https://www.nory.ai/product/business-intelligence) | Multi-site operating metrics and business performance framing |
| Deliverect | [Analytics](https://help.deliverect.com/en/articles/7978952-track-performance-using-the-analytics-page) | Order/channel performance, location drilldowns |
| Otter | [Sales Summary](https://helpdesk.tryotter.com/hc/en-us/articles/41042129066259-Sales-Summary) | Gross/net sales definition and comparison |
| Otter | [Payouts Overview](https://helpdesk.tryotter.com/hc/en-us/articles/7816159229715-Payouts-Overview) | Channel payout ledger and payout status |
| Otter | [Reports & Insights](https://helpdesk.tryotter.com/hc/en-us/articles/12558297776147-Otter-Analytics-Your-Guide-to-Reports-and-Insights) | Report organization and exploration |
| Otter | [Merchant Statement](https://helpdesk.tryotter.com/hc/en-us/articles/52620620895251-Merchant-Statement) | Settlement statement presentation |
| Otter | [Cash Management](https://helpdesk.tryotter.com/hc/en-us/articles/41030431592979-Cash-Management-Report) | Cash flow and operational cash controls |
| Otter | [Financial Reconciliation](https://helpdesk.tryotter.com/hc/en-us/articles/18163188728339-Financials-Reconciliation) | Reconciliation lifecycle and explanation |
| Lunchbox | [Financial Reconciliation](https://support.lunchbox.io/en/articles/10393641-financial-reconciliation-third-party-manager) | Side-by-side financial evidence and exceptions |
| Lunchbox | [Finance Manager](https://support.lunchbox.io/en/articles/10393681-finance-manager-third-party-manager) | Financial reporting workflow by 3PD |
| Lunchbox | [Sales Analytics](https://support.lunchbox.io/en/articles/10394252-sales-analytics-third-party-manager) | Sales comparison and platform segmentation |
| Lunchbox | [Reconciliation Glossary](https://support.lunchbox.io/en/articles/16738255-financial-reconciliation-glossary-third-party-manager) | Precise terminology and reconciliation explanations |
| Craftable | [Sales Details Report](https://help.craftable.com/learning/sales-details-report) | Line-item reporting and export affordances |

## Accessible visual references

We extracted and preserved a **separate internal ZIP archive** of the accessible public help-article screenshots, together with a browsable `index.html` and `manifest.json`. The export contains 28 image files from 13 of the 16 reference articles (the duplicate Otter payout URL was counted only once). Three pages did not yield usable screenshots.

The ZIP is intended only for private competitive research. All KoreFi interface visuals and CSS are original. Do not publish the third-party screenshots to the app or its public repository.

## Product decisions

1. One **canonical sales source**: Square POS already includes sales from third-party delivery channels. Don't add DoorDash/Uber Eats/Grubhub gross revenue on top.
2. Distinguish business-date sales from **payout-date settlement reports**. A date mismatch alone is not a financial discrepancy.
3. Expose the freshness of each source. Toast covers Koreatown and is older; Uber Eats reports are older; QuickBooks is a company, not store, ledger.
4. Build *reconciliation as a workflow*: sources available → order identity matching → payout matching → bank confirmation. Never mark "matched" based only on sums.
5. Progressive disclosure: top-level summary, trend/mix chart, sortable/reporting tables, row drilldowns, export and source definitions.
6. Follow the [KoreFi Figma captures](https://www.figma.com/design/AypXwJhURCv3eEiLlGsNkT/Captures.?node-id=194-2): light surfaces, calm neutrals, clear data density, sidebar/navigation, cards with small labels, fine dividers, restrained warm accents.

## Follow-on design explorations

- True multi-period and year-over-year comparisons only for source-overlapping ranges.
- Platform deductions, chargeback recovery states and case tracking after order-level linking.
- Cash/bank reconciliation and variance queues once bank data is connected.
- Access-controlled exports and saved custom reports.
