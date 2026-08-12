"use client";

import { useState } from "react";

export default function PersonaliseForm({
  token,
  orderRef,
  note,
}: {
  token: string;
  orderRef: string;
  note?: string | null;
}) {
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) return;
    setStatus("sending");

    const res = await fetch("/api/personalise/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, response }),
    });

    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <main style={{ fontFamily: "sans-serif", maxWidth: 520, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h1 style={{ color: "#333" }}>Thank you!</h1>
        <p style={{ color: "#555" }}>We have your details and will get your order made and shipped as soon as possible.</p>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 520, margin: "60px auto", padding: "0 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <img src="/paca-logo.png" alt="Paca Prints" style={{ height: 48 }} />
      </div>
      <h1 style={{ color: "#333", marginBottom: 8 }}>Personalise your order</h1>
      <p style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>Order reference: {orderRef}</p>
      {note && (
        <p style={{ background: "#f0f9f6", borderRadius: 8, padding: "12px 16px", color: "#333", fontSize: 14, marginBottom: 16 }}>
          {note}
        </p>
      )}
      <p style={{ color: "#555", marginBottom: 24 }}>
        Please tell us exactly what you'd like on your item — for example your name, a date, or a short message.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="e.g. Sarah, 14th June 2025 — Happy Birthday!"
          rows={5}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 15,
            resize: "vertical",
            boxSizing: "border-box",
            marginBottom: 16,
          }}
        />
        {status === "error" && (
          <p style={{ color: "#c00", fontSize: 14, marginBottom: 12 }}>
            Something went wrong. Please try again or email us directly.
          </p>
        )}
        <button
          type="submit"
          disabled={status === "sending" || !response.trim()}
          style={{
            background: "#b8e0d2",
            color: "#1a1a1a",
            border: "none",
            borderRadius: 8,
            padding: "14px 28px",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {status === "sending" ? "Sending…" : "Submit my details"}
        </button>
      </form>
    </main>
  );
}
