import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const store = process.env.SHOPIFY_STORE_DOMAIN;

  if (!token || !store) {
    return NextResponse.json({ error: "Shopify not configured" }, { status: 500 });
  }

  const { productId, imageBase64, alt } = await req.json();

  if (!productId || !imageBase64) {
    return NextResponse.json({ error: "productId and imageBase64 are required" }, { status: 400 });
  }

  const res = await fetch(
    `https://${store}/admin/api/2024-01/products/${productId}/images.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ image: { attachment: imageBase64, alt: alt ?? "" } }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const msg =
      typeof data.errors === "string"
        ? data.errors
        : JSON.stringify(data.errors ?? data);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json({ ok: true, imageId: data.image?.id });
}
