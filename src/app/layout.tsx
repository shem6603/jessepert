import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "Clarified Educator - Landing Page",
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
    title: "Clarified Educator - Landing Page",
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
      className={`light ${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground [text-size-adjust:100%] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]">
        <FirebaseAnalytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}