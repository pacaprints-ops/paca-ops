import { supabase } from "../../lib/supabaseClient";
import PersonalisationClient from "./PersonalisationClient";

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
    .select("id, sent_at, customer_email, order_ref, note, status, customer_response, responded_at")
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
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.order_ref}</td>
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
                      {r.customer_response ?? <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
