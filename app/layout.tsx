import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { SessionProvider } from 'next-auth/react'
import { companyConfig, generateThemeCSS } from '@/company.config'

export const metadata: Metadata = {
  title: {
    default: companyConfig.shortName,
    template: `%s | ${companyConfig.shortName}`,
  },
  description: companyConfig.motto,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const themeCSS = generateThemeCSS(companyConfig)

  return (
    <html lang="es" suppressHydrationWarning>
      <body style={{ ['--' as any]: undefined }}>
        <style>{`:root { ${themeCSS} }`}</style>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
