
import { cek_role } from "@/lib/auth/cek_role";
import JenisDataClient from "../../components/jenisdata/JenisDataClient";
import header from "@/components/layout/header";
export default async function JenisDataPage() {
  await cek_role();

  return <JenisDataClient />;
}
