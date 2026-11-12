import { NextRequest, NextResponse, after } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../lib/supabaseClient";
import { escapeHtml } from "../../../lib/escapeHtml";
import { makePortraitFolder } from "../../../lib/portraitFolder";
import { portraitText, validMember, type PortraitSubmission } from "../../../personalise/portrait/catalog";

const resend = new Resend(process.env.RESEND_API_KEY);
export const maxDuration = 120;

const NOTIFY_EMAIL = "hello@pacaprints.com";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body;
  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  const { data: req, error: findError } = await supabase
    .from("personalisation_requests")
    .select("id, order_ref, customer_email, kind, size_label, max_people, status")
    .eq("token", token)
    .single();

  if (findError || !req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (req.status === "received") {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  let responseText: string;
  let portrait: PortraitSubmission | null = null;

  if (req.kind === "portrait") {
    const sub = body.portrait as PortraitSubmission | undefined;
    const members = Array.isArray(sub?.members) ? sub!.members : [];
    if (members.length === 0) return NextResponse.json({ error: "Add at least one person" }, { status: 400 });
    if (req.max_people && members.length > req.max_people) {
      return NextResponse.json({ error: `Your print is for up to ${req.max_people} people & pets` }, { status: 400 });
    }
    if (!members.every(validMember)) {
      return NextResponse.json({ error: "Some choices are incomplete — please check each person" }, { status: 400 });
    }
    portrait = {
      title: String(sub?.title ?? "").slice(0, 60).trim() || undefined,
      notes: String(sub?.notes ?? "").slice(0, 1000).trim() || undefined,
      members: members.map((m) => ({ ...m, name: undefined, age: m.age == null ? undefined : Number(m.age) })),
    };
    responseText = portraitText(portrait, req.size_label);
  } else {
    if (!body.response) return NextResponse.json({ error: "Response is required" }, { status: 400 });
    responseText = String(body.response).slice(0, 5000);
  }

  const { error: updateError } = await supabase
    .from("personalisation_requests")
    .update({
      status: "received",
      customer_response: responseText,
      responded_at: new Date().toISOString(),
      ...(portrait ? { portrait } : {}),
    })
    .eq("token", token);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await resend.emails.send({
    from: "Paca Prints <hello@pacaprints.com>",
    to: NOTIFY_EMAIL,
    subject: `${portrait ? "Family portrait built" : "Personalisation received"} — Order ${req.order_ref}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="color:#333;">${portrait ? "Family portrait details received" : "Personalisation details received"}</h2>
        <p><strong>Order:</strong> ${escapeHtml(req.order_ref)}</p>
        <p><strong>Customer:</strong> ${escapeHtml(req.customer_email)}</p>
        <p><strong>Their details:</strong></p>
        <div style="background:#f0f9f6;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;color:#333;">${escapeHtml(responseText)}</div>
        ${portrait ? `<p style="color:#555;font-size:14px;">Exact files for each person are on the Personalisation page in paca-ops, and a Drive folder with copies of them is being made in "Portrait orders".</p>` : ""}
      </div>
    `,
  });

  // Copy the exact design files into a Drive folder after replying, so the customer isn't kept waiting.
  if (portrait) after(() => makePortraitFolder(req.id).then(() => undefined));

  return NextResponse.json({ success: true });
}
