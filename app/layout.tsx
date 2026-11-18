import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SITIJO | Sistem Informasi Infrastruktur Kota Yogyakarta", description: "Sistem Informasi Infrastruktur Kota Yogyakarta — DPUPKP" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="id"><body>{children}</body></html>; }
