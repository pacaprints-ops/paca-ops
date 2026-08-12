"use client";

import { useEffect, useRef, useState } from "react";

const RESULTS_KEY = "create-product-results";

type Copy = {
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
};

type GeneratedImage = {
  imageBase64: string;
  mimeType: string;
};

const THEMES = [
  { value: "default", label: "General / No theme" },
  { value: "birthday", label: "Birthday" },
  { value: "valentines", label: "Valentine's Day" },
  { value: "mothers_day", label: "Mother's Day" },
  { value: "fathers_day", label: "Father's Day" },
  { value: "baby", label: "Baby / Newborn" },
  { value: "christmas", label: "Christmas" },
  { value: "easter", label: "Easter" },
  { value: "halloween", label: "Halloween" },
  { value: "kids", label: "Kids" },
  { value: "gaming", label: "Gaming" },
  { value: "wedding", label: "Wedding" },
];

const ROOMS = [
  { value: "default", label: "No specific room" },
  { value: "lounge", label: "Lounge / Living room" },
  { value: "kitchen", label: "Kitchen" },
  { value: "nursery", label: "Nursery" },
  { value: "bathroom", label: "Bathroom" },
  { value: "bedroom", label: "Bedroom" },
  { value: "office", label: "Office" },
  { value: "girls_bedroom", label: "Girl's bedroom" },
  { value: "boys_bedroom", label: "Boy's bedroom" },
];

const CARD_SIZES = ["A6", "A5", "Square", "A4"];
const PRINT_SIZES = ["A4", "A3", "A2"];

type Mode = "all" | "copy" | "images";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "all", label: "Everything", hint: "Copy + selected images" },
  { value: "copy", label: "Copy only", hint: "Title, description, meta — no image credits used" },
  { value: "images", label: "Images only", hint: "Only the images you tick below" },
];

const RECIPE_LABELS = [
  "Hero product shot",
  "Lifestyle scene",
  "Flatlay with envelope",
  "Hand-held shot",
  "Desk / packaging scene",
];

const PRINT_RECIPE_LABELS = [
  "Hero wall shot",
  "Close detail shot",
  "Desk / shelf styling",
  "Lifestyle wide scene",
  "Packaging flatlay",
];

export default function CreateProductPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("all");
  const [selectedRecipes, setSelectedRecipes] = useState<boolean[]>([
    true, true, true, true, true,
  ]);

  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState<"card" | "print">("card");
  const [size, setSize] = useState("A5");
  const [theme, setTheme] = useState("default");
  const [room, setRoom] = useState("default");
  const [extraNotes, setExtraNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);

  const [copy, setCopy] = useState<Copy | null>(null);
  const [images, setImages] = useState<(GeneratedImage | null)[]>([
    null, null, null, null, null,
  ]);

  const [copyError, setCopyError] = useState<string>("");
  const [imageErrors, setImageErrors] = useState<string[]>(["", "", "", "", ""]);

  const [shopifyPushing, setShopifyPushing] = useState(false);
  const [shopifyUrl, setShopifyUrl] = useState<string>("");
  const [shopifyError, setShopifyError] = useState<string>("");
  const [existingProductRef, setExistingProductRef] = useState<string>("");
  const [existingError, setExistingError] = useState<string>("");
  const [existingUrl, setExistingUrl] = useState<string>("");

  // Restore results from sessionStorage on mount (survives mobile download navigation)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(RESULTS_KEY);
      if (!saved) return;
      const { copy: c, images: imgs, productName: name } = JSON.parse(saved);
      if (c) setCopy(c);
      if (imgs) setImages(imgs);
      if (name) setProductName(name);
    } catch {}
  }, []);

  // Save results to sessionStorage whenever they change
  useEffect(() => {
    if (!copy && images.every((i) => i === null)) return;
    try {
      sessionStorage.setItem(RESULTS_KEY, JSON.stringify({ copy, images, productName }));
    } catch {}
  }, [copy, images, productName]);

  const sizes = productType === "card" ? CARD_SIZES : PRINT_SIZES;
  const recipeLabels =
    productType === "card" ? RECIPE_LABELS : PRINT_RECIPE_LABELS;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleProductTypeChange(type: "card" | "print") {
    setProductType(type);
    setSize(type === "card" ? "A5" : "A4");
  }

  async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // result is "data:image/png;base64,XXXX"
        const [header, base64] = result.split(",");
        const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/png";
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerate() {
    const wantsCopy = mode !== "images";
    const wantsImages = mode !== "copy";
    const recipeIndexes = wantsImages
      ? selectedRecipes.map((on, i) => (on ? i : -1)).filter((i) => i >= 0)
      : [];

    if (wantsCopy && !productName.trim()) {
      alert("Please enter a product name.");
      return;
    }
    if (wantsImages && !imageFile) {
      alert("Please upload the product front image.");
      return;
    }
    if (wantsImages && recipeIndexes.length === 0) {
      alert("Please tick at least one image to generate.");
      return;
    }

    setRunning(true);
    // Only clear what we're about to regenerate — keeps the other half intact
    if (wantsCopy) {
      setCopy(null);
      setCopyError("");
    }
    if (wantsImages) {
      setImages((prev) => prev.map((img, i) => (recipeIndexes.includes(i) ? null : img)));
      setImageErrors((prev) => prev.map((e, i) => (recipeIndexes.includes(i) ? "" : e)));
    }
    setShopifyUrl("");
    setShopifyError("");
    setExistingUrl("");
    setExistingError("");

    // Step 1: Generate copy
    if (wantsCopy) {
      setStatus("Writing product copy…");
      try {
        const res = await fetch("/api/create-product/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productName, productType, size, theme, room, extraNotes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to generate copy");
        setCopy(data);
      } catch (err) {
        setCopyError(err instanceof Error ? err.message : "Failed to generate copy");
      }
    }

    // Step 2: Generate the selected images one by one
    if (wantsImages && imageFile) {
      const { base64, mimeType } = await fileToBase64(imageFile);

      for (let n = 0; n < recipeIndexes.length; n++) {
        const i = recipeIndexes[n];
        setStatus(
          `Generating image ${n + 1} of ${recipeIndexes.length} — ${recipeLabels[i]}…`
        );
        try {
          const res = await fetch("/api/create-product/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              imageMimeType: mimeType,
              productType,
              size,
              theme,
              room,
              extraNotes,
              recipeIndex: i,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Failed to generate image");
          setImages((prev) => {
            const next = [...prev];
            next[i] = data;
            return next;
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed";
          setImageErrors((prev) => {
            const next = [...prev];
            next[i] = msg;
            return next;
          });
        }
      }
    }

    setStatus("Done!");
    setRunning(false);
  }

  function toggleRecipe(i: number) {
    setSelectedRecipes((prev) => prev.map((on, idx) => (idx === i ? !on : on)));
  }

  // Accepts a raw ID or a pasted Shopify admin URL (…/products/1234567890)
  function parseProductId(input: string): string | null {
    const match = input.trim().match(/(\d{5,})/g);
    return match ? match[match.length - 1] : null;
  }

  async function addImagesToExistingProduct() {
    const productId = parseProductId(existingProductRef);
    if (!productId) {
      setExistingError("Paste a Shopify product ID or the admin product URL.");
      return;
    }
    const validImages = images.filter(Boolean) as GeneratedImage[];
    if (validImages.length === 0) {
      setExistingError("No generated images to add.");
      return;
    }

    setShopifyPushing(true);
    setExistingError("");
    setExistingUrl("");
    let failed = 0;
    let adminUrl = "";
    for (const img of validImages) {
      try {
        const res = await fetch("/api/create-product/shopify/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            imageBase64: img.imageBase64,
            alt: copy?.title ?? productName,
          }),
        });
        const data = await res.json();
        if (!res.ok) failed++;
        else if (data.adminUrl) adminUrl = data.adminUrl;
      } catch {
        failed++;
      }
    }
    if (failed === validImages.length) {
      setExistingError("All image uploads failed — check the product ID.");
    } else {
      if (failed > 0) setExistingError(`${failed} image(s) failed to upload.`);
      if (adminUrl) setExistingUrl(adminUrl);
    }
    setShopifyPushing(false);
  }

  async function pushToShopify() {
    if (!copy) return;
    setShopifyPushing(true);
    setShopifyUrl("");
    setShopifyError("");
    try {
      // Step 1: Create the product (copy only — no images to stay under payload limit)
      const res = await fetch("/api/create-product/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy, productType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create Shopify product");
      const { productId, adminUrl } = data;

      // Step 2: Upload each generated image one at a time
      const validImages = images.filter(Boolean);
      for (const img of validImages) {
        if (!img) continue;
        await fetch("/api/create-product/shopify/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, imageBase64: img.imageBase64, alt: copy.title }),
        });
        // Continue even if one image fails — don't block the whole push
      }

      setShopifyUrl(adminUrl);
    } catch (err) {
      setShopifyError(err instanceof Error ? err.message : "Failed to push to Shopify");
    }
    setShopifyPushing(false);
  }

  function downloadImage(img: GeneratedImage, index: number) {
    const byteCharacters = atob(img.imageBase64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: img.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = productName.trim() ? productName.replace(/\s+/g, "-").toLowerCase() : "product";
    a.download = `${base}-image-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyCopyToClipboard() {
    if (!copy) return;
    const text = [
      `TITLE:\n${copy.title}`,
      `\nDESCRIPTION:\n${copy.description}`,
      `\nMETA TITLE:\n${copy.metaTitle}`,
      `\nMETA DESCRIPTION:\n${copy.metaDescription}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  }

  const hasResults = copy || images.some((img) => img !== null);

  return (
    <div className="space-y-6">
      <div className="pp-card p-5">
        <h1 className="text-2xl font-extrabold text-slate-900">Create Product</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload your Canva design, fill in the details, and generate 5 lifestyle images + Shopify copy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — Form */}
        <div className="space-y-4">
          <div className="pp-card p-5 space-y-4">
            {/* What to generate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                What do you need?
              </label>
              <div className="flex gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={[
                      "flex-1 rounded-xl px-3 py-2 text-xs font-semibold border transition",
                      mode === m.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-400",
                    ].join(" ")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {MODES.find((m) => m.value === mode)?.hint}
              </p>
            </div>

            {/* Which images */}
            {mode !== "copy" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Images to generate ({selectedRecipes.filter(Boolean).length}/5)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRecipes(
                        selectedRecipes.every(Boolean)
                          ? [false, false, false, false, false]
                          : [true, true, true, true, true]
                      )
                    }
                    className="text-xs font-semibold text-slate-600 underline hover:text-slate-900"
                  >
                    {selectedRecipes.every(Boolean) ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div className="space-y-1">
                  {recipeLabels.map((label, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipes[i]}
                        onChange={() => toggleRecipe(i)}
                        className="rounded border-slate-300"
                      />
                      {i + 1}. {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Image upload */}
            <div className={mode === "copy" ? "hidden" : ""}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Front image (from Canva) *
              </label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-slate-400 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto max-h-40 object-contain rounded"
                  />
                ) : (
                  <p className="text-sm text-slate-500">Click to upload PNG or JPG</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Product name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product name / title hint {mode === "images" ? "(optional)" : "*"}
              </label>
              <input
                type="text"
                className="pp-input"
                placeholder="e.g. Funny Dad Emergency Father's Day Card"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            {/* Product type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product type *
              </label>
              <div className="flex gap-2">
                {(["card", "print"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleProductTypeChange(t)}
                    className={[
                      "flex-1 rounded-xl px-4 py-2 text-sm font-semibold border transition",
                      productType === t
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-400",
                    ].join(" ")}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Size
              </label>
              <select
                className="pp-select"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                {sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Theme / occasion
              </label>
              <select
                className="pp-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {THEMES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Room */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Room / setting
              </label>
              <select
                className="pp-select"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              >
                {ROOMS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Extra notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Extra notes (optional)
              </label>
              <textarea
                className="pp-input"
                rows={2}
                placeholder="e.g. recipient is male, add masculine colour tones"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={running}
              className="w-full rounded-xl px-4 py-3 text-sm font-bold bg-slate-900 text-white hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running
                ? status
                : mode === "copy"
                ? "Generate copy only"
                : mode === "images"
                ? `Generate ${selectedRecipes.filter(Boolean).length} image(s)`
                : "Generate"}
            </button>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className="space-y-4">
          {/* Status */}
          {running && (
            <div className="pp-card p-4">
              <p className="text-sm font-semibold text-slate-700">{status}</p>
            </div>
          )}

          {/* Copy */}
          {(copy || copyError) && (
            <div className="pp-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">Shopify Copy</h2>
                {copy && (
                  <button
                    type="button"
                    onClick={copyCopyToClipboard}
                    className="text-xs font-semibold text-slate-600 underline hover:text-slate-900"
                  >
                    Copy all to clipboard
                  </button>
                )}
              </div>

              {copyError ? (
                <p className="text-sm text-red-600">{copyError}</p>
              ) : copy ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">Title</p>
                    <p className="text-slate-900 font-semibold">{copy.title}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">Description</p>
                    <p className="text-slate-700 leading-relaxed">{copy.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">Meta title</p>
                    <p className="text-slate-700">{copy.metaTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">Meta description</p>
                    <p className="text-slate-700">{copy.metaDescription}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Push to Shopify */}
          {copy && !running && (
            <div className="pp-card p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-slate-900">Push to Shopify</h2>
              <p className="text-xs text-slate-500">
                Creates a <strong>draft product</strong> in Shopify with the copy and all generated images. Nothing goes live until you publish it.
              </p>

              {shopifyUrl ? (
                <a
                  href={shopifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center rounded-xl px-4 py-3 text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Product created — open in Shopify admin →
                </a>
              ) : (
                <button
                  type="button"
                  onClick={pushToShopify}
                  disabled={shopifyPushing}
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold bg-slate-900 text-white hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {shopifyPushing ? "Pushing to Shopify…" : "Push to Shopify"}
                </button>
              )}

              {shopifyError && (
                <p className="text-sm text-red-600">{shopifyError}</p>
              )}
            </div>
          )}

          {/* Add images to an existing product */}
          {images.some((i) => i !== null) && !running && (
            <div className="pp-card p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-slate-900">
                Add images to an existing product
              </h2>
              <p className="text-xs text-slate-500">
                For topping up a product that already exists in Shopify. Paste the product ID
                or the admin URL.
              </p>
              <input
                type="text"
                className="pp-input"
                placeholder="e.g. 8123456789012 or https://admin.shopify.com/store/…/products/8123456789012"
                value={existingProductRef}
                onChange={(e) => setExistingProductRef(e.target.value)}
              />
              <button
                type="button"
                onClick={addImagesToExistingProduct}
                disabled={shopifyPushing || !existingProductRef.trim()}
                className="w-full rounded-xl px-4 py-3 text-sm font-bold bg-slate-900 text-white hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shopifyPushing
                  ? "Uploading images…"
                  : `Add ${images.filter(Boolean).length} image(s) to product`}
              </button>

              {existingUrl && (
                <a
                  href={existingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center rounded-xl px-4 py-3 text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Images added — open in Shopify admin →
                </a>
              )}

              {existingError && (
                <p className="text-sm text-red-600">{existingError}</p>
              )}
            </div>
          )}

          {/* Images */}
          {hasResults && (
            <div className="pp-card p-5">
              <h2 className="text-sm font-extrabold text-slate-900 mb-3">Lifestyle Images</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs text-slate-500 font-semibold truncate">
                      {i + 1}. {recipeLabels[i]}
                    </p>
                    <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                      {img ? (
                        <img
                          src={`data:${img.mimeType};base64,${img.imageBase64}`}
                          alt={recipeLabels[i]}
                          className="w-full h-full object-cover"
                        />
                      ) : imageErrors[i] ? (
                        <p className="text-xs text-red-500 p-2 text-center">{imageErrors[i]}</p>
                      ) : (
                        <p className="text-xs text-slate-400">
                          {running ? "Generating…" : "Not started"}
                        </p>
                      )}
                    </div>
                    {img && (
                      <button
                        type="button"
                        onClick={() => downloadImage(img, i)}
                        className="w-full text-xs font-semibold text-slate-600 underline hover:text-slate-900"
                      >
                        Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
