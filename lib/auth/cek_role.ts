
import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function cek_role() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Mengikuti aturan cek_role.php lama.
  const canAdd = true;
  const canEdit = true;
  const canDelete = true;

  return {
    user,
    canAdd,
    canEdit,
    canDelete,
  };
}
