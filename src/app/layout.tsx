import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "Jesspert | AI Teaching Assistant for Jamaican Educators",
  description: "Get back more than 8 hours of your week. Jesspert is an AI-powered assistant for Jamaica's Basic, Primary, and Secondary teachers that handles grading, lesson planning, and admin work.",
  keywords: [
    "AI teaching assistant",
    "Jamaican teachers",
    "PEP lesson plans",
    "CSEC rubrics",
    "mark papers online",
    "primary school Jamaica",
    "early childhood education Jamaica",
    "teacher time saver"
  ],
  openGraph: {
    title: "Jesspert | AI Teaching Assistant for Jamaican Educators",
    description: "Stop spending your evenings on unpaid work. Jesspert handles grading and lesson planning for Basic, Primary, and Secondary educators.",
    type: "website",
    locale: "en_JM",
    siteName: "Jesspert",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground [text-size-adjust:100%] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]">
        <FirebaseAnalytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}