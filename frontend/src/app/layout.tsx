import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Rent Amortization – Zemen Bank",
  description: "Lease contract registration and monthly amortization reporting",
  icons: {
    icon: "/amortization/z-07.png",
    shortcut: "/amortization/z-07.png",
    apple: "/amortization/z-07.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/amortization/z-07.png" />
        <link rel="shortcut icon" type="image/png" href="/amortization/z-07.png" />
        <link rel="apple-touch-icon" href="/amortization/z-07.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var theme = (stored === 'dark' || stored === 'light') 
                    ? stored 
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}

