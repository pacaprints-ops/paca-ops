import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export const maxDuration = 30;

// Public storefront domain (custom domain, not the *.myshopify.com admin domain)
const STORE_URL = "https://www.pacaprints.com";

type ShopifyProduct = {
  title: string;
  product_type: string | null;
  handle: string;
};

/**
 * Paginated on purpose: fetching + upserting the whole catalog in one request
 * risks hitting the platform's function timeout as the catalog grows. The
 * client calls this once per page (see the product tracker page), passing
 * back the `cursor` from the previous response until `done` is true.
 */
export async function POST(req: NextRequest) {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const store = process.env.SHOPIFY_STORE_DOMAIN;

  if (!token || !store) {
    return NextResponse.json(
      { error: "Shopify env vars not configured (SHOPIFY_ADMIN_TOKEN, SHOPIFY_STORE_DOMAIN)" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const cursor: string | null = body?.cursor ?? null;

  const isFirstPage = !cursor;

  // On the first page only: untick everything, so products that have gone to
  // draft/archived (or been deleted) since the last sync end up unticked
  // rather than stuck as "live". Matching is by Shopify's handle (stable +
  // unique, unlike title, which duplicates across a handful of real products).
  if (isFirstPage) {
    const { error: resetError } = await supabase
      .from("product_tracker")
      .update({ shopify_live: false, updated_at: new Date().toISOString() })
      .eq("shopify_live", true);

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 });
    }
  }

  const url =
    cursor ??
    `https://${store}/admin/api/2024-01/products.json?status=active&limit=100&fields=title,handle,product_type`;

  const res: Response = await fetch(url, {
    headers: { "X-Shopify-Access-Token": token },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Shopify error: ${text}` }, { status: res.status });
  }

  const data = await res.json();
  const products: ShopifyProduct[] = data.products ?? [];

  const link: string | null = res.headers.get("link");
  const nextMatch: RegExpMatchArray | null = link
    ? link.match(/<([^>]+)>;\s*rel="next"/)
    : null;
  const nextCursor = nextMatch ? nextMatch[1] : null;

  if (products.length > 0) {
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
  } else if (isFirstPage) {
    return NextResponse.json({ error: "Shopify returned no active products" }, { status: 500 });
  }

  if (!nextCursor) {
    // Last page done — record when the Shopify column was last refreshed.
    await supabase
      .from("platform_sync")
      .upsert({ platform: "shopify", synced_at: new Date().toISOString() });
  }

  return NextResponse.json({
    synced: products.length,
    nextCursor,
    done: !nextCursor,
  });
}
