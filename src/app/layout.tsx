import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ShiftTypeLabelsProvider } from "@/components/ShiftTypeLabelsProvider";

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  weight: "200 800",
  variable: "--font-geist-sans",
  display: "swap",
});

const mono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  variable: "--font-geist-mono",
  display: "swap",
});

const display = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  weight: "300 700",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos",
    template: "%s · Diario de Turnos",
  },
  description:
    "Diario mural de turnos para planificar, asignar y comunicar los turnos de tu equipo.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050510",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${jakarta.variable} ${mono.variable} ${display.variable}`}>
      <body className="font-sans text-slate-100">
        <ShiftTypeLabelsProvider>{children}</ShiftTypeLabelsProvider>
      </body>
    </html>
  );
}
