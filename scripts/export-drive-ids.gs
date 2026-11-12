/**
 * Lists every file in the "All family designs" Drive folder with its Drive ID,
 * into a new Google Sheet called "portrait-file-ids".
 *
 * How to run (one time, ~5 minutes):
 *  1. Go to https://script.google.com and click "New project".
 *  2. Delete what's there, paste this whole file in, click Save.
 *  3. Click Run (function: exportIds). Google will ask you to allow access to your
 *     Drive and Sheets — allow it (it's your own script, it only reads).
 *  4. When it finishes, a sheet called "portrait-file-ids" appears in your Drive.
 *
 * Folder names are trimmed (some in Drive end with a space) so paths match paca-ops.
 */
const ROOT_ID = "12nH9wanF1fMgQehh-vxHKQAfGlQgkczM";

function exportIds() {
  const rows = [["path", "id"]];
  walk(DriveApp.getFolderById(ROOT_ID), "", rows);
  const ss = SpreadsheetApp.create("portrait-file-ids");
  ss.getSheets()[0].getRange(1, 1, rows.length, 2).setValues(rows);
  Logger.log("Done: " + (rows.length - 1) + " files → " + ss.getUrl());
}

function walk(folder, prefix, rows) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    rows.push([prefix + f.getName().trim(), f.getId()]);
  }
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const s = subs.next();
    walk(s, prefix + s.getName().trim() + "/", rows);
  }
}
