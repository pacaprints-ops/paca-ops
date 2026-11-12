import { NextRequest, NextResponse } from "next/server";
import { makePortraitFolder } from "../../../lib/portraitFolder";

// Admin-only (behind login via middleware): (re)make the Drive folder for one portrait order.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const result = await makePortraitFolder(String(id));
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
