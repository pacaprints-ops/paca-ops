"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type TrackerRow = {
  id: string;
  shopify_handle: string | null;
  product_title: string;
  product_type: string | null;
  shopify_url: string | null;
  shopify_live: boolean;
  tiktok_live: boolean;
  ebay_live: boolean;
  etsy_live: boolean;
  raw_files_url: string | null;
  notes: string | null;
};

type PlatformKey = "shopify_live" | "tiktok_live" | "ebay_live" | "etsy_live";

function Tick({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded accent-teal-600 cursor-pointer"
    />
  );
}

export default function ProductTrackerPage() {
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingRawId, setEditingRawId] = useState<string | null>(null);
  const [rawDraft, setRawDraft] = useState("");

  async function loadRows() {
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("product_tracker")
        .select("*")
        .order("product_title", { ascending: true });

      if (error) {
        setErrorMsg(error.message);
        setRows([]);
        return;
      }

      setRows((data ?? []) as TrackerRow[]);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load product tracker");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.product_title.toLowerCase().includes(q) ||
        (r.product_type ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.shopify_live) acc.shopify += 1;
        if (r.tiktok_live) acc.tiktok += 1;
        if (r.ebay_live) acc.ebay += 1;
        if (r.etsy_live) acc.etsy += 1;
        if (r.raw_files_url) acc.rawFiles += 1;
        return acc;
      },
      { total: 0, shopify: 0, tiktok: 0, ebay: 0, etsy: 0, rawFiles: 0 }
    );
  }, [rows]);

  async function togglePlatform(row: TrackerRow, key: PlatformKey, next: boolean) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [key]: next } : r)));

    const { error } = await supabase
      .from("product_tracker")
      .update({ [key]: next, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (error) {
      setErrorMsg(error.message);
      // revert on failure
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [key]: !next } : r)));
    }
  }

  function startEditRaw(row: TrackerRow) {
    setEditingRawId(row.id);
    setRawDraft(row.raw_files_url ?? "");
  }

  function cancelEditRaw() {
    setEditingRawId(null);
    setRawDraft("");
  }

  async function saveRaw(row: TrackerRow) {
    const value = rawDraft.trim() || null;

    const { error } = await supabase
      .from("product_tracker")
      .update({ raw_files_url: value, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, raw_files_url: value } : r))
    );
    setEditingRawId(null);
    setRawDraft("");
  }

  async function addProduct() {
    const title = newTitle.trim();
    if (!title) return;

    setAdding(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("product_tracker")
      .insert({ product_title: title })
      .select("*")
      .single();

    setAdding(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setRows((prev) =>
      [...prev, data as TrackerRow].sort((a, b) =>
        a.product_title.localeCompare(b.product_title)
      )
    );
    setNewTitle("");
  }

  async function syncShopify() {
    setSyncing(true);
    setSyncMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/product-tracker/sync-shopify", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Sync failed");
        setSyncing(false);
        return;
      }

      setSyncMsg(`Synced ${data.synced} live Shopify products.`);
      await loadRows();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Sync failed");
    }

    setSyncing(false);
  }

  return (
    <main className="pp-container py-8">
      <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Product Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every product, ticked off by which platform it&apos;s live on — plus a link to the
            raw design files for each one.
          </p>
        </div>

        <button
          type="button"
          onClick={syncShopify}
          disabled={syncing}
          className="pp-btn pp-btn-primary whitespace-nowrap"
        >
          {syncing ? "Syncing…" : "Sync from Shopify"}
        </button>
      </div>

      {syncMsg ? (
        <div className="pp-card p-3 mb-4 text-sm font-semibold text-teal-700">{syncMsg}</div>
      ) : null}

      {errorMsg ? (
        <div className="pp-card p-3 mb-4 text-sm font-semibold text-red-700">{errorMsg}</div>
      ) : null}

      <div className="pp-card p-5 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Type a product name…"
              className="pp-input w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div>
              <span className="pp-subtle">Total:</span>{" "}
              <span className="font-extrabold text-slate-900">{counts.total}</span>
            </div>
            <div>
              <span className="pp-subtle">Shopify:</span>{" "}
              <span className="font-extrabold text-slate-900">{counts.shopify}</span>
            </div>
            <div>
              <span className="pp-subtle">TikTok:</span>{" "}
              <span className="font-extrabold text-slate-900">{counts.tiktok}</span>
            </div>
            <div>
              <span className="pp-subtle">eBay:</span>{" "}
              <span className="font-extrabold text-slate-900">{counts.ebay}</span>
            </div>
            <div>
              <span className="pp-subtle">Etsy:</span>{" "}
              <span className="font-extrabold text-slate-900">{counts.etsy}</span>
            </div>
            <div>
              <span className="pp-subtle">Raw files linked:</span>{" "}
              <span className="font-extrabold text-slate-900">{counts.rawFiles}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pp-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Add a product manually (e.g. a TikTok-only design)…"
            className="pp-input flex-1 min-w-[240px]"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProduct()}
          />
          <button
            type="button"
            onClick={addProduct}
            disabled={adding || !newTitle.trim()}
            className="pp-btn pp-btn-secondary"
          >
            {adding ? "Adding…" : "+ Add product"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pp-card p-4">
          <div className="text-sm text-slate-600">Loading…</div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="pp-card p-4">
          <div className="text-sm text-slate-600">No matching products.</div>
        </div>
      ) : (
        <div className="pp-table">
          <table>
            <thead>
              <tr className="text-left">
                <th>Product</th>
                <th>Type</th>
                <th className="text-center">Shopify</th>
                <th className="text-center">TikTok</th>
                <th className="text-center">eBay</th>
                <th className="text-center">Etsy</th>
                <th>Raw files</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold text-slate-900">
                    {r.shopify_url ? (
                      <a
                        href={r.shopify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-teal-700"
                        title="Open on Shopify"
                      >
                        {r.product_title}
                      </a>
                    ) : (
                      r.product_title
                    )}
                  </td>
                  <td className="text-slate-500">{r.product_type || "—"}</td>
                  <td className="text-center">
                    <Tick
                      checked={r.shopify_live}
                      onChange={(next) => togglePlatform(r, "shopify_live", next)}
                    />
                  </td>
                  <td className="text-center">
                    <Tick
                      checked={r.tiktok_live}
                      onChange={(next) => togglePlatform(r, "tiktok_live", next)}
                    />
                  </td>
                  <td className="text-center">
                    <Tick
                      checked={r.ebay_live}
                      onChange={(next) => togglePlatform(r, "ebay_live", next)}
                    />
                  </td>
                  <td className="text-center">
                    <Tick
                      checked={r.etsy_live}
                      onChange={(next) => togglePlatform(r, "etsy_live", next)}
                    />
                  </td>
                  <td>
                    {editingRawId === r.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Paste Drive folder link…"
                          className="pp-input text-xs py-1 w-56"
                          value={rawDraft}
                          onChange={(e) => setRawDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRaw(r);
                            if (e.key === "Escape") cancelEditRaw();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveRaw(r)}
                          className="pp-btn pp-btn-primary text-xs px-2 py-1"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditRaw}
                          className="pp-btn pp-btn-secondary text-xs px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : r.raw_files_url ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={r.raw_files_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-700 hover:underline text-xs font-semibold"
                        >
                          Open folder ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => startEditRaw(r)}
                          className="text-slate-300 hover:text-slate-600 text-xs"
                          title="Edit link"
                        >
                          ✎
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditRaw(r)}
                        className="text-xs text-slate-400 hover:text-teal-700 underline"
                      >
                        + Add folder link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
