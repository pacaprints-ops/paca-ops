import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const store = process.env.SHOPIFY_STORE_DOMAIN;

  if (!clientId || !store) {
    return NextResponse.json({ error: "SHOPIFY_CLIENT_ID or SHOPIFY_STORE_DOMAIN not set" }, { status: 500 });
  }

  const redirectUri = `${req.nextUrl.origin}/api/shopify/callback`;
  const state = Math.random().toString(36).slice(2);

  const url =
    `https://${store}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=write_products` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  return NextResponse.redirect(url);
}
