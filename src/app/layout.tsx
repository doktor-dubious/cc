import type { Metadata } from 'next'
import { roboto } from './fonts/fonts';

import { inter } from './fonts/fonts';
import { geograph } from './fonts/fonts';
import { playfair } from './fonts/fonts';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import './globals.css'

export const metadata: Metadata = {
  title: 'Compliance Circle',
  description: 'Compliance Circle',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
        <>
    <html lang="en" className={`${roboto.variable} ${geograph.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head />
      <body className={`bg-background ${roboto.variable} antialiased font-sans`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster 
              theme="dark"
              position="top-right"
              toastOptions={{
                style: {
                  background: '#262626',
                  border: '1px solid #404040',
                  color: '#fafafa',
                },
              }}
            />
          </ThemeProvider>
        </body>
    </html>
    </>
  );
}
