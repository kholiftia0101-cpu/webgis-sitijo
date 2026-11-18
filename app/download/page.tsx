import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import DownloadDataClient from "@/components/download/DownloadDataClient";
import "./download.css";

export const dynamic = "force-dynamic";

export default async function DownloadPage() {
  const user = await getSession();

  if (!user) {
    redirect("/signin?redirect=%2Fdownload");
  }

  return (
    <DownloadDataClient
      username={user.username}
      unit={user.unit}
    />
  );
}
