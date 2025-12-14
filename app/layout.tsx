import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles.css';
import '../theme.css';

export const metadata: Metadata = {
  title: "Gemini OmniChat",
  description: "A high-performance chat interface supporting multiple API key rotation (polling) for higher reliability and rate limit handling.",
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zooming on mobile inputs
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossOrigin="anonymous" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    gray: {
                      950: '#030712',
                    },
                    primary: {
                      DEFAULT: 'rgba(var(--color-theme-primary-rgb), <alpha-value>)',
                      50: 'rgba(var(--color-theme-primary-rgb), 0.1)',
                      100: 'rgba(var(--color-theme-primary-rgb), 0.2)',
                      200: 'rgba(var(--color-theme-primary-rgb), 0.3)',
                      300: 'rgba(var(--color-theme-primary-rgb), 1.0)',
                      400: 'rgba(var(--color-theme-primary-rgb), 0.6)',
                      500: 'rgba(var(--color-theme-primary-rgb), 0.8)',
                      600: 'rgba(var(--color-theme-primary-rgb), 1.0)',
                      700: 'rgba(var(--color-theme-primary-rgb), 1.0)',
                    }
                  }
                }
              }
            }
          `
        }} />
      </head>
      <body className="antialiased h-screen overflow-hidden selection:bg-primary-500/30">
        <div id="root" className="h-full w-full">
          {children}
        </div>
      </body>
    </html>
  );
}