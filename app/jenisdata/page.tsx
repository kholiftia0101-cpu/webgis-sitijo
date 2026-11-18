
import { cek_role } from "@/lib/auth/cek_role";
import JenisDataClient from "../../components/jenisdata/JenisDataClient";

export default async function JenisDataPage() {
  await cek_role();

  return <JenisDataClient />;
}
