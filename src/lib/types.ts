export type PageKey =
  | "overview"
  | "sales"
  | "payouts"
  | "reconciliation"
  | "menu"
  | "locations"
  | "sources";

export type RangePreset = "7d" | "30d" | "90d" | "custom";

export type Filters = {
  from: string;
  to: string;
  location: string;
  channel: string;
};

export type TrendPoint = {
  date: string;
  sales: number;
  gross: number;
  orders: number;
};

export type ChannelRow = {
  name: string;
  sales: number;
  orders: number;
  share: number;
  color: string;
};

export type LocationRow = {
  id: string;
  name: string;
  sales: number;
  orders: number;
  share: number;
};

export type MenuRow = {
  name: string;
  category: string;
  sales: number;
  units: number;
};

export type PayoutRow = {
  id: string;
  platform: string;
  store: string;
  locationId: string;
  payoutDate: string;
  amount: number;
  status: "Reported" | "Pending" | "Paid";
  basis: "Payout date";
};

export type SourceRow = {
  name: string;
  type: "POS" | "Delivery" | "Accounting";
  lastDate: string;
  latestLoaded: string;
  rows: number;
  locations: number;
  status: "Current through export" | "Older export" | "Company-level";
  note: string;
};

export type Summary = {
  netSales: number;
  grossSales: number;
  discounts: number;
  taxes: number;
  orders: number;
  avgOrderValue: number;
  refunds: number;
  payoutTotal: number;
};

export type DashboardData = {
  mode: "demo" | "live";
  asOf: string;
  from: string;
  to: string;
  summary: Summary;
  trend: TrendPoint[];
  channels: ChannelRow[];
  locations: LocationRow[];
  menu: MenuRow[];
  payouts: PayoutRow[];
  sources: SourceRow[];
  insights: string[];
  notes: string[];
};

export const LOCATIONS = [
  { id: "all", name: "All locations" },
  { id: "ooo_koreatown", name: "Koreatown" },
  { id: "ooo_pasadena", name: "Pasadena" },
  { id: "ooo_santa_monica", name: "Santa Monica" },
  { id: "ooo_sawtelle", name: "Sawtelle" },
  { id: "ooo_san_mateo", name: "San Mateo" },
];

export const CHANNELS = [
  "All channels",
  "In-store / POS",
  "Kiosk",
  "DoorDash",
  "Uber Eats",
  "Grubhub",
  "Direct Online",
  "ClassPass",
  "Invoice",
];

export const CHANNEL_COLORS: Record<string, string> = {
  "In-store / POS": "#bb7950",
  "Kiosk": "#32473c",
  "DoorDash": "#e96852",
  "Uber Eats": "#95ab91",
  "Grubhub": "#ddaa55",
  "Direct Online": "#8197ad",
  "ClassPass": "#a28eb6",
  "Invoice": "#a7a7a0",
  "Other": "#9ba3a6",
};

export function classifyChannel(raw: string | null | undefined): string {
  const value = (raw || "").toLowerCase();
  if (value.includes("doordash")) return "DoorDash";
  if (value.includes("uber eats") || value.includes("ubereats")) return "Uber Eats";
  if (value.includes("grubhub")) return "Grubhub";
  if (value.includes("kiosk")) return "Kiosk";
  if (value.includes("pick up") || value.includes("online")) return "Direct Online";
  if (value.includes("classpass")) return "ClassPass";
  if (value.includes("invoice")) return "Invoice";
  return "In-store / POS";
}
