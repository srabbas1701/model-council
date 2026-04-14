import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Model Council — AI Debate Engine',
  description: 'Ask once. Let four AI models debate, then reach consensus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
