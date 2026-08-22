import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crew — Dayflow HRMS",
  description: "Every workday, perfectly aligned. Modern HRMS for leave, attendance, payroll, and workforce management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-violet-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}