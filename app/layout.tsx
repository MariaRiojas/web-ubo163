import './globals.css'
import type { Metadata } from 'next'
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { SessionProvider } from 'next-auth/react'
import { companyConfig, generateThemeCSS } from '@/company.config'

// ─── Fuentes institucionales (docs/ARQUITECTURA_MENU.md §10) ───
// Fraunces       → títulos (display serif con carácter institucional)
// Inter Tight    → UI general (sans condensada contemporánea)
// JetBrains Mono → data técnica (códigos CBP, timestamps, números)
const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-display-loaded',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})
const fontUi = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-ui-loaded',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})
const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-loaded',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

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
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontUi.variable} ${fontMono.variable}`}
    >
      <body style={{ ['--' as any]: undefined }}>
        {/* Aplica clase de tema intranet antes de hidratación para evitar flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('ubo163:intranet-theme')==='light'){document.documentElement.classList.add('intranet-light')}}catch(e){}`,
          }}
        />
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
