import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ShiftTypeLabelsProvider } from "@/components/ShiftTypeLabelsProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos",
    template: "%s · Diario de Turnos",
  },
  description:
    "Diario mural de turnos para planificar, asignar y comunicar los turnos de tu equipo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d57f5",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${jakarta.variable} ${mono.variable}`}>
      <body className="font-sans text-slate-900">
        <ShiftTypeLabelsProvider>{children}</ShiftTypeLabelsProvider>
      </body>
    </html>
  );
}
