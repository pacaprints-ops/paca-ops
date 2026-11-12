import { Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";
import PersonalisationClient from "./PersonalisationClient";
import PortraitFolderButton from "./PortraitFolderButton";
import { resolve, thumb, type PortraitSubmission } from "../../personalise/portrait/catalog";


function PortraitFiles({ r }: { r: PersonalisationRequest }) {
  if (!r.portrait) return null;
  const people = resolve(r.portrait);
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="text-sm text-gray-700">
        {r.portrait.title && <>Title: <b>{r.portrait.title}</b> · </>}
        {people.length} people &amp; pets{r.size_label && <> (paid for {r.size_label})</>}
      </div>
      <PortraitFolderButton id={r.id} url={r.portrait.driveFolderUrl} />
      {r.portrait.notes && <p className="rounded bg-amber-50 px-3 py-2 text-sm text-gray-800">Notes: {r.portrait.notes}</p>}
      <ol className="flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.position} className="rounded-lg border bg-gray-50 p-3">
            <div className="mb-2 text-sm font-semibold text-gray-900">
              {p.position}. {p.type}{p.name && <span className="font-normal text-gray-600"> — {p.name}</span>}
            </div>
            <div className="flex flex-wrap gap-3">
              {p.parts.map((part) => (
                <div key={part.part} className="flex w-44 gap-2">
                  {part.thumbId ? (
                    <img src={thumb({ id: part.thumbId })} alt="" className="h-12 w-12 shrink-0 rounded bg-white object-contain" />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded bg-white" />
                  )}
                  <div className="min-w-0 text-xs">
                    <div className="font-semibold text-gray-800">{part.part}{part.code && ` ${part.code}`}</div>
                    <div className="text-gray-600">{part.label}</div>
                    <div className="break-all text-[10px] text-gray-400" title={part.file}>{part.file}</div>
                  </div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const dynamic = "force-dynamic";

type PersonalisationRequest = {
  id: string;
  sent_at: string;
  customer_email: string;
  order_ref: string;
  note: string | null;
  status: string;
  customer_response: string | null;
  responded_at: string | null;
  kind: string | null;
  size_label: string | null;
  portrait: (PortraitSubmission & { driveFolderUrl?: string }) | null;
};

function formatDateTimeUK(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function PersonalisationPage() {
  const { data, error } = await supabase
    .from("personalisation_requests")
    .select("id, sent_at, customer_email, order_ref, note, status, customer_response, responded_at, kind, size_label, portrait")
    .order("sent_at", { ascending: false })
    .limit(100);

  const requests = (data ?? []) as PersonalisationRequest[];

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Personalisation Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send a personalisation email to a customer and track their response.
        </p>
      </div>

      <PersonalisationClient />

      {error && (
        <p className="mt-4 rounded-lg border bg-red-50 p-3 text-sm text-red-700">
          Error loading requests: {error.message}
        </p>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Request log</h2>

        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">No requests sent yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Order ref</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden md:table-cell">Note sent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Sent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden lg:table-cell">Response</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <Fragment key={r.id}>
                  <tr className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {r.order_ref}
                      {r.kind === "portrait" && (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          Portrait {r.size_label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.customer_email}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[160px] truncate">
                      {r.note ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTimeUK(r.sent_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.status === "received" ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Received {formatDateTimeUK(r.responded_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Waiting
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell max-w-xs text-gray-800">
                      {r.kind === "portrait" && r.portrait
                        ? <span className="text-gray-500">See files below</span>
                        : r.customer_response ?? <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                  {r.kind === "portrait" && r.portrait && (
                    <tr className="border-b">
                      <td colSpan={6} className="px-4 pb-4">
                        <details>
                          <summary className="cursor-pointer py-2 text-sm font-semibold text-sky-700">Show family &amp; files</summary>
                          <PortraitFiles r={r} />
                        </details>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
