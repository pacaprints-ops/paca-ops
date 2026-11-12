// Builds the family-portrait option list + small preview pictures for the customer form.
//
// Run:  node scripts/build-portrait-catalog.cjs "<path to extracted 'All family designs'>" "<hair-catalog.json>"
// Needs the `sharp` package available (npm i -D sharp, or NODE_PATH pointing at one).
//
// Writes:
//   app/personalise/portrait/catalog.json   — every option the form offers, with its Drive file path
//   public/portrait/<id>.webp                — preview pictures (skipped if already there)
//
// What is offered comes from Carrie's "Sitting Down Family Prints" list (Untitled document.docx
// in the Drive folder) and the hair colour review (hair-catalog.json, "Don't offer" removed).

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const [ROOT, HAIR_JSON] = process.argv.slice(2);
if (!ROOT || !HAIR_JSON) {
  console.error("Usage: node scripts/build-portrait-catalog.cjs <All family designs dir> <hair-catalog.json>");
  process.exit(1);
}
const APP = path.join(__dirname, "..");
const THUMBS = path.join(APP, "public", "portrait");
fs.mkdirSync(THUMBS, { recursive: true });

const idOf = (rel) => crypto.createHash("md5").update(rel).digest("hex").slice(0, 12);
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const pretty = (s) => s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/Ponytale/g, "Ponytail").replace(/Bund/g, "Buns").trim();

const jobs = [];
function item(rel, extra = {}) {
  if (!exists(rel)) throw new Error("Missing file: " + rel);
  const id = idOf(rel);
  jobs.push({ rel, id });
  return { id, file: rel, ...extra };
}
const codes = (dir, list, label, extra = {}) =>
  list.map((code) => item(`${dir}/${code}.png`, { code, label: `${label} ${code}`, ...extra }));

// ---------- Hair (from the colour review) ----------
const hairRows = JSON.parse(fs.readFileSync(HAIR_JSON, "utf8")).filter((h) => h.family !== "Don't offer");
const hair = {};
for (const h of hairRows) {
  (hair[h.person] ||= []).push(item(h.file, { style: pretty(h.style), colour: h.family }));
}

// ---------- Clothes (offered codes) ----------
const DAD = "Dad/Clothes", MUM = "Mum/Sets", BOY = "Kids/Boy/Cloths", GIRL = "Kids/Girl", BABY = "Kids/Baby/Clothes";
const MUM_D = "Mum/Sets/Body D use this/TShirtForBodyD";
const MUM_C_SCP = "Family Scp design/women/tshirts/tshirt for arm out";

const people = {
  Man: {
    hair: hair.Man,
    tops: [
      ...codes(`${DAD}/TShirt`, ["T1", "T2", "T3", "T9", "T14", "T23"], "T-shirt", { kind: "T-shirt" }),
      ...codes(`${DAD}/Hoodie`, ["H1", "H3", "H8", "H13", "H23", "H30"], "Hoodie", { kind: "Hoodie" }),
    ],
    bottoms: codes(`${DAD}/Jeans`, ["J2", "J5", "J19"], "Jeans", { kind: "Jeans" }),
    dresses: [],
  },
  Woman: {
    hair: hair.Woman,
    // T-shirts come in two cuts: "arms in" (2nd adult, body D) and "arm out" (1st adult, body C).
    // The customer only picks the colour; the right cut is chosen from where they sit.
    tops: [
      ...["T1", "T2", "T3", "T4", "T5", "T6"].map((code, i) =>
        item(`${MUM_D}/${code}.png`, {
          code, label: `T-shirt ${code}`, kind: "T-shirt",
          fileArmOut: `${MUM_C_SCP}/t${i + 1}.png`,
        })),
      ...codes(`${MUM}/WavyTop`, ["P1", "P2", "P4", "P6", "P8", "P10"], "Top", { kind: "Top" }),
    ],
    bottoms: codes(`${MUM}/Jeans`, ["J1", "J2", "J10"], "Jeans", { kind: "Jeans" }),
    dresses: codes(`${MUM}/Dress`, ["D4", "D6", "D12", "D13", "D14", "D15"], "Dress", { kind: "Dress" }),
  },
  Girl: {
    hair: hair.Girl,
    tops: codes(`${GIRL}/Body and specific body clothes/TshirtForBodyAandD`, ["T1", "T2", "T3", "T4", "T5", "T6", "T7"], "T-shirt", { kind: "T-shirt" }),
    bottoms: codes(`${GIRL}/Jeans`, ["J3", "J11", "J15", "J17"], "Jeans", { kind: "Jeans" }),
    dresses: codes(`${GIRL}/Dress`, ["D1", "D2", "D4", "D6", "D8", "D9"], "Dress", { kind: "Dress" }),
    ribbons: Array.from({ length: 14 }, (_, i) =>
      item(`Family Scp design/girl/ribbon/r${i + 1}.png`, { code: `R${i + 1}`, label: `Ribbon R${i + 1}`, kind: "Ribbon" })),
  },
  Boy: {
    hair: hair.Boy,
    tops: [
      ...codes(`${BOY}/Tshirt/TShirtForBodyCandD`, ["T1", "T2", "T3", "T4", "T5", "T6"], "T-shirt", { kind: "T-shirt" }),
      // Hoodies 4–6 are saved as T4/T5/T6.png inside the hoodie folder
      ...["H1", "H2", "H3", "T4", "T5", "T6"].map((f, i) =>
        item(`${BOY}/Hoodie/HoodieForBodyCandD/${f}.png`, { code: `H${i + 1}`, label: `Hoodie H${i + 1}`, kind: "Hoodie" })),
    ],
    bottoms: [
      ...codes(`${BOY}/Jeans`, ["J1", "J2", "J3"], "Jeans", { kind: "Jeans" }),
      ...codes(`${BOY}/Jeans`, ["JS1", "JS2", "JS3"], "Jeans with braces", { kind: "Jeans with braces" }),
    ],
    dresses: [],
  },
  Baby: {
    hair: hair.Baby,
    tops: codes(`${BABY}/OnePiece`, ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"], "Babygrow", { kind: "Babygrow" }),
    bottoms: [],
    dresses: [],
  },
};

// ---------- Bodies / skin (S1 lightest … S4 darkest) ----------
// Men's folders B0–B4 are skin tones (letter = pose); everyone else: number = skin, letter = pose.
const bodies = {
  Man: {
    first: ["Dad/Body & Skin/B0/B0 - USE THIS BODY.png", "Dad/Body & Skin/B1/skincolor1e.png", "Dad/Body & Skin/Body2/skincolor2e.png", "Dad/Body & Skin/Body4/skincolor4e.png"],
    other: ["Dad/Body & Skin/B0/skincolor0d.png", "Dad/Body & Skin/B1/skincolor1d.png", "Dad/Body & Skin/Body2/skincolor2d.png", "Dad/Body & Skin/Body4/skincolor4d.png"],
  },
  Woman: {
    first: [1, 2, 3, 4].map((s) => `Mum/Sets/Body C  - use this one if its first adult/Body & Skin/bodyskin${s}c.png`),
    // Body D has no skin-2 file — fall back to body C for S2
    other: [1, 2, 3, 4].map((s) => s === 2 ? `Mum/Sets/Body C  - use this one if its first adult/Body & Skin/bodyskin2c.png` : `Mum/Sets/Body D use this/Skin & Body/bodyskin${s}d.png`),
  },
  Boy: { other: [1, 2, 3, 4].map((s) => `Kids/Boy/Body/BodyC/skincolor${s}c.png`) },
  Girl: { other: [1, 2, 3, 4].map((s) => `Kids/Girl/Body and specific body clothes/BodyD/Body/skincolor${s}d.png`) },
  Baby: { other: [1, 2, 3, 4].map((s) => `Kids/Baby/Body & Skin/skincolor${s}.png`) },
};
for (const b of Object.values(bodies)) for (const list of Object.values(b)) list.forEach((f) => { if (!exists(f)) throw new Error("Missing body: " + f); });

const skins = [
  { code: "S1", hex: "#f5cba7" },
  { code: "S2", hex: "#d08c60" },
  { code: "S3", hex: "#a85a32" },
  { code: "S4", hex: "#6e2e1a" },
];

// ---------- Pets ----------
function petGroup(dir) {
  return fs.readdirSync(path.join(ROOT, dir)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((folder) => {
    const breed = pretty(folder.replace(/^\d+/, "").replace(/Cat$/, "").replace(/Chichuahua/, "Chihuahua").replace(/Shorhair/, "Shorthair").replace(/Iggy/, "Italian Greyhound"));
    const files = fs.readdirSync(path.join(ROOT, dir, folder)).filter((f) => /\.png$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return { breed, variants: files.map((f) => item(`${dir}/${folder}/${f}`, { label: `${breed} ${f.replace(/\D/g, "") || ""}`.trim() })) };
  }).sort((a, b) => a.breed.localeCompare(b.breed));
}
const pets = { Dog: petGroup("Dogs"), Cat: petGroup("Cats") };

const catalog = { builtAt: new Date().toISOString().slice(0, 10), skins, people, bodies, pets };
const out = path.join(APP, "app", "personalise", "portrait", "catalog.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(catalog));

(async () => {
  let made = 0;
  for (const { rel, id } of jobs) {
    const dest = path.join(THUMBS, id + ".webp");
    if (fs.existsSync(dest)) continue;
    await sharp(path.join(ROOT, rel)).trim().resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 74 }).toFile(dest);
    made++;
  }
  console.log(`catalog: ${jobs.length} options, ${made} new pictures -> ${path.relative(APP, out)}`);
})();
