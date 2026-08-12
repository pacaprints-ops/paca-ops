import PortraitLookupClient from "./PortraitLookupClient";

export default function PortraitLookupPage() {
  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Portrait Lookup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste order codes to get direct Drive links for every file you need.
        </p>
      </div>
      <PortraitLookupClient />
    </main>
  );
}
