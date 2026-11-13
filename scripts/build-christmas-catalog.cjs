// Builds the Christmas family option list + preview pictures for the customer form.
//
// Run:  node scripts/build-christmas-catalog.cjs "<folder holding the unzipped MAN, WOMAN_TOPS, CHILDREN, HAIR, CATS_DOGS folders>"
// Needs the `sharp` package available (npm i -D sharp, or NODE_PATH pointing at one).
//
// Writes:
//   app/personalise/christmas/catalog.json  — every option the form offers, with its Drive file path(s)
//   public/xmas/<id>.webp                    — preview pictures (hair, pets, jumper swatches; skipped if already there)
//
// Drive copy: "All family designs/Christmas family/<Man|women|children|man hair|women hair|kids hair|pets>/".
// People already wear their jumper, so the customer only picks skin (2 tones) + jumper colour; the Drive folder
// gets every pose (adults) / every child body for that combo and we choose which to use.

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const [SRC] = process.argv.slice(2);
if (!SRC) {
  console.error("Usage: node scripts/build-christmas-catalog.cjs <folder holding the unzipped sets>");
  process.exit(1);
}
const APP = path.join(__dirname, "..");
const THUMBS = path.join(APP, "public", "xmas");
fs.mkdirSync(THUMBS, { recursive: true });

const DRIVE = "Christmas family";
const LOCAL_TO_DRIVE = {
  MAN: "Man", WOMAN_TOPS: "women", CHILDREN: "children",
  "HAIR/MAN": "man hair", "HAIR/WOMAN": "women hair", "HAIR/CHILD": "kids hair", CATS_DOGS: "pets",
};
const SKINS = [{ code: "light", file: "WHITE", label: "Lighter" }, { code: "dark", file: "BLACK", label: "Darker" }];
const ADULT_JUMPERS = [
  { code: "red", file: "RED", label: "Red" }, { code: "green", file: "GREEN", label: "Green" },
  { code: "blue", file: "BLUE", label: "Blue" }, { code: "orange", file: "ORANGE", label: "Orange" },
];
const CHILD_JUMPERS = [
  ...ADULT_JUMPERS,
  { code: "red-plain", file: "RED_PLAIN", label: "Plain red" }, { code: "white-plain", file: "WHITE_PLAIN", label: "Plain white" },
];
const CHILD_BODIES = [{ prefix: "CHILD_3_", label: "baby" }, { prefix: "CHILD_", label: "small" }, { prefix: "CHILD2_", label: "older" }];

const idOf = (p) => crypto.createHash("md5").update(p).digest("hex").slice(0, 12);
const coll = new Intl.Collator(undefined, { numeric: true });
const nice = (f) => f.replace(/\.png$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase().replace(/^./, (c) => c.toUpperCase());

/** First existing file among candidates in a local set; returns its Drive path. */
function pick(localDir, names) {
  for (const n of names) {
    if (fs.existsSync(path.join(SRC, localDir, n))) return `${DRIVE}/${LOCAL_TO_DRIVE[localDir]}/${n}`;
  }
  throw new Error(`Missing in ${localDir}: ${names.join(" / ")}`);
}
const localOf = (drivePath) => {
  const [, folder, name] = drivePath.split("/");
  const local = Object.keys(LOCAL_TO_DRIVE).find((k) => LOCAL_TO_DRIVE[k] === folder);
  return path.join(SRC, local, name);
};

const jobs = []; // { localFile, id, kind: "fit" | "swatch" }
function listSet(localDir) {
  return fs.readdirSync(path.join(SRC, localDir)).filter((f) => /\.png$/i.test(f)).sort(coll.compare).map((f) => {
    const drive = `${DRIVE}/${LOCAL_TO_DRIVE[localDir]}/${f}`;
    const id = idOf(drive);
    jobs.push({ localFile: path.join(SRC, localDir, f), id, kind: "fit" });
    return { id, file: drive, label: nice(f) };
  });
}

(async () => {
  const bodies = { Man: {}, Woman: {}, Child: {} };
  for (const s of SKINS) {
    bodies.Man[s.code] = {}; bodies.Woman[s.code] = {}; bodies.Child[s.code] = {};
    for (const j of ADULT_JUMPERS) {
      bodies.Man[s.code][j.code] = [1, 2, 3].map((n) => ({
        label: `pose ${n}`,
        file: pick("MAN", [`MAN_${s.file}_${j.file}_TYPE_${n}.png`, `MAN_${s.file}_${j.file}_TYPE_${n}_.png`]),
      }));
      bodies.Woman[s.code][j.code] = [1, 2, 3].map((n) => ({
        label: `pose ${n}`,
        file: pick("WOMAN_TOPS", [`${j.file}_${s.file}_${n}.png`]),
      }));
    }
    for (const j of CHILD_JUMPERS) {
      bodies.Child[s.code][j.code] = CHILD_BODIES.map((b) => ({
        label: `${b.label} body`,
        file: pick("CHILDREN", [
          `${b.prefix}${s.file}_${j.file}.png`,
          // CHILD_3 darker skin + plain white is saved as CHILD_3_WHITE_BLACK_PLAIN
          ...(j.code === "white-plain" ? [`${b.prefix}WHITE_${s.file}_PLAIN.png`] : []),
        ]),
      }));
    }
  }

  // Jumper swatches: a crop of the pattern band, from the lighter-skin bodies
  const swatch = (drivePath, top = 0.3) => { const id = idOf("swatch:" + drivePath); jobs.push({ localFile: localOf(drivePath), id, kind: "swatch", top }); return id; };
  const jumpers = {
    adult: ADULT_JUMPERS.map((j) => ({ code: j.code, label: j.label, thumb: swatch(bodies.Man.light[j.code][1].file) })),
    child: CHILD_JUMPERS.map((j) => ({ code: j.code, label: j.label, thumb: swatch(bodies.Child.light[j.code][2].file, 0.5) })),
  };

  const hair = { Man: listSet("HAIR/MAN"), Woman: listSet("HAIR/WOMAN"), Child: listSet("HAIR/CHILD") };
  const pets = listSet("CATS_DOGS");

  // Skin swatch colours: average of the head area on the man's pose-2 body
  async function headColour(drivePath) {
    const img = sharp(localOf(drivePath)).trim();
    const meta = await img.clone().toBuffer({ resolveWithObject: true });
    const { width, height } = meta.info;
    const { data } = await sharp(meta.data).extract({ left: Math.round(width * 0.4), top: Math.round(height * 0.03), width: Math.round(width * 0.2), height: Math.round(height * 0.12) })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 220) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    const hex = (v) => Math.round(v / Math.max(n, 1)).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  const skins = [];
  for (const s of SKINS) skins.push({ code: s.code, label: s.label, hex: await headColour(bodies.Man[s.code].red[1].file) });

  const catalog = { builtAt: new Date().toISOString().slice(0, 10), maxMembers: 9, skins, jumpers, bodies, hair, pets };
  const out = path.join(APP, "app", "personalise", "christmas", "catalog.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(catalog));

  let made = 0;
  for (const { localFile, id, kind, top } of jobs) {
    const dest = path.join(THUMBS, id + ".webp");
    if (fs.existsSync(dest)) continue;
    if (kind === "swatch") {
      const { data, info } = await sharp(localFile).trim().toBuffer({ resolveWithObject: true });
      const w = Math.round(info.width * 0.44), h = Math.round(info.height * 0.3);
      await sharp(data).extract({ left: Math.round(info.width * 0.28), top: Math.round(info.height * top), width: w, height: h })
        .resize(140, 140, { fit: "cover" }).webp({ quality: 78 }).toFile(dest);
    } else {
      await sharp(localFile).trim().resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 74 }).toFile(dest);
    }
    made++;
  }
  const n = Object.values(hair).reduce((a, h) => a + h.length, 0) + pets.length;
  console.log(`catalog: ${n} hair/pet options, skins ${skins.map((s) => s.hex).join(" ")}, ${made} new pictures -> ${path.relative(APP, out)}`);
})();
