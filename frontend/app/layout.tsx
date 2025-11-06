import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Interview Bot",
  description: "AI-powered voice interview assistant with document-based knowledge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
