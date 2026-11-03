import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { BRAND } from "@/lib/brand"
import { Providers } from "./providers"
import "./globals.css"

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] })
// Fallback while Geist loads, and for any glyph it lacks.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: `${BRAND.bankShortName} ${BRAND.productName}`, template: `%s · ${BRAND.bankShortName}` },
  description: "Loan approval flow for Retail and SME lending.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#121015" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <body className={`${geist.variable} ${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
