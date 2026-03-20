"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function OrderFlagsQuickToggle({
  orderId,
  isSettled,
  isRefunded,
  refundNotes,
  needsAttention,
  attentionNote,
}: {
  orderId: string;
  isSettled: boolean;
  isRefunded: boolean;
  refundNotes: string | null;
  needsAttention: boolean;
  attentionNote?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [localSettled, setLocalSettled] = useState(!!isSettled);
  const [localRefunded, setLocalRefunded] = useState(!!isRefunded);
  const [localAttention, setLocalAttention] = useState(!!needsAttention);
  const [localNote, setLocalNote] = useState(attentionNote ?? "");
  const [enteringNote, setEnteringNote] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  async function saveFlags(nextSettled: boolean, nextRefunded: boolean) {
    setSaving(true);
    setLocalSettled(nextSettled);
    setLocalRefunded(nextRefunded);

    const { error } = await supabase.rpc("set_order_flags", {
      p_order_id: orderId,
      p_is_settled: nextSettled,
      p_is_refunded: nextRefunded,
      p_refund_notes: nextRefunded ? (refundNotes ?? null) : null,
    });

    setSaving(false);

    if (error) {
      setLocalSettled(!!isSettled);
      setLocalRefunded(!!isRefunded);
      alert(error.message);
      return;
    }

    if (nextSettled) setLocalAttention(false);
    router.refresh();
  }

  async function confirmFlag(note: string) {
    setSaving(true);
    setEnteringNote(false);
    setLocalAttention(true);
    setLocalNote(note);

    const { error } = await supabase.rpc("set_order_attention", {
      p_order_id: orderId,
      p_needs_attention: true,
      p_attention_note: note.trim() || null,
    });

    setSaving(false);

    if (error) {
      setLocalAttention(!!needsAttention);
      setLocalNote(attentionNote ?? "");
      alert(error.message);
      return;
    }

    router.refresh();
  }

  async function unflag() {
    setSaving(true);
    setLocalAttention(false);
    setLocalNote("");

    const { error } = await supabase.rpc("set_order_attention", {
      p_order_id: orderId,
      p_needs_attention: false,
      p_attention_note: null,
    });

    setSaving(false);

    if (error) {
      setLocalAttention(!!needsAttention);
      setLocalNote(attentionNote ?? "");
      alert(error.message);
      return;
    }

    router.refresh();
  }

  function handleFlagClick() {
    if (localSettled) return;
    if (localAttention) {
      unflag();
    } else {
      setDraftNote("");
      setEnteringNote(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => saveFlags(!localSettled, localRefunded)}
          className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-60 ${
            localSettled ? "bg-green-600 text-white border-green-600" : "bg-white"
          }`}
          title="Toggle settled"
        >
          {localSettled ? "✓ Settled" : "Settled"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => saveFlags(localSettled, !localRefunded)}
          className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-60 ${
            localRefunded ? "bg-red-600 text-white border-red-600" : "bg-white"
          }`}
          title="Toggle refunded"
        >
          {localRefunded ? "Refunded" : "Refund"}
        </button>

        {/* 🚩 only when NOT settled */}
        {!localSettled ? (
          <button
            type="button"
            disabled={saving}
            onClick={handleFlagClick}
            className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-60 ${
              localAttention
                ? "bg-red-600 text-white border-red-600 animate-pulse"
                : "bg-white text-gray-400"
            }`}
            title={localAttention ? "Flagged — click to unflag" : "Flag as needs attention"}
          >
            🚩{localAttention ? " Awaiting" : ""}
          </button>
        ) : null}
      </div>

      {/* Show saved note when flagged */}
      {localAttention && localNote && !enteringNote ? (
        <div className="text-[11px] text-amber-700 max-w-[200px] leading-tight">{localNote}</div>
      ) : null}

      {/* Inline note input when flagging */}
      {enteringNote ? (
        <div className="flex flex-col gap-1 mt-1">
          <input
            autoFocus
            type="text"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmFlag(draftNote);
              if (e.key === "Escape") setEnteringNote(false);
            }}
            placeholder="Reason (optional)"
            className="rounded border px-2 py-1 text-xs w-36"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => confirmFlag(draftNote)}
              className="rounded border bg-red-600 text-white px-2 py-0.5 text-xs font-semibold"
            >
              Flag
            </button>
            <button
              type="button"
              onClick={() => setEnteringNote(false)}
              className="rounded border bg-white px-2 py-0.5 text-xs text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}