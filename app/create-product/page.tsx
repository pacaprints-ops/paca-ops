"use client";

import { useRef, useState } from "react";

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
    if (!productName.trim()) {
      alert("Please enter a product name.");
      return;
    }
    if (!imageFile) {
      alert("Please upload the product front image.");
      return;
    }

    setRunning(true);
    setCopy(null);
    setImages([null, null, null, null, null]);
    setCopyError("");
    setImageErrors(["", "", "", "", ""]);

    // Step 1: Generate copy
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

    // Step 2: Generate 5 images one by one
    const { base64, mimeType } = await fileToBase64(imageFile);

    for (let i = 0; i < 5; i++) {
      setStatus(`Generating image ${i + 1} of 5 — ${recipeLabels[i]}…`);
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

    setStatus("Done!");
    setRunning(false);
  }

  function downloadImage(img: GeneratedImage, index: number) {
    const a = document.createElement("a");
    a.href = `data:${img.mimeType};base64,${img.imageBase64}`;
    a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}-image-${index + 1}.png`;
    a.click();
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
            {/* Image upload */}
            <div>
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
                Product name / title hint *
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
              {running ? status : "Generate"}
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
