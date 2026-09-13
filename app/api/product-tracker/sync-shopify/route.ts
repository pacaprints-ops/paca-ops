import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export const maxDuration = 60;

// Public storefront domain (custom domain, not the *.myshopify.com admin domain)
const STORE_URL = "https://www.pacaprints.com";

type ShopifyProduct = {
  title: string;
  product_type: string | null;
  handle: string;
};

export async function POST() {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const store = process.env.SHOPIFY_STORE_DOMAIN;

  if (!token || !store) {
    return NextResponse.json(
      { error: "Shopify env vars not configured (SHOPIFY_ADMIN_TOKEN, SHOPIFY_STORE_DOMAIN)" },
      { status: 500 }
    );
  }

  const products: ShopifyProduct[] = [];
  let url: string | null =
    `https://${store}/admin/api/2024-01/products.json?status=active&limit=250&fields=title,handle,product_type`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": token },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Shopify error: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    products.push(...(data.products ?? []));

    const link: string | null = res.headers.get("link");
    const nextMatch: RegExpMatchArray | null = link
      ? link.match(/<([^>]+)>;\s*rel="next"/)
      : null;
    url = nextMatch ? nextMatch[1] : null;
  }

  if (products.length === 0) {
    return NextResponse.json({ error: "Shopify returned no active products" }, { status: 500 });
  }

  // Untick everything first, so products that have gone to draft/archived (or
  // been deleted) since the last sync end up unticked below rather than stuck
  // as "live". Matching is by Shopify's handle (stable + unique, unlike title,
  // which duplicates across a handful of real products).
  const { error: resetError } = await supabase
    .from("product_tracker")
    .update({ shopify_live: false, updated_at: new Date().toISOString() })
    .eq("shopify_live", true);

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  const rows = products.map((p) => ({
    shopify_handle: p.handle,
    product_title: p.title,
    product_type: p.product_type || null,
    shopify_url: `${STORE_URL}/products/${p.handle}`,
    shopify_live: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("product_tracker")
    .upsert(rows, { onConflict: "shopify_handle" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length });
}
