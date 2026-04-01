import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!code || !shop || !clientId || !clientSecret) {
    return new NextResponse("Missing required parameters.", { status: 400 });
  }

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    return new NextResponse(`Shopify error: ${JSON.stringify(data)}`, { status: 400 });
  }

  const token = data.access_token as string;

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Shopify Connected</title>
<style>
  body { font-family: sans-serif; padding: 2rem; max-width: 640px; margin: 0 auto; color: #1e293b; }
  h1 { color: #166534; }
  code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
  textarea { width: 100%; padding: 0.75rem; font-family: monospace; font-size: 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 0.5rem; }
  .note { color: #64748b; font-size: 0.85rem; margin-top: 1rem; }
</style>
</head>
<body>
  <h1>Shopify Connected!</h1>
  <p>Copy the token below and add it as <code>SHOPIFY_ADMIN_TOKEN</code> in:</p>
  <ul>
    <li>Your <code>.env.local</code> file (for local dev)</li>
    <li>Vercel → Project Settings → Environment Variables (for production)</li>
  </ul>
  <label><strong>Your access token:</strong>
    <textarea rows="2" onclick="this.select()">${token}</textarea>
  </label>
  <p class="note">This token does not expire. Keep it secret — treat it like a password. Once you've saved it, you can close this page.</p>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
