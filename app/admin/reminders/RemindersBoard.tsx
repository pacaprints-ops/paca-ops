"use client";

import { useState, useEffect } from "react";

type ReminderItem = { id: string; text: string; done: boolean };
type ReminderSection = { id: string; title: string; items: ReminderItem[] };

const STORAGE_KEY = "pp-reminders-v1";

const DEFAULT_SECTIONS: ReminderSection[] = [
  {
    id: "expenses",
    title: "Expenses to log",
    items: [
      { id: "canva-carrie", text: "Find Carrie's Canva invoices and add to expenses", done: false },
      { id: "canva-vicky", text: "Find Vicky's Canva invoices and add to expenses", done: false },
      { id: "chatgpt", text: "Find ChatGPT invoices and add to expenses", done: false },
      { id: "cricut", text: "Find Cricut invoices and add to expenses", done: false },
      { id: "capcut", text: "Find CapCut invoices and add to expenses", done: false },
    ],
  },
  {
    id: "other",
    title: "Other",
    items: [],
  },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function RemindersBoard() {
  const [sections, setSections] = useState<ReminderSection[]>(DEFAULT_SECTIONS);
  const [loaded, setLoaded] = useState(false);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSections(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  }, [sections, loaded]);

  function toggleItem(sectionId: string, itemId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
          : s
      )
    );
  }

  function removeItem(sectionId: string, itemId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
      )
    );
  }

  function addItem(sectionId: string) {
    const text = (newItemText[sectionId] || "").trim();
    if (!text) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, { id: uid(), text, done: false }] }
          : s
      )
    );
    setNewItemText((prev) => ({ ...prev, [sectionId]: "" }));
  }

  if (!loaded) return null;

  const totalPending = sections.flatMap((s) => s.items).filter((i) => !i.done).length;

  return (
    <div className="flex flex-col gap-6">
      {totalPending === 0 && (
        <div className="pp-card p-5 text-center text-sm text-slate-400">
          All caught up — nothing pending.
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="pp-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
            {section.title}
          </h2>

          {section.items.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">Nothing here yet.</p>
          )}

          <div className="flex flex-col gap-2 mb-4">
            {section.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 group">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem(section.id, item.id)}
                  className="w-4 h-4 rounded accent-teal-600 cursor-pointer flex-shrink-0"
                />
                <span
                  className={`text-sm flex-1 ${item.done ? "line-through text-slate-400" : "text-slate-700"}`}
                >
                  {item.text}
                </span>
                <button
                  onClick={() => removeItem(section.id, item.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-slate-300 hover:text-red-400 text-xs px-1"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText[section.id] || ""}
              onChange={(e) =>
                setNewItemText((prev) => ({ ...prev, [section.id]: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && addItem(section.id)}
              placeholder="Add a reminder…"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
            />
            <button
              onClick={() => addItem(section.id)}
              className="pp-btn pp-btn-primary text-xs px-3 py-1.5"
            >
              + Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
