"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PersonalisationClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !orderRef.trim()) return;
    setStatus("sending");
    setErrorMsg("");

    const res = await fetch("/api/personalise/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerEmail: email.trim(),
        orderRef: orderRef.trim(),
        note: note.trim() || undefined,
      }),
    });

    if (res.ok) {
      setStatus("done");
      setEmail("");
      setOrderRef("");
      setNote("");
      router.refresh();
    } else {
      const data = await res.json();
      setErrorMsg(data.error ?? "Something went wrong");
      setStatus("error");
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

      <form onSubmit={handleSend} className="flex flex-col gap-3">
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
