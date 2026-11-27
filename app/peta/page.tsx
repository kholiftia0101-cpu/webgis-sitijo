
import Link from "next/link";
import { cek_role } from "@/lib/auth/cek_role";
import MapClientLoader from "@/components/map/MapClientLoader";

export default async function PetaPage() {
  await cek_role();

  return (
    <main className="map-page">
   <Header />

      <section className="map-content">
        <MapClientLoader />
      </section>
    </main>
  );
}
