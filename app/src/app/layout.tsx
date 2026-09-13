import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Priyena Wedding Planner",
  description: "Priyena Wedding Planner — Priyena weds Khushal, 25 January 2027",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-[#fffaf5]">
        <header className="sticky top-0 z-40 border-b border-[#eadfd5] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">

            <Link
              href="/"
              className="flex min-w-0 items-center gap-2.5"
            >
              <span className="relative h-9 w-9 shrink-0">
                <Image
                  src="/ganesha-logo.svg"
                  alt="Lord Ganesha"
                  fill
                  className="object-contain"
                />
              </span>

              <span className="truncate text-base font-semibold text-[#7f2935] sm:text-lg">
                Priyena Wedding Planner
              </span>
            </Link>

            <nav className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-end sm:gap-2">
              <Link
                href="/"
                className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#fff3ed] sm:px-4 sm:text-sm"
              >
                Dashboard
              </Link>

              <Link
                href="/guests"
                className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#fff3ed] sm:px-4 sm:text-sm"
              >
                Guests
              </Link>

              <Link
                href="/functions"
                className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#fff3ed] sm:px-4 sm:text-sm"
              >
                Functions
              </Link>

              <Link
                href="/budget"
                className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-[#fff3ed] sm:px-4 sm:text-sm"
              >
                Budget
              </Link>
            </nav>
          </div>
        </header>

        <div className="min-w-0 flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
