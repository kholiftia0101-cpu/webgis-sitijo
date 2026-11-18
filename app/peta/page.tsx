
import Link from "next/link";
import { cek_role } from "@/lib/auth/cek_role";
import MapClientLoader from "@/components/map/MapClientLoader";

export default async function PetaPage() {
  await cek_role();

  return (
    <main className="map-page">
      <header className="map-header">
        <div className="map-brand">
          <b>SITIJO</b>
          <span>
            Sistem Informasi Infrastruktur Kota Yogyakarta
          </span>
        </div>

        <Link href="/" className="map-home">
          Beranda
        </Link>
      </header>

      <section className="map-content">
        <MapClientLoader />
      </section>
    </main>
  );
}
