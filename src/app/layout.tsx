import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ShiftTypeLabelsProvider } from "@/components/ShiftTypeLabelsProvider";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Diario de Turnos",
  description: "Diario mural de turnos para trabajadores",
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
    <html lang="es">
      <body className="font-sans text-slate-900">
        <ShiftTypeLabelsProvider>{children}</ShiftTypeLabelsProvider>
      </body>
    </html>
  );
}
