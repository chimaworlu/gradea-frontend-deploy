import { Inter, Lora } from "next/font/google";

// Build Plan Phase 0: Lora 700 for headings, Inter 400 to 700 for text.
// The variable names are the ones tokens.css reads (--font-family-lora, --font-family-inter).
export const lora = Lora({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});

// Inter includes latin-ext so the naira sign renders. Prices are always set in Inter.
export const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});
