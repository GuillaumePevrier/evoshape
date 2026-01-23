import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EvoShape",
  description: "Suivi régime simple et motivant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
          <div className="pointer-events-none absolute -top-24 right-[-8%] h-72 w-72 rounded-full bg-[var(--accent-soft)] blur-[120px] opacity-70" />
          <div className="pointer-events-none absolute -bottom-40 left-[-6%] h-96 w-96 rounded-full bg-[var(--accent-soft)] blur-[160px] opacity-80" />
          <div className="relative">{children}</div>
        </div>
      </body>
    </html>
  );
}
