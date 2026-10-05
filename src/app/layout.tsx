import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090d16",
};

export const metadata: Metadata = {
  title: "SplitFlow — Frictionless Expense Sharing & Debt Simplification",
  description:
    "Zero-friction group expense tracker. Log expenses on behalf of anyone, add friends without accounts, simplify debts using the Min-Cash-Flow algorithm, and settle via dynamic UPI QR codes.",
  keywords: ["splitwise alternative", "debt simplification", "upi settlement", "group expenses", "splitflow"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SplitFlow",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
