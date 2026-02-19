import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cursor Ambassador QR Printer",
  description: "Generate printable QR code cards for Cursor community events.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
