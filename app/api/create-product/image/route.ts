import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { buildImagePrompt, getRecipeDesignIndexes, ProductType } from "@/app/lib/productRules";

export const maxDuration = 60;

type ReferenceImage = { base64: string; mimeType: string };

export async function POST(req: NextRequest) {
  try {
    const {
      referenceImages,
      productType,
      size,
      theme,
      room,
      extraNotes,
      recipeIndex,
      landscape,
      finish,
    } = await req.json();

    if (!referenceImages?.length || !productType) {
      return NextResponse.json(
        { error: "referenceImages and productType are required" },
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

    const ai = new GoogleGenAI({ apiKey });

    const prompt = buildImagePrompt(
      productType as ProductType,
      size,
      theme,
      room,
      recipeIndex ?? 0,
      extraNotes,
      Boolean(landscape),
      finish
    );

    const designIndexes = getRecipeDesignIndexes(productType as ProductType, recipeIndex ?? 0);
    const imagesForThisShot: ReferenceImage[] =
      designIndexes === "all" ? referenceImages : [referenceImages[designIndexes]];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          parts: [
            ...imagesForThisShot.map((img) => ({
              inlineData: {
                mimeType: img.mimeType ?? "image/png",
                data: img.base64,
              },
            })),
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        { error: "No image returned from Gemini" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
