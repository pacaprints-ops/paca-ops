/**
 * Paca portrait folders — makes one Drive folder per portrait order holding
 * copies of exactly the design files the customer picked.
 * paca-ops calls this when a customer submits the portrait form.
 *
 * One-time setup (~5 minutes):
 *  1. https://script.google.com → New project → name it "Paca portrait folders".
 *  2. Paste this whole file in. Replace PASTE_SECRET_HERE with the secret Claude gave you. Save.
 *  3. Deploy → New deployment → cog icon → "Web app".
 *       Execute as: Me      Who has access: Anyone
 *     Click Deploy, allow access when Google asks, copy the "Web app URL".
 *  4. Give the Web app URL to Claude (it goes into paca-ops' settings).
 *
 * "Anyone" only means anyone with the URL *and* the secret — without the secret it does nothing.
 * Folders are created inside a Drive folder called "Portrait orders" (made automatically).
 */
const SECRET = "PASTE_SECRET_HERE";
const DESIGNS_ROOT_ID = "12nH9wanF1fMgQehh-vxHKQAfGlQgkczM"; // "All family designs"
const ORDERS_FOLDER_NAME = "Portrait orders";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return json({ error: "unauthorised" });

    const parent = ordersFolder();
    const existing = parent.getFoldersByName(body.folderName);
    const folder = existing.hasNext() ? existing.next() : parent.createFolder(body.folderName);

    const already = {};
    const have = folder.getFiles();
    while (have.hasNext()) already[have.next().getName()] = true;

    const root = DriveApp.getFolderById(DESIGNS_ROOT_ID);
    const cache = {};
    const missing = [];
    (body.files || []).forEach(function (f) {
      if (already[f.name]) return;
      const file = findByPath(root, f.path, cache);
      if (file) file.makeCopy(f.name, folder);
      else missing.push(f.path);
    });

    return json({ url: folder.getUrl(), missing: missing });
  } catch (err) {
    return json({ error: String(err) });
  }
}

function ordersFolder() {
  const found = DriveApp.getRootFolder().getFoldersByName(ORDERS_FOLDER_NAME);
  return found.hasNext() ? found.next() : DriveApp.getRootFolder().createFolder(ORDERS_FOLDER_NAME);
}

// Walks "Dad/Hairstyles/Curly/Curly3.png" from the designs root. Names are compared
// trimmed, because some Drive folder names end with a space.
function findByPath(root, path, cache) {
  const parts = path.split("/");
  const fileName = parts.pop().trim();
  let folder = root;
  let key = "";
  for (let i = 0; i < parts.length; i++) {
    key += "/" + parts[i].trim();
    if (!cache[key]) {
      cache[key] = childFolder(folder, parts[i].trim());
      if (!cache[key]) return null;
    }
    folder = cache[key];
  }
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (norm(f.getName()) === norm(fileName)) return f;
  }
  return null;
}

// Drive names some files without ".png" and with different capitals than the downloaded copies.
function norm(name) {
  return name.trim().replace(/\.png$/i, "").trim().toLowerCase();
}

function childFolder(folder, name) {
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const s = subs.next();
    if (s.getName().trim() === name) return s;
  }
  return null;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
