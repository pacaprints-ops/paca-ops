const F = "https://drive.google.com/drive/folders/";
const FILE = "https://drive.google.com/file/d/";
const v = (id: string) => FILE + id + "/view";

export const FOLDERS = {
  root:           F + "12nH9wanF1fMgQehh-vxHKQAfGlQgkczM",
  ribbons:        F + "1QL-n7nLqU0ZyjMxW7SkemV1xZKRUT1rz",
  backgrounds:    F + "1Hdd5TE92bucx3q-tKJkA3fFwpEfOKAYo",
  angelAcc:       F + "1UtTGU0-WpRrfc4P_xW-y5MGDIXDYQgrH",
  dogs:           F + "1Y8Aqi0Fwq92RLhVC89m_FTC4d39mkYa6",
  cats:           F + "1vXdPWChfJIJAz8RcBG5q02IuO-Fwr6gv",

  dad:            F + "16fuwkjPpkkrqWgjbs_r8lOvpTRdUAEdV",
  dadHair:        F + "1wMQhyLYEd6slHgAju-6yZsVm4J-Mg08b",
  dadBodySkin:    F + "1Qmdbnt1_9UiBoMgOlvPs9zRi_CeRcUTs",
  dadJeans:       F + "1Vt4IJWfN3B_DiZeTpPCQlJu2-Z8WCfU0",
  dadHoodie:      F + "1yTtoB0shL30JiM7tCfCJCQB1OljDi6g7",
  dadTshirt:      F + "1QRVmEIIwKY4XN8EAMwp5xKf_knzpuTOD",

  mum:            F + "1qw1fZZUz1M6x7WeMpIoghyBMWEnoibTX",
  mumHair:        F + "1f_QIIImtfRf4ijXoepKr6gJ3cxwhxzXl",
  mumSets:        F + "1D-jD-TFu70KYbanxeKxbBXbIhVpKKVkt",
  mumJeans:       F + "1CnSMg2CYI_kr2M04In-EE44lYbROM94i",
  mumDress:       F + "18XbD4C3zzwDysXGJr8yqdwkycXb8c9AE",
  mumTopWavy:     F + "1Z26jjaZO9uwFmt3Js6OTnDxUu_aVpEK0",
  mumTopSummer:   F + "1CCI-6aGB5HMiwY3HxRDLwSbMT7ZxcCkJ",
  mumTopStyled:   F + "1wQ92Sum7ewAVM4wDsBv-2fjGDhsgPYvN",
  mumSkirt:       F + "1b26JuaIiQWVSJO6bpZoZroX3FH5Ldudo",

  girl:           F + "1hR3IPfKMV5e8v6icHhE2vATqxoYWne1o",
  girlHair:       F + "1cjfKbdlu0kyCDNLkb4T8djIgY6bgubjP",
  girlBody:       F + "1hZ9jjOVFmfs__aPhnOQczaL-zd-wtsQC",
  girlDress:      F + "1L87kVoJHStDYvk9XIK-KoK4Ae6P504y_",
  girlJeans:      F + "1rOxwUqcaK2FN214ScTEvDLKCgh6DkFLF",

  boy:            F + "19OjysoA2r4y5pV1wgedWhR_F3g3qaFo8",
  boyHair:        F + "1wQxCTngyIVEVk2cySbOQqfFe5mqfxU4E",
  boyBody:        F + "10nb_fQhbwplOTq296rHc1uEu2Ryv_TlM",
  boyJeans:       F + "1hpJTU-4QVabqdOxg6bOpoQwB0NSB-DBE",
  boyTshirt:      F + "1P_5LAkzrBg9lYDTS19_HPxn7mV_wYv-E",
  boyHoodie:      F + "1ME0_srE4syReVBqD7WSs93YXWR5Rgj5o",

  baby:           F + "1GqYV9Vu-Ykw9KFLByO46Ez1wLXvWWiAH",
};

// Mum hair style subfolders — keyed by the style NUMBER the customer gives (e.g. "13M" → style 13)
const MUM_HAIR: Record<number, { id: string; name: string }> = {
  1:  { id: "1xRNC1Lz8goIUqNzrRp5i9CXJ2dwTCOH3", name: "Buns Wavy" },
  2:  { id: "1prEcXbwtn0L260mBCt9CMplvZMWLsf4t", name: "Long Wavy" },
  4:  { id: "1B9evkkBmzk-Dg7FbQpA2eCezuNnGyLD0", name: "Medium Wavy" },
  6:  { id: "1j5onyluxvZsjZaspYYYj9nrz_LlTlmFo", name: "Medium Curly" },
  8:  { id: "18FxsxGBVgvMnOhPLMN1RHb1rtJaHK3u-", name: "Bun High Messy" },
  9:  { id: "1MSW5VXbEFVsTI-7H-HA-buYDtCiIGtSY", name: "Bun Low Styled" },
  10: { id: "1lgZupUM4i7v28DK7KLZD7xHtMha66Tut", name: "Long Straight" },
  11: { id: "1SmP4lsxl4ZLX26MmfGZyAL7dsjoqa2jT", name: "Long Wavy Styled" },
  12: { id: "1Yo9sh4h5792LzPXOUXXzZNDdSOYl91aZ", name: "Medium Straight" },
  13: { id: "1nN7jpqc3Jb0CEyyV7GKxDP_4_sWU3lVl", name: "Long Curly Styled" },
  14: { id: "1SfR9gW-xh7OR06ZkUVlxfq7hxz4Mpm7K", name: "Medium Side Braid" },
  15: { id: "1KMpfougK-daV8joXIDHldLFa6XqkAhY7", name: "Braided Messy" },
  16: { id: "1iW0Kk875gOdOMAVq6wFMTVydYTswavpI", name: "Braided Double Low" },
  17: { id: "11GTAbAqb9TysaW7DKa7X7f9zaU1zSi7Q", name: "Medium Curly Braid" },
  19: { id: "1KCZoJNq9iUHZ2fbQ6C0N8oRn4vrVoeCX", name: "Long Straight Braid" },
  20: { id: "1O7_wKYUnPMWlTfq6aLm2AVg_EV0MiDox", name: "Braided Double French" },
  21: { id: "1rl2w708G_5ZzjNElRaUOwu5HQoLY25Wr", name: "Braided Single Medium" },
  22: { id: "1hcFp8npp-oxejJ_rVuj8OXGZLkr0DviD", name: "Afro Defined Curls" },
  25: { id: "1PmfvOKAYEdurXHV455dR2B4yBhFX1Gi6", name: "Medium Wavy Beach" },
  26: { id: "1ssHVUxUabdnk9QG4rNwoDsJRwGlnuRGo", name: "Medium Very Curly" },
};

// All known direct file links
export const FILES: Record<string, string> = {
  // Dad jeans
  "man_J2":  v("1VeceY8eENEfm3IGMpY9xUSNlnfaaijr2"),
  "man_J5":  v("1Cl2h7Yyrz-j344DS-F6FPFnA9GoseF_h"),
  "man_J19": v("1AuOHODYNRuVdgTMNCnG6ZuwvCsr1J-pl"),

  // Dad t-shirts
  "man_T1":  v("1XAx1W6MOdsTK48X7F2uxfJq9S8mZ4UVw"),
  "man_T2":  v("1gMD6gH-n93gCkRih0TAzJRTxiLjKhNRS"),
  "man_T3":  v("1L6AUiJ66y-T1eKGTteZmlneC0rdC_L1V"),
  "man_T9":  v("1IXHsnPPiCEHKc1P1-byHyiSbRQPGkp5j"),
  "man_T14": v("13Sjub0wbD1g0hJCXmdpqjIMLGZz-17Mu"),
  "man_T23": v("1u4GuhTp9U3YipECinREO72sEsN_3hZWA"),

  // Dad hoodies
  "man_H1":  v("1u_J5JmElUZeflCerd01YZkbjdL6m32T1"),
  "man_H3":  v("1PBzUl8nS4FQ1b_73tPTv5k4ZS_jzFGJW"),
  "man_H8":  v("1fzrqBnN9bP8r1bXzmTTd04r7_eKlSgKI"),
  "man_H13": v("1KSNboGlVzqUg8N15xWTBtLcRDRYEn5vd"),
  "man_H23": v("1vuL8MXxD7vAkU02SxvWB8blbEY3oZCd3"),
  "man_H30": v("1CRZR2mVTVeoTn-7zJFDtsAtwMaSo93GJ"),

  // Mum jeans
  "woman_J1":  v("12FBA6w4n_4PXpth4hYCx8D_yY481yHcC"),
  "woman_J2":  v("1t42KYatveiJrBN32o6daVp0EhrJLvYXZ"),
  "woman_J10": v("1M5-2_G8f8cIzSXY25Slq5HFYNQD2ieOM"),

  // Girl jeans
  "girl_J3":  v("131LiKETPY-O9X6xB-NJyR9ceMeGT8u-e"),
  "girl_J11": v("10oSNbmSkUXE35dSI9V0A06KEh4jeRCcR"),
  "girl_J15": v("1on5r8EWrQ8ue-pFp9VywIqAcqE_6lqI5"),
  "girl_J17": v("1zA_xe-ht-BoZg9BqQS-iga00DJ2OQXeS"),
};

export type PersonType = "man" | "woman" | "girl" | "boy" | "baby";

export function detectPerson(line: string): PersonType {
  const l = line.toLowerCase();
  if (/baby/.test(l)) return "baby";
  if (/\bgirl\b/.test(l)) return "girl";
  if (/\bboy\b/.test(l)) return "boy";
  if (/female|woman|mum|mom|wife|2nd adult|adult 2|adult female/.test(l)) return "woman";
  if (/male|man|dad|husband|1st adult|adult 1|adult male/.test(l)) return "man";
  return "man";
}

export type CodeResult = {
  code: string;
  label: string;
  folder: string;
  url: string;
  isDirect: boolean;
};

export function resolveCode(rawCode: string, person: PersonType): CodeResult {
  const c = rawCode.toUpperCase();
  const miss = (label: string, folder: string, url: string): CodeResult =>
    ({ code: c, label, folder, url, isDirect: false });
  const hit = (label: string, folder: string, url: string): CodeResult =>
    ({ code: c, label, folder, url, isDirect: true });

  // Helper: check FILES map first, fall back to folder
  function jeans(folderUrl: string, folderLabel: string): CodeResult {
    const key = `${person}_${c}`;
    return FILES[key]
      ? hit("Jeans", folderLabel, FILES[key])
      : miss("Jeans", folderLabel, folderUrl);
  }
  function hoodie(folderUrl: string, folderLabel: string): CodeResult {
    const key = `${person}_${c}`;
    return FILES[key]
      ? hit("Hoodie", folderLabel, FILES[key])
      : miss("Hoodie", folderLabel, folderUrl);
  }
  function tshirt(folderUrl: string, folderLabel: string): CodeResult {
    const key = `${person}_${c}`;
    return FILES[key]
      ? hit("T-shirt", folderLabel, FILES[key])
      : miss("T-shirt", folderLabel, folderUrl);
  }

  // ── Skin tone S1–S4 ──────────────────────────────────
  if (/^S[1-4]$/.test(c)) {
    if (person === "man")   return miss("Skin tone", "Dad › Body & Skin", FOLDERS.dadBodySkin);
    if (person === "woman") return miss("Skin tone", "Mum › Sets", FOLDERS.mumSets);
    if (person === "girl")  return miss("Skin tone", "Kids › Girl › Body", FOLDERS.girlBody);
    if (person === "boy")   return miss("Skin tone", "Kids › Boy › Body", FOLDERS.boyBody);
    if (person === "baby")  return miss("Skin tone", "Kids › Baby", FOLDERS.baby);
  }

  // ── Jeans J + number (not JR = Jack Russell) ─────────
  if (/^J\d+$/.test(c)) {
    if (person === "man")   return jeans(FOLDERS.dadJeans,  "Dad › Clothes › Jeans");
    if (person === "woman") return jeans(FOLDERS.mumJeans,  "Mum › Sets › Jeans");
    if (person === "girl")  return jeans(FOLDERS.girlJeans, "Kids › Girl › Jeans");
    if (person === "boy")   return jeans(FOLDERS.boyJeans,  "Kids › Boy › Jeans");
    if (person === "baby")  return miss("Jeans", "Kids › Baby", FOLDERS.baby);
  }

  // ── Suspenders JS + number ───────────────────────────
  if (/^JS\d+$/.test(c)) {
    return miss("Suspenders", "Kids › Boy › Jeans", FOLDERS.boyJeans);
  }

  // ── Hoodie H + number (men & boys) ───────────────────
  if (/^H\d+$/.test(c)) {
    if (person === "man")   return hoodie(FOLDERS.dadHoodie,  "Dad › Clothes › Hoodie");
    if (person === "boy")   return hoodie(FOLDERS.boyHoodie,  "Kids › Boy › Hoodie");
    if (person === "woman") return miss("Hair", "Mum › Hair", FOLDERS.mumHair);
    if (person === "girl")  return miss("Hair", "Kids › Girl › Hair", FOLDERS.girlHair);
    if (person === "baby")  return miss("Hair", "Kids › Baby", FOLDERS.baby);
  }

  // ── T-shirt T + number ───────────────────────────────
  if (/^T\d+$/.test(c)) {
    if (person === "man")   return tshirt(FOLDERS.dadTshirt,  "Dad › Clothes › T-shirt");
    if (person === "boy")   return tshirt(FOLDERS.boyTshirt,  "Kids › Boy › T-shirt");
    if (person === "woman") return miss("T-shirt", "Mum › Sets", FOLDERS.mumSets);
    if (person === "girl")  return miss("T-shirt", "Kids › Girl › Body & Clothes", FOLDERS.girlBody);
    if (person === "baby")  return miss("Babygrow", "Kids › Baby", FOLDERS.baby);
  }

  // ── Dress D + number ─────────────────────────────────
  if (/^D\d+$/.test(c)) {
    if (person === "woman") return miss("Dress", "Mum › Sets › Dress", FOLDERS.mumDress);
    if (person === "girl")  return miss("Dress", "Kids › Girl › Dress", FOLDERS.girlDress);
    if (person === "baby")  return miss("Babygrow", "Kids › Baby", FOLDERS.baby);
  }

  // ── Top / babygrow P + number ────────────────────────
  if (/^P\d+$/.test(c)) {
    if (person === "woman") return miss("Top", "Mum › Sets", FOLDERS.mumSets);
    if (person === "girl")  return miss("Top", "Kids › Girl › Body & Clothes", FOLDERS.girlBody);
    if (person === "baby")  return miss("Babygrow / Top", "Kids › Baby", FOLDERS.baby);
    if (person === "man")   return miss("Top", "Dad › Clothes", FOLDERS.dadTshirt);
  }

  // ── Ribbon R + number ────────────────────────────────
  // Ribbons folder files are named by colour (Pink, Red, etc.) not by code
  // Just open the ribbons folder
  if (/^R\d+$/.test(c)) {
    return miss("Ribbon", "Ribbons", FOLDERS.ribbons);
  }

  // ── Hair: number + letter(s) e.g. 4A, 13M ────────────
  if (/^\d{1,2}[A-Z]{1,2}$/.test(c)) {
    if (person === "woman") {
      const styleNum = parseInt(c.match(/^(\d{1,2})/)?.[1] ?? "0", 10);
      const colourCode = c.replace(/^\d{1,2}/, ""); // e.g. "M" from "13M"
      const sub = MUM_HAIR[styleNum];
      return sub
        ? miss(
            `Hair style ${styleNum} · look for "${colourCode}" file`,
            `Mum › Hair › ${styleNum}. ${sub.name}`,
            F + sub.id
          )
        : miss("Hair colour/style", "Mum › Hair", FOLDERS.mumHair);
    }
    if (person === "man")   return miss("Hair colour/style", "Dad › Hairstyles", FOLDERS.dadHair);
    if (person === "girl")  return miss("Hair colour/style", "Kids › Girl › Hair", FOLDERS.girlHair);
    if (person === "boy")   return miss("Hair colour/style", "Kids › Boy › Hairstyles", FOLDERS.boyHair);
    if (person === "baby")  return miss("Hair colour/style", "Kids › Baby", FOLDERS.baby);
  }

  // ── Body base B codes ─────────────────────────────────
  if (/^B[0-9A-E]$/.test(c) || /^BD$|^BC$|^B0$|^B1$/.test(c)) {
    if (person === "woman") return miss("Body base", "Mum › Sets", FOLDERS.mumSets);
    if (person === "man")   return miss("Body base", "Dad › Body & Skin", FOLDERS.dadBodySkin);
  }

  // ── Dog / Cat ─────────────────────────────────────────
  if (/^(JR[1-3]|C[1-4]|F[1-5]|PUG?[1-4]|G[1-4]|L[1-4]|BC[1-3]|H[1-3])$/.test(c)) {
    return miss("Dog", "Dogs", FOLDERS.dogs);
  }
  if (/^(B[1-5]|BM[1-3]|D[1-5]|A[1-2]|M[1-5]|SM[1-3]|R[1-4]SX?|S[1-5])$/.test(c)) {
    return miss("Cat", "Cats", FOLDERS.cats);
  }
  if (/^M[12]$/.test(c)) {
    return miss("Cat (Maine Coon)", "Cats", FOLDERS.cats);
  }

  // ── Fallback ──────────────────────────────────────────
  return {
    code: c,
    label: "Unknown",
    folder: "Search Drive",
    url: `https://drive.google.com/drive/search?q=${encodeURIComponent(c)}`,
    isDirect: false,
  };
}

export function parseLine(line: string): { personLabel: string; person: PersonType; codes: string[] } {
  const person = detectPerson(line);
  const upper = line.toUpperCase();

  // Extract codes — case-insensitive by working on uppercased line
  const codes = (upper.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]{0,2}|\d{1,2}[A-Z]{1,2})\b/g) ?? [])
    .filter((c) => !/^\d+$/.test(c)); // remove pure numbers (ages)

  // Person label = everything before the first code in the original line
  const firstCodeIndex = codes.length
    ? upper.indexOf(codes[0])
    : line.length;
  const personLabel = line.slice(0, firstCodeIndex).trim().replace(/[,\s]+$/, "") ||
    line.split(/\s+/).slice(0, 3).join(" ");

  return { personLabel, person, codes };
}
