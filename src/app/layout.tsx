import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Анатомия",
  description: "Интерактивный 3D-атлас анатомии человека на русском языке",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-white text-neutral-900 antialiased flex flex-col">
        {/* Временный заголовок; SiteHeader появится в Task 9 */}
        <header className="h-12 border-b px-4 flex items-center font-semibold">Анатомия</header>
        {children}
      </body>
    </html>
  );
}
