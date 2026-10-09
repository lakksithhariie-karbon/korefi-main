import {
  CHANNEL_COLORS,
  CHANNELS,
  LOCATIONS,
  classifyChannel,
  type ChannelRow,
  type DashboardData,
  type Filters,
  type LocationRow,
  type MenuRow,
  type PayoutRow,
  type SourceRow,
  type TrendPoint,
} from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_END = "2026-10-06";
const DEMO_START = "2026-04-06";

const SITE_WEIGHTS: Record<string, number> = {
  ooo_koreatown: 0.19,
  ooo_pasadena: 0.18,
  ooo_santa_monica: 0.18,
  ooo_sawtelle: 0.24,
  ooo_san_mateo: 0.21,
};

const CHANNEL_WEIGHTS: Record<string, number> = {
  "In-store / POS": 0.33,
  Kiosk: 0.28,
  DoorDash: 0.14,
  "Uber Eats": 0.11,
  Grubhub: 0.035,
  "Direct Online": 0.045,
  ClassPass: 0.045,
  Invoice: 0.015,
};

const MENU_SEEDS: Array<{ name: string; category: string; weight: number; unitPrice: number }> = [
  { name: "TW '23 Golden Buddha Silk Boba", category: "Milky Odditeas", weight: 0.145, unitPrice: 7.65 },
  { name: "Wintermelon Lemon", category: "Refreshers", weight: 0.117, unitPrice: 7.30 },
  { name: "Brown Sugar Boba Milk", category: "Milky Odditeas", weight: 0.105, unitPrice: 7.95 },
  { name: "Matcha Cloud Latte", category: "Matcha", weight: 0.102, unitPrice: 8.30 },
  { name: "Jasmine Silk Milk Tea", category: "Crafted Milk Tea", weight: 0.09, unitPrice: 7.45 },
  { name: "Osmanthus Pure Tea", category: "Small Batch Pure Tea", weight: 0.078, unitPrice: 6.75 },
  { name: "Strawberry Matcha", category: "Matcha", weight: 0.072, unitPrice: 8.80 },
  { name: "Peach Oolong Refresher", category: "Refreshers", weight: 0.065, unitPrice: 7.50 },
  { name: "Cold Brew Coffee", category: "Coffee & Espresso", weight: 0.059, unitPrice: 5.50 },
  { name: "Pistachio Gelato", category: "Gelato & Sorbets", weight: 0.057, unitPrice: 6.50 },
  { name: "Seasonal Tea Special", category: "Seasonal", weight: 0.056, unitPrice: 8.20 },
  { name: "Yuzu Black Tea", category: "Refreshers", weight: 0.054, unitPrice: 6.90 },
];

export const SOURCE_HEALTH: SourceRow[] = [
  {
    name: "Square",
    type: "POS",
    lastDate: "2026-10-06",
    latestLoaded: "82,577 item-level rows",
    rows: 82577,
    locations: 5,
    status: "Current through export",
    note: "Primary source for omnichannel sales. California business dates normalized.",
  },
  {
    name: "DoorDash",
    type: "Delivery",
    lastDate: "2026-10-04",
    latestLoaded: "Order & payout exports",
    rows: 7027,
    locations: 4,
    status: "Current through export",
    note: "Order and transaction feeds; payouts use payout date, not order date.",
  },
  {
    name: "Grubhub",
    type: "Delivery",
    lastDate: "2026-10-05",
    latestLoaded: "Order, finance & deposits",
    rows: 483,
    locations: 4,
    status: "Current through export",
    note: "Orders, financials and deposit ledgers reconcile within exported datasets.",
  },
  {
    name: "Uber Eats",
    type: "Delivery",
    lastDate: "2026-09-30",
    latestLoaded: "Financials through September",
    rows: 4339,
    locations: 4,
    status: "Older export",
    note: "Order history ends July 31; payment reporting extends through September 30 and payouts through September.",
  },
  {
    name: "Toast",
    type: "POS",
    lastDate: "2026-07-28",
    latestLoaded: "Koreatown only",
    rows: 12827,
    locations: 1,
    status: "Older export",
    note: "Koreatown order details only. Do not add Toast sales to Square totals.",
  },
  {
    name: "QuickBooks",
    type: "Accounting",
    lastDate: "2026-10-07",
    latestLoaded: "Company-level ledger",
    rows: 1814,
    locations: 1,
    status: "Company-level",
    note: "No native store-level class or department tracking; allocation requires evidence.",
  },
];

function utcDay(value: string): Date {
  return new Date(value + "T12:00:00.000Z");
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function boundedDate(value: string, fallback: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= DEMO_START && value <= DEMO_END
    ? value
    : fallback;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function demoDashboard(filters: Filters): DashboardData {
  const to = boundedDate(filters.to, DEMO_END);
  const from = boundedDate(filters.from, isoDate(new Date(utcDay(to).getTime() - 29 * DAY_MS)));
  const start = from <= to ? from : to;
  const locationWeight = filters.location === "all" ? 1 : SITE_WEIGHTS[filters.location] ?? 1;
  const channel = filters.channel === "All channels" ? null : filters.channel;
  const channelWeight = channel === null ? 1 : CHANNEL_WEIGHTS[channel] ?? 1;
  const trend: TrendPoint[] = [];
  const first = utcDay(start).getTime();
  const last = utcDay(to).getTime();

  for (let ms = first, idx = 0; ms <= last && idx < 190; ms += DAY_MS, idx++) {
    const date = new Date(ms);
    const dow = date.getUTCDay();
    const weekend = dow === 6 ? 1.44 : dow === 0 ? 1.26 : dow === 5 ? 1.19 : 1;
    const monthShape = 1 + 0.12 * Math.sin((idx + 14) / 8);
    const organic = 0.92 + 0.12 * Math.sin(idx * 1.7) + 0.045 * Math.cos(idx * 0.41);
    const sales = round(7260 * weekend * monthShape * organic * locationWeight * channelWeight);
    const orders = Math.max(1, Math.round(sales / 23.6));
    trend.push({ date: isoDate(date), sales, gross: round(sales * 1.033), orders });
  }

  const netSales = round(trend.reduce((total, point) => total + point.sales, 0));
  const grossSales = round(trend.reduce((total, point) => total + point.gross, 0));
  const orders = trend.reduce((total, point) => total + point.orders, 0);
  const discounts = round(netSales - grossSales);

  const channels: ChannelRow[] = Object.keys(CHANNEL_WEIGHTS)
    .filter((name) => channel === null || name === channel)
    .map((name) => {
      const share = channel === null ? CHANNEL_WEIGHTS[name] : 1;
      return {
        name,
        sales: round(netSales * share),
        orders: Math.round(orders * share),
        share: round(share * 100),
        color: CHANNEL_COLORS[name],
      };
    })
    .sort((a, b) => b.sales - a.sales);

  const locations: LocationRow[] = LOCATIONS.filter((x) => x.id !== "all" && (filters.location === "all" || filters.location === x.id))
    .map((x) => {
      const share = filters.location === "all" ? SITE_WEIGHTS[x.id] : 1;
      return {
        id: x.id,
        name: x.name,
        sales: round(netSales * share),
        orders: Math.round(orders * share),
        share: round(share * 100),
      };
    })
    .sort((a, b) => b.sales - a.sales);

  const menu: MenuRow[] = MENU_SEEDS.map((x) => ({
    name: x.name,
    category: x.category,
    sales: round(netSales * x.weight),
    units: Math.round((netSales * x.weight) / x.unitPrice),
  })).sort((a, b) => b.sales - a.sales);

  const payouts: PayoutRow[] = [];
  const partnerChannels: Array<{ name: string; multiplier: number }> = [
    { name: "DoorDash", multiplier: 0.75 },
    { name: "Uber Eats", multiplier: 0.73 },
    { name: "Grubhub", multiplier: 0.78 },
  ];

  partnerChannels.forEach(({ name, multiplier }) => {
    if (channel && channel !== name) return;
    const share = CHANNEL_WEIGHTS[name] ?? 0;
    const siteRows = locations.length === 1 ? locations : locations.slice(0, 4);
    siteRows.forEach((site, idx) => {
      for (let week = 0; week < Math.ceil(trend.length / 7); week++) {
        const chunk = trend.slice(week * 7, week * 7 + 7);
        if (!chunk.length) continue;
        const payoutDate = chunk[chunk.length - 1].date;
        const saleTotal = chunk.reduce((sum, day) => sum + day.sales, 0);
        const locationShare = locations.length === 1 ? 1 : SITE_WEIGHTS[site.id] || 0;
        const amount = round(saleTotal * share * locationShare * multiplier);
        if (amount < 1) continue;
        payouts.push({
          id: "DEMO-" + name.slice(0, 2).toUpperCase() + "-" + idx + "-" + week,
          platform: name,
          store: site.name,
          locationId: site.id,
          payoutDate,
          amount,
          status: "Reported",
          basis: "Payout date",
        });
      }
    });
  });

  payouts.sort((a, b) => b.payoutDate.localeCompare(a.payoutDate));

  return {
    mode: "demo",
    asOf: DEMO_END,
    from: start,
    to,
    summary: {
      netSales,
      grossSales,
      discounts,
      taxes: round(netSales * 0.016),
      orders,
      avgOrderValue: orders ? round(netSales / orders) : 0,
      refunds: round(-grossSales * 0.0011),
      payoutTotal: round(payouts.reduce((sum, row) => sum + row.amount, 0)),
    },
    trend,
    channels,
    locations,
    menu,
    payouts,
    sources: SOURCE_HEALTH,
    insights: [
      "Square is the sales system of record. Delivery-channel revenue is already included in POS sales.",
      "Payouts are separate cash flows: their payout dates can differ from the originating order dates.",
      "Uber Eats and Toast exports are older than the current Square dataset. Refresh before making current-period comparisons.",
    ],
    notes: [
      "Illustrative demo figures. No financial amounts in demo mode are pulled from the restaurant database.",
      "Source-health dates describe the available exports, not real-time integration status.",
      "Revenue and payout totals are different measures and should not be added together.",
    ],
  };
}
