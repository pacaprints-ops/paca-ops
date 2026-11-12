import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../lib/supabaseClient";
import { SIZES } from "../../../personalise/portrait/catalog";
import { escapeHtml } from "../../../lib/escapeHtml";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { customerEmail, orderRef, note, kind, size } = await request.json();

  if (!customerEmail || !orderRef) {
    return NextResponse.json({ error: "Email and order ref are required" }, { status: 400 });
  }

  const isPortrait = kind === "portrait";
  const sizeRow = isPortrait ? SIZES.find((s) => s.label === size) : undefined;
  if (isPortrait && !sizeRow) {
    return NextResponse.json({ error: "Pick the print size the customer bought" }, { status: 400 });
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "paca-ops.vercel.app";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const formLink = `${proto}://${host}/personalise?token=${token}`;

  const { error: dbError } = await supabase
    .from("personalisation_requests")
    .insert({
      customer_email: customerEmail,
      order_ref: orderRef,
      note: note || null,
      token,
      sent_at: new Date().toISOString(),
      status: "pending",
      ...(isPortrait && sizeRow
        ? { kind: "portrait", size_label: sizeRow.label, min_people: sizeRow.min, max_people: sizeRow.max }
        : {}),
    });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const noteHtml = note
    ? `<p style="background:#f0f9f6;border-radius:8px;padding:12px 16px;font-size:14px;color:#333;">${escapeHtml(note)}</p>`
    : "";

  const intro = isPortrait
    ? `Thanks so much for your family portrait order! Tap below to build your family — pick each person's hair, skin tone and outfit (and add your pets). Your print is for <b>${sizeRow!.label} people &amp; pets</b>.`
    : "Thanks so much for your order. We just need a couple of details to personalise it for you.";
  const button = isPortrait ? "Build your family" : "Fill in your details";
  const timing = isPortrait
    ? "It takes about 5 minutes and means we can start making your print straight away."
    : "It only takes 30 seconds and means we can get your order made and on its way as quickly as possible.";

  const { error: emailError } = await resend.emails.send({
    from: "Paca Prints <hello@pacaprints.com>",
    to: customerEmail,
    subject: isPortrait
      ? `Build your family portrait — Order ${orderRef}`
      : `Your personalisation details — Order ${orderRef}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="color:#333;margin-bottom:8px;">Almost done!</h2>
        <p style="color:#555;">${intro}</p>
        ${noteHtml}
        <p style="margin:24px 0;">
          <a href="${formLink}" style="background:#b8e0d2;color:#1a1a1a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            ${button}
          </a>
        </p>
        <p style="color:#555;font-size:14px;">${timing}</p>
        <p style="color:#555;">Thanks,<br/>Paca Prints</p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Order reference: ${escapeHtml(orderRef)}</p>
      </div>
    `,
  });

  if (emailError) {
    // The request is saved, so the link still works — return it so it can be sent by chat instead
    return NextResponse.json({ error: emailError.message, formLink }, { status: 500 });
  }

  return NextResponse.json({ success: true, formLink });
}
