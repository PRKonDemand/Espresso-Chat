"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { signUp } from "@/features/authentication/services/authService";
import { isUserIdAvailable } from "@/features/user-search/services/userSearch";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const USER_ID_RE = /^[a-zA-Z0-9_]{3,24}$/;

export function SignupForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [form, setForm] = useState({ name: "", userId: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!USER_ID_RE.test(form.userId.trim())) {
      setError("User ID must be 3–24 characters: letters, numbers or underscore.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const available = await isUserIdAvailable(supabase, form.userId.trim());
      if (!available) {
        setError("That User ID is already taken. Try another one.");
        return;
      }
      const { session } = await signUp(supabase, {
        email: form.email.trim(),
        password: form.password,
        userId: form.userId,
        name: form.name
      });
      if (session) {
        router.push("/chat");
        router.refresh();
      } else {
        setNotice("Account created. Check your email to confirm, then sign in.");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Name" value={form.name} onChange={set("name")} placeholder="Alex Rivera" required autoComplete="name" />
      <Input
        label="User ID"
        value={form.userId}
        onChange={set("userId")}
        placeholder="alex_rivera"
        hint="This is how others find you. Letters, numbers and underscores."
        required
        autoComplete="username"
      />
      <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required autoComplete="email" />
      <Input
        label="Password"
        type="password"
        value={form.password}
        onChange={set("password")}
        placeholder="At least 8 characters"
        required
        autoComplete="new-password"
      />

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-accent">{notice}</p>}

      <Button type="submit" size="lg" loading={busy}>Create account</Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
