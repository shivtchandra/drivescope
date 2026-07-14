import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./atmosphere.css";
import Navbar from "@/components/Navbar";
import FirebaseAnalytics from "@/components/FirebaseAnalytics";
import IntroSequence from "@/components/IntroSequence";
import ChatbotWidget from "@/components/ChatbotWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "DriveScope — Find The Right Car. Not Just The Popular One.",
    template: "%s | DriveScope"
  },
  description:
    "India's intelligent car decision platform. Compare vehicles, simulate ownership costs, and understand which variant actually fits your life. Stop guessing, start deciding.",
  keywords: ["car comparison", "TCO calculator", "buy car in India", "car simulator", "vehicle decision engine", "DriveScope", "car specs", "ownership cost"],
  openGraph: {
    title: "DriveScope — Intelligent Car Decision Engine",
    description: "Compare vehicles, simulate ownership costs, and understand which variant actually fits your life. Real physics. Real costs.",
    url: "/",
    siteName: "DriveScope",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DriveScope — Intelligent Car Decision Engine",
    description: "Compare vehicles, simulate ownership costs, and understand which variant actually fits your life. Real physics. Real costs.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${cormorantGaramond.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "DriveScope",
              "url": "https://drivescope.com", // use actual domain when deployed
              "description": "India's intelligent car decision platform.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://drivescope.com/explore?search={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <FirebaseAnalytics />
        {/* First-load F1 intro overlay — plays on ANY entry route, then reveals the requested page */}
        <IntroSequence />
        <Navbar />
        <main className="flex-1">{children}</main>
        <ChatbotWidget />
        <footer className="border-t border-[#161616]/10 mt-auto bg-[#F5F1E8] text-[#161616]">
          <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm font-bold tracking-tight font-mono">
              Drive<span className="text-[#C84C31]">Scope</span>
            </p>
            <p className="text-xs text-[#161616]/60 max-w-sm font-mono">
              Estimated figures are modeled, not tested — look for the ~ estimated badge. Prices are ex-showroom; on-road varies by city and RTO.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
