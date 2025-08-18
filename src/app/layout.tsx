import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Group Lending Application",
  description: "A comprehensive group lending platform for managing loans and payments between lenders and borrowers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}