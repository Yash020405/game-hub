import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
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
  title: "Game Hub - Learn Through Play",
  description: "An interactive gaming platform featuring graph theory, algorithms, and puzzle games designed for learning and fun.",
  keywords: "games, puzzles, graph theory, algorithms, learning, education",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Security: Prevent inspect element and right-click in production
            if (typeof window !== 'undefined') {
              // Only enable in production builds
              if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                document.addEventListener('contextmenu', e => e.preventDefault());
                document.addEventListener('keydown', e => {
                  // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U
                  if (e.key === 'F12' || 
                     (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                     (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                     (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault();
                    return false;
                  }
                });
              }
            }
          `
        }} />
      </body>
    </html>
  );
}
