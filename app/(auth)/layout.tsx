export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
              <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
              <path d="M7 3c0 1-1 1.5-1 2.5S7 7 7 8" />
              <path d="M11 3c0 1-1 1.5-1 2.5S11 7 11 8" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">Espresso</span>
        </div>
        <div className="espresso-auth-card">{children}</div>
      </div>
    </main>
  );
}
