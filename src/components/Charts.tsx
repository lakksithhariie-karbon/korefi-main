"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import type { ChannelRow, LocationRow, TrendPoint } from "@/lib/types";

const moneyCompact = (v: number): string => {
  if (Math.abs(v) >= 1000000) return "$" + (v / 1000000).toFixed(1) + "m";
  if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(0) + "k";
  return "$" + v.toFixed(0);
};

const moneyFull = (v: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(v);

const tickDate = (date: string): string => {
  const [, mm, dd] = date.split("-");
  return Number(mm) + "/" + Number(dd);
};

type Tip = { active?: boolean; payload?: Array<{ value?: number; name?: string; payload?: TrendPoint }>; label?: string };
function SalesTooltip({ active, payload, label }: Tip) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((point, i) => (
        <div key={i} className="chart-tooltip-line">
          <span>{point.name || "Net sales"}</span>
          <b>{moneyFull(Number(point.value || 0))}</b>
        </div>
      ))}
      {payload[0].payload?.orders !== undefined && (
        <div className="chart-tooltip-foot">{payload[0].payload.orders.toLocaleString("en-US")} orders</div>
      )}
    </div>
  );
}

export function RevenueChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) return <div className="chart-empty">No sales in the selected period.</div>;
  return (
    <div className="revenue-chart" role="img" aria-label="Area chart of net and gross sales over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 14, right: 12, bottom: 2, left: -12 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a66c48" stopOpacity={0.19} />
              <stop offset="100%" stopColor="#a66c48" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eceee9" strokeDasharray="3 4" />
          <XAxis
            dataKey="date" tickFormatter={tickDate} minTickGap={34}
            tick={{ fill: "#8c948e", fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={13}
          />
          <YAxis tickFormatter={moneyCompact} tick={{ fill: "#8c948e", fontSize: 11 }} tickLine={false} axisLine={false} tickMargin={10} />
          <Tooltip content={<SalesTooltip />} />
          <Area name="Gross sales" type="monotone" dataKey="gross" stroke="#b8c5ba" strokeWidth={1.6} strokeDasharray="4 4" fill="transparent" dot={false} activeDot={{ r: 3 }} />
          <Area name="Net sales" type="monotone" dataKey="sales" stroke="#a66c48" strokeWidth={2.9} fill="url(#revenueFill)" dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChannelDonut({ data }: { data: ChannelRow[] }) {
  const values = data.filter((c) => c.sales > 0);
  const total = values.reduce((sum, v) => sum + v.sales, 0);
  if (!values.length) return <div className="chart-empty">No channel data.</div>;
  return (
    <div className="donut-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={values} dataKey="sales" nameKey="name" innerRadius={70} outerRadius={98}
            paddingAngle={2} stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270}
          >
            {values.map((v) => <Cell key={v.name} fill={v.color} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [moneyFull(Number(value || 0)), String(name)]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-total">
        <small>Total net sales</small>
        <strong>{moneyCompact(total)}</strong>
      </div>
    </div>
  );
}

export function LocationBars({ data }: { data: LocationRow[] }) {
  if (!data.length) return <div className="chart-empty">No locations in this period.</div>;
  return (
    <div className="location-chart" role="img" aria-label="Location sales ranking">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 4" stroke="#eceee9" />
          <XAxis type="number" tickFormatter={moneyCompact} tick={{ fontSize: 11, fill: "#8c948e" }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: "#526057" }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => moneyFull(Number(value || 0))} />
          <Bar dataKey="sales" name="Net sales" fill="#8eab91" radius={[0, 5, 5, 0]} barSize={17} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
