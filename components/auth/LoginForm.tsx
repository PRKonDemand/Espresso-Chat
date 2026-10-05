"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { signIn } from "@/features/authentication/services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(supabase, email.trim(), password);
      router.push("/chat");
      router.refresh();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required autoComplete="current-password" />

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <Button type="submit" size="lg" loading={busy}>Sign in</Button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/recover" className="text-muted hover:text-ink">Forgot password?</Link>
        <Link href="/signup" className="font-medium text-accent hover:underline">Create account</Link>
      </div>
    </form>
  );
}
