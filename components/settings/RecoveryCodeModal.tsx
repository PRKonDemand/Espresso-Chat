"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { issueRecoveryCode } from "@/features/authentication/services/authService";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Shows the numeric recovery code exactly once, right after it is generated.
 * The server only ever stores a hash of it.
 */
export function RecoveryCodeModal({
  open,
  onClose,
  autoGenerate = false
}: {
  open: boolean;
  onClose: () => void;
  autoGenerate?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const fresh = await issueRecoveryCode(supabase);
      setCode(fresh);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Your recovery code">
      {!code ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Your recovery code lets you reset your password if you lose access. It is shown once
            and stored only as a secure hash — nobody, including us, can read it back.
          </p>
          {autoGenerate ? (
            <p className="text-sm text-muted">Generate it now to finish setting up your account.</p>
          ) : null}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button onClick={generate} loading={busy} size="lg">
            Generate recovery code
          </Button>
          {!autoGenerate && (
            <button onClick={onClose} className="text-sm text-muted hover:text-ink">
              Maybe later
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Save this code somewhere safe. You won&apos;t be able to see it again.
          </p>
          <div className="rounded-xl border border-line bg-bg p-4 text-center">
            <p className="select-all font-mono text-2xl tracking-[0.25em]">{code}</p>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button variant="subtle" onClick={copy} className="flex-1">
              {copied ? "Copied" : "Copy code"}
            </Button>
            <Button onClick={onClose} className="flex-1">
              I&apos;ve saved it
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
