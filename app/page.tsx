
import Link from "next/link";
import { getSession } from "@/lib/auth/session";

const asset = (name: string) =>
  `${process.env.NEXT_PUBLIC_ASSET_BASE || "https://sitijo-assets.ruli-andaru.workers.dev"}/assets/${name}`;

const features = [
  ["profil.png", "Informasi Profil DPUPKP Kota Yogyakarta", "/info"],
  ["data.png", "Ketersediaan Data Infrastruktur", "/jenisdata"],
  ["peta.png", "Peta Infrastruktur", "/peta"],
  ["update.png", "Update Data Infrastruktur", "/update"],
  ["tambah.png", "Tambah Data Infrastruktur", "/tambah"],
  ["download.png", "Download Data Infrastruktur", "/download"],
  ["riwayat.png", "Riwayat Akses Pengguna", "/riwayat"],
  ["panduan.png", "Panduan Penggunaan WEBGIS SITIJO", "/panduan"],
];

const departments = [
  ["penataan_bangunan.png", "Bidang Penataan Bangunan"],
  ["konstruksi.png", "Bidang Pengendalian & Pembinaan Jasa Konstruksi"],
  ["perumahan.png", "Bidang Perumahan & Kawasan Permukiman"],
  ["jalan_jembatan.png", "Bidang Jalan & Jembatan"],
  ["drainase.png", "Bidang Sumber Daya Air & Drainase"],
  ["pal.png", "UPT Pengelolaan Air Limbah"],
  ["rusunawa.png", "UPT Pengelolaan Rusunawa"],
  ["pju.png", "UPT Penerangan Jalan Umum"],
];

export default async function Home() {
  const user = await getSession();

  const isLoggedIn = Boolean(user);
  const isAdmin =
    String(user?.unit || "").toLowerCase() === "admin";

  // Semua halaman internal memerlukan login.
  // Riwayat akses hanya ditampilkan untuk admin.
  const protectedHref = (href: string) =>
    isLoggedIn ? href : `/login?redirect=${encodeURIComponent(href)}`;

  const visibleFeatures = features.filter(([, , href]) => {
    if (href === "/riwayat" && !isAdmin) {
      return false;
    }

    return true;
  });

  return (
    <main className="home">
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
            Data Infrastruktur ▾

            <div className="dropdown">
              <Link href={protectedHref("/peta")}>
                Peta Infrastruktur
              </Link>

              <Link href={protectedHref("/update")}>
                Update Data
              </Link>

              <Link href={protectedHref("/tambah")}>
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
                <button
                  type="submit"
                  className="signin"
                >
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

      <section
        className="hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(0,26,58,.82),rgba(0,37,74,.35)),url(${asset("background.jpg")})`,
        }}
      >
        <div className="hero-copy">
          <span className="eyebrow">
            WEBGIS INFRASTRUKTUR KOTA YOGYAKARTA
          </span>

          <h1>
            Satu Data, Satu Peta
            <br />
            Infrastruktur Kota Yogyakarta
          </h1>

          <p>
            Sistem Informasi Infrastruktur Kota Yogyakarta
            (SITIJO) merupakan platform digital internal Dinas
            Pekerjaan Umum, Perumahan dan Kawasan Permukiman
            Kota Yogyakarta yang menyajikan data spasial dan
            data atribut penunjang infrastruktur Kota Yogyakarta.
          </p>

          <Link
            className="gold-button"
            href={protectedHref("/peta")}
          >
            Explore Peta <span>→</span>
          </Link>
        </div>
      </section>

      <section className="intro-grid">
        <article>
          <span className="section-kicker">
            KOLABORASI DAN INTEGRASI DATA
          </span>

          <h2>Kolaborasi dan Integrasi Data</h2>

          <p>
            Website based Geographic Information System
            (WEBGIS) SITIJO dapat digunakan sebagai sarana
            koordinasi antar Bidang dan UPT di lingkup DPUPKP
            Kota Yogyakarta untuk pengelolaan data infrastruktur.
          </p>
        </article>

        <article className="access-card">
          <div className="lock">♙</div>

          <h2>
            {isLoggedIn
              ? "Akses Berhasil Diaktifkan"
              : "Akses Terbatas dan Terlindungi"}
          </h2>

          <p>
            {isLoggedIn
              ? `Selamat datang, ${user?.username}. Kamu sudah login dan dapat mengakses menu sesuai hak akses akun.`
              : "Platform digital ini hanya dapat diakses oleh Bidang, UPT, dan beberapa pihak terkait di lingkup DPUPKP Kota Yogyakarta."}
          </p>

          {isLoggedIn ? (
            <Link href="/peta">
              Buka Peta Infrastruktur →
            </Link>
          ) : (
            <Link href="/login">
              Sign In →
            </Link>
          )}
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="section-kicker">
            FITUR YANG TERSEDIA PADA WEBGIS SITIJO
          </span>

          <h2>Fitur WEBGIS SITIJO</h2>

          <p>
            Seluruh kebutuhan informasi dan pengelolaan data
            infrastruktur dalam satu platform.
          </p>
        </div>

        <div className="feature-grid">
          {visibleFeatures.map(([img, label, href]) => (
            <Link
              href={protectedHref(href)}
              className="feature-card"
              key={label}
            >
              <img src={asset(img)} alt="" />

              <strong>{label}</strong>

              <span>
                {isLoggedIn
                  ? "Jelajahi fitur →"
                  : "Login untuk mengakses →"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section department-section">
        <div className="section-heading">
          <span className="section-kicker">
            BIDANG TERKAIT
          </span>

          <h2>Data Infrastruktur pada WEBGIS SITIJO</h2>

          <p>
            Telusuri bidang-bidang yang berkaitan dengan
            penyajian data geospasial pada Sistem Informasi
            Infrastruktur Kota Yogyakarta (SITIJO).
          </p>
        </div>

        <div className="department-grid">
          {departments.map(([img, label]) => (
            <article
              className="department-card"
              key={label}
            >
              <img src={asset(img)} alt="" />
              <h3>{label}</h3>
            </article>
          ))}
        </div>

        <div className="center">
          <Link
            href={protectedHref("/jenisdata")}
            className="outline-button"
          >
            Lihat Semua
          </Link>
        </div>
      </section>

      <section className="section external">
        <div>
          <span className="section-kicker">
            WEBSITE DPUPKP KOTA YOGYAKARTA
          </span>

          <h2>
            Ketersediaan Website di DPUPKP Kota Yogyakarta
          </h2>
        </div>

        <div className="external-links">
          <a
            href="https://lintas.geo-ai.id"
            target="_blank"
            rel="noopener noreferrer"
          >
            LINTAS — Layanan Informasi Jembatan Kota Yogyakarta ↗
          </a>

          <a
            href="https://pu.jogjakota.go.id"
            target="_blank"
            rel="noopener noreferrer"
          >
            Website DPUPKP Kota Yogyakarta ↗
          </a>

          <a
            href="https://yogyapsu.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            YOGYAPSU — Sistem Informasi PSU Perumahan ↗
          </a>
        </div>
      </section>

      <section className="facts">
        <div className="section-heading">
          <span className="section-kicker">
            KILAS BATASAN DATA
          </span>

          <h2>Kilas Batasan Data Kota Yogyakarta</h2>

          <p>
            Kota Yogyakarta secara astronomis terletak di
            antara 7°15&apos;24&quot; sampai dengan 7°49&apos;26&quot; Lintang
            Selatan dan 110°24&apos;19&quot; sampai dengan 110°28&apos;53&quot;
            Bujur Timur, dengan ketinggian rata-rata 114 m
            di atas permukaan laut.
          </p>
        </div>

        <div className="stat-grid">
          {[
            ["luas.png", "0", "Luas Wilayah (km²)"],
            ["kecamatan.png", "14", "Kemantren"],
            ["kelurahan.png", "45", "Kelurahan"],
            ["rw.png", "0", "RW"],
            ["rt.png", "0", "RT"],
          ].map(([img, n, label]) => (
            <div className="stat" key={label}>
              <img src={asset(img)} alt="" />
              <b>{n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div>
          <h2>DPUPKP KOTA YOGYAKARTA</h2>

          <p>
            Dinas Pekerjaan Umum Perumahan dan Kawasan
            Permukiman
            <br />
            Pemerintah Kota Yogyakarta
          </p>

          <p>
            Jl. Kenari No. 56, Kelurahan Muja Muju,
            Kemantren Umbulharjo,
            <br />
            Kota Yogyakarta, Daerah Istimewa Yogyakarta 55165
          </p>
        </div>

        <div>
          <b>Kontak</b>

          <p>
            Telepon: (0274) 515867, (0274) 586795,
            (0274) 515866
          </p>

          <p>Email: puperkim@jogjakota.go.id</p>
        </div>

        <small>
          © 2025 Dinas Pekerjaan Umum, Perumahan dan
          Kawasan Permukiman Kota Yogyakarta
        </small>
      </footer>
    </main>
  );
}
