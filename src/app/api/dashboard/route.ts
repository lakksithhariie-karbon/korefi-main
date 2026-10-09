import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { demoDashboard } from "@/lib/demo";
import { getLiveDashboard } from "@/lib/live";
import type { Filters } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validIso(value: string | null, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? fallback
    : value;
}

function authorized(received: string | null, expected: string): boolean {
  if (!received || !received.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(received.slice(7), "utf8");
  const target = Buffer.from(expected, "utf8");
  return candidate.length === target.length && timingSafeEqual(candidate, target);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = validIso(searchParams.get("to"), "2026-10-06");
  const fallbackFrom = new Date(new Date(to + "T00:00:00.000Z").getTime() - 29 * 86400000)
    .toISOString().slice(0, 10);
  const inputFrom = validIso(searchParams.get("from"), fallbackFrom);
  const from = inputFrom <= to ? inputFrom : to;

  const span = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (span > 366) {
    return NextResponse.json({ error: "Date range must not exceed 366 days." }, { status: 400 });
  }

  const location = searchParams.get("location") || "all";
  const channel = searchParams.get("channel") || "All channels";
  const allowedLocations = ["all", "ooo_koreatown", "ooo_pasadena", "ooo_santa_monica", "ooo_sawtelle", "ooo_san_mateo"];
  const allowedChannels = [
    "All channels", "In-store / POS", "Kiosk", "DoorDash", "Uber Eats",
    "Grubhub", "Direct Online", "ClassPass", "Invoice",
  ];

  const filters: Filters = {
    from,
    to,
    location: allowedLocations.includes(location) ? location : "all",
    channel: allowedChannels.includes(channel) ? channel : "All channels",
  };

  const responseHeaders = { "Cache-Control": "private, no-store, max-age=0" };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(demoDashboard(filters), { headers: responseHeaders });
  }

  const accessKey = process.env.KOREFI_PREVIEW_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "Live data is disabled until KOREFI_PREVIEW_ACCESS_KEY is set." },
      { status: 503, headers: responseHeaders }
    );
  }

  if (!authorized(request.headers.get("authorization"), accessKey)) {
    return NextResponse.json(
      { error: "Preview access key required.", requiresAccess: true },
      { status: 401, headers: responseHeaders }
    );
  }

  try {
    const data = await getLiveDashboard(filters);
    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error("KoreFi dashboard data query failed", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json(
      { error: "Live data could not be retrieved. Please retry or check the Neon connection." },
      { status: 502, headers: responseHeaders }
    );
  }
}
