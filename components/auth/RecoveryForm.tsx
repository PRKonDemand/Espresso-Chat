"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { requestEmailReset, recoverAccount } from "@/features/authentication/services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function RecoveryForm() {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"code" | "email">("code");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await recoverAccount(userId.trim(), code.trim(), password);
      setDone("Password updated. You can now sign in with your new password.");
      setUserId("");
      setCode("");
      setPassword("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      await requestEmailReset(supabase, email.trim());
      setDone("If that email exists, a reset link is on its way.");
      setEmail("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-full bg-bubble p-1 text-sm">
        {(["code", "email"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError(null);
              setDone(null);
            }}
            className={cn(
              "flex-1 rounded-full py-1.5 font-medium transition-colors",
              tab === t ? "bg-surface text-ink shadow-sm" : "text-muted"
            )}
          >
            {t === "code" ? "Recovery code" : "Email link"}
          </button>
        ))}
      </div>

      {tab === "code" ? (
        <form onSubmit={submitCode} className="flex flex-col gap-4">
          <Input label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="alex_rivera" required />
          <Input label="Recovery code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="12-digit code" inputMode="numeric" required />
          <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required autoComplete="new-password" />
          <Button type="submit" size="lg" loading={busy}>Reset password</Button>
        </form>
      ) : (
        <form onSubmit={submitEmail} className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          <Button type="submit" size="lg" loading={busy}>Send reset link</Button>
        </form>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {done && <p role="status" className="text-sm text-accent">{done}</p>}

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="hover:text-ink">Back to sign in</Link>
      </p>
    </div>
  );
}
