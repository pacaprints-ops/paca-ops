import { supabase } from "./supabaseClient";
import { resolve, type PortraitSubmission } from "../personalise/portrait/catalog";

export type PortraitFolderResult = { url?: string; missing?: string[]; error?: string };

/** Copies the order's exact design files into Drive ("Portrait orders/<order ref> …") via the Apps Script web app,
 *  then saves the folder link on the request (portrait.driveFolderUrl). */
export async function makePortraitFolder(requestId: string): Promise<PortraitFolderResult> {
  const scriptUrl = process.env.PORTRAIT_FOLDER_SCRIPT_URL;
  const secret = process.env.PORTRAIT_FOLDER_SECRET;
  if (!scriptUrl || !secret) return { error: "Drive folder script isn't set up yet" };

  const { data: req, error } = await supabase
    .from("personalisation_requests")
    .select("order_ref, portrait")
    .eq("id", requestId)
    .single();
  if (error || !req?.portrait) return { error: "No portrait details on this request" };

  const portrait = req.portrait as PortraitSubmission & { driveFolderUrl?: string };
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();
  const files = resolve(portrait).flatMap((p) => {
    const who = safe(p.who);
    return p.parts.map((part) => ({
      path: part.file,
      name: `${p.position} ${who} - ${part.part}${part.code ? ` ${part.code}` : ""}.png`,
    }));
  });
  const folderName = safe(`${req.order_ref}${portrait.title ? ` - ${portrait.title}` : ""}`);

  let result: PortraitFolderResult;
  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ secret, folderName, files }),
    });
    result = await res.json();
  } catch (e) {
    return { error: `Couldn't reach the Drive script: ${String(e)}` };
  }
  if (result.error || !result.url) return { error: result.error ?? "Drive script gave no folder link" };

  await supabase
    .from("personalisation_requests")
    .update({ portrait: { ...portrait, driveFolderUrl: result.url } })
    .eq("id", requestId);
  return result;
}
