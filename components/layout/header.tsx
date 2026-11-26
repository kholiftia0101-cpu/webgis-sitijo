
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
      <div className="header-inner">
        {/* BRAND */}
        <Link href="/" className="brand" aria-label="SITIJO Beranda">
          <div className="brand-logos">
            <img
              src={asset("jogja.png")}
              alt="Logo Pemerintah Kota Yogyakarta"
              className="brand-logo brand-logo-jogja"
            />
            <img
              src={asset("logo.png")}
              alt="Logo DPUPKP"
              className="brand-logo brand-logo-dinas"
            />
          </div>

          <div className="brand-divider" />

          <div className="brand-copy">
            <div className="brand-title-row">
              <b>SITIJO</b>
              <span className="brand-version">PORTAL GIS</span>
            </div>

            <span className="brand-description">
              Sistem Informasi Infrastruktur Kota Yogyakarta
            </span>

            <small>
              Dinas Pekerjaan Umum Perumahan dan Kawasan Permukiman
            </small>
          </div>
        </Link>

        {/* NAVIGATION */}
        <div className="header-navigation">
          <div className="header-caption">
            <span className="header-status-dot" />
            <span>INTEGRATED INFRASTRUCTURE DATA</span>
          </div>

          <nav className="main-nav" aria-label="Navigasi utama">
            <Link href="/" className="nav-link">
              Beranda
            </Link>

            <Link
              href={protectedHref("/jenisdata")}
              className="nav-link"
            >
              Jenis Data
            </Link>

            <details className="nav-dropdown">
              <summary className="nav-link nav-dropdown-trigger">
                Data Infrastruktur
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m5 7.5 5 5 5-5" />
                </svg>
              </summary>

              <div className="dropdown-panel">
                <div className="dropdown-heading">
                  <span>DATA CENTER</span>
                  <small>Kelola data infrastruktur</small>
                </div>

                <Link href={protectedHref("/peta")}>
                  <span className="dropdown-icon">01</span>
                  <span>
                    <b>Peta Infrastruktur</b>
                    <small>Visualisasi data spasial</small>
                  </span>
                </Link>

                <Link href={protectedHref("/update")}>
                  <span className="dropdown-icon">02</span>
                  <span>
                    <b>Update Data</b>
                    <small>Pembaruan informasi data</small>
                  </span>
                </Link>

                <Link href={protectedHref("/tambah_data")}>
                  <span className="dropdown-icon">03</span>
                  <span>
                    <b>Tambah Data</b>
                    <small>Input data infrastruktur</small>
                  </span>
                </Link>

                <Link href={protectedHref("/download")}>
                  <span className="dropdown-icon">04</span>
                  <span>
                    <b>Download Data</b>
                    <small>Unduh data dan informasi</small>
                  </span>
                </Link>
              </div>
            </details>

            {isAdmin && (
              <Link href="/riwayat" className="nav-link">
                Riwayat Akses
              </Link>
            )}

            <Link
              href={protectedHref("/panduan")}
              className="nav-link"
            >
              Panduan
            </Link>

            <div className="nav-auth">
              {isLoggedIn ? (
                <>
                  <div className="user-profile">
                    <span className="user-avatar">
                      {String(user?.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <span className="user-name">
                      {user?.username}
                    </span>
                  </div>

                  <form action="/api/auth/signout" method="POST">
                    <button type="submit" className="signin-button logout-button">
                      Logout
                      <span aria-hidden="true">↗</span>
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="signin-button">
                  <span>Sign In</span>
                  <span className="signin-arrow" aria-hidden="true">↗</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
