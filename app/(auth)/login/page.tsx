import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in · Espresso" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to keep the conversation going.</p>
      </div>
      <LoginForm />
    </div>
  );
}
