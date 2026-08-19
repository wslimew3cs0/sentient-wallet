import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: "Sentient Wallet · AI Risk & Programmable Policy",
    description:
      "An educational prototype combining explainable behavioral-risk scoring with programmable smart-account controls.",
    openGraph: {
      title: "Sentient Wallet",
      description:
        "Explainable machine-learning risk meets programmable transaction friction.",
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Sentient Wallet behavioral guardian and risk score",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Sentient Wallet",
      description:
        "Explainable machine-learning risk meets programmable transaction friction.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-app="sentient-wallet">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
