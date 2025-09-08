import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Annotator", description: "No-install website markup" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}