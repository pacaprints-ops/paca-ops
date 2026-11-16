/**
 * Orders for a tax period, on the CASH basis: an order's money counts in the tax year
 * it was actually paid out to us (`paid_date`), not the year it was ordered.
 *
 * e.g. a TikTok order placed 30/01/2025 and paid out 18/02/2025 counts in 2024-25 (first
 * period from 01/02/2025); an order placed 25/03/2025 and paid out 14/04/2025 counts in 2025-26.
 *
 * Orders with no `paid_date` (older rows, or not settled yet) fall back to the order date.
 * The Tax Year page, Finance page and Tax Calculator all use this so they agree.
 */
import { supabase } from "./supabaseClient";
import { fetchAllPages } from "./fetchAllPages";
import { feeAmount } from "./money";
import type { TaxPeriod } from "./taxPeriods";

export type TaxOrderRow = {
  order_no: number;
  order_date: string;
  paid_date: string | null;
  platform: string | null;
  platform_order_ref: string | null;
  gross_revenue: number | null;
  platform_fees: number | null;
  revenue: number | null;
  is_settled: boolean;
  is_refunded: boolean;
};

/** Payouts land within weeks of the order; look this far back for orders paid inside the period. */
const LOOKBACK_DAYS = 120;

export const incomeDate = (o: Pick<TaxOrderRow, "paid_date" | "order_date">) =>
  (o.paid_date ?? o.order_date).slice(0, 10);

export async function fetchTaxOrders(period: TaxPeriod): Promise<TaxOrderRow[]> {
  const from = new Date(`${period.ordersFrom}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - LOOKBACK_DAYS);
  const rows = await fetchAllPages<TaxOrderRow>((a, b) =>
    supabase
      .from("orders")
      .select(
        "order_no,order_date,paid_date,platform,platform_order_ref,gross_revenue,platform_fees,revenue,is_settled,is_refunded"
      )
      .gte("order_date", from.toISOString().slice(0, 10))
      .lt("order_date", period.endExclusive)
      .order("order_no", { ascending: true })
      .range(a, b)
  );
  return rows.filter((o) => {
    const d = incomeDate(o);
    return d >= period.ordersFrom && d < period.endExclusive;
  });
}

/** Settled, not refunded: the orders that count as turnover. */
export function summariseTaxOrders(rows: TaxOrderRow[]) {
  const counted = rows.filter((o) => o.is_settled && !o.is_refunded);
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    gross_revenue: counted.reduce((s, o) => s + num(o.gross_revenue), 0),
    platform_fees: counted.reduce((s, o) => s + feeAmount(o.platform_fees), 0),
    payout: counted.reduce((s, o) => s + num(o.revenue), 0),
  };
}
