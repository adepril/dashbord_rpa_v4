import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClientWrapper } from "../components/ui/client-wrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Spacecraft Discovery One",
  description: "Tableau de bord RPA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientWrapper className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
