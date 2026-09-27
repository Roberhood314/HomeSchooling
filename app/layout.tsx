import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI HomeSchool Pro",
  description: "Professional multilingual AI homeschooling platform for children ages 3–9 and parents."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
      <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="afterInteractive" />
    </html>
  );
}
