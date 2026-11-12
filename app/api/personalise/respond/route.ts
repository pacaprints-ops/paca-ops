import { NextRequest, NextResponse, after } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../lib/supabaseClient";
import { escapeHtml } from "../../../lib/escapeHtml";
import { makePortraitFolder } from "../../../lib/portraitFolder";
import { portraitText, validMember, type PortraitSubmission } from "../../../personalise/portrait/catalog";
import { MAX_SHOE_PEOPLE, shoesText, validShoeMember, type ShoesSubmission } from "../../../personalise/shoes/catalog";

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
  let shoes: ShoesSubmission | null = null;

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
  } else if (req.kind === "shoes") {
    const sub = body.shoes as ShoesSubmission | undefined;
    const members = Array.isArray(sub?.members) ? sub!.members : [];
    if (members.length === 0) return NextResponse.json({ error: "Add at least one person" }, { status: 400 });
    if (members.length > (req.max_people ?? MAX_SHOE_PEOPLE)) {
      return NextResponse.json({ error: `The print fits up to ${req.max_people ?? MAX_SHOE_PEOPLE} people` }, { status: 400 });
    }
    if (!members.every(validShoeMember)) {
      return NextResponse.json({ error: "Some choices are incomplete — please check each person" }, { status: 400 });
    }
    shoes = {
      title: String(sub?.title ?? "").slice(0, 60).trim() || undefined,
      notes: String(sub?.notes ?? "").slice(0, 1000).trim() || undefined,
      members: members.map((m) => ({
        type: m.type, skin: m.skin, pose: m.pose, shoe: Number(m.shoe),
        name: String(m.name ?? "").slice(0, 30).trim() || undefined,
      })),
    };
    responseText = shoesText(shoes);
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
      // Shoes picks live in the same jsonb column as portraits (kind tells them apart)
      ...(portrait ? { portrait } : shoes ? { portrait: shoes } : {}),
    })
    .eq("token", token);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const what = portrait ? "Family portrait" : shoes ? "Family shoes print" : null;
  await resend.emails.send({
    from: "Paca Prints <hello@pacaprints.com>",
    to: NOTIFY_EMAIL,
    subject: `${what ? `${what} built` : "Personalisation received"} — Order ${req.order_ref}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="color:#333;">${what ? `${what} details received` : "Personalisation details received"}</h2>
        <p><strong>Order:</strong> ${escapeHtml(req.order_ref)}</p>
        <p><strong>Customer:</strong> ${escapeHtml(req.customer_email)}</p>
        <p><strong>Their details:</strong></p>
        <div style="background:#f0f9f6;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;color:#333;">${escapeHtml(responseText)}</div>
        ${what ? `<p style="color:#555;font-size:14px;">Exact files for each person are on the Personalisation page in paca-ops, and a Drive folder with copies of them is being made in "Portrait orders".</p>` : ""}
      </div>
    `,
  });

  // Copy the exact design files into a Drive folder after replying, so the customer isn't kept waiting.
  if (what) after(() => makePortraitFolder(req.id).then(() => undefined));

  return NextResponse.json({ success: true });
}
