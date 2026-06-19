import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "expoship — EAS Production Build Console",
  description: "Automated Expo/EAS production build runner and split-flap builds board.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
