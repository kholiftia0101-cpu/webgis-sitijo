import type { Metadata } from "next";
import TambahDataClient from "@/components/tambah-data/TambahDataClient";
import "./tambah-data.css";

export const metadata: Metadata = {
  title: "Tambah Data Infrastruktur | SITIJO",
  description: "Tambah data infrastruktur ke WebGIS SITIJO.",
};

export default function TambahDataPage() {
  return <TambahDataClient />;
}
