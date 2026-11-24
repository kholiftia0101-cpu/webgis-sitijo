import Link from "next/link";

const PDF_URL =
  "https://pub-713a8976c18a46cbb1c4eccac3de6a2a.r2.dev/assets/panduan-webgis-sitijo.pdf";

export default function PanduanPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
      }}
    >
      <header
        style={{
          padding: "18px 5%",
          background: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#17365d" }}>
            Panduan Penggunaan SITIJO
          </h2>
          <small style={{ color: "#64748b" }}>
            Sistem Informasi Infrastruktur Kota Yogyakarta
          </small>
        </div>

        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "#17365d",
            fontWeight: 600,
          }}
        >
          ← Beranda
        </Link>
      </header>

      <section
        style={{
          padding: "20px 4%",
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 5px" }}>
              Buku Panduan WEBGIS SITIJO
            </h3>
            <small style={{ color: "#64748b" }}>
              Preview dokumen panduan penggunaan
            </small>
          </div>

          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#17365d",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Download Panduan PDF ↓
          </a>
        </div>

        <div
          style={{
            height: "calc(100vh - 190px)",
            minHeight: 600,
            background: "#fff",
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
          }}
        >
          <iframe
            src={`${PDF_URL}#toolbar=1&navpanes=1&view=FitH`}
            title="Panduan Penggunaan WEBGIS SITIJO"
            width="100%"
            height="100%"
            style={{ border: 0 }}
          />
        </div>
      </section>
    </main>
  );
}
