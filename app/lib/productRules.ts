// Product image and copy prompt builders for Create Product tool

export type ProductType = "card" | "print" | "set2" | "set3" | "invite";

// Finish only applies to the print-family types (print, set2, set3) — cards/invites are always flat/folded, never framed.
export type Finish = "framed" | "unframed" | "laminated";

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
  boys: "Playful, bold, clean boyish palette: navy, denim blue, forest green, grey + white. Allowed props: simple geometric shapes, generic star/rocket/dino motifs (no branded characters), subtle texture. No pink, no glitter.",
  girls: "Playful, soft, clean girlie palette: blush pink, lilac, soft rose, cream + white. Allowed props: simple floral or heart motifs (generic), soft ribbon, subtle tasteful sparkle. No branded characters.",
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

// Shared hero-shot background used for RECIPE 1 of every product type, so the first image
// generated is always uniform across the whole catalogue regardless of theme/room chosen.
const HERO_BACKGROUND =
  "FIXED TEMPLATE for this shot only — always use exactly this, ignore the room styling and theme prop sections. This exact framing and background must be produced identically every single time this shot is generated, for every product type. The product (plus its envelope, if it has one) is centered in frame, set against a seamless pure white studio background (plain white, not grey, not cream, not off-white) — no room setting, no theme props, no decor of any kind. Soft, even, shadowless studio lighting. No hands. No clutter. No other objects in frame. (Note: the final crop/zoom is applied afterward in post-processing, so framing it as a normal, moderately-cropped product shot here is fine — don't try to zoom in yourself.)";
const HERO_FRAME_OVERRIDE =
  "If framed, the frame must always be plain black for this shot (never white, never wood). If unframed or laminated, present with no frame per the Finish rule below.";
const HERO_ENVELOPE =
  "ENVELOPE — MANDATORY, matching the approved reference photo exactly: " +
  "1) ORIENTATION: the envelope always matches the product's own shape — if the product is square, the envelope is square too (NOT wider than it is tall); if the product is a portrait rectangle, the envelope is a portrait rectangle too (taller than wide). In both cases the envelope stands upright like the product. NEVER landscape, NEVER wider than tall, NEVER rotated onto its side, regardless of the product's shape. " +
  "2) SIZE — measure this precisely: the envelope's width and height must each be no more than 10% larger than the product's own width and height (whatever the product's actual shape is) — e.g. a product 100 units wide is matched by an envelope roughly 105-110 units wide, never much more. This is a snug-fit card envelope, not a statement/oversized envelope — most of the envelope is HIDDEN behind the product. " +
  "3) POSITION: stands leaning back against the background, directly behind the product, touching it with zero gap — the product's back rests flat against the envelope's front face. Because the envelope is only slightly bigger than the product (per rule 2), only a THIN sliver of it is visible: the triangular flap tip peeking above the product's top edge, and a narrow strip down ONE side only — never a wide margin of envelope visible on multiple sides. " +
  "4) GROUP: the product+envelope together are centered as one unit in the frame, even margins left/right.";

const CARD_RECIPES = [
  `RECIPE 1 — Hero Product Shot: ${HERO_BACKGROUND} Single card front-facing, centered in frame. ${HERO_ENVELOPE}`,
  "RECIPE 2 — Lifestyle Scene: Card placed naturally in the selected room environment. Room styling visible but subtle. Theme props lightly included.",
  "RECIPE 3 — Flatlay with Envelope: Card flat on surface with envelope beside it. Theme props allowed. Minimal, clean layout.",
  "RECIPE 4 — Hand-held Shot: Card held naturally by a neutral hand. Background blurred using room tones. Theme mood applied.",
  "RECIPE 5 — Packaging / Desk Scene: Card positioned near packaging or desk styling. Theme cues allowed. Premium ecommerce feel.",
];

const PRINT_RECIPES = [
  `RECIPE 1 — Hero Product Shot: ${HERO_BACKGROUND} Single print centered in frame, presented per the Finish rule below. ${HERO_FRAME_OVERRIDE}`,
  "RECIPE 2 — Close Detail Shot: Print displayed, slightly angled, presented per the Finish rule below. Focus on artwork clarity and design legibility.",
  "RECIPE 3 — Desk / Shelf Styling: Print resting on desk or shelf with minimal props, presented per the Finish rule below.",
  "RECIPE 4 — Lifestyle Wide Scene: Print visible within a wider room scene, presented per the Finish rule below. Room context clear.",
  "RECIPE 5 — Packaging / Flatlay: Print flat with packaging materials. Clean flatlay composition.",
];

// Set recipes: group scenes show every uploaded design together, individual scenes show one design only.
const SET3_RECIPES = [
  `RECIPE 1 — Gallery Grouping (all 3): ${HERO_BACKGROUND} All three reference designs displayed together, evenly spaced as a matching gallery set (row or gentle asymmetric cluster), presented per the Finish rule below. ${HERO_FRAME_OVERRIDE} Each design's artwork reproduced exactly as supplied — never merged, resized inconsistently, or altered.`,
  "RECIPE 2 — Styled Grouping (all 3): All three reference designs displayed together in a styled scene — leaning together on a shelf, console, or floor with even, complementary spacing, presented per the Finish rule below. Each design reproduced exactly as supplied.",
  "RECIPE 3 — Individual Hero Shot (Design 1): Only the first reference design shown, displayed front-facing on a clean surface, presented per the Finish rule below and matching the group shots' style. No other design from the set in shot.",
  "RECIPE 4 — Individual Hero Shot (Design 2): Only the second reference design shown, displayed front-facing, presented per the Finish rule below and matching the group shots' style. No other design from the set in shot.",
  "RECIPE 5 — Individual Hero Shot (Design 3): Only the third reference design shown, displayed front-facing, presented per the Finish rule below and matching the group shots' style. No other design from the set in shot.",
];

const SET2_RECIPES = [
  `RECIPE 1 — Gallery Grouping (pair): ${HERO_BACKGROUND} Both reference designs displayed together, evenly spaced as a matching pair, presented per the Finish rule below. ${HERO_FRAME_OVERRIDE} Each design's artwork reproduced exactly as supplied — never merged, resized inconsistently, or altered.`,
  "RECIPE 2 — Styled Grouping (pair): Both reference designs displayed together in a styled scene — leaning together on a shelf or console, presented per the Finish rule below. Each design reproduced exactly as supplied.",
  "RECIPE 3 — Flatlay Pair: Both reference designs laid flat together, side by side, clean flatlay composition.",
  "RECIPE 4 — Individual Hero Shot (Design 1): Only the first reference design shown, displayed front-facing on a clean surface, presented per the Finish rule below and matching the group shots' style. No other design from the set in shot.",
  "RECIPE 5 — Individual Hero Shot (Design 2): Only the second reference design shown, displayed front-facing, presented per the Finish rule below and matching the group shots' style. No other design from the set in shot.",
];

const INVITE_RECIPES = [
  `RECIPE 1 — Hero Flat Shot: ${HERO_BACKGROUND} Single invite shown fully flat and front-facing, propped upright leaning slightly, same treatment as the card hero shot. No fold. ${HERO_ENVELOPE}`,
  "RECIPE 2 — Lifestyle Scene: Invite placed flat within the selected event setting (e.g. party table, desk). Theme props lightly included.",
  "RECIPE 3 — Flatlay with Envelope: Invite flat on a surface with a plain unbranded envelope beside it. Theme props allowed. Minimal, clean layout.",
  "RECIPE 4 — Hand-held Shot: Invite held flat and naturally by a neutral hand. Background blurred using room tones. Theme mood applied.",
  "RECIPE 5 — Stack / Desk Scene: A small neat stack of the invite positioned near desk or packaging styling. Theme cues allowed. Premium ecommerce feel.",
];

// Per-recipe-index map of which uploaded design(s) a set recipe needs — "all" sends every
// uploaded reference image to Gemini (group shots), a number sends just that one design (individual shots).
const SET2_RECIPE_DESIGNS: ("all" | number)[] = ["all", "all", "all", 0, 1];
const SET3_RECIPE_DESIGNS: ("all" | number)[] = ["all", "all", 0, 1, 2];

export function getRecipeDesignIndexes(productType: ProductType, recipeIndex: number): "all" | number {
  if (productType === "set2") return SET2_RECIPE_DESIGNS[recipeIndex] ?? "all";
  if (productType === "set3") return SET3_RECIPE_DESIGNS[recipeIndex] ?? "all";
  return "all";
}

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
- If an envelope is shown, it is always a plain white unbranded envelope — never any colour other than white
`.trim();

const PRINT_RULES_BASE = `
PRINT RULES:
- The print design shown in the reference image must be reproduced exactly as supplied
- Never alter the artwork, text, colours, fonts, or layout
- CRITICAL: Never add, invent, or insert any extra element, object, symbol, or text into the design that is not in the reference image
- CRITICAL: Never remove, omit, or crop out any element, object, symbol, or text that IS in the reference image
- The artwork inside the print must match the reference image pixel-for-pixel — only the surrounding scene/frame/room changes, never the design itself
- Print must be fully visible and legible
- No reflections blocking the design
- No hands unless the recipe specifically requires it
`.trim();

const FINISH_RULES: Record<Finish, string> = {
  framed: `
FINISH — Framed:
- The print is inside a neutral, modern, thin frame
- Frame colour must ALWAYS be either plain black or plain white — never wood, never any other colour
`.trim(),
  unframed: `
FINISH — Unframed:
- The print has NO frame, mount, or border — never add one
- Show the raw print edges
- Display it pinned to a corkboard, taped up, clipped on a string with a wooden peg, or simply propped/leaning against a wall, shelf, or stand — never inside a frame
`.trim(),
  laminated: `
FINISH — Laminated:
- The print has NO frame, mount, or border — never add one
- It has a laminated finish: a thin glossy or matte plastic coating, visible as a subtle sheen and slightly rounded/sealed edge
- Display it pinned, taped, propped, or on a stand — never inside a frame
`.trim(),
};

const HARD_INVITE_RULES = `
INVITE RULES — THESE ARE ABSOLUTE AND CANNOT BE BROKEN:
- The invite design shown in the reference image must be reproduced exactly as a physical flat card
- Never alter the artwork, text, colours, fonts, layout, or alignment
- The invite is a single flat panel — it does NOT fold and has no spine
- Show the full flat face of the invite, fully visible — no cropping of any edge
- Never show it standing open like a greeting card or folded in any way
- If an envelope is shown, it is always a plain white unbranded envelope placed beside the invite — never sealed around it or obscuring the design, never any colour other than white
`.trim();

const HARD_SET_RULES = `
SET RULES — THESE ARE ABSOLUTE AND CANNOT BE BROKEN:
- Each reference image shows one distinct design belonging to the same matching set
- Reproduce every design's artwork exactly as supplied — never alter, merge, or redraw any of them
- CRITICAL: Never add, invent, or insert any extra element, object, symbol, or text into ANY design that is not in that design's own reference image
- CRITICAL: Never remove, omit, or crop out any element, object, symbol, or text that IS in a design's reference image
- CRITICAL: Never blend, combine, or swap elements between the different designs in the set — each design's artwork stays exactly as its own reference image, pixel-for-pixel
- Keep framing, size, and style consistent across every image in the set
- In group scenes, arrange the supplied designs together as described — do not invent extra designs or duplicate one design to fill space
- In individual scenes, show only the one specified design — no other designs from the set should appear
`.trim();

function getRecipes(productType: ProductType): string[] {
  switch (productType) {
    case "card":
      return CARD_RECIPES;
    case "set2":
      return SET2_RECIPES;
    case "set3":
      return SET3_RECIPES;
    case "invite":
      return INVITE_RECIPES;
    case "print":
    default:
      return PRINT_RECIPES;
  }
}

function getProductRulesText(productType: ProductType, finish: Finish): string {
  switch (productType) {
    case "card":
      return HARD_CARD_RULES;
    case "invite":
      return HARD_INVITE_RULES;
    case "set2":
    case "set3":
      return `${PRINT_RULES_BASE}\n\n${FINISH_RULES[finish]}\n\n${HARD_SET_RULES}`;
    case "print":
    default:
      return `${PRINT_RULES_BASE}\n\n${FINISH_RULES[finish]}`;
  }
}

const SIZE_ASPECTS: Record<string, string> = {
  A6: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
  A5: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
  A4: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
  A3: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
  A2: "portrait rectangle — taller than wide, aspect ratio 1:1.41. NEVER square, NEVER landscape.",
  Square: "perfect square — equal width and height, aspect ratio 1:1. NEVER portrait, NEVER landscape.",
};

const LANDSCAPE_ASPECTS: Record<string, string> = {
  A6: "landscape rectangle — wider than tall, aspect ratio 1.41:1. NEVER portrait, NEVER square.",
  A5: "landscape rectangle — wider than tall, aspect ratio 1.41:1. NEVER portrait, NEVER square.",
  A4: "landscape rectangle — wider than tall, aspect ratio 1.41:1. NEVER portrait, NEVER square.",
  A3: "landscape rectangle — wider than tall, aspect ratio 1.41:1. NEVER portrait, NEVER square.",
  A2: "landscape rectangle — wider than tall, aspect ratio 1.41:1. NEVER portrait, NEVER square.",
  // A square has no orientation — the Landscape tick has no visual effect when Size is Square.
  Square: "perfect square — equal width and height, aspect ratio 1:1.",
};

export function buildImagePrompt(
  productType: ProductType,
  size: string,
  theme: string,
  room: string,
  recipeIndex: number,
  extraNotes: string,
  landscape: boolean = false,
  finish: Finish = "framed"
): string {
  const themeKey = theme.toLowerCase().replace(/\s+/g, "_");
  const roomKey = room.toLowerCase().replace(/\s+/g, "_");

  const themeRules = THEMES[themeKey] ?? THEMES.default;
  const roomRules = ROOMS[roomKey] ?? ROOMS.default;

  const recipes = getRecipes(productType);
  const recipe = recipes[recipeIndex] ?? recipes[0];
  const productRules = getProductRulesText(productType, finish);

  const aspects = landscape ? LANDSCAPE_ASPECTS : SIZE_ASPECTS;
  const fallbackAspect = landscape
    ? "landscape rectangle — wider than tall"
    : "portrait rectangle — taller than wide";
  const sizeNote = size
    ? `PRODUCT SIZE (mandatory — do not deviate): ${size} — the physical product must be rendered as a ${aspects[size] ?? fallbackAspect}. Every image in the set must show the same consistent size and shape.`
    : "";

  const extraNote = extraNotes?.trim()
    ? `Additional styling notes (treat as refinement, never break brand rules): ${extraNotes}`
    : "";

  const outputSpec = landscape
    ? "Create a photorealistic lifestyle product mockup image, landscape orientation (approximately 800x600 pixels, wider than tall)."
    : "Create a photorealistic lifestyle product mockup image at 600x600 pixels.";

  const outputLine = landscape
    ? "Output: one photorealistic image only, landscape orientation (wider than tall). No text overlays. No watermarks."
    : "Output: one photorealistic 600x600 image only. No text overlays. No watermarks.";

  return `
${outputSpec}

The reference image(s) attached show the artwork for a ${productType === "set2" || productType === "set3" ? "set of matching prints" : productType}. Use them to render the product accurately in the scene below.

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

${outputLine}
`.trim();
}

const FINISH_DETAIL_LINES: Record<Finish, string> = {
  framed: "• Comes ready-framed in a neutral, modern thin frame",
  unframed: "• Unframed — ready to frame yourselves or display your own way",
  laminated: "• Laminated finish — durable and wipe-clean, ready to use straight away",
};

function buildProductDetails(productType: ProductType, size: string, finish: Finish = "framed"): string {
  if (productType === "card") {
    return [
      "Details:",
      `• Size: ${size || "A5"}`,
      "• Printed on premium quality card stock",
      "• Comes with a white envelope",
      "• Blank inside — ready for your personal message",
      "• Printed and shipped from the UK",
    ].join("\n");
  }
  if (productType === "invite") {
    return [
      "Details:",
      `• Size: ${size || "A6"}`,
      "• Printed on premium quality card stock",
      "• Comes with a white envelope",
      "• Blank or personalised exactly as ordered",
      "• Printed and shipped from the UK",
    ].join("\n");
  }
  if (productType === "set2" || productType === "set3") {
    const count = productType === "set2" ? "2" : "3";
    return [
      "Details:",
      `• Sold as a matching set of ${count} prints`,
      `• Size: ${size || "A4"} each`,
      "• High-quality fine art prints on premium paper",
      FINISH_DETAIL_LINES[finish],
      "• Colours are vibrant and fade-resistant",
      "• Printed and shipped from the UK",
    ].join("\n");
  }
  return [
    "Details:",
    `• Size: ${size || "A4"}`,
    "• High-quality fine art print on premium paper",
    FINISH_DETAIL_LINES[finish],
    "• Colours are vibrant and fade-resistant",
    "• Printed and shipped from the UK",
  ].join("\n");
}

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  card: "card",
  print: "print",
  set2: "set of 2 prints",
  set3: "set of 3 prints",
  invite: "invite",
};

export function buildCopyPrompt(
  productName: string,
  productType: ProductType,
  size: string,
  theme: string,
  room: string,
  extraNotes: string,
  finish: Finish = "framed"
): string {
  const details = buildProductDetails(productType, size, finish);
  const typeLabel = PRODUCT_TYPE_LABELS[productType] ?? productType;
  const isPrintFamily = productType === "print" || productType === "set2" || productType === "set3";
  const finishLabel = isPrintFamily
    ? finish === "framed"
      ? "framed"
      : finish === "laminated"
      ? "laminated (unframed), great for chore charts, checklists, or anywhere it needs to be wipeable"
      : "unframed"
    : "";

  return `
You write product descriptions for PacaPrints, a small UK card and print shop. The tone is warm, friendly, and a little witty — like a mate who knows their stuff giving you a genuine recommendation. You want the reader to smile, feel something, and actually want to buy it. Write with personality. Make it feel real.

Banned phrases (never use these — they kill the vibe instantly):
"perfect for", "look no further", "elevate", "nestled", "timeless", "thoughtfully crafted", "make memories", "loved ones", "cherish", "heartfelt", "curated", "stunning", "beautiful", "elegant", "touch of", "speaks volumes", "say it all", "the perfect gift".

Product:
- Name/title hint: ${productName}
- Type: ${typeLabel}${size ? ` (${size})` : ""}
${finishLabel ? `- Finish: ${finishLabel}` : ""}
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
