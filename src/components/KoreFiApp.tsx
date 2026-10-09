"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowDownToLine, ArrowRight, ArrowUpRight,
  Bell, BookOpenText, CalendarDays, ChartColumnIncreasing, ChartNoAxesCombined,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, CreditCard, Database, FileCheck2, FileSpreadsheet, Filter,
  Layers3, LayoutDashboard, LockKeyhole, Menu, MoreHorizontal,
  RefreshCw, Scale, Search, Settings2, ShieldCheck, Sparkles,
  Store, TrendingUp, WalletCards, X,
} from "lucide-react";
import { ChannelDonut, LocationBars, RevenueChart } from "@/components/Charts";
import {
  CHANNELS, LOCATIONS,
  type DashboardData, type PageKey, type PayoutRow, type RangePreset, type SourceRow,
} from "@/lib/types";

const MILLISECONDS_DAY = 86400000;
const DEFAULT_TO = "2026-10-06";

const nav = [
  {
    label: "WORKSPACE",
    items: [
      { key: "overview" as PageKey, label: "Overview", icon: LayoutDashboard },
      { key: "sales" as PageKey, label: "Sales analytics", icon: ChartNoAxesCombined },
      { key: "payouts" as PageKey, label: "Payouts", icon: WalletCards },
      { key: "reconciliation" as PageKey, label: "Reconciliation", icon: Scale },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { key: "menu" as PageKey, label: "Menu performance", icon: Layers3 },
      { key: "locations" as PageKey, label: "Locations", icon: Store },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { key: "sources" as PageKey, label: "Data sources", icon: Database },
    ],
  },
];

const viewHeaders: Record<PageKey, { title: string; detail: string; eyebrow: string }> = {
  overview: {
    title: "Your business, in focus.",
    detail: "A connected view of revenue, channels and the money that reaches you.",
    eyebrow: "Business overview",
  },
  sales: {
    title: "Sales intelligence",
    detail: "Understand demand, channel contribution and how performance changes over time.",
    eyebrow: "Performance / Sales",
  },
  payouts: {
    title: "Payouts",
    detail: "Track reported payments from delivery partners across locations and dates.",
    eyebrow: "Finance / Payouts",
  },
  reconciliation: {
    title: "Financial reconciliation",
    detail: "Understand what is reconciled, what is reported, and which matches remain open.",
    eyebrow: "Finance / Reconciliation",
  },
  menu: {
    title: "Menu performance",
    detail: "The items and categories that contribute the most to your sales.",
    eyebrow: "Intelligence / Menu",
  },
  locations: {
    title: "Location performance",
    detail: "Compare individual stores without double-counting delivery sales.",
    eyebrow: "Intelligence / Locations",
  },
  sources: {
    title: "Connected sources",
    detail: "Data coverage, the latest available exports and known reporting limitations.",
    eyebrow: "Settings / Integrations",
  },
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const percent = (n: number) => n.toFixed(1) + "%";
const formatMoney = (n: number) => usd.format(n);
const moneyNoCents = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function shortDate(s: string) {
  if (!s) return "—";
  const d = new Date(s + "T12:00:00Z");
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function longDate(s: string) {
  if (!s) return "—";
  const d = new Date(s + "T12:00:00Z");
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function rangeStart(to: string, days: number) {
  return new Date(new Date(to + "T12:00:00Z").getTime() - (days - 1) * MILLISECONDS_DAY)
    .toISOString().slice(0, 10);
}

function platformColor(platform: string) {
  if (platform === "DoorDash") return "platform-dd";
  if (platform === "Uber Eats") return "platform-ue";
  if (platform === "Grubhub") return "platform-gh";
  return "platform-square";
}

function csvEscape(value: string | number | undefined | null) {
  const safe = String(value ?? "");
  return '"' + safe.replace(/"/g, '""') + '"';
}

function downloadCsv(name: string, rows: Record<string, string | number | null | undefined>[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const lines = [
    columns.map(csvEscape).join(","),
    ...rows.map((row) => columns.map((col) => csvEscape(row[col])).join(",")),
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = "neutral",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  caption: string;
  tone?: "neutral" | "warm" | "green";
}) {
  return (
    <article className={"metric-card metric-" + tone}>
      <div className="metric-top"><span>{label}</span><Icon size={17} strokeWidth={1.7} /></div>
      <div className="metric-value">{value}</div>
      <div className="metric-caption"><span className="metric-mini-line" />{caption}</div>
    </article>
  );
}

function PanelHeading({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="panel-heading">
      <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
      {right && <div className="panel-heading-right">{right}</div>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><Activity size={22} /><p>{message}</p></div>;
}

function PayoutTable({
  rows,
  query,
  onSelect,
  perPage = 7,
}: {
  rows: PayoutRow[];
  query: string;
  onSelect: (row: PayoutRow) => void;
  perPage?: number;
}) {
  const [page, setPage] = useState(1);
  const found = useMemo(() => rows.filter((row) =>
    (row.id + " " + row.platform + " " + row.store).toLowerCase().includes(query.toLowerCase())
  ), [rows, query]);
  const maxPage = Math.max(1, Math.ceil(found.length / perPage));
  const currentPage = Math.min(page, maxPage);
  const visible = found.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>
            <th>Partner / payout</th><th>Location</th><th>Payout date</th>
            <th className="align-right">Reported amount</th><th>Status</th><th />
          </tr></thead>
          <tbody>
            {visible.map((row, index) => (
              <tr className="clickable-row" key={row.platform + row.id + index} onClick={() => onSelect(row)}>
                <td>
                  <div className="table-primary"><span className={"platform-dot " + platformColor(row.platform)} />{row.platform}</div>
                  <span className="row-subtitle">{row.id}</span>
                </td>
                <td>{row.store}</td>
                <td className="tabular">{longDate(row.payoutDate)}</td>
                <td className="align-right table-money">{formatMoney(row.amount)}</td>
                <td><span className="pill pill-neutral">Reported</span></td>
                <td><ChevronRight className="row-chevron" size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <EmptyState message="No reported payouts match these filters." />}
      </div>
      {found.length > perPage && (
        <div className="table-footer">
          <span>{found.length} payouts · page {currentPage} of {maxPage}</span>
          <div className="pagination">
            <button aria-label="Previous payouts page" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
            <button aria-label="Next payouts page" disabled={currentPage >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}

function SourceStatus({ source }: { source: SourceRow }) {
  const old = source.status === "Older export";
  const company = source.status === "Company-level";
  return <span className={"pill " + (old ? "pill-amber" : company ? "pill-neutral" : "pill-green")}>
    <span className="status-dot" />{source.status}
  </span>;
}

export default function KoreFiApp() {
  const [page, setPage] = useState<PageKey>("overview");
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [from, setFrom] = useState(rangeStart(DEFAULT_TO, 30));
  const [to, setTo] = useState(DEFAULT_TO);
  const [location, setLocation] = useState("all");
  const [channel, setChannel] = useState("All channels");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsAccess, setNeedsAccess] = useState(false);
  const [accessInput, setAccessInput] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [drawer, setDrawer] = useState<PayoutRow | null>(null);
  const [sourceDrawer, setSourceDrawer] = useState<SourceRow | null>(null);
  const [search, setSearch] = useState("");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("korefi-preview-key");
    if (saved) setAccessKey(saved);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ from, to, location, channel });
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/dashboard?" + query.toString(), {
          headers: accessKey ? { Authorization: "Bearer " + accessKey } : {},
          signal: controller.signal,
          cache: "no-store",
        });
        if (res.status === 401) {
          setNeedsAccess(true);
          setData(null);
          setLoading(false);
          return;
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Unable to load the dashboard.");
        if (!controller.signal.aborted) {
          setData(body as DashboardData);
          setNeedsAccess(false);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [from, to, location, channel, refresh, accessKey]);

  const changePage = useCallback((next: PageKey) => {
    setPage(next);
    setSearch("");
    setShowMobileNav(false);
    setDrawer(null);
    setSourceDrawer(null);
  }, []);

  function changePreset(next: RangePreset) {
    setPreset(next);
    if (next !== "custom") {
      const days = next === "7d" ? 7 : next === "30d" ? 30 : 90;
      setFrom(rangeStart(to, days));
    }
  }

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = accessInput.trim();
    sessionStorage.setItem("korefi-preview-key", trimmed);
    setAccessKey(trimmed);
    setNeedsAccess(false);
    setAccessInput("");
    setRefresh((n) => n + 1);
  }

  function exportData() {
    if (!data) return;
    const name = "korefi-" + page + "-" + data.from + "-to-" + data.to + ".csv";
    if (page === "sales" || page === "overview") {
      downloadCsv(name, data.trend.map((x) => ({
        business_date: x.date, net_sales: x.sales, gross_sales: x.gross, orders: x.orders,
      })));
    } else if (page === "payouts" || page === "reconciliation") {
      downloadCsv(name, data.payouts.map((x) => ({
        payout_id: x.id, platform: x.platform, location: x.store,
        payout_date: x.payoutDate, reported_amount: x.amount, status: x.status,
      })));
    } else if (page === "menu") {
      downloadCsv(name, data.menu.map((x) => ({
        item_name: x.name, category: x.category, net_sales: x.sales, units: x.units,
      })));
    } else if (page === "locations") {
      downloadCsv(name, data.locations.map((x) => ({
        location_id: x.id, location: x.name, net_sales: x.sales, orders: x.orders,
      })));
    } else {
      downloadCsv(name, data.sources.map((x) => ({
        source: x.name, type: x.type, through_date: x.lastDate, rows: x.rows,
        locations: x.locations, status: x.status, note: x.note,
      })));
    }
  }

  const header = viewHeaders[page];
  const summary = data?.summary;
  const noData = !data || loading;

  const matches = (name: string) => name.toLowerCase().includes(search.toLowerCase());
  const menuRows = data?.menu.filter((x) => matches(x.name + " " + x.category)) || [];
  const sourceRows = data?.sources.filter((x) => matches(x.name + " " + x.status)) || [];

  return (
    <div className="app-shell">
      {showMobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setShowMobileNav(false)} />}
      <aside className={"sidebar " + (showMobileNav ? "sidebar-open" : "")}>
        <div className="sidebar-logo">
          <div className="logo-emblem"><span /><span /><span /><span /></div>
          <div className="logo-text">kore<span>fi</span><sup>®</sup></div>
          <button className="sidebar-close" onClick={() => setShowMobileNav(false)} aria-label="Close sidebar"><X size={19} /></button>
        </div>
        <div className="workspace-picker">
          <div className="workspace-avatar">O</div>
          <div className="workspace-copy"><strong>Odd One Out Tea</strong><span>5 locations connected</span></div>
          <ChevronDown size={14} />
        </div>
        <nav className="sidebar-navigation" aria-label="Main navigation">
          {nav.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map(({ key, label, icon: Icon }) => (
                <button key={key} className={"nav-item " + (page === key ? "active" : "")} onClick={() => changePage(key)}>
                  <Icon size={17} strokeWidth={1.85} />
                  <span>{label}</span>
                  {key === "sources" && <i className="source-indicator" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-icon"><Sparkles size={17} /></span>
            <strong>Good decisions start here.</strong>
            <span>Financial clarity across every channel.</span>
            <button onClick={() => changePage("sources")}>View data coverage <ArrowRight size={13} /></button>
          </div>
          <div className="sidebar-profile">
            <div className="profile-avatar">K</div>
            <div><strong>KoreFi workspace</strong><span>Prototype environment</span></div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" aria-label="Open navigation" onClick={() => setShowMobileNav(true)}><Menu size={20} /></button>
            <span className="topbar-home">Workspace</span>
            <ChevronRight size={14} strokeWidth={1.8} />
            <span className="topbar-current">{header.eyebrow}</span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-connection"><span /> {data?.mode === "live" ? "Neon connected" : "Prototype"}</span>
            <button className="icon-button" onClick={() => setShowInfo((v) => !v)} aria-label="About this dashboard"><CircleHelp size={18} /></button>
            <button className="icon-button" onClick={() => changePage("sources")} aria-label="Data sources"><Bell size={18} /></button>
            <span className="topbar-user">K</span>
          </div>
        </header>

        {showInfo && (
          <div className="about-popover">
            <button onClick={() => setShowInfo(false)} aria-label="Close" className="about-close"><X size={15} /></button>
            <strong>About the numbers</strong>
            <p>Sales come from Square POS. Delivery payouts are separate partner settlement reports. This prevents double-counting the same orders.</p>
            <button onClick={() => { changePage("sources"); setShowInfo(false); }}>See data lineage <ArrowRight size={13} /></button>
          </div>
        )}

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />{header.eyebrow}</div>
              <h1>{header.title}</h1>
              <p>{header.detail}</p>
            </div>
            <div className="heading-side">
              <div className="as-of"><Clock3 size={14} /> Source data through {data ? longDate(data.asOf) : "Oct 6, 2026"}</div>
              <button className="primary-button" onClick={exportData} disabled={!data || loading}><ArrowDownToLine size={16} /> Export CSV</button>
            </div>
          </div>

          <div className="filters-bar">
            <div className="filter-set">
              <div className="filter-icon"><CalendarDays size={16} /></div>
              <div className="range-presets" aria-label="Date range">
                {(["7d","30d","90d"] as RangePreset[]).map((p) => (
                  <button key={p} className={preset === p ? "range-active" : ""} onClick={() => changePreset(p)}>
                    {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
                  </button>
                ))}
              </div>
            </div>
            <div className="date-inputs">
              <input type="date" aria-label="From date" value={from} max={to} onChange={(e) => { setPreset("custom"); setFrom(e.target.value); }} />
              <span>–</span>
              <input type="date" aria-label="To date" value={to} min={from} onChange={(e) => { const next = e.target.value; setPreset("custom"); setTo(next); }} />
            </div>
            <div className="filter-spacer" />
            <label className="filter-select"><Store size={15} /><select aria-label="Filter by location" value={location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATIONS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select><ChevronDown size={13} /></label>
            <label className="filter-select"><Filter size={15} /><select aria-label="Filter by channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select><ChevronDown size={13} /></label>
            <button className="icon-button refresh-button" title="Refresh dashboard" aria-label="Refresh" onClick={() => setRefresh((n) => n + 1)}><RefreshCw size={16} /></button>
          </div>

          {data?.mode === "demo" && (
            <div className="demo-banner"><span className="demo-asterisk">✳</span>
              <span><strong>Prototype preview</strong> — Financial figures are illustrative. Add a protected Neon connection to explore real historical data.</span>
              <button onClick={() => changePage("sources")}>Data sources <ArrowRight size={13} /></button>
            </div>
          )}

          {error && (
            <div className="error-banner"><CircleHelp size={17} /><span>{error}</span><button onClick={() => setRefresh((n) => n + 1)}>Try again</button></div>
          )}

          {needsAccess && (
            <section className="auth-screen panel">
              <div className="auth-symbol"><LockKeyhole size={26} /></div>
              <h2>Secure preview access</h2>
              <p>This deployment has private Neon data connected. Enter your preview access key to view aggregated restaurant financial information.</p>
              <form onSubmit={signIn}>
                <input aria-label="Preview access key" type="password" autoComplete="off" value={accessInput} onChange={(e) => setAccessInput(e.target.value)} placeholder="Preview access key" required />
                <button type="submit" className="primary-button">Unlock dashboard <ArrowRight size={16} /></button>
              </form>
              <small>The key is kept only in this browser session and is not added to the URL.</small>
            </section>
          )}

          {noData && !needsAccess && !error && (
            <div className="loading-layout" aria-live="polite">
              <div className="skeleton skeleton-wide" />
              <div className="skeleton-row">{[0,1,2,3].map((x) => <div className="skeleton" key={x} />)}</div>
              <div className="skeleton-row tall"><div className="skeleton" /><div className="skeleton" /></div>
            </div>
          )}

          {data && !loading && !needsAccess && (
            <>
              {(page === "overview" || page === "sales") && (
                <>
                  <div className="metric-grid">
                    <MetricCard icon={ChartColumnIncreasing} label="Net sales" value={moneyNoCents(summary?.netSales || 0)} caption="POS sales, after discounts & refunds" tone="warm" />
                    <MetricCard icon={Store} label="Completed orders" value={whole.format(summary?.orders || 0)} caption="Payment events in selected period" />
                    <MetricCard icon={TrendingUp} label="Average order value" value={formatMoney(summary?.avgOrderValue || 0)} caption="Net sales per completed order" />
                    <MetricCard icon={CreditCard} label="Reported partner payouts" value={moneyNoCents(summary?.payoutTotal || 0)} caption="Separate payout-date basis" tone="green" />
                  </div>

                  <div className="dashboard-grid chart-grid">
                    <section className="panel chart-panel">
                      <PanelHeading title="Revenue trend" subtitle="Net sales and gross sales over the selected business days"
                        right={<span className="quiet-badge"><span className="point-terracotta" /> Square POS</span>} />
                      <div className="chart-legend"><span><i className="legend-net" />Net sales</span><span><i className="legend-gross" />Gross sales</span></div>
                      <RevenueChart data={data.trend} />
                      <div className="chart-bottom"><span><CheckCircle2 size={14} /> No 3PD sales double counted</span><span>{shortDate(data.from)} – {longDate(data.to)}</span></div>
                    </section>
                    <section className="panel breakdown-panel">
                      <PanelHeading title="Channel mix" subtitle="Where your sales are coming from" />
                      <ChannelDonut data={data.channels} />
                      <div className="channel-list">
                        {data.channels.slice(0, 6).map((c) => (
                          <div className="channel-list-row" key={c.name}>
                            <span className="channel-name"><i style={{ background: c.color }} />{c.name}</span>
                            <strong>{percent(c.share)}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  {page === "overview" && (
                    <div className="dashboard-grid lower-grid">
                      <section className="panel location-panel">
                        <PanelHeading title="Location performance" subtitle="Store contribution for the selected period"
                          right={<button className="text-button" onClick={() => changePage("locations")}>View all <ArrowRight size={14} /></button>} />
                        <div className="table-wrap">
                          <table className="data-table">
                            <thead><tr><th>Location</th><th className="align-right">Orders</th><th className="align-right">Net sales</th><th className="align-right">Share</th><th /></tr></thead>
                            <tbody>{data.locations.map((x, index) => (
                              <tr className="clickable-row" key={x.id} onClick={() => { setLocation(x.id); changePage("locations"); }}>
                                <td className="table-primary"><span className="location-index">{String(index+1).padStart(2,"0")}</span>{x.name}</td>
                                <td className="align-right tabular">{whole.format(x.orders)}</td>
                                <td className="align-right table-money">{formatMoney(x.sales)}</td>
                                <td className="align-right"><span className="share-indicator"><i style={{ width: Math.min(100,x.share) + "%" }} /></span><span className="tabular">{percent(x.share)}</span></td>
                                <td><ChevronRight size={15} className="row-chevron" /></td>
                              </tr>
                            ))}</tbody>
                          </table>
                          {!data.locations.length && <EmptyState message="No location sales for the current filter." />}
                        </div>
                      </section>
                      <section className="panel insight-panel">
                        <PanelHeading title="KoreFi perspective" subtitle="What the data is telling us" right={<Sparkles size={18} className="accent-icon" />} />
                        {data.insights.map((insight, i) => (
                          <div className="insight-row" key={insight}><span className="insight-count">0{i+1}</span><p>{insight}</p></div>
                        ))}
                        <button className="insight-foot-button" onClick={() => changePage("sources")}>Review source coverage <ArrowRight size={16} /></button>
                      </section>
                    </div>
                  )}
                  {page === "sales" && (
                    <section className="panel data-section">
                      <PanelHeading title="Channel breakdown" subtitle="Sales and completed order counts grouped by channel"
                        right={<span className="quiet-badge">POS-normalized reporting</span>} />
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead><tr><th>Channel</th><th className="align-right">Net sales</th><th className="align-right">Completed orders</th><th className="align-right">Contribution</th></tr></thead>
                          <tbody>{data.channels.map((x) => <tr key={x.name}>
                            <td><span className="table-primary"><span className="platform-dot" style={{background:x.color}} />{x.name}</span></td>
                            <td className="align-right table-money">{formatMoney(x.sales)}</td>
                            <td className="align-right tabular">{whole.format(x.orders)}</td>
                            <td className="align-right tabular">{percent(x.share)}</td>
                          </tr>)}</tbody>
                        </table>
                        {!data.channels.length && <EmptyState message="No channel activity for these filters." />}
                      </div>
                    </section>
                  )}
                </>
              )}

              {page === "payouts" && (
                <>
                  <div className="metric-grid three-metrics">
                    <MetricCard icon={WalletCards} label="Reported payout total" value={moneyNoCents(summary?.payoutTotal || 0)} caption="Partner reports, grouped by payout date" tone="warm" />
                    <MetricCard icon={FileCheck2} label="Payout entries" value={whole.format(data.payouts.length)} caption="Source-reported records in selected period" />
                    <MetricCard icon={Clock3} label="Latest reported payout" value={data.payouts[0] ? shortDate(data.payouts[0].payoutDate) : "—"} caption="Not a confirmation of bank settlement" />
                  </div>
                  <div className="inline-explainer"><ShieldCheck size={19} /><div><strong>Sales dates and payout dates are different.</strong><span>A single sale can settle days later. The totals shown here are partner-reported payouts, not verified bank deposits.</span></div></div>
                  <section className="panel data-section">
                    <PanelHeading title="Partner payout ledger" subtitle="Click a payout to see its source and reporting basis"
                      right={<div className="table-search"><Search size={15} /><input placeholder="Search payouts…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>} />
                    <PayoutTable rows={data.payouts} query={search} onSelect={setDrawer} />
                  </section>
                </>
              )}

              {page === "reconciliation" && (
                <>
                  <div className="recon-hero">
                    <div className="recon-hero-icon"><Scale size={23} /></div>
                    <div><span className="small-eyebrow">RECONCILIATION STATUS</span><h2>Source ledgers connected. Bank matching comes next.</h2>
                      <p>KoreFi can trace reported sales and payouts. A trustworthy variance needs an order-to-payout match and a bank deposit confirmation—neither is inferred from date-level totals.</p></div>
                    <span className="pill pill-amber">Not bank matched</span>
                  </div>
                  <div className="recon-steps">
                    <article className="recon-step"><span className="recon-step-icon success"><Check size={18} /></span><strong>01. POS sales</strong><p>Square order and item events available by business date.</p><span className="pill pill-green">Loaded</span></article>
                    <article className="recon-step"><span className="recon-step-icon success"><Check size={18} /></span><strong>02. Partner payouts</strong><p>Delivery-platform payout summaries and deposit reports.</p><span className="pill pill-green">Available</span></article>
                    <article className="recon-step"><span className="recon-step-icon muted"><Clock3 size={18} /></span><strong>03. Order linking</strong><p>Validate identifiers and timings before calculating payment differences.</p><span className="pill pill-amber">Needs matching</span></article>
                    <article className="recon-step"><span className="recon-step-icon muted"><Clock3 size={18} /></span><strong>04. Bank proof</strong><p>Confirm actual bank receipts against each partner payout.</p><span className="pill pill-neutral">Not connected</span></article>
                  </div>
                  <section className="panel data-section">
                    <PanelHeading title="Payout evidence" subtitle="Reported partner values for the selected payout dates"
                      right={<span className="quiet-badge"><ShieldCheck size={14} /> No fabricated variances</span>} />
                    <PayoutTable rows={data.payouts} query={search} onSelect={setDrawer} perPage={5} />
                  </section>
                </>
              )}

              {page === "menu" && (
                <>
                  <div className="metric-grid three-metrics">
                    <MetricCard icon={Layers3} label="Tracked menu items" value={whole.format(data.menu.length)} caption="Top ranked items in this filtered view" tone="warm" />
                    <MetricCard icon={ChartColumnIncreasing} label="Top item by sales" value={data.menu[0] ? moneyNoCents(data.menu[0].sales) : "—"} caption={data.menu[0]?.name || "No item data"} />
                    <MetricCard icon={Store} label="Units in top items" value={whole.format(data.menu.reduce((sum,x)=>sum+x.units,0))} caption="Units in displayed ranking" />
                  </div>
                  <div className="dashboard-grid menu-grid">
                    <section className="panel data-section">
                      <PanelHeading title="Top-selling items" subtitle="Ranked by recorded net sales in Square"
                        right={<div className="table-search"><Search size={15} /><input placeholder="Find an item…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>} />
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead><tr><th>Item</th><th>Category</th><th className="align-right">Units</th><th className="align-right">Net sales</th></tr></thead>
                          <tbody>{menuRows.map((x) => <tr key={x.name+x.category}>
                            <td className="table-primary">{x.name}</td><td><span className="category-chip">{x.category}</span></td>
                            <td className="align-right tabular">{whole.format(x.units)}</td><td className="align-right table-money">{formatMoney(x.sales)}</td>
                          </tr>)}</tbody>
                        </table>
                        {!menuRows.length && <EmptyState message="No items match the search or selected dates." />}
                      </div>
                    </section>
                    <section className="panel category-panel">
                      <PanelHeading title="Category leaders" subtitle="Highest net sales within the ranked items" />
                      {Object.entries(data.menu.reduce<Record<string, number>>((memo,item) => {
                        memo[item.category] = (memo[item.category] || 0) + item.sales; return memo;
                      }, {})).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([category,amount],i,all) => (
                        <div className="category-row" key={category}>
                          <div><span>{category}</span><strong>{moneyNoCents(amount)}</strong></div>
                          <div className="category-track"><span style={{ width: (amount / Math.max(all[0]?.[1] || 1,1) * 100) + "%", opacity: 1 - i * 0.08 }} /></div>
                        </div>
                      ))}
                    </section>
                  </div>
                </>
              )}

              {page === "locations" && (
                <>
                  <div className="metric-grid three-metrics">
                    <MetricCard icon={Store} label="Locations in view" value={whole.format(data.locations.length)} caption="Based on the selected location filter" tone="warm" />
                    <MetricCard icon={ChartColumnIncreasing} label="Total net sales" value={moneyNoCents(summary?.netSales || 0)} caption="Single POS source of truth" />
                    <MetricCard icon={TrendingUp} label="Highest-performing store" value={data.locations[0]?.name || "—"} caption={data.locations[0] ? moneyNoCents(data.locations[0].sales) + " net sales" : "No matching sales"} />
                  </div>
                  <div className="dashboard-grid location-grid">
                    <section className="panel chart-panel">
                      <PanelHeading title="Sales by location" subtitle="Net sales from Square POS, across all fulfillment channels" />
                      <LocationBars data={data.locations} />
                    </section>
                    <section className="panel insight-panel">
                      <PanelHeading title="How to compare fairly" subtitle="A note on source coverage" />
                      <div className="location-guidance"><ShieldCheck size={20} /><p>Square provides multi-location sales across all five stores. Toast currently covers Koreatown only, while third-party partner feeds cover four LA locations.</p></div>
                      <div className="location-guidance"><Activity size={20} /><p>Only compare source metrics with matching dates, locations, and revenue definitions. Missing feeds never mean zero sales.</p></div>
                      <button className="insight-foot-button" onClick={() => changePage("sources")}>Explore connection coverage <ArrowRight size={16} /></button>
                    </section>
                  </div>
                  <section className="panel data-section">
                    <PanelHeading title="Location detail" subtitle="Select a location to focus the entire dashboard" />
                    <div className="location-card-grid">
                      {data.locations.map((site,i) => (
                        <button key={site.id} className="site-card" onClick={() => { setLocation(site.id); changePage("overview"); }}>
                          <div className="site-card-top"><span className="site-initial">{site.name.slice(0,2).toUpperCase()}</span><ArrowUpRight size={18} /></div>
                          <h3>{site.name}</h3><strong>{moneyNoCents(site.sales)}</strong>
                          <div><span>{whole.format(site.orders)} orders</span><span>{percent(site.share)} share</span></div>
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {page === "sources" && (
                <>
                  <div className="sources-overview">
                    <div className="sources-icon"><Database size={24} /></div>
                    <div><span className="small-eyebrow">YOUR DATA FABRIC</span><h2>Six source systems, one clearer picture.</h2><p>Each connector has different dates, coverage and financial meaning. This register makes the differences visible.</p></div>
                  </div>
                  <div className="metric-grid three-metrics">
                    <MetricCard icon={Database} label="Source datasets" value={whole.format(data.sources.length)} caption="POS, delivery and accounting" tone="warm" />
                    <MetricCard icon={CheckCircle2} label="POS locations" value="5" caption="Square location names provisionally mapped" />
                    <MetricCard icon={Clock3} label="Exports needing refresh" value={String(data.sources.filter((x)=>x.status==="Older export").length)} caption="Uber Eats and Toast" />
                  </div>
                  <section className="panel data-section">
                    <PanelHeading title="Source health & coverage" subtitle="Dates below represent the last available data, not real-time syncs"
                      right={<div className="table-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a source…" /></div>} />
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead><tr><th>Integration</th><th>Data type</th><th>Latest export date</th><th className="align-right">Locations</th><th>Coverage</th><th /></tr></thead>
                        <tbody>{sourceRows.map((x) => (
                          <tr className="clickable-row" key={x.name} onClick={() => setSourceDrawer(x)}>
                            <td className="table-primary"><span className="source-logo">{x.name[0]}</span>{x.name}</td>
                            <td>{x.type}</td><td className="tabular">{longDate(x.lastDate)}</td><td className="align-right tabular">{x.locations}</td>
                            <td><SourceStatus source={x} /></td><td><ChevronRight size={16} className="row-chevron" /></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </section>
                  <div className="disclosure-panel"><BookOpenText size={19} /><div><strong>Important reporting boundaries</strong><p>Square is the POS sales source of truth. QuickBooks represents a legal company rather than five separate store-level ledgers. Partner settlements are not automatically bank-confirmed.</p></div></div>
                </>
              )}

              <footer className="page-footer">
                <span>© 2026 KoreFi · Intelligence that works with you.</span>
                <div><span><ShieldCheck size={13} /> Source-aware reporting</span><span>Prototype v0.1</span></div>
              </footer>
            </>
          )}
        </div>
      </main>

      {drawer && (
        <div className="drawer-overlay" onClick={() => setDrawer(null)}>
          <aside className="details-drawer" role="dialog" aria-modal="true" aria-label="Payout details" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top"><span>Reported payout details</span><button onClick={() => setDrawer(null)} aria-label="Close payout details"><X size={19} /></button></div>
            <div className="drawer-content">
              <span className={"platform-badge " + platformColor(drawer.platform)}>{drawer.platform}</span>
              <h2>{formatMoney(drawer.amount)}</h2>
              <p className="drawer-sub">Partner-reported payout amount</p>
              <div className="details-list">
                <div><span>Payout reference</span><strong>{drawer.id}</strong></div>
                <div><span>Platform</span><strong>{drawer.platform}</strong></div>
                <div><span>Location</span><strong>{drawer.store}</strong></div>
                <div><span>Payout date</span><strong>{longDate(drawer.payoutDate)}</strong></div>
                <div><span>Reporting basis</span><strong>{drawer.basis}</strong></div>
                <div><span>Verification</span><strong>Partner reported · bank not matched</strong></div>
              </div>
              <div className="drawer-warning"><CircleHelp size={17} /><span>This amount comes from a platform export. A matching bank deposit has not yet been verified in KoreFi.</span></div>
            </div>
          </aside>
        </div>
      )}

      {sourceDrawer && (
        <div className="drawer-overlay" onClick={() => setSourceDrawer(null)}>
          <aside className="details-drawer" role="dialog" aria-modal="true" aria-label="Data source details" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top"><span>Data source details</span><button onClick={() => setSourceDrawer(null)} aria-label="Close source details"><X size={19} /></button></div>
            <div className="drawer-content">
              <div className="source-large-avatar">{sourceDrawer.name[0]}</div>
              <h2>{sourceDrawer.name}</h2><p className="drawer-sub">{sourceDrawer.type} integration</p>
              <SourceStatus source={sourceDrawer} />
              <div className="details-list">
                <div><span>Last available date</span><strong>{longDate(sourceDrawer.lastDate)}</strong></div>
                <div><span>Location coverage</span><strong>{sourceDrawer.locations}</strong></div>
                <div><span>Reference row count</span><strong>{whole.format(sourceDrawer.rows)}</strong></div>
                <div><span>Dataset</span><strong>{sourceDrawer.latestLoaded}</strong></div>
              </div>
              <div className="drawer-warning"><CircleHelp size={17} /><span>{sourceDrawer.note}</span></div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
