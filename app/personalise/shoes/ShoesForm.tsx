"use client";

import { useEffect, useState } from "react";
import {
  shoesCatalog, SHOE_TYPES, CHILD_AGES, MAX_SHOE_PEOPLE, posesFor, poseOf, shoeChoices, shoeMissing, shoeThumb,
  type ShoeMember, type ShoeType, type Pose, type ShoeOption,
} from "./catalog";

const TYPE_HINT: Record<ShoeType, string> = { Man: "Adult", Woman: "Adult", Child: "Child", Baby: "Baby" };
const POSE_LABEL: Record<Pose, string> = { crossed: "Legs crossed", open: "Legs side by side" };

type Props = { token: string; orderRef: string; note?: string | null };

export default function ShoesForm({ token, orderRef, note }: Props) {
  const draftKey = `shoes-draft-${token}`;
  const [members, setMembers] = useState<ShoeMember[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<{ index: number | null; member: ShoeMember } | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  // Keep a draft on this device so customers can come back to it
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const d = JSON.parse(localStorage.getItem(draftKey) || "null");
        if (d) { setMembers(d.members ?? []); setTitle(d.title ?? ""); setNotes(d.notes ?? ""); }
      } catch {}
      setDraftLoaded(true);
    });
    return () => { cancelled = true; };
  }, [draftKey]);
  useEffect(() => {
    if (!draftLoaded) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ members, title, notes })); } catch {}
  }, [draftKey, draftLoaded, members, title, notes]);

  const full = members.length >= MAX_SHOE_PEOPLE;

  function startAdd(type: ShoeType) {
    if (full) return;
    setEditing({ index: null, member: { type } });
    window.scrollTo({ top: 0 });
  }
  function saveMember(m: ShoeMember) {
    setMembers((list) => {
      if (editing?.index == null) return [...list, m];
      const next = [...list]; next[editing.index] = m; return next;
    });
    setEditing(null);
  }
  const move = (i: number, d: -1 | 1) => setMembers((l) => {
    const j = i + d; if (j < 0 || j >= l.length) return l;
    const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const remove = (i: number) => setMembers((l) => l.filter((_, k) => k !== i));

  async function submit() {
    setStatus("sending"); setError("");
    const res = await fetch("/api/personalise/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, shoes: { title, notes, members } }),
    });
    if (res.ok) {
      setStatus("done");
      try { localStorage.removeItem(draftKey); } catch {}
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong. Please try again, or message us.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <Shell>
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--pp-teal)] text-2xl">✓</div>
          <h1 className="text-2xl font-semibold text-[var(--pp-ink)]">Thank you!</h1>
          <p className="mx-auto mt-2 max-w-sm text-gray-600">We have your family. We&apos;ll start making your print and be in touch if we have any questions.</p>
        </div>
      </Shell>
    );
  }

  if (editing) {
    return (
      <Shell>
        <MemberEditor initial={editing.member} isNew={editing.index == null} onCancel={() => setEditing(null)} onSave={saveMember} />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--pp-ink)]">Build your family shoes print</h1>
        <p className="text-sm text-gray-500">Order {orderRef}</p>
      </header>

      {note && <p className="rounded-lg bg-[var(--pp-teal-soft)] px-4 py-3 text-sm text-gray-800">{note}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--pp-teal-border)] bg-white px-4 py-3">
        <div className="text-sm text-gray-700">Add everyone in your family, up to {MAX_SHOE_PEOPLE} people.</div>
        <div className="text-sm font-semibold tabular-nums text-[var(--pp-ink)]">{members.length} of {MAX_SHOE_PEOPLE} added</div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--pp-ink)]">Your family</h2>
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
            No one added yet. Add everyone in the order you want them on the print, from left to right.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500">This is the order they&apos;ll go in, from left to right. Use the arrows to change it.</p>
            <ol className="flex flex-col gap-2">
              {members.map((m, i) => (
                <MemberCard
                  key={i}
                  member={m}
                  position={i + 1}
                  onEdit={() => setEditing({ index: i, member: m })}
                  onRemove={() => remove(i)}
                  onUp={i > 0 ? () => move(i, -1) : undefined}
                  onDown={i < members.length - 1 ? () => move(i, 1) : undefined}
                />
              ))}
            </ol>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--pp-ink)]">Add a person</h2>
        {full ? (
          <p className="rounded-lg bg-[var(--pp-peach-soft)] px-4 py-3 text-sm text-gray-800">
            You&apos;ve added {MAX_SHOE_PEOPLE}, which is the most we can fit on one print.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SHOE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => startAdd(t)}
                className="flex flex-col items-start rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-[var(--pp-teal)] focus-visible:outline-2 focus-visible:outline-[var(--pp-ink)]"
              >
                <span className="font-semibold text-[var(--pp-ink)]">+ {t}</span>
                <span className="text-xs text-gray-500">{TYPE_HINT[t]}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--pp-ink)]">Family name for the print</span>
          <span className="text-xs text-gray-500">For example: The Smiths. Leave blank if you don&apos;t want one.</span>
          <input id="shoes-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-base" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--pp-ink)]">Anything else we should know?</span>
          <span className="text-xs text-gray-500">Optional.</span>
          <textarea id="shoes-notes" value={notes} maxLength={1000} rows={3} onChange={(e) => setNotes(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-base" />
        </label>
      </section>

      {status === "error" && <p className="text-sm font-semibold text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={members.length === 0 || status === "sending"}
        className="rounded-xl bg-[var(--pp-ink)] px-6 py-4 text-base font-semibold text-white disabled:opacity-40"
      >
        {status === "sending" ? "Sending…" : "Send my family"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-16">
      <img src="/paca-logo.png" alt="Paca Prints" className="h-12 w-auto self-start" />
      {children}
    </div>
  );
}

function MemberCard({ member, position, onEdit, onRemove, onUp, onDown }: {
  member: ShoeMember; position: number; onEdit: () => void; onRemove: () => void; onUp?: () => void; onDown?: () => void;
}) {
  const shoe = shoeChoices(member).find((s) => s.code === member.shoe);
  const desc = [
    member.skin && `skin ${member.skin}`,
    posesFor(member.type).length > 1 && member.pose && POSE_LABEL[member.pose].toLowerCase(),
    shoe && `shoe ${shoe.code}`,
  ].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <span className="w-5 text-center text-sm font-semibold tabular-nums text-gray-400">{position}</span>
      {shoe && <img src={shoeThumb(shoe)} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-[var(--pp-bg)] object-contain" />}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[var(--pp-ink)]">
          {member.type}{member.type === "Child" && member.age && <span className="ml-1 font-normal text-gray-600">aged {member.age}</span>}{member.name?.trim() && <span className="ml-1 font-normal text-gray-600">· {member.name.trim()}</span>}
        </div>
        <div className="truncate text-xs text-gray-500">{desc}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconBtn label="Move left" onClick={onUp}>↑</IconBtn>
        <IconBtn label="Move right" onClick={onDown}>↓</IconBtn>
        <button type="button" onClick={onEdit} className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--pp-ink)] underline">Edit</button>
        <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-sm text-gray-500 underline">Remove</button>
      </div>
    </li>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={!onClick} onClick={onClick} className="h-8 w-8 rounded-lg border border-gray-200 text-sm disabled:opacity-25">
      {children}
    </button>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-[var(--pp-ink)]"><span className="mr-2 text-gray-400 tabular-nums">{n}</span>{title}</h2>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function MemberEditor({ initial, isNew, onCancel, onSave }: {
  initial: ShoeMember; isNew: boolean; onCancel: () => void; onSave: (m: ShoeMember) => void;
}) {
  const [m, setM] = useState<ShoeMember>(initial);
  const set = (patch: Partial<ShoeMember>) => setM((x) => ({ ...x, ...patch }));
  const missing = shoeMissing(m);
  const [tried, setTried] = useState(false);
  const poses = posesFor(m.type);
  const legsFor = (p: Pose) => shoesCatalog.people[m.type].poses[p]!.legs;
  const skinLegs = legsFor(poseOf(m));
  let n = 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--pp-ink)]">{isNew ? "Add" : "Edit"} {m.type.toLowerCase()}</h1>
        <button type="button" onClick={onCancel} className="text-sm text-gray-600 underline">Back to family</button>
      </header>

      <Step n={n++} title="Name (optional)" hint="Shown under their shoes on the print. Leave blank for no name.">
        <input id="member-name" value={m.name ?? ""} maxLength={30} onChange={(e) => set({ name: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-base" />
      </Step>

      {m.type === "Child" && (
        <Step n={n++} title="How old?" hint="We use this to get each child's size right on the print.">
          <select
            id="member-age"
            value={m.age ?? ""}
            onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : undefined })}
            className="self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
          >
            <option value="">Choose age</option>
            {CHILD_AGES.map((a) => <option key={a} value={a}>{a} years old</option>)}
          </select>
        </Step>
      )}

      {poses.length > 1 && (
        <Step n={n++} title="Legs">
          <div className="grid grid-cols-2 gap-2 sm:w-2/3">
            {poses.map((p) => {
              const pic = legsFor(p).find((l) => l.code === m.skin) ?? legsFor(p)[0];
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={m.pose === p}
                  onClick={() => set({ pose: p })}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-sm ${m.pose === p ? "border-[var(--pp-ink)] bg-[var(--pp-teal)] font-semibold" : "border-transparent bg-white"}`}
                >
                  <img src={shoeThumb(pic)} alt="" className="aspect-square w-full object-contain" />
                  {POSE_LABEL[p]}
                </button>
              );
            })}
          </div>
        </Step>
      )}

      <Step n={n++} title="Skin tone">
        <div className="grid grid-cols-5 gap-2">
          {skinLegs.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={m.skin === l.code}
              aria-label={`Skin tone ${l.code}`}
              onClick={() => set({ skin: String(l.code) })}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-xs font-semibold text-gray-700 ${m.skin === l.code ? "border-[var(--pp-ink)] bg-[var(--pp-teal)]" : "border-transparent bg-white"}`}
            >
              <img src={shoeThumb(l)} alt="" className="aspect-square w-full object-contain" />
              {l.code}
            </button>
          ))}
        </div>
      </Step>

      <Step n={n++} title="Shoes" hint="Each picture is one pair: the shoe colour and laces together.">
        <ShoeGrid options={shoeChoices(m)} value={m.shoe} onPick={(code) => set({ shoe: code })} />
      </Step>

      <div className="sticky bottom-0 flex flex-col gap-2 bg-[var(--pp-bg)] py-3">
        {tried && missing.length > 0 && (
          <p role="alert" className="rounded-lg bg-[var(--pp-peach)] px-4 py-2 text-sm text-gray-900">Still to choose: {missing.join(", ")}</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700">Cancel</button>
          <button
            type="button"
            onClick={() => { setTried(true); if (missing.length === 0) onSave({ ...m, name: m.name?.trim() || undefined }); }}
            className="flex-1 rounded-xl bg-[var(--pp-ink)] px-5 py-3 font-semibold text-white"
          >
            {isNew ? "Add to family" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShoeGrid({ options, value, onPick }: { options: ShoeOption[]; value?: number; onPick: (code: number) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.code}
          aria-label={`Shoe ${o.code}`}
          onClick={() => onPick(Number(o.code))}
          className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1 text-xs text-gray-700 ${value === o.code ? "border-[var(--pp-ink)] bg-[var(--pp-teal)] font-semibold" : "border-transparent bg-white"}`}
        >
          <img src={shoeThumb(o)} alt="" loading="lazy" className="aspect-square w-full object-contain" />
          <span className="leading-tight tabular-nums">{o.code}</span>
        </button>
      ))}
    </div>
  );
}
