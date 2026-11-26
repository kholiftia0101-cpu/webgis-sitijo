
import Link from "next/link";
import { getSession } from "@/lib/auth/session";

const asset = (name: string) =>
  `${process.env.NEXT_PUBLIC_ASSET_BASE || "https://sitijo-assets.ruli-andaru.workers.dev"}/assets/${name}`;

export default async function Header() {
  const user = await getSession();

  const isLoggedIn = Boolean(user);
  const isAdmin =
    String(user?.unit || "").toLowerCase() === "admin";

  const protectedHref = (href: string) =>
    isLoggedIn
      ? href
      : `/login?redirect=${encodeURIComponent(href)}`;

  return (
    <header className="site-header">
      <div className="brand">
        <img src={asset("jogja.png")} alt="Logo Jogja" />
        <img src={asset("logo.png")} alt="Logo DPUPKP" />

        <div>
          <b>SITIJO</b>
          <span>
            Sistem Informasi Infrastruktur Kota Yogyakarta
          </span>
          <small>
            Dinas Pekerjaan Umum Perumahan dan Kawasan Permukiman
          </small>
        </div>
      </div>

      <nav>
        <Link href="/">Beranda</Link>

        <Link href={protectedHref("/jenisdata")}>
          Jenis Data
        </Link>

        <div className="navdrop">
          <span>Data Infrastruktur ▾</span>

          <div className="dropdown">
            <Link href={protectedHref("/peta")}>
              Peta Infrastruktur
            </Link>

            <Link href={protectedHref("/update")}>
              Update Data
            </Link>

            <Link href={protectedHref("/tambah_data")}>
              Tambah Data
            </Link>

            <Link href={protectedHref("/download")}>
              Download Data
            </Link>
          </div>
        </div>

        {isAdmin && (
          <Link href="/riwayat">
            Riwayat Akses
          </Link>
        )}

        <Link href={protectedHref("/panduan")}>
          Panduan Penggunaan
        </Link>

        {isLoggedIn ? (
          <div className="nav-user">
            <span className="nav-username">
              {user?.username}
            </span>

            <form
              action="/api/auth/signout"
              method="POST"
            >
              <button type="submit" className="signin">
                Logout
              </button>
            </form>
          </div>
        ) : (
          <Link className="signin" href="/login">
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}
