import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import "@/styles/chat.css";
import "@/styles/auth.css";
import "@/styles/settings.css";
import "@/styles/responsive.css";
import { AuthProvider } from "@/features/authentication/components/AuthProvider";

export const metadata: Metadata = {
  title: "Espresso",
  description: "Fast, reliable, clean real-time messaging."
};

export const viewport: Viewport = {
  themeColor: "#6b4f3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
