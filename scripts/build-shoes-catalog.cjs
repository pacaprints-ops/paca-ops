// Builds the family shoes option list + preview pictures for the customer form.
//
// Run:  node scripts/build-shoes-catalog.cjs "<Downloads folder holding '1 Dad', '2 Mom', '3 Child', '4 Child', '5 Baby'>"
// Needs the `sharp` package available (npm i -D sharp, or NODE_PATH pointing at one).
//
// Writes:
//   app/personalise/shoes/catalog.json   — every option the form offers, with its Drive file path
//   public/shoes/<id>.webp                — preview pictures (skipped if already there)
//
// The Drive copy lives in "All family designs/Family shoes print/<dad|mum|child|baby>/<legs|shoes>/".
// Each set has 5 leg skin tones (Legs (1) lightest … Legs (5) darkest) and the same 68 shoe designs.
// The child has two poses: crossed (set 3) and open (set 4); in Drive the open legs are Legs (6)–(10).

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const [SRC] = process.argv.slice(2);
if (!SRC) {
  console.error("Usage: node scripts/build-shoes-catalog.cjs <folder holding the five downloaded sets>");
  process.exit(1);
}
const APP = path.join(__dirname, "..");
const THUMBS = path.join(APP, "public", "shoes");
fs.mkdirSync(THUMBS, { recursive: true });

const DRIVE = "Family shoes print";
const SHOES = 68;
// Shoe designs not offered (picture check). Numbers are the same across every set.
const HIDE_SHOES = [];

const sets = [
  { type: "Man", pose: "crossed", local: "1 Dad", drive: "dad", shoe: "Shoes 1", legOffset: 0 },
  { type: "Woman", pose: "crossed", local: "2 Mom", drive: "mum", shoe: "Shoes 2", legOffset: 0 },
  { type: "Child", pose: "crossed", local: "3 Child", drive: "child", shoe: "Shoes 3", legOffset: 0 },
  { type: "Child", pose: "open", local: "4 Child", drive: "child", shoe: "Shoes 4", legOffset: 5 },
  { type: "Baby", pose: "open", local: "5 Baby", drive: "baby", shoe: "Shoes 5", legOffset: 0 },
];

const idOf = (p) => crypto.createHash("md5").update(p).digest("hex").slice(0, 12);
const jobs = [];
function item(localFile, drivePath, extra) {
  if (!fs.existsSync(localFile)) throw new Error("Missing file: " + localFile);
  const id = idOf(drivePath);
  jobs.push({ localFile, id });
  return { id, file: drivePath, ...extra };
}

async function avgColour(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4 * 9) if (data[i + 3] > 200) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

(async () => {
  const people = {};
  for (const s of sets) {
    const dir = path.join(SRC, s.local);
    const legs = [];
    for (let k = 1; k <= 5; k++) {
      legs.push(item(path.join(dir, `Legs (${k}).png`), `${DRIVE}/${s.drive}/legs/Legs (${k + s.legOffset}).png`, { code: `S${k}` }));
    }
    const shoes = [];
    for (let n = 1; n <= SHOES; n++) {
      if (HIDE_SHOES.includes(n)) continue;
      shoes.push(item(path.join(dir, `${s.shoe} (${n}).png`), `${DRIVE}/${s.drive}/shoes/${s.shoe} (${n}).png`, { code: n }));
    }
    ((people[s.type] ||= { poses: {} }).poses[s.pose] = { legs, shoes });
  }

  // Skin swatches come from the adult man's legs (same five tones in every set)
  const skins = [];
  for (let k = 1; k <= 5; k++) skins.push({ code: `S${k}`, hex: await avgColour(path.join(SRC, "1 Dad", `Legs (${k}).png`)) });

  const catalog = { builtAt: new Date().toISOString().slice(0, 10), maxPeople: 8, skins, people };
  const out = path.join(APP, "app", "personalise", "shoes", "catalog.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(catalog));

  let made = 0;
  for (const { localFile, id } of jobs) {
    const dest = path.join(THUMBS, id + ".webp");
    if (fs.existsSync(dest)) continue;
    await sharp(localFile).trim().resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 74 }).toFile(dest);
    made++;
  }
  console.log(`catalog: ${jobs.length} options, ${made} new pictures -> ${path.relative(APP, out)}`);
})();
