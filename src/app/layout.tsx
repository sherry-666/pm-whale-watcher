import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { TopBar } from '../components/layout/TopBar';
import { TickerStrip } from '../components/layout/TickerStrip';
import { ClusterBanner } from '../components/layout/ClusterBanner';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Whale Watch — Polymarket Analytics Dashboard',
  description: 'Real-time monitoring for emerging wallet insider activity on Polymarket low-odds outcomes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}>
      <body className="font-mono bg-ww-bg-app text-ww-text-primary antialiased min-h-screen flex flex-col">
        <TopBar />
        <TickerStrip />
        <ClusterBanner />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
