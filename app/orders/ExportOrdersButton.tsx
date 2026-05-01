"use client";

type Row = {
  order_no?: number | null;
  order_date: string | null;
  platform: string | null;
  platform_order_ref: string | null;
  items_summary: string | null;
  customer_name: string | null;
  gross_revenue?: any;
  platform_fees?: any;
  revenue: any;
  shipping_cost: any;
  total_cost: any;
  cogs_override?: any;
  gross_profit: any;
  is_refunded?: boolean | null;
};

function toN(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          const escaped = s.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportOrdersButton({
  rows,
  from,
  to,
}: {
  rows: Row[];
  from?: string;
  to?: string;
}) {
  function exportCSV() {
    const header = [
      "Order #",
      "Order date",
      "Platform",
      "Platform ref",
      "Products",
      "Customer",
      "Gross revenue",
      "Platform fees",
      "Payout (net)",
      "Shipping cost",
      "COGS",
      "Profit",
      "Refunded",
    ];

    const lines = rows.map((o) => {
      const cogs = toN(o.cogs_override ?? o.total_cost);
      const payout = toN(o.revenue);
      const shipping = toN(o.shipping_cost);
      const profit = payout - shipping - cogs;
      return [
        String(o.order_no ?? ""),
        o.order_date ?? "",
        o.platform ?? "",
        o.platform_order_ref ?? "",
        o.items_summary ?? "",
        o.customer_name ?? "",
        toN(o.gross_revenue).toFixed(2),
        toN(o.platform_fees).toFixed(2),
        payout.toFixed(2),
        shipping.toFixed(2),
        cogs.toFixed(2),
        profit.toFixed(2),
        o.is_refunded ? "Yes" : "No",
      ];
    });

    // Totals row (non-refunded only)
    const nonRefunded = rows.filter((o) => !o.is_refunded);
    const totals = [
      "TOTAL (excl. refunded)",
      "",
      "",
      "",
      "",
      "",
      nonRefunded.reduce((s, o) => s + toN(o.gross_revenue), 0).toFixed(2),
      nonRefunded.reduce((s, o) => s + toN(o.platform_fees), 0).toFixed(2),
      nonRefunded.reduce((s, o) => s + toN(o.revenue), 0).toFixed(2),
      nonRefunded.reduce((s, o) => s + toN(o.shipping_cost), 0).toFixed(2),
      nonRefunded.reduce((s, o) => s + toN(o.cogs_override ?? o.total_cost), 0).toFixed(2),
      nonRefunded.reduce((s, o) => {
        const p = toN(o.revenue);
        const sh = toN(o.shipping_cost);
        const c = toN(o.cogs_override ?? o.total_cost);
        return s + (p - sh - c);
      }, 0).toFixed(2),
      "",
    ];

    const suffix = from && to ? `_${from}_to_${to}` : `_${new Date().toISOString().slice(0, 10)}`;
    downloadCSV(`orders${suffix}.csv`, [header, ...lines, totals]);
  }

  return (
    <button
      type="button"
      onClick={exportCSV}
      disabled={rows.length === 0}
      className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm disabled:opacity-60"
    >
      Export CSV
    </button>
  );
}
