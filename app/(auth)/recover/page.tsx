import { RecoveryForm } from "@/components/auth/RecoveryForm";

export const metadata = { title: "Recover account · Espresso" };

export default function RecoverPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Recover your account</h1>
        <p className="mt-1 text-sm text-muted">
          Use your recovery code, or send a reset link to your email.
        </p>
      </div>
      <RecoveryForm />
    </div>
  );
}
