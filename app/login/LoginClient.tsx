// pacaprints-ops/app/login/LoginClient.tsx

"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../lib/supabaseBrowser";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = useMemo(() => sp.get("redirect") || "/dashboard", [sp]);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function signInWithPassword() {
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) return setMsg(error.message);

    // Full page reload ensures cookies are sent with the next request
    // before the middleware checks auth
    window.location.href = redirectTo;
  }

  async function sendMagicLink() {
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}${redirectTo}`
            : undefined,
      },
    });

    setLoading(false);

    if (error) return setMsg(error.message);

    setMsg("Magic link sent — check your email.");
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <div className="pp-card-strong p-6">
        <h1 className="text-2xl font-extrabold text-gray-900">PacaPrints Ops</h1>
        <p className="mt-1 text-sm text-gray-600">Log in to continue.</p>

        {msg ? (
          <div className="mt-4 rounded-lg border bg-white p-3 text-sm text-gray-800">
            {msg}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <label className="block">
            <div className="text-xs font-semibold text-gray-700 mb-1">Email</div>
            <input
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@pacaprints.com"
            />
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-gray-700 mb-1">Password</div>
            <input
              type="password"
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button
            type="button"
            className="pp-btn pp-btn-teal w-full"
            onClick={signInWithPassword}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            className="pp-btn pp-btn-peach w-full"
            onClick={sendMagicLink}
            disabled={loading || !email.trim()}
          >
            {loading ? "Sending…" : "Send magic link instead"}
          </button>

          <p className="text-xs text-gray-500">
            If you used “Invite user” in Supabase, set your password from the invite email.
          </p>
        </div>
      </div>
    </main>
  );
}
