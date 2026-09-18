import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { club } from "@/content/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${club.name} — ${club.motto}`,
    template: `%s | ${club.shortName}`,
  },
  description:
    "A community football club from Nagaland. Born in 2024. Champions in 2025. Rise Together.",
  icons: { icon: "/crest.png", apple: "/crest.png" },
};
export const viewport: Viewport = { themeColor: "#081936" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${barlow.variable}`}
    >
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
