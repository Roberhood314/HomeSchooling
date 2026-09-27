import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI HomeSchool",
  description: "Multilingual AI learning platform for children ages 3–9 and parents."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
