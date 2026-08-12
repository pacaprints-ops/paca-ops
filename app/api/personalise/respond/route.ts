import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../lib/supabaseClient";

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = "hello@pacaprints.com";

export async function POST(request: NextRequest) {
  const { token, response } = await request.json();

  if (!token || !response) {
    return NextResponse.json({ error: "Token and response are required" }, { status: 400 });
  }

  const { data: req, error: findError } = await supabase
    .from("personalisation_requests")
    .select("order_ref, customer_email")
    .eq("token", token)
    .single();

  if (findError || !req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("personalisation_requests")
    .update({
      status: "received",
      customer_response: response,
      responded_at: new Date().toISOString(),
    })
    .eq("token", token);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await resend.emails.send({
    from: "Paca Prints <hello@pacaprints.com>",
    to: NOTIFY_EMAIL,
    subject: `Personalisation received — Order ${req.order_ref}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="color:#333;">Personalisation details received</h2>
        <p><strong>Order:</strong> ${req.order_ref}</p>
        <p><strong>Customer:</strong> ${req.customer_email}</p>
        <p><strong>Their details:</strong></p>
        <div style="background:#f0f9f6;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;color:#333;">${response}</div>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
