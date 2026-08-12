"use client";

import { useState } from "react";
import { parseLine, resolveCode, type PersonType, type CodeResult } from "./driveMap";

const PERSON_COLOURS: Record<PersonType, string> = {
  man:   "bg-blue-50 text-blue-800 ring-blue-200",
  woman: "bg-pink-50 text-pink-800 ring-pink-200",
  girl:  "bg-purple-50 text-purple-800 ring-purple-200",
  boy:   "bg-sky-50 text-sky-800 ring-sky-200",
  baby:  "bg-yellow-50 text-yellow-800 ring-yellow-200",
};

const PERSON_LABEL: Record<PersonType, string> = {
  man: "Man", woman: "Woman", girl: "Girl", boy: "Boy", baby: "Baby",
};

const EXAMPLES = [
  {
    label: "2 adults + girl + boy",
    value: `Adult Male S2 H4 J2 T3\nAdult Female S1 H7 J1 D4\nGirl age 6 S2 H3 J2 T1 R5\nBoy age 4 S3 H2 J1 T4`,
  },
  {
    label: "Mum + baby",
    value: `Mum S3 H12 J10 P4\nBaby S3 H2 P2`,
  },
  {
    label: "Dad only",
    value: `Dad S2 H5 J19 T5`,
  },
];

type ParsedPerson = {
  personLabel: string;
  person: PersonType;
  results: CodeResult[];
};

export default function PortraitLookupClient() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedPerson[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  function lookup() {
    const lines = input.split("\n").filter((l) => l.trim());
    const results: ParsedPerson[] = lines.map((line) => {
      const { personLabel, person, codes } = parseLine(line);
      return {
        personLabel,
        person,
        results: codes.map((c) => resolveCode(c, person)),
      };
    }).filter((p) => p.results.length > 0);
    setParsed(results);
    setHasSearched(true);
  }

  return (
    <div className="space-y-6">
      {/* Input card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Paste order codes</h2>
        <p className="mt-1 text-sm text-gray-500">One person per line. Include their type (Male/Female/Girl/Boy/Baby) and then their codes.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setInput(ex.value)}
              className="rounded-lg border bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"e.g.\nAdult Male  S2  H4  J2  T3\nAdult Female  S1  H7  J1  D4\nGirl age 6  S2  H3  J2  T1  R5"}
          rows={5}
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
        />

        <button
          onClick={lookup}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          Find Files
        </button>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Files needed — {parsed.reduce((a, p) => a + p.results.length, 0)} items across {parsed.length} {parsed.length === 1 ? "person" : "people"}
          </h2>

          {parsed.length === 0 ? (
            <p className="text-sm text-gray-500">No codes found. Make sure each line includes codes like S2, H4, J2, T3 etc.</p>
          ) : (
            <div className="space-y-6">
              {parsed.map((p, i) => (
                <div key={i}>
                  {i > 0 && <hr className="mb-6 border-dashed border-gray-200" />}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{p.personLabel}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PERSON_COLOURS[p.person]}`}>
                      {PERSON_LABEL[p.person]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {p.results.map((r, j) => (
                      <div
                        key={j}
                        className={`flex min-w-[130px] max-w-[180px] flex-1 flex-col rounded-xl border p-3 ${
                          r.isDirect
                            ? "border-green-200 bg-green-50"
                            : r.label === "Unknown"
                            ? "border-red-200 bg-red-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <span className={`font-mono text-xl font-bold ${
                          r.isDirect ? "text-green-800" : r.label === "Unknown" ? "text-red-700" : "text-gray-900"
                        }`}>
                          {r.code}
                        </span>
                        <span className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">{r.label}</span>
                        {r.folder && r.label !== "Unknown" && (
                          <span className="mt-1 text-xs text-gray-400">{r.folder}</span>
                        )}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-2 rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition ${
                            r.isDirect
                              ? "border-green-300 bg-white text-green-800 hover:bg-green-100"
                              : r.label === "Unknown"
                              ? "border-red-300 bg-white text-red-700 hover:bg-red-100"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {r.isDirect ? "📂 Open file" : r.label === "Unknown" ? "🔍 Search Drive" : "📁 Open folder"}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-green-300 bg-green-50" />
          Direct file link
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-gray-300 bg-gray-50" />
          Folder link (opens the right subfolder)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-red-300 bg-red-50" />
          Code not recognised — searches Drive
        </span>
      </div>
    </div>
  );
}
