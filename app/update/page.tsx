import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import UpdateDataClient from "@/components/update/UpdateDataClient";
import "./update.css";

export const dynamic = "force-dynamic";

export default async function UpdatePage() {
  const user = await getSession();
  if (!user) redirect("/signin?redirect=%2Fupdate");
  return <UpdateDataClient username={user.username} unit={user.unit} />;
}
