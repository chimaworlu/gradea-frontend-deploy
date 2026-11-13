import type { ReactNode } from "react";
// Imported once, globally (Build Plan Phase 0). Generated from gradea-design-tokens.json.
import "../styles/tokens.css";
import "./globals.css";
import { inter, lora } from "./fonts";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${lora.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
