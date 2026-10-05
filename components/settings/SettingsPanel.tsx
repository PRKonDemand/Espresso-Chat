"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Profile } from "@/types/database";
import { signOut, updatePassword } from "@/features/authentication/services/authService";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { RecoveryCodeModal } from "./RecoveryCodeModal";
import { ThemeToggle } from "./ThemeToggle";

export function SettingsPanel({
  profile,
  onClose,
  onProfileUpdated
}: {
  profile: Profile;
  onClose: () => void;
  onProfileUpdated: (p: Profile) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState(profile.name);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => setName(profile.name), [profile.name]);

  const saveName = async () => {
    setSavingName(true);
    setNameMsg(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", profile.id)
        .select("*")
        .single();
      if (error) throw error;
      onProfileUpdated(data);
      setNameMsg("Saved");
    } catch (e) {
      setNameMsg(friendlyError(e));
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 8) {
      setPwMsg("Use at least 8 characters.");
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    try {
      await updatePassword(supabase, password);
      setPassword("");
      setPwMsg("Password updated");
    } catch (e) {
      setPwMsg(friendlyError(e));
    } finally {
      setSavingPw(false);
    }
  };

  const doSignOut = async () => {
    await signOut(supabase);
    router.push("/login");
    router.refresh();
  };

  return (
    <Modal open onClose={onClose} title="Settings">
      <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-1">
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Profile</h3>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveName} loading={savingName} disabled={name.trim() === profile.name}>
              Save name
            </Button>
            {nameMsg && <span className="text-xs text-muted">{nameMsg}</span>}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-line bg-bg px-3 py-2.5">
            <div>
              <p className="text-xs text-muted">User ID (permanent)</p>
              <p className="font-mono text-sm">@{profile.user_id}</p>
            </div>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => navigator.clipboard.writeText(profile.user_id).catch(() => {})}
            >
              Copy
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Recovery</h3>
          <p className="text-sm text-muted">
            Generate a new numeric recovery code. This replaces any previous one.
          </p>
          <Button size="sm" variant="subtle" onClick={() => setShowRecovery(true)}>
            Generate new recovery code
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Password</h3>
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={savePassword} loading={savingPw} disabled={!password}>
              Update password
            </Button>
            {pwMsg && <span className="text-xs text-muted">{pwMsg}</span>}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Appearance</h3>
          <ThemeToggle />
        </section>

        <section className="border-t border-line pt-4">
          <Button variant="danger" onClick={doSignOut} className="w-full">
            Sign out
          </Button>
        </section>
      </div>

      <RecoveryCodeModal open={showRecovery} onClose={() => setShowRecovery(false)} />
    </Modal>
  );
}
