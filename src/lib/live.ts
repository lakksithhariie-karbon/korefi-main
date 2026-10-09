import { Pool } from "pg";
import {
  CHANNEL_COLORS,
  LOCATIONS,
  type DashboardData,
  type Filters,
  type PayoutRow,
  type SourceRow,
} from "@/lib/types";
import { SOURCE_HEALTH } from "@/lib/demo";

let pool: Pool | undefined;

function db(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("Neon is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 12000,
      statement_timeout: 30000,
      application_name: "korefi-finance-prototype",
    });
  }
  return pool;
}

type R = Record<string, unknown>;

function num(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function dateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function string(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

const CHANNEL_SQL =
  "CASE WHEN lower(coalesce(t.channel,'')) LIKE '%doordash%' THEN 'DoorDash' " +
  "WHEN lower(coalesce(t.channel,'')) LIKE '%uber eats%' OR lower(coalesce(t.channel,'')) LIKE '%ubereats%' THEN 'Uber Eats' " +
  "WHEN lower(coalesce(t.channel,'')) LIKE '%grubhub%' THEN 'Grubhub' " +
  "WHEN lower(coalesce(t.channel,'')) LIKE '%kiosk%' THEN 'Kiosk' " +
  "WHEN lower(coalesce(t.channel,'')) LIKE '%pick up%' OR lower(coalesce(t.channel,'')) LIKE '%online%' THEN 'Direct Online' " +
  "WHEN lower(coalesce(t.channel,'')) LIKE '%classpass%' THEN 'ClassPass' " +
  "WHEN lower(coalesce(t.channel,'')) LIKE '%invoice%' THEN 'Invoice' " +
  "ELSE 'In-store / POS' END";

const SALES_WHERE =
  "t.business_date BETWEEN $1::date AND $2::date " +
  "AND ($3 = 'all' OR t.core_location_id = $3) " +
  "AND ($4 = 'All channels' OR " + CHANNEL_SQL + " = $4)";

const REFUND_FILTER = "CASE WHEN lower(coalesce(t.event_type,'')) = 'refund' THEN 1 ELSE 0 END";

export async function getLiveDashboard(filters: Filters): Promise<DashboardData> {
  const client = db();
  const params = [filters.from, filters.to, filters.location, filters.channel];

  const [
    latestResult,
    summaryResult,
    trendResult,
    channelsResult,
    locationsResult,
    itemsResult,
    payoutsResult,
  ] = await Promise.all([
    client.query("SELECT max(business_date) AS latest FROM square.transactions"),
    client.query(
      "SELECT COALESCE(sum(t.net_sales),0) AS net_sales, " +
      "COALESCE(sum(t.gross_sales),0) AS gross_sales, " +
      "COALESCE(sum(t.discounts),0) AS discounts, " +
      "COALESCE(sum(t.tax),0) AS taxes, " +
      "COUNT(*) FILTER (WHERE lower(coalesce(t.event_type,'')) = 'payment') AS orders, " +
      "COALESCE(sum(abs(t.net_sales)) FILTER (WHERE " + REFUND_FILTER + " = 1),0) AS refunds " +
      "FROM square.transactions t WHERE " + SALES_WHERE,
      params
    ),
    client.query(
      "SELECT t.business_date AS date, COALESCE(sum(t.net_sales),0) AS sales, " +
      "COALESCE(sum(t.gross_sales),0) AS gross, " +
      "COUNT(*) FILTER (WHERE lower(coalesce(t.event_type,'')) = 'payment') AS orders " +
      "FROM square.transactions t WHERE " + SALES_WHERE +
      " GROUP BY t.business_date ORDER BY t.business_date",
      params
    ),
    client.query(
      "SELECT " + CHANNEL_SQL + " AS name, COALESCE(sum(t.net_sales),0) AS sales, " +
      "COUNT(*) FILTER (WHERE lower(coalesce(t.event_type,'')) = 'payment') AS orders " +
      "FROM square.transactions t WHERE " + SALES_WHERE +
      " GROUP BY 1 ORDER BY 2 DESC",
      params
    ),
    client.query(
      "SELECT t.core_location_id AS id, max(t.location_name) AS name, " +
      "COALESCE(sum(t.net_sales),0) AS sales, " +
      "COUNT(*) FILTER (WHERE lower(coalesce(t.event_type,'')) = 'payment') AS orders " +
      "FROM square.transactions t WHERE " + SALES_WHERE +
      " GROUP BY t.core_location_id ORDER BY 3 DESC",
      params
    ),
    client.query(
      "SELECT COALESCE(NULLIF(s.item_name,''),'Unspecified item') AS name, " +
      "COALESCE(NULLIF(s.category,''),'Uncategorised') AS category, " +
      "COALESCE(sum(s.net_sales),0) AS sales, " +
      "COALESCE(sum(s.quantity),0) AS units " +
      "FROM square.item_sales_detail s " +
      "WHERE s.business_date BETWEEN $1::date AND $2::date " +
      "AND ($3 = 'all' OR s.core_location_id = $3) " +
      "AND ($4 = 'All channels' OR (" +
      "CASE WHEN lower(coalesce(s.channel,'')) LIKE '%doordash%' THEN 'DoorDash' " +
      "WHEN lower(coalesce(s.channel,'')) LIKE '%uber eats%' OR lower(coalesce(s.channel,'')) LIKE '%ubereats%' THEN 'Uber Eats' " +
      "WHEN lower(coalesce(s.channel,'')) LIKE '%grubhub%' THEN 'Grubhub' " +
      "WHEN lower(coalesce(s.channel,'')) LIKE '%kiosk%' THEN 'Kiosk' " +
      "WHEN lower(coalesce(s.channel,'')) LIKE '%pick up%' OR lower(coalesce(s.channel,'')) LIKE '%online%' THEN 'Direct Online' " +
      "WHEN lower(coalesce(s.channel,'')) LIKE '%classpass%' THEN 'ClassPass' " +
      "WHEN lower(coalesce(s.channel,'')) LIKE '%invoice%' THEN 'Invoice' " +
      "ELSE 'In-store / POS' END) = $4) " +
      "GROUP BY 1,2 ORDER BY 3 DESC LIMIT 30",
      params
    ),
    fetchPayoutRows(client, filters),
  ]);

  const main = (summaryResult.rows[0] || {}) as R;
  const sales = num(main.net_sales);
  const gross = num(main.gross_sales);
  const orders = num(main.orders);
  const payoutRows = payoutsResult;

  const channelRows = channelsResult.rows.map((x: R) => ({
    name: string(x.name),
    sales: num(x.sales),
    orders: num(x.orders),
    share: sales === 0 ? 0 : +(num(x.sales) / sales * 100).toFixed(1),
    color: CHANNEL_COLORS[string(x.name)] || CHANNEL_COLORS.Other,
  }));

  const locationRows = locationsResult.rows.map((x: R) => ({
    id: string(x.id),
    name: string(x.name) || LOCATIONS.find((site) => site.id === x.id)?.name || "Unmapped",
    sales: num(x.sales),
    orders: num(x.orders),
    share: sales === 0 ? 0 : +(num(x.sales) / sales * 100).toFixed(1),
  }));

  const latest = dateOnly(latestResult.rows[0]?.latest);
  const notes = [
    "Live aggregated Square POS sales. DoorDash, Uber Eats and Grubhub orders are already represented in Square and are not added again.",
    "Payout totals use partner payout dates, not Square order business dates. Bank matching has not been performed.",
    "Export coverage varies by source and location; older data must not be treated as zero activity.",
  ];

  return {
    mode: "live",
    asOf: latest,
    from: filters.from,
    to: filters.to,
    summary: {
      netSales: sales,
      grossSales: gross,
      discounts: num(main.discounts),
      taxes: num(main.taxes),
      orders,
      avgOrderValue: orders ? +(sales / orders).toFixed(2) : 0,
      refunds: -num(main.refunds),
      payoutTotal: payoutRows.reduce((sum, payout) => sum + payout.amount, 0),
    },
    trend: trendResult.rows.map((x: R) => ({
      date: dateOnly(x.date),
      sales: num(x.sales),
      gross: num(x.gross),
      orders: num(x.orders),
    })),
    channels: channelRows,
    locations: locationRows,
    menu: itemsResult.rows.map((x: R) => ({
      name: string(x.name),
      category: string(x.category),
      sales: num(x.sales),
      units: num(x.units),
    })),
    payouts: payoutRows,
    sources: SOURCE_HEALTH.map((x: SourceRow) =>
      x.name === "Square" ? { ...x, lastDate: latest } : x
    ),
    insights: [
      "Square is the canonical omnichannel sales source for this view; third-party marketplace sales must not be double-counted.",
      "Compare payouts using payout dates separately from sales business dates before interpreting a difference as missing money.",
      "Bank reconciliation and cross-system order-level matching are not yet certified; amounts shown here are reported source values.",
    ],
    notes,
  };
}

async function fetchPayoutRows(client: Pool, filters: Filters): Promise<PayoutRow[]> {
  if (filters.channel !== "All channels" &&
      !["DoorDash", "Uber Eats", "Grubhub"].includes(filters.channel)) {
    return [];
  }

  const partnerWhere = (name: string) =>
    filters.channel === "All channels" || filters.channel === name;

  const jobs: Array<Promise<PayoutRow[]>> = [];

  if (partnerWhere("DoorDash")) {
    jobs.push(client.query(
      "SELECT f.payout_id AS id, f.payout_date AS day, " +
      "COALESCE(p.location_id,'') AS location_id, " +
      "COALESCE(p.platform_store_name,f.store_name,'Unknown') AS store, " +
      "sum(COALESCE(NULLIF(regexp_replace(coalesce(f.net_total,''),'[^0-9.-]','','g'),''),'0')::numeric) AS amount " +
      "FROM doordash.financial_payout_summary f " +
      "LEFT JOIN core.platform_locations p ON p.platform = 'doordash' AND p.platform_location_id = f.store_id " +
      "WHERE f.payout_date ~ '^\\d{4}-\\d{2}-\\d{2}$' " +
      "AND f.payout_date::date BETWEEN $1::date AND $2::date " +
      "AND ($3 = 'all' OR p.location_id = $3) " +
      "GROUP BY 1,2,3,4 ORDER BY 2 DESC LIMIT 200",
      [filters.from, filters.to, filters.location]
    ).then((result) => result.rows.map((x: R) => ({
      id: string(x.id) || "dd-" + string(x.day),
      platform: "DoorDash",
      store: displayStore(string(x.store)),
      locationId: string(x.location_id),
      payoutDate: dateOnly(x.day),
      amount: num(x.amount),
      status: "Reported" as const,
      basis: "Payout date" as const,
    }))).catch(() => []));
  }

  if (partnerWhere("Grubhub")) {
    jobs.push(client.query(
      "SELECT d.deposit_id AS id, d.payout_date AS day, " +
      "d.location_id, d.store_name AS store, d.payout_amount AS amount " +
      "FROM grubhub.deposits d " +
      "WHERE d.payout_date BETWEEN $1::date AND $2::date " +
      "AND ($3 = 'all' OR d.location_id = $3) " +
      "ORDER BY d.payout_date DESC LIMIT 200",
      [filters.from, filters.to, filters.location]
    ).then((result) => result.rows.map((x: R) => ({
      id: string(x.id),
      platform: "Grubhub",
      store: displayStore(string(x.store)),
      locationId: string(x.location_id),
      payoutDate: dateOnly(x.day),
      amount: num(x.amount),
      status: "Reported" as const,
      basis: "Payout date" as const,
    }))).catch(() => []));
  }

  if (partnerWhere("Uber Eats")) {
    jobs.push(client.query(
      "SELECT f.payout_reference_id AS id, f.payout_date AS day, " +
      "COALESCE(p.location_id,'') AS location_id, f.shop_name AS store, " +
      "COALESCE(NULLIF(regexp_replace(coalesce(f.total_payout,''),'[^0-9.-]','','g'),''),'0')::numeric AS amount " +
      "FROM uber_eats.payout_summary f " +
      "LEFT JOIN core.platform_locations p ON p.platform = 'uber_eats' AND p.platform_location_id = f.shop_uuid " +
      "WHERE f.payout_date ~ '^\\d{2}/\\d{2}/\\d{4}$' " +
      "AND to_date(f.payout_date,'DD/MM/YYYY') BETWEEN $1::date AND $2::date " +
      "AND ($3 = 'all' OR p.location_id = $3) " +
      "ORDER BY to_date(f.payout_date,'DD/MM/YYYY') DESC LIMIT 200",
      [filters.from, filters.to, filters.location]
    ).then((result) => result.rows.map((x: R) => ({
      id: string(x.id),
      platform: "Uber Eats",
      store: displayStore(string(x.store)),
      locationId: string(x.location_id),
      payoutDate: flipDate(string(x.day)),
      amount: num(x.amount),
      status: "Reported" as const,
      basis: "Payout date" as const,
    }))).catch(() => []));
  }

  const result = (await Promise.all(jobs)).flat();
  return result.sort((a, b) => b.payoutDate.localeCompare(a.payoutDate));
}

function flipDate(value: string): string {
  const parts = value.split("/");
  return parts.length === 3 ? parts[2] + "-" + parts[1] + "-" + parts[0] : value;
}

function displayStore(name: string): string {
  const text = name.toLowerCase();
  if (text.includes("korea") || text.includes("western")) return "Koreatown";
  if (text.includes("pasadena") || text.includes("fair oaks")) return "Pasadena";
  if (text.includes("sawtelle") || text.includes("olympic")) return "Sawtelle";
  if (text.includes("santa monica") || text.includes("promenade")) return "Santa Monica";
  if (text.includes("san mateo")) return "San Mateo";
  return name || "Unmapped location";
}
