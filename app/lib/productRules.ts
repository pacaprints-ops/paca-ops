// Product image and copy prompt builders for Create Product tool

export const THEMES: Record<string, string> = {
  default: "Clean, modern, minimal, soft studio aesthetic. Neutral whites/creams with subtle teal accents. No seasonal props.",
  birthday: "Celebratory, fun, bright-but-not-neon. Allowed props: subtle confetti, small candle hint, gift ribbon. No giant balloons, messy clutter, or alcohol.",
  valentines: "Romantic or cheeky (tasteful). Palette: reds/pinks + neutrals. Allowed props: small hearts, minimal rose petals, ribbon, soft florals. Premium, subtle cues only.",
  mothers_day: "Warm, caring, thoughtful, premium gift feel. Palette: cream, blush, sage, soft lilac. Allowed props: gentle florals, ribbon, tea cup (unbranded), soft fabrics.",
  fathers_day: "Modern, confident, understated. Palette: navy/charcoal/earth tones. Allowed props: minimal desk items, wood/leather textures (unbranded). No alcohol, tool mess, or sports logos.",
  baby: "Soft, gentle, calm. Palette: creams + pastel blue/pink/yellow + sage. Allowed props: muslin cloth, generic soft toy (no brands), neutral blocks (no letters).",
  christmas: "Festive, cozy, premium. Allowed props: tiny bauble hint, pine sprig, warm fairy-light bokeh, ribbon. Subtle seasonal cues only — no busy santa imagery or cartoon characters.",
  easter: "Spring, fresh, light. Palette: pastel spring tones + neutrals. Allowed props: small eggs, subtle spring florals, light greenery. Minimal hints only.",
  halloween: "Spooky-cute, modern, not gory. Palette: black/charcoal + muted orange/purple accents. Allowed props: subtle cobweb hint, tiny pumpkin, candle glow. No gore or horror characters.",
  kids: "Playful, colourful, clean. Allowed props: simple generic toy shapes, playful textures, colour pops. No branded characters or clutter.",
  gaming: "Modern, neon-accented but controlled. Palette: dark neutrals + subtle neon accent glow. Allowed props: generic controller silhouette (no logos), RGB glow ambiance, unbranded desk setup.",
  wedding: "Elegant, romantic, luxury stationery feel. Palette: whites/creams + sage, blush, taupe. Allowed props: silk ribbon, wax seal (generic), delicate florals, linen textures.",
};

export const ROOMS: Record<string, string> = {
  default: "Clean neutral modern wall. Light wood or white desk. Soft natural light, minimal stationery or subtle plant.",
  lounge: "Warm natural light, cozy. Surfaces: coffee table wood or neutral fabric. Allowed props: small plant, neutral candle (unbranded), subtle throw texture. Soft furnishings hinted but blurred.",
  kitchen: "Bright clean daylight. Light worktop (stone/wood). Allowed props: ceramic mug (unbranded), plain tea towel, small plant. Clean backsplash hints blurred in background.",
  nursery: "Airy, soft daylight. Light wood or soft fabric surfaces. Allowed props: muslin cloth, generic soft toy (no brands), neutral blocks (no letters). Cream/sage/pastel tones.",
  bathroom: "Bright, crisp, spa-like. Light stone/marble counter. Allowed props: rolled plain towel, small plant, simple unbranded soap dispenser. Neutral tiles background.",
  bedroom: "Soft, calm, slightly warm light. Bedside table or light wood surface. Allowed props: linen texture, small plant, subtle lamp glow (unbranded). Blurred bedding background.",
  office: "Clean modern daylight. Desk (wood/white). Allowed props: minimal stationery, closed laptop (no logo), desk plant. Neutral wall, tidy workspace hints.",
  girls_bedroom: "Soft, bright, cheerful. Light wood/white desk or bedside. Palette hint: blush/lilac/sage accents (subtle). Allowed props: soft cushion texture, small plant, minimal decor.",
  boys_bedroom: "Soft, bright, clean. Light wood/white desk or bedside. Palette hint: navy/teal/grey accents (subtle). Allowed props: minimal desk items, small plant.",
};

const CARD_RECIPES = [
  "RECIPE 1 — Hero Product Shot: Single card front-facing on a clean surface. Apply theme and room styling subtly. No hands. No clutter.",
  "RECIPE 2 — Lifestyle Scene: Card placed naturally in the selected room environment. Room styling visible but subtle. Theme props lightly included.",
  "RECIPE 3 — Flatlay with Envelope: Card flat on surface with envelope beside it. Theme props allowed. Minimal, clean layout.",
  "RECIPE 4 — Hand-held Shot: Card held naturally by a neutral hand. Background blurred using room tones. Theme mood applied.",
  "RECIPE 5 — Packaging / Desk Scene: Card positioned near packaging or desk styling. Theme cues allowed. Premium ecommerce feel.",
];

const PRINT_RECIPES = [
  "RECIPE 1 — Hero Wall Shot: Print framed and hanging on wall in the selected room. Minimal surrounding decor.",
  "RECIPE 2 — Close Detail Shot: Print framed, slightly angled. Focus on artwork clarity and design legibility.",
  "RECIPE 3 — Desk / Shelf Styling: Print resting on desk or shelf with minimal props.",
  "RECIPE 4 — Lifestyle Wide Scene: Print visible within a wider room scene. Room context clear.",
  "RECIPE 5 — Packaging / Flatlay: Print flat with packaging materials. Clean flatlay composition.",
];

const BRAND_RULES = `
BRAND RULES (never break):
- Clean, premium, modern, cosy — UK aesthetic, not American stock-photo styled
- Soft natural daylight only. Neutral tones: beige, cream, light wood, soft grey
- No harsh shadows. No heavy contrast. Whites must be clean, not yellow or blue
- No overly busy scenes. No bright or harsh colours. No dark or dramatic lighting
- Product is always the hero — fully visible, legible, not cropped
- No props overlapping the design area
- No brand logos or readable text on props
- No watermarks
- Must look like a real photograph of a real product
- Suitable for Shopify product pages and Instagram
`.trim();

const HARD_CARD_RULES = `
CARD RULES — THESE ARE ABSOLUTE AND CANNOT BE BROKEN:
- The card design shown in the reference image must be reproduced exactly as a physical card
- Never alter the artwork, text, colours, fonts, layout, or alignment
- The card is a standard single-fold greeting card that opens like a book
- SPINE/FOLD: LEFT edge only — sealed and closed, never open
- OPENING: RIGHT edge only — the only place the two layers can separate
- TOP edge: sealed and closed
- BOTTOM edge: sealed and closed — NEVER open at the bottom, this is critically wrong
- The card must NEVER appear landscape-oriented with the fold at the bottom or top
- The card must ALWAYS stand upright with the fold on the left side
- Show the full front face — no cropping of any edge
`.trim();

const HARD_PRINT_RULES = `
PRINT RULES:
- The print design shown in the reference image must be reproduced exactly as a framed print
- Never alter the artwork, text, colours, fonts, or layout
- Frame must be neutral, modern, and thin
- Print must be fully visible and legible
- No reflections blocking the design
- No hands unless the recipe specifically requires it
`.trim();

export function buildImagePrompt(
  productType: "card" | "print",
  size: string,
  theme: string,
  room: string,
  recipeIndex: number,
  extraNotes: string
): string {
  const themeKey = theme.toLowerCase().replace(/\s+/g, "_");
  const roomKey = room.toLowerCase().replace(/\s+/g, "_");

  const themeRules = THEMES[themeKey] ?? THEMES.default;
  const roomRules = ROOMS[roomKey] ?? ROOMS.default;

  const recipes = productType === "card" ? CARD_RECIPES : PRINT_RECIPES;
  const recipe = recipes[recipeIndex] ?? recipes[0];
  const productRules = productType === "card" ? HARD_CARD_RULES : HARD_PRINT_RULES;

  const SIZE_ASPECTS: Record<string, string> = {
    A6: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
    A5: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
    A4: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
    A3: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
    A2: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
    Square: "perfect square — equal width and height, aspect ratio 1:1. NEVER portrait, NEVER landscape.",
  };
  const sizeNote = size
    ? `PRODUCT SIZE (mandatory — do not deviate): ${size} — the physical product must be rendered as a ${SIZE_ASPECTS[size] ?? "portrait rectangle"}. Every image in the set must show the same consistent size and shape.`
    : "";

  const extraNote = extraNotes?.trim()
    ? `Additional styling notes (treat as refinement, never break brand rules): ${extraNotes}`
    : "";

  return `
Create a photorealistic lifestyle product mockup image at 600x600 pixels.

The reference image attached shows the artwork for a ${productType}. Use it to render the product accurately in the scene below.

MANDATORY PRODUCT RULES — READ FIRST, NEVER BREAK:
${productRules}

${sizeNote}

SCENE TO CREATE:
${recipe}

THEME STYLING:
${themeRules}

ROOM STYLING:
${roomRules}

${BRAND_RULES}

${extraNote}

Output: one photorealistic 600x600 image only. No text overlays. No watermarks.
`.trim();
}

function buildProductDetails(productType: "card" | "print", size: string): string {
  if (productType === "card") {
    return [
      "Details:",
      `• Size: ${size || "A5"}`,
      "• Printed on premium quality card stock",
      "• Comes with a white envelope",
      "• Blank inside — ready for your personal message",
      "• Printed and shipped from the UK",
    ].join("\n");
  } else {
    return [
      "Details:",
      `• Size: ${size || "A4"}`,
      "• High-quality fine art print on premium paper",
      "• Available as print only or framed",
      "• Colours are vibrant and fade-resistant",
      "• Printed and shipped from the UK",
    ].join("\n");
  }
}

export function buildCopyPrompt(
  productName: string,
  productType: "card" | "print",
  size: string,
  theme: string,
  room: string,
  extraNotes: string
): string {
  const details = buildProductDetails(productType, size);

  return `
You write product descriptions for PacaPrints, a small UK card and print shop. The tone is warm, friendly, and a little witty — like a mate who knows their stuff giving you a genuine recommendation. You want the reader to smile, feel something, and actually want to buy it. Write with personality. Make it feel real.

Banned phrases (never use these — they kill the vibe instantly):
"perfect for", "look no further", "elevate", "nestled", "timeless", "thoughtfully crafted", "make memories", "loved ones", "cherish", "heartfelt", "curated", "stunning", "beautiful", "elegant", "touch of", "speaks volumes", "say it all", "the perfect gift".

Product:
- Name/title hint: ${productName}
- Type: ${productType}${size ? ` (${size})` : ""}
- Occasion/theme: ${theme || "general"}
${extraNotes ? `- Extra notes: ${extraNotes}` : ""}

Return ONLY valid JSON with no markdown or extra text:
{
  "title": "product title here",
  "description": "product description here",
  "metaTitle": "meta title here",
  "metaDescription": "meta description here"
}

Rules:
- Title: 60-80 characters, plain and descriptive, include the occasion and product type, UK English
- Description: 3-4 paragraphs. First paragraph: hook the reader — who is this for and why will they love it? Be specific and a little cheeky if it fits. Second paragraph: paint a picture of the moment — getting it, giving it, seeing it on a wall. Third paragraph: sell the quality without being boring about it. End with this exact block on a new line:\n${details}
- Meta title: under 60 characters, plain and clear
- Meta description: 150-160 characters, punchy and enticing — make someone want to click
`.trim();
}
