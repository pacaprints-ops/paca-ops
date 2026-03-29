import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const store = process.env.SHOPIFY_STORE_DOMAIN;

  if (!token || !store) {
    return NextResponse.json(
      { error: "Shopify env vars not configured (SHOPIFY_ADMIN_TOKEN, SHOPIFY_STORE_DOMAIN)" },
      { status: 500 }
    );
  }

  const { copy, images, productType } = await req.json();

  if (!copy?.title) {
    return NextResponse.json({ error: "copy.title is required" }, { status: 400 });
  }

  // Convert plain text description to basic HTML paragraphs
  const bodyHtml = (copy.description as string)
    .split(/\n+/)
    .filter((l: string) => l.trim())
    .map((l: string) => `<p>${l.trim()}</p>`)
    .join("");

  // Only push images that were successfully generated
  const productImages = (images as Array<{ imageBase64: string; mimeType: string } | null>)
    .filter(Boolean)
    .map((img) => ({
      attachment: img!.imageBase64,
      alt: copy.title,
    }));

  const product = {
    title: copy.title,
    body_html: bodyHtml,
    vendor: "Paca Prints",
    product_type: productType === "card" ? "Card" : "Print",
    status: "draft",
    images: productImages,
    metafields: [
      {
        namespace: "global",
        key: "title_tag",
        value: copy.metaTitle,
        type: "single_line_text_field",
      },
      {
        namespace: "global",
        key: "description_tag",
        value: copy.metaDescription,
        type: "single_line_text_field",
      },
    ],
  };

  const res = await fetch(`https://${store}/admin/api/2024-01/products.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ product }),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg =
      typeof data.errors === "string"
        ? data.errors
        : JSON.stringify(data.errors ?? data);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const productId = data.product.id;
  const storeHandle = store.replace(".myshopify.com", "");
  const adminUrl = `https://admin.shopify.com/store/${storeHandle}/products/${productId}`;

  return NextResponse.json({ productId, adminUrl });
}
