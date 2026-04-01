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
      model: "gemini-2.0-flash",
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
    const text = result.response.text().trim();

    const copy = JSON.parse(text);

    return NextResponse.json(copy);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
