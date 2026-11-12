"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SIZES } from "../../personalise/portrait/catalog";

export default function PersonalisationClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"standard" | "portrait" | "shoes">("standard");
  const [size, setSize] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !orderRef.trim()) return;
    if (kind === "portrait" && !size) { setErrorMsg("Pick the print size the customer bought"); setStatus("error"); return; }
    setStatus("sending");
    setErrorMsg("");
    setLink("");
    setCopied(false);

    const res = await fetch("/api/personalise/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerEmail: email.trim(),
        orderRef: orderRef.trim(),
        note: note.trim() || undefined,
        kind,
        size: kind === "portrait" ? size : undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (data.formLink) setLink(data.formLink);
    if (res.ok) {
      setStatus("done");
      setEmail("");
      setOrderRef("");
      setNote("");
      setSize("");
      router.refresh();
    } else {
      setErrorMsg(data.error ?? "Something went wrong");
      setStatus("error");
      if (data.formLink) router.refresh();
    }
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Send personalisation request</h2>

      {status === "done" && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
          Email sent! The customer will receive a link to fill in their details.
        </div>
      )}

      {link && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-gray-50 px-4 py-3 text-sm">
          <span className="font-semibold text-gray-800">Link for TikTok chat</span>
          <div className="flex gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded border bg-white px-2 py-1 text-xs" />
            <button type="button" onClick={copyLink} className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">What are they personalising?</label>
          <div className="flex gap-2">
            {([["standard", "Name / message"], ["portrait", "Family portrait"], ["shoes", "Family shoes"]] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`rounded-lg border px-3 py-2 text-sm ${kind === k ? "border-gray-900 bg-gray-900 text-white" : "bg-white text-gray-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {kind === "portrait" && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Print size they bought (people &amp; pets)</label>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSize(s.label)}
                  aria-pressed={size === s.label}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold ${size === s.label ? "border-gray-900 bg-gray-900 text-white" : "bg-white text-gray-700"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Customer email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Order ref</label>
          <input
            type="text"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="e.g. TK-12345678"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Note for customer{" "}
            <span className="text-gray-400 font-normal">(optional — e.g. "we need your child's name and age")</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Leave blank for generic message"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send email"}
        </button>
      </form>
    </div>
  );
}
