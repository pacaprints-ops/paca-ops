import { supabase } from "../lib/supabaseClient";
import PersonaliseForm from "./PersonaliseForm";

export default async function PersonalisePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main style={{ fontFamily: "sans-serif", maxWidth: 520, margin: "60px auto", padding: "0 24px" }}>
        <h1 style={{ color: "#333" }}>Invalid link</h1>
        <p style={{ color: "#555" }}>This link doesn't look right. Please check your email and try again.</p>
      </main>
    );
  }

  const { data: req } = await supabase
    .from("personalisation_requests")
    .select("order_ref, status, note")
    .eq("token", token)
    .single();

  if (!req) {
    return (
      <main style={{ fontFamily: "sans-serif", maxWidth: 520, margin: "60px auto", padding: "0 24px" }}>
        <h1 style={{ color: "#333" }}>Link not found</h1>
        <p style={{ color: "#555" }}>We couldn't find this request. Please check your email and try again, or contact us directly.</p>
      </main>
    );
  }

  if (req.status === "received") {
    return (
      <main style={{ fontFamily: "sans-serif", maxWidth: 520, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ color: "#333" }}>Already submitted</h1>
        <p style={{ color: "#555" }}>We already have your personalisation details — we'll get your order made and on its way!</p>
      </main>
    );
  }

  return <PersonaliseForm token={token} orderRef={req.order_ref} note={req.note} />;
}
