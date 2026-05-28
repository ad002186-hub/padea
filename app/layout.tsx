import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Padea",
  description: "School catering management platform",
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
      suppressHydrationWarning
    >
      {/* Inline script prevents flash of wrong theme before React hydrates */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('padea-theme');var dark=t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);})();`,
          }}
        />
      </head>
      <body className="flex h-full bg-slate-50 dark:bg-[#0f1117] transition-colors duration-200">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Persistent top header */}
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-end px-8 border-b border-slate-200 dark:border-[#2a2d3e] bg-slate-50/90 dark:bg-[#0f1117]/90 backdrop-blur-sm">
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
