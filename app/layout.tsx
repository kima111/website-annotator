import "./globals.css";
import type { ReactNode } from "react";
import NextTopLoader from "nextjs-toploader";

export const metadata = { title: "Annotator", description: "No-install website markup" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">
        <NextTopLoader color="#38bdf8" crawlSpeed={200} height={3} showSpinner={false} />
        {children}
      </body>
    </html>
  );
}