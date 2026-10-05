import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = { title: "Create account · Espresso" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Fast, private, and yours.</p>
      </div>
      <SignupForm />
    </div>
  );
}
