import type { Metadata } from "next";
import { AppBackdrop } from "@/components/ui/app-backdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniClip",
  description: "OmniClip generates visual-first manga pages with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <div className="app-root">
          <AppBackdrop />
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
