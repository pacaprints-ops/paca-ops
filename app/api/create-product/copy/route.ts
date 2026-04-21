import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildCopyPrompt } from "@/app/lib/productRules";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { productName, productType, size, theme, room, extraNotes } =
      await req.json();

    if (!productName || !productType) {
      return NextResponse.json(
        { error: "productName and productType are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } as any,
    });

    const prompt = buildCopyPrompt(
      productName,
      productType,
      size,
      theme,
      room,
      extraNotes
    );

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Escape control characters only inside JSON string values (not structural whitespace)
    let inString = false;
    let escaped = false;
    let sanitized = "";
    for (const c of raw) {
      if (escaped) { sanitized += c; escaped = false; continue; }
      if (c === "\\" && inString) { escaped = true; sanitized += c; continue; }
      if (c === '"') { inString = !inString; sanitized += c; continue; }
      if (inString) {
        if (c === "\n") { sanitized += "\\n"; continue; }
        if (c === "\r") { sanitized += "\\r"; continue; }
        if (c === "\t") { sanitized += "\\t"; continue; }
        if (c.charCodeAt(0) < 32) continue; // drop other control chars
      }
      sanitized += c;
    }

    const copy = JSON.parse(sanitized);

    return NextResponse.json(copy);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
