
import Link from "next/link";

const content: Record<string, { title: string; desc: string }> = {
  jenisdata: {
    title: "Jenis Data Infrastruktur",
    desc: "Informasi ketersediaan data infrastruktur pada WEBGIS SITIJO.",
  },
  info: {
    title: "Informasi Profil DPUPKP Kota Yogyakarta",
    desc: "Profil Dinas Pekerjaan Umum Perumahan dan Kawasan Permukiman Kota Yogyakarta.",
  },
  panduan: {
    title: "Panduan Penggunaan",
    desc: "Panduan penggunaan WEBGIS SITIJO untuk pengelolaan data infrastruktur.",
  },
  update: {
    title: "Update Data Infrastruktur",
    desc: "Fitur pembaruan atribut dan geometri data infrastruktur. Silakan masuk untuk melanjutkan.",
  },
  tambah: {
    title: "Tambah Data Infrastruktur",
    desc: "Fitur penambahan data spasial infrastruktur. Silakan masuk untuk melanjutkan.",
  },
  download: {
    title: "Download Data Infrastruktur",
    desc: "Unduh data infrastruktur sesuai hak akses pengguna.",
  },
  riwayat: {
    title: "Riwayat Akses Pengguna",
    desc: "Riwayat aktivitas dan akses pengguna WEBGIS SITIJO.",
  },
  login: {
    title: "Sign In SITIJO",
    desc: "Akses terbatas untuk Bidang, UPT, dan pihak terkait DPUPKP Kota Yogyakarta.",
  },
};

const errorMessages: Record<string, string> = {
  empty: "Username dan password harus diisi.",
  username: "Username tidak ditemukan.",
  password: "Password salah.",
  database: "Terjadi kesalahan saat mengakses database.",
  server: "Terjadi kesalahan pada server.",
};

type SectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function SectionPage({
  params,
  searchParams,
}: SectionPageProps) {
  const { section } = await params;
  const query = await searchParams;

  const item = content[section] || {
    title: "Halaman SITIJO",
    desc: "Modul ini sedang disiapkan dalam proses migrasi.",
  };

  const error = query.error
    ? errorMessages[query.error]
    : undefined;

  return (
    <main className="subpage">
      <header className="sub-header">
        <Link href="/" className="sub-brand">
          SITIJO
        </Link>

        <Link href="/">
          ⌂ Beranda
        </Link>
      </header>

      <section className="sub-card">
        <span className="section-kicker">
          SISTEM INFORMASI INFRASTRUKTUR KOTA YOGYAKARTA
        </span>

        <h1>{item.title}</h1>
        <p>{item.desc}</p>

        {section === "login" ? (
          <>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            <form
              className="login-form"
              action="/api/auth/cek_signin"
              method="POST"
            >
              <input
                type="hidden"
                name="redirect"
                value="/peta"
                />

              <label>
                Username
                <input
                  type="text"
                  name="username"
                  placeholder="Masukkan username"
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                />
              </label>

              <label className="remember">
                <input
                  type="checkbox"
                  name="remember"
                />
                Remember me!
              </label>

              <button type="submit">
                SIGN IN
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/peta"
            className="outline-button"
          >
            Buka Peta Infrastruktur →
          </Link>
        )}
      </section>

      <footer className="sub-footer">
        © 2025 DPUPKP Kota Yogyakarta · SITIJO
      </footer>
    </main>
  );
}
