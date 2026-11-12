"use client";

import { useEffect, useMemo, useState } from "react";
import {
  catalog, HAIR_COLOURS, HUMANS, PETS, isPet, missingParts, optionById, thumb,
  type Member, type MemberType, type Option,
} from "./catalog";

const TYPE_LABEL: Record<MemberType, string> = {
  Man: "Man", Woman: "Woman", Boy: "Boy", Girl: "Girl", Baby: "Baby", Dog: "Dog", Cat: "Cat",
};
const TYPE_HINT: Record<MemberType, string> = {
  Man: "Adult", Woman: "Adult", Boy: "Child", Girl: "Child", Baby: "Under 2", Dog: "Pet", Cat: "Pet",
};
const SWATCH = Object.fromEntries(HAIR_COLOURS);

type Props = { token: string; orderRef: string; note?: string | null; sizeLabel: string; minPeople: number; maxPeople: number };

export default function PortraitForm({ token, orderRef, note, sizeLabel, minPeople, maxPeople }: Props) {
  const draftKey = `portrait-draft-${token}`;
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<{ index: number | null; member: Member } | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [confirmFew, setConfirmFew] = useState(false);

  // Keep a draft on this device so customers can come back to it
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    // Read after first paint (localStorage isn't available during server render)
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

  const full = members.length >= maxPeople;

  function startAdd(type: MemberType) {
    if (full) return;
    setEditing({ index: null, member: { type, outfit: type === "Woman" || type === "Girl" ? "separates" : undefined } });
    window.scrollTo({ top: 0 });
  }
  function saveMember(m: Member) {
    setMembers((list) => {
      if (editing?.index == null) return [...list, m];
      const next = [...list]; next[editing.index] = m; return next;
    });
    setEditing(null);
    setConfirmFew(false);
  }
  const move = (i: number, d: -1 | 1) => setMembers((l) => {
    const j = i + d; if (j < 0 || j >= l.length) return l;
    const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const remove = (i: number) => setMembers((l) => l.filter((_, k) => k !== i));

  async function submit() {
    if (members.length < minPeople && !confirmFew) { setConfirmFew(true); return; }
    setStatus("sending"); setError("");
    const res = await fetch("/api/personalise/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, portrait: { title, notes, members } }),
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
        <MemberEditor
          initial={editing.member}
          isNew={editing.index == null}
          onCancel={() => setEditing(null)}
          onSave={saveMember}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--pp-ink)]">Build your family portrait</h1>
        <p className="text-sm text-gray-500">Order {orderRef}</p>
      </header>

      {note && <p className="rounded-lg bg-[var(--pp-teal-soft)] px-4 py-3 text-sm text-gray-800">{note}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--pp-teal-border)] bg-white px-4 py-3">
        <div className="text-sm text-gray-700">
          Your print: <b>{sizeLabel} people &amp; pets</b>
        </div>
        <div className="text-sm font-semibold tabular-nums text-[var(--pp-ink)]">
          {members.length} of {maxPeople} added
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--pp-ink)]">Your family</h2>
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
            No one added yet. Start with the adults, then the children, then any pets.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500">This is the order they&apos;ll sit in, from left to right. Use the arrows to change it.</p>
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
        <h2 className="text-lg font-semibold text-[var(--pp-ink)]">Add a person or pet</h2>
        {full ? (
          <p className="rounded-lg bg-[var(--pp-peach-soft)] px-4 py-3 text-sm text-gray-800">
            Your print is for up to {maxPeople} people &amp; pets, and you&apos;ve added {members.length}. Need more? Message us and we&apos;ll upgrade your order.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[...HUMANS, ...PETS].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => startAdd(t)}
                className="flex flex-col items-start rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-[var(--pp-teal)] focus-visible:outline-2 focus-visible:outline-[var(--pp-ink)]"
              >
                <span className="font-semibold text-[var(--pp-ink)]">+ {TYPE_LABEL[t]}</span>
                <span className="text-xs text-gray-500">{TYPE_HINT[t]}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--pp-ink)]">Name for the top of the print</span>
          <span className="text-xs text-gray-500">For example: The Smiths, or Our Family</span>
          <input
            id="portrait-title"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--pp-ink)]">Anything else we should know?</span>
          <span className="text-xs text-gray-500">Optional. For example: Dad wears glasses</span>
          <textarea
            id="portrait-notes"
            value={notes}
            maxLength={1000}
            rows={3}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
        </label>
      </section>

      {confirmFew && (
        <p className="rounded-lg bg-[var(--pp-peach-soft)] px-4 py-3 text-sm text-gray-800">
          You&apos;ve added {members.length}, but your print is for {sizeLabel}. Press <b>Send my family</b> again if that&apos;s right, or add the rest first.
        </p>
      )}
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
  member: Member; position: number; onEdit: () => void; onRemove: () => void; onUp?: () => void; onDown?: () => void;
}) {
  const pics = [member.hair, member.outfit === "dress" ? member.dress : member.top, member.pet].map(optionById).filter(Boolean) as Option[];
  const skin = catalog.skins.find((s) => s.code === member.skin);
  const hair = optionById(member.hair);
  const desc = isPet(member.type)
    ? optionById(member.pet)?.label
    : [hair && `${hair.colour} hair`, skin && `skin ${skin.code}`].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <span className="w-5 text-center text-sm font-semibold tabular-nums text-gray-400">{position}</span>
      <div className="flex shrink-0 gap-1">
        {pics.map((o) => (
          <img key={o.id} src={thumb(o)} alt="" className="h-12 w-12 rounded-lg bg-[var(--pp-bg)] object-contain" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[var(--pp-ink)]">
          {member.name || TYPE_LABEL[member.type]}
          {member.name && <span className="ml-1 text-sm font-normal text-gray-500">({TYPE_LABEL[member.type]})</span>}
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
    <button
      type="button"
      aria-label={label}
      disabled={!onClick}
      onClick={onClick}
      className="h-8 w-8 rounded-lg border border-gray-200 text-sm disabled:opacity-25"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

function MemberEditor({ initial, isNew, onCancel, onSave }: {
  initial: Member; isNew: boolean; onCancel: () => void; onSave: (m: Member) => void;
}) {
  const [m, setM] = useState<Member>(initial);
  const set = (patch: Partial<Member>) => setM((x) => ({ ...x, ...patch }));
  const missing = missingParts(m);
  const [tried, setTried] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--pp-ink)]">{isNew ? "Add" : "Edit"} {TYPE_LABEL[m.type].toLowerCase()}</h1>
        <button type="button" onClick={onCancel} className="text-sm text-gray-600 underline">Back to family</button>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--pp-ink)]">Name</span>
        <span className="text-xs text-gray-500">Optional, just so we know who&apos;s who. For example: Dad, Lily, Biscuit</span>
        <input
          id="member-name"
          value={m.name ?? ""}
          maxLength={40}
          onChange={(e) => set({ name: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
      </label>

      {isPet(m.type) ? <PetPicker type={m.type} value={m.pet} onChange={(pet) => set({ pet })} /> : <PersonPicker m={m} set={set} />}

      <div className="sticky bottom-0 flex flex-col gap-2 bg-[var(--pp-bg)] py-3">
        {tried && missing.length > 0 && (
          <p role="alert" className="rounded-lg bg-[var(--pp-peach)] px-4 py-2 text-sm text-gray-900">Still to choose: {missing.join(", ")}</p>
        )}
        <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700">Cancel</button>
        <button
          type="button"
          onClick={() => { setTried(true); if (missing.length === 0) onSave(m); }}
          className="flex-1 rounded-xl bg-[var(--pp-ink)] px-5 py-3 font-semibold text-white"
        >
          {isNew ? "Add to family" : "Save changes"}
        </button>
        </div>
      </div>
    </div>
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

function PersonPicker({ m, set }: { m: Member; set: (p: Partial<Member>) => void }) {
  const opts = catalog.people[m.type as keyof typeof catalog.people];
  const hairColours = useMemo(() => HAIR_COLOURS.map(([c]) => c).filter((c) => opts.hair.some((h) => h.colour === c)), [opts]);
  const current = optionById(m.hair);
  const [colour, setColour] = useState<string | undefined>(current?.colour);
  const styles = opts.hair.filter((h) => h.colour === colour);
  const hasDress = opts.dresses.length > 0;
  // One outfit only: e.g. T-shirt & jeans, or Hoodie & jeans, or a Dress
  const topKinds = [...new Set(opts.tops.map((o) => o.kind ?? "Top"))];
  const [topKind, setTopKind] = useState<string>(optionById(m.top)?.kind ?? topKinds[0]);
  const outfitChoices = [
    ...topKinds.map((k) => ({ key: `top:${k}`, label: `${k} & jeans` })),
    ...(hasDress ? [{ key: "dress", label: "Dress" }] : []),
  ];
  const outfitKey = m.outfit === "dress" ? "dress" : `top:${topKind}`;
  function chooseOutfit(key: string) {
    if (key === "dress") { set({ outfit: "dress", top: undefined, bottom: undefined }); return; }
    const k = key.slice(4);
    setTopKind(k);
    const keepTop = optionById(m.top)?.kind === k ? m.top : undefined;
    set({ outfit: "separates", dress: undefined, top: keepTop });
  }
  let n = 1;

  return (
    <>
      <Step n={n++} title="Skin tone">
        <div className="flex gap-3">
          {catalog.skins.map((s) => (
            <button
              key={s.code}
              type="button"
              aria-pressed={m.skin === s.code}
              aria-label={`Skin tone ${s.code}`}
              onClick={() => set({ skin: s.code })}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 ${m.skin === s.code ? "border-[var(--pp-ink)]" : "border-transparent"}`}
            >
              <span className="h-11 w-11 rounded-full" style={{ background: s.hex }} />
              <span className="text-xs font-semibold text-gray-700">{s.code}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={n++} title="Hair colour">
        <div className="flex flex-wrap gap-2">
          {hairColours.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={colour === c}
              onClick={() => { setColour(c); if (current?.colour !== c) set({ hair: undefined }); }}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${colour === c ? "border-[var(--pp-ink)] bg-[var(--pp-teal-soft)] font-semibold" : "border-gray-300 bg-white"}`}
            >
              <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: SWATCH[c] }} />
              {c}
            </button>
          ))}
        </div>
      </Step>

      <Step n={n++} title="Hairstyle" hint={colour ? `Styles we have in ${colour.toLowerCase()}` : "Choose a hair colour first"}>
        {colour && <TileGrid options={styles} value={m.hair} onPick={(id) => set({ hair: id })} caption={(o) => o.style ?? ""} />}
      </Step>

      {m.type === "Baby" ? (
        <Step n={n++} title="Babygrow">
          <TileGrid options={opts.tops} value={m.top} onPick={(id) => set({ top: id })} caption={(o) => o.code ?? ""} />
        </Step>
      ) : (
        <>
          {outfitChoices.length > 1 && (
            <Step n={n++} title="Outfit" hint="Choose one">
              <div className="flex flex-wrap gap-2">
                {outfitChoices.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={outfitKey === c.key}
                    onClick={() => chooseOutfit(c.key)}
                    className={`rounded-full border px-4 py-2 text-sm ${outfitKey === c.key ? "border-[var(--pp-ink)] bg-[var(--pp-teal-soft)] font-semibold" : "border-gray-300 bg-white"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Step>
          )}
          {m.outfit === "dress" && hasDress ? (
            <Step n={n++} title="Dress">
              <TileGrid options={opts.dresses} value={m.dress} onPick={(id) => set({ dress: id })} caption={(o) => o.code ?? ""} />
            </Step>
          ) : (
            <>
              <Step n={n++} title={topKind}>
                <TileGrid options={opts.tops.filter((o) => (o.kind ?? "Top") === topKind)} value={m.top} onPick={(id) => set({ top: id })} caption={(o) => o.code ?? ""} />
              </Step>
              <Step n={n++} title="Jeans">
                <GroupedTiles options={opts.bottoms} value={m.bottom} onPick={(id) => set({ bottom: id })} />
              </Step>
            </>
          )}
        </>
      )}

      {opts.ribbons && opts.ribbons.length > 0 && (
        <Step n={n++} title="Hair ribbon" hint="Optional">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-pressed={!m.ribbon}
              onClick={() => set({ ribbon: undefined })}
              className={`self-start rounded-full border px-4 py-2 text-sm ${!m.ribbon ? "border-[var(--pp-ink)] bg-[var(--pp-teal-soft)] font-semibold" : "border-gray-300 bg-white"}`}
            >
              No ribbon
            </button>
            <TileGrid options={opts.ribbons} value={m.ribbon} onPick={(id) => set({ ribbon: id })} caption={(o) => o.code ?? ""} />
          </div>
        </Step>
      )}
    </>
  );
}

function PetPicker({ type, value, onChange }: { type: "Dog" | "Cat"; value?: string; onChange: (id: string) => void }) {
  const groups = catalog.pets[type];
  const [breed, setBreed] = useState<string | undefined>(groups.find((g) => g.variants.some((v) => v.id === value))?.breed);
  const group = groups.find((g) => g.breed === breed);
  return (
    <>
      <Step n={1} title="Breed" hint={`Pick the closest match. Can't see yours? Choose the nearest and tell us in the notes.`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {groups.map((g) => (
            <button
              key={g.breed}
              type="button"
              aria-pressed={breed === g.breed}
              onClick={() => setBreed(g.breed)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-white p-2 text-xs ${breed === g.breed ? "border-[var(--pp-ink)] font-semibold" : "border-transparent"}`}
            >
              <img src={thumb(g.variants[0])} alt="" loading="lazy" className="aspect-square w-full object-contain" />
              {g.breed}
            </button>
          ))}
        </div>
      </Step>
      {group && (
        <Step n={2} title="Colour">
          <TileGrid options={group.variants} value={value} onPick={onChange} caption={() => ""} />
        </Step>
      )}
    </>
  );
}

function GroupedTiles({ options, value, onPick }: { options: Option[]; value?: string; onPick: (id: string) => void }) {
  const kinds = [...new Set(options.map((o) => o.kind ?? ""))];
  return (
    <div className="flex flex-col gap-3">
      {kinds.map((k) => (
        <div key={k} className="flex flex-col gap-2">
          {kinds.length > 1 && <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k}</h3>}
          <TileGrid options={options.filter((o) => (o.kind ?? "") === k)} value={value} onPick={onPick} caption={(o) => o.code ?? ""} />
        </div>
      ))}
    </div>
  );
}

function TileGrid({ options, value, onPick, caption }: {
  options: Option[]; value?: string; onPick: (id: string) => void; caption: (o: Option) => string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          aria-label={o.label ?? o.style ?? caption(o)}
          onClick={() => onPick(o.id)}
          className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-xs text-gray-700 ${value === o.id ? "border-[var(--pp-ink)] bg-[var(--pp-teal)] font-semibold" : "border-transparent bg-white"}`}
        >
          <img src={thumb(o)} alt="" loading="lazy" className="aspect-square w-full object-contain" />
          {caption(o) && <span className="leading-tight">{caption(o)}</span>}
        </button>
      ))}
    </div>
  );
}
