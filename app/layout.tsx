import type { ReactNode } from "react";
// Imported once, globally (Build Plan Phase 0). Generated from gradea-design-tokens.json.
import "../styles/tokens.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
