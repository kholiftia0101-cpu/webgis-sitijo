"use client";

import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

type KelasData = {
  icon: string;
  desc: string;
  subkelas: string[];
  chartData: number[];
  jumlahData: (string | number)[];
};

const asset = (name: string) =>
  `${process.env.NEXT_PUBLIC_ASSET_BASE || "https://sitijo-assets.ruli-andaru.workers.dev"}/assets/${name}`;

const dataManual: Record<string, KelasData> = {
  "Atribut Jalan": {
    icon: "atribut_jalan.jpg",
    desc: "Atribut Jalan merupakan fasilitas penunjang di sepanjang area jalan yang mencakup cermin jalan, kamera pengawas, lampu jalan, lampu lalu lintas, dan rambu lalu lintas.",
    subkelas: [
      "Cermin Jalan",
      "Kamera Pengawas",
      "Lampu Jalan",
      "Lampu Lalu Lintas",
      "Rambu Lalu Lintas",
    ],
    chartData: [8.7, 8.7, 100, 26.09, 26.09],
    jumlahData: [
      "25 Fitur",
      "29 Fitur",
      "9290 Fitur",
      "517 Fitur",
      "1767 Fitur",
    ],
  },

  Bangunan: {
    icon: "bangunan.jpg",
    desc: "Berdasarkan Peraturan Pemerintah Republik Indonesia Nomor 16 Tahun 2021 tentang Peraturan Pelaksanaan Undang-Undang Nomor 28 Tahun 2002 tentang Bangunan Gedung, bahwa bangunan gedung merupakan wujud fisik hasil pekerjaan konstruksi yang menyatu dengan tempat kedudukannya, sebagian atau seluruhnya berada di atas dan/atau di dalam tanah dan/atau di air, yang berfungsi sebagai tempat manusia melakukan kegiatannya, baik untuk hunian atau tempat tinggal, kegiatan keagamaan, kegiatan usaha, kegiatan sosial dan budaya, maupun kegiatan khusus.",
    subkelas: ["Bangunan", "Rusunawa"],
    chartData: [33.33, 0],
    jumlahData: ["Fitur Bangunan Tahap 1", "0"],
  },

  Halte: {
    icon: "halte.jpg",
    desc: "Berdasarkan Peraturan Menteri Perhubungan Republik Indonesia Nomor PM 15 Tahun 2019 tentang Penyelenggaraan Angkutan Orang dengan Kendaraan Bermotor Umum dalam Trayek, bahwa halte adalah tempat persinggahan atau rambu pemberhentian angkutan umum yang dilalui oleh setiap trayek yang melayani angkutan secara terus menerus serta berhenti pada tempat untuk menaikkan dan menurunkan penumpang yang telah ditetapkan untuk angkutan perkotaan.",
    subkelas: ["Titik Halte", "Jalur Halte Trans"],
    chartData: [100, 100],
    jumlahData: ["180 Fitur", "280 km"],
  },

  "Infrastruktur Pendukung": {
    icon: "utilitas_pendukung.jpg",
    desc: "Infrastruktur Pendukung merupakan fasilitas penunjang infrastruktur yang mencakup hidran, rantai pasok, reklame, dan titik bench mark.",
    subkelas: [
      "Hidran",
      "Rantai Pasok",
      "Reklame",
      "Titik Bench Mark",
    ],
    chartData: [8.7, 100, 26.09, 26.09],
    jumlahData: [
      "6 Fitur",
      "183 Fitur",
      "294 Fitur",
      "70 Fitur",
    ],
  },

  "Jaringan Drainase": {
    icon: "jaringan_drainase.png",
    desc: "Berdasarkan Peraturan Menteri Pekerjaan Umum dan Perumahan Rakyat Republik Indonesia Nomor 12/PRT/M/2014 tentang Penyelenggaraan Sistem Drainase Perkotaan, bahwa sistem drainase perkotaan adalah satu kesatuan sistem teknis dan non teknis dari prasarana dan sarana drainase perkotaan. Prasarana drainase adalah lengkungan atau saluran air di permukaan atau di bawah tanah, baik yang terbentuk secara alami maupun dibuat oleh manusia, yang berfungsi menyalurkan kelebihan air dari suatu kawasan ke badan air penerima.",
    subkelas: [
      "Inlet",
      "Manhole Drainase",
      "Sumur Resapan",
      "Zona Drainase",
    ],
    chartData: [26.09, 26.09, 100, 100],
    jumlahData: [
      "7865 Fitur",
      "3363 Fitur",
      "2443 Fitur",
      "387 km",
    ],
  },

  "Jaringan Fiber Optik": {
    icon: "jaringan_fo.jpg",
    desc: "Jaringan Fiber Optik merupakan teknologi transmisi data yang menggunakan bahan serat kaca atau plastik untuk mentransmisikan sinyal cahaya dari satu lokasi ke lokasi lainnya yang mencakup kabel fiber optik, manhole fiber optik, dan tiang fiber optik.",
    subkelas: [
      "Kabel Fiber Optik",
      "Manhole Fiber Optik",
      "Tiang Fiber Optik",
    ],
    chartData: [26.09, 26.09, 26.09],
    jumlahData: ["324 km", "341 Fitur", "1960 Fitur"],
  },

  "Jaringan Instalasi Pengolahan Air Limbah": {
    icon: "jaringan_ipal.jpg",
    desc: "Berdasarkan Peraturan Menteri Pekerjaan Umum dan Perumahan Rakyat Republik Indonesia Nomor 4/PRT/M/2017 tentang Penyelenggaraan Sistem Pengelolaan Air Limbah Domestik (SPALD), bahwa sistem pengelolaan air limbah domestik adalah serangkaian kegiatan pengelolaan air limbah domestik dalam satu kesatuan dengan prasarana dan sarana pengelolaan air limbah domestik.",
    subkelas: [
      "Manhole Saluran Air Limbah",
      "Pipa Induk",
      "Pipa Glontor",
      "Pipa Lateral",
    ],
    chartData: [26.09, 100, 100, 100],
    jumlahData: [
      "1511 Fitur",
      "58 km",
      "115 km",
      "22 km",
    ],
  },

  "Jaringan Jalan": {
    icon: "jaringan_jalan.jpg",
    desc: "Berdasarkan Undang-Undang Republik Indonesia Nomor 38 Tahun 2004 tentang Jalan, bahwa jalan adalah prasarana transportasi darat yang meliputi segala bagian jalan, termasuk bangunan pelengkap dan perlengkapannya yang diperuntukkan bagi lalu lintas, yang berada pada permukaan tanah, di atas permukaan tanah, di bawah permukaan tanah dan/atau air, serta di atas permukaan air, kecuali jalan kereta api, jalan lori, dan jalan kabel.",
    subkelas: [
      "Jembatan",
      "Jalan Lingkungan",
      "Jalan Kota",
      "Jalur Pemandu",
      "Trotoar",
    ],
    chartData: [100, 100, 100, 26.09, 100],
    jumlahData: [
      "54 Fitur",
      "594 km",
      "230 km",
      0,
      0,
    ],
  },

  "Jaringan Listrik": {
    icon: "jaringan_listrik.jpg",
    desc: "Berdasarkan Peraturan Menteri Energi dan Sumber Daya Mineral Republik Indonesia Nomor 20 Tahun 2020 tentang Aturan Jaringan Sistem Tenaga Listrik (Grid Code), bahwa sistem tenaga listrik adalah suatu rangkaian dalam tenaga listrik yang berfungsi untuk menyalurkan tenaga listrik dari pembangkit tenaga listrik ke konsumen tenaga listrik.",
    subkelas: [
      "Jaringan Kabel Listrik Tegangan Menengah",
      "Jaringan Kabel Listrik Tegangan Rendah",
      "Rumah Kabel",
      "Tiang Listrik",
      "Trafo Listrik",
    ],
    chartData: [100, 100, 8.7, 26.09, 8.7],
    jumlahData: [
      "190 km",
      "232 km",
      "115 Fitur",
      "2771 Fitur",
      "310 Fitur",
    ],
  },

  "Jaringan Perusahaan Daerah Air Minum": {
    icon: "jaringan_pdam.jpg",
    desc: "Berdasarkan Peraturan Menteri Pekerjaan Umum dan Perumahan Rakyat Republik Indonesia Nomor 4 Tahun 2020 tentang Prosedur Operasional Standar Penyelenggaraan Sistem Penyediaan Air Minum, bahwa sistem penyediaan air minum merupakan satu kesatuan sarana dan prasarana penyediaan air minum yang mengikuti proses dasar manajemen untuk penyediaan air minum kepada masyarakat.",
    subkelas: [
      "Jaringan Perusahaan Daerah Air Minum",
    ],
    chartData: [100],
    jumlahData: ["699 km"],
  },

  Sungai: {
    icon: "sungai.jpg",
    desc: "Berdasarkan Peraturan Pemerintah Republik Indonesia Nomor 38 Tahun 2011 tentang Sungai, bahwa sungai adalah alur atau wadah air alami dan/atau buatan berupa jaringan pengaliran air beserta air di dalamnya, mulai dari hulu sampai muara, dengan dibatasi kanan dan kiri oleh garis sempadan.",
    subkelas: ["Sungai"],
    chartData: [100],
    jumlahData: ["49 km"],
  },
};




export default function JenisDataClient() {
  const [selectedKelas, setSelectedKelas] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const selectedData = selectedKelas ? dataManual[selectedKelas] : null;

  useEffect(() => {
    if (!selectedData || !canvasRef.current) return;

    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: selectedData.subkelas,
        datasets: [{
          label: "Ketersediaan data",
          data: selectedData.chartData,
          backgroundColor: selectedData.chartData.map((value, index) => {
            const palette = ["#3B82F6", "#14B8A6", "#8B5CF6", "#F59E0B", "#0EA5E9"];
            return palette[index % palette.length];
          }),
          borderRadius: 7,
          borderSkipped: false,
          barThickness: 23,
          maxBarThickness: 27,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: "easeOutQuart" },
        layout: { padding: { top: 8, right: 18, bottom: 2, left: 2 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: "#10243D",
            titleColor: "#FFFFFF",
            bodyColor: "#E7F0FA",
            padding: 12,
            cornerRadius: 9,
            callbacks: {
              label: (context) => `Progres: ${Number(context.raw).toLocaleString("id-ID")}%`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            min: 0,
            max: 100,
            border: { display: false },
            ticks: {
              stepSize: 20,
              callback: (value) => `${value}%`,
              color: "#718096",
              font: { size: 11, family: "Inter, Arial, sans-serif" },
              padding: 9,
            },
            grid: { color: "#E9EEF5", drawTicks: false },
          },
          y: {
            border: { display: false },
            ticks: {
              color: "#334155",
              font: { size: 11, weight: "600", family: "Inter, Arial, sans-serif" },
              padding: 12,
            },
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [selectedData]);

  useEffect(() => {
    if (!selectedKelas) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedKelas(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedKelas]);

  const closeModal = () => setSelectedKelas(null);

  return (
    <main className="jd-page">
      <div className="jd-shell">
        <section className="jd-intro">
          <div className="jd-intro-copy">
            <div className="jd-eyebrow">
              <span className="jd-eyebrow-dot" />
              SISTEM INFORMASI INFRASTRUKTUR KOTA YOGYAKARTA
            </div>
            <h1>Jenis Data Infrastruktur</h1>
            <p>
              Jelajahi klasifikasi data infrastruktur, informasi setiap subkelas,
              serta progres ketersediaan data dalam satu tampilan terpadu.
            </p>
          </div>
          <div className="jd-intro-mark" aria-hidden="true">
            <div className="jd-mark-ring jd-mark-ring-one" />
            <div className="jd-mark-ring jd-mark-ring-two" />
            <div className="jd-mark-core"><span>SI</span></div>
            <i className="jd-mark-dot jd-mark-dot-one" />
            <i className="jd-mark-dot jd-mark-dot-two" />
          </div>
        </section>

        <div className="jd-section-heading">
          <div>
            <span className="jd-section-kicker">KATALOG DATA</span>
            <h2>Klasifikasi Infrastruktur</h2>
            <p>Pilih salah satu kelas untuk melihat rincian informasi.</p>
          </div>
          <div className="jd-class-count">
            <strong>{Object.keys(dataManual).length.toString().padStart(2, "0")}</strong>
            <span>Kelas data</span>
          </div>
        </div>

        <div className="jd-grid">
          {Object.entries(dataManual).map(([kelas, meta], index) => (
            <button
              type="button"
              className="jd-card"
              key={kelas}
              onClick={() => setSelectedKelas(kelas)}
              aria-label={`Lihat detail ${kelas}`}
            >
              <div className="jd-card-image">
                <img src={asset(meta.icon)} alt="" loading="lazy" />
                <span className="jd-card-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="jd-card-open" aria-hidden="true">↗</span>
              </div>
              <div className="jd-card-content">
                <span className="jd-card-label">KELAS INFRASTRUKTUR</span>
                <strong>{kelas}</strong>
                <div className="jd-card-footer">
                  <span>{meta.subkelas.length} subkelas</span>
                  <span className="jd-card-link">Lihat detail <b>→</b></span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedKelas && selectedData && (
        <div className="jd-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <section className="jd-modal" role="dialog" aria-modal="true" aria-labelledby="jd-modal-title">
            <header className="jd-modal-header">
              <div className="jd-modal-heading">
                <div className="jd-modal-symbol">SI</div>
                <div>
                  <span className="jd-modal-kicker">DETAIL KELAS INFRASTRUKTUR</span>
                  <h2 id="jd-modal-title">{selectedKelas}</h2>
                </div>
              </div>
              <button type="button" className="jd-close" onClick={closeModal} aria-label="Tutup dialog">×</button>
            </header>

            <div className="jd-modal-scroll">
              <div className="jd-modal-content">
                <div className="jd-left-column">
                  <section className="jd-panel jd-description">
                    <div className="jd-panel-heading">
                      <span className="jd-step">01</span>
                      <div><span className="jd-panel-kicker">INFORMASI UMUM</span><h3>Deskripsi</h3></div>
                    </div>
                    <p>{selectedData.desc}</p>
                  </section>

                  <section className="jd-panel jd-subclass">
                    <div className="jd-panel-heading">
                      <span className="jd-step">02</span>
                      <div><span className="jd-panel-kicker">STRUKTUR KLASIFIKASI</span><h3>Daftar Subkelas</h3></div>
                      <span className="jd-count-pill">{selectedData.subkelas.length} item</span>
                    </div>
                    <ol className="jd-subclass-list">
                      {selectedData.subkelas.map((subkelas, index) => (
                        <li key={subkelas}>
                          <span className="jd-subclass-number">{String(index + 1).padStart(2, "0")}</span>
                          <span>{subkelas}</span>
                          <span className="jd-subclass-arrow">↗</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className="jd-panel jd-availability">
                    <div className="jd-panel-heading">
                      <span className="jd-step">03</span>
                      <div><span className="jd-panel-kicker">INVENTARISASI</span><h3>Ketersediaan Data</h3></div>
                    </div>
                    <div className="jd-table-wrap">
                      <table className="jd-table">
                        <thead><tr><th>No.</th><th>Subkelas</th><th>Jumlah Data</th></tr></thead>
                        <tbody>
                          {selectedData.subkelas.map((subkelas, index) => (
                            <tr key={subkelas}>
                              <td><span className="jd-table-number">{String(index + 1).padStart(2, "0")}</span></td>
                              <td>{subkelas}</td>
                              <td><strong>{selectedData.jumlahData[index] ?? "—"}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="jd-table-note">
                      <span className="jd-note-dot" />
                      Jumlah data ditampilkan berdasarkan inventarisasi pada setiap subkelas.
                    </div>
                  </section>
                </div>

                <div className="jd-right-column">
                  <section className="jd-panel jd-chart-panel">
                    <div className="jd-panel-heading">
                      <span className="jd-step">04</span>
                      <div><span className="jd-panel-kicker">ANALISIS DATA</span><h3>Progres Ketersediaan</h3></div>
                    </div>
                    <p className="jd-panel-description">
                      Statistik persentase data yang telah diperoleh dan diolah berdasarkan klasifikasi subkelas.
                    </p>
                    <div className="jd-chart-summary">
                      <div><span className="jd-summary-label">Jumlah subkelas</span><strong>{selectedData.subkelas.length}</strong></div>
                      <div><span className="jd-summary-label">Progres tertinggi</span><strong>{Math.max(...selectedData.chartData)}<small>%</small></strong></div>
                    </div>
                    <div className="jd-chart-area">
                      <canvas ref={canvasRef} />
                    </div>
                    <div className="jd-chart-footnote">
                      <span className="jd-legend-dot" />
                      Persentase ketersediaan data
                      <span className="jd-chart-scale">Skala 0–100%</span>
                    </div>
                  </section>

                  <div className="jd-insight">
                    <div className="jd-insight-icon">i</div>
                    <div>
                      <strong>Catatan statistik</strong>
                      <p>Nilai persentase menggambarkan progres ketersediaan data pada masing-masing subkelas, bukan perbandingan jumlah fitur antarjenis data.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <footer className="jd-modal-footer">
              <span><i /> SISTEM INFORMASI INFRASTRUKTUR KOTA YOGYAKARTA</span>
              <button type="button" onClick={closeModal}>Tutup detail <b>×</b></button>
            </footer>
          </section>
        </div>
      )}

      <style jsx>{`
        .jd-page{min-height:100%;padding:34px 28px 64px;background:#f4f7fb;color:#172b45;font-family:Inter,"Segoe UI",Arial,sans-serif}
        .jd-shell{max-width:1440px;margin:0 auto}
        .jd-intro{position:relative;display:flex;align-items:center;justify-content:space-between;min-height:190px;padding:34px 46px;overflow:hidden;border-radius:18px;background:linear-gradient(115deg,#071b34 0%,#0d345c 58%,#12617a 100%);box-shadow:0 14px 34px rgba(13,43,74,.15)}
        .jd-intro:after{content:"";position:absolute;width:430px;height:430px;right:9%;top:-310px;border:1px solid rgba(255,255,255,.12);border-radius:50%;box-shadow:0 0 0 34px rgba(255,255,255,.025),0 0 0 72px rgba(255,255,255,.025)}
        .jd-intro-copy{position:relative;z-index:1;max-width:760px}
        .jd-eyebrow{display:flex;align-items:center;gap:9px;color:#9ed9e5;font-size:10px;font-weight:800;letter-spacing:1.65px}
        .jd-eyebrow-dot{width:7px;height:7px;border-radius:50%;background:#36c4b1;box-shadow:0 0 0 4px rgba(54,196,177,.13)}
        .jd-intro h1{margin:15px 0 8px;color:#fff;font-size:clamp(26px,3vw,36px);font-weight:750;letter-spacing:-.8px}
        .jd-intro p{max-width:650px;margin:0;color:#c2d1e1;font-size:14px;line-height:1.8}
        .jd-intro-mark{position:relative;z-index:1;width:145px;height:125px;margin-right:5%;display:grid;place-items:center}
        .jd-mark-ring{position:absolute;border:1px solid rgba(148,220,226,.3);border-radius:50%;transform:rotate(-28deg)}
        .jd-mark-ring-one{width:116px;height:116px}.jd-mark-ring-two{width:86px;height:86px;border-color:rgba(148,220,226,.45)}
        .jd-mark-core{width:55px;height:55px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(145deg,#25b8ae,#187d9b);box-shadow:0 8px 25px rgba(0,0,0,.2);transform:rotate(-8deg)}
        .jd-mark-core span{color:#fff;font-size:18px;font-weight:800;transform:rotate(8deg);letter-spacing:1px}
        .jd-mark-dot{position:absolute;width:9px;height:9px;border-radius:50%;background:#7ee0d0;box-shadow:0 0 0 5px rgba(126,224,208,.12)}
        .jd-mark-dot-one{top:13px;right:28px}.jd-mark-dot-two{bottom:13px;left:18px;background:#80b9f5}
        .jd-section-heading{display:flex;align-items:flex-end;justify-content:space-between;margin:37px 2px 19px}
        .jd-section-kicker,.jd-panel-kicker{display:block;color:#168b91;font-size:9px;font-weight:800;letter-spacing:1.35px}
        .jd-section-heading h2{margin:5px 0 4px;color:#142c49;font-size:21px;font-weight:750;letter-spacing:-.35px}
        .jd-section-heading p{margin:0;color:#718096;font-size:12px}
        .jd-class-count{display:flex;align-items:center;gap:10px;padding:9px 14px;border:1px solid #e0e8f1;border-radius:10px;background:#fff}
        .jd-class-count strong{color:#0d5875;font-size:21px}.jd-class-count span{color:#64748b;font-size:11px;font-weight:600}
        .jd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
        .jd-card{padding:0;overflow:hidden;text-align:left;border:1px solid #e3eaf2;border-radius:14px;background:#fff;cursor:pointer;box-shadow:0 3px 12px rgba(17,43,70,.035);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
        .jd-card:hover{transform:translateY(-4px);border-color:#a8cbd7;box-shadow:0 13px 28px rgba(17,43,70,.11)}
        .jd-card:focus-visible,.jd-close:focus-visible,.jd-modal-footer button:focus-visible{outline:3px solid rgba(20,153,166,.35);outline-offset:3px}
        .jd-card-image{position:relative;height:142px;overflow:hidden;background:#e9f0f5}
        .jd-card-image:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,24,44,.03),rgba(5,24,44,.35))}
        .jd-card-image img{width:100%;height:100%;object-fit:cover;transition:transform .45s ease}
        .jd-card:hover .jd-card-image img{transform:scale(1.055)}
        .jd-card-index{position:absolute;z-index:1;top:12px;left:13px;padding:5px 8px;border:1px solid rgba(255,255,255,.35);border-radius:6px;background:rgba(8,31,53,.55);color:#fff;font-size:10px;font-weight:800;letter-spacing:.7px;backdrop-filter:blur(8px)}
        .jd-card-open{position:absolute;z-index:1;right:13px;bottom:12px;width:29px;height:29px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.45);border-radius:50%;background:rgba(255,255,255,.17);color:#fff;font-size:17px;transition:background .2s}
        .jd-card:hover .jd-card-open{background:#168b91}
        .jd-card-content{padding:16px 17px 14px}
        .jd-card-label{color:#168b91;font-size:8px;font-weight:800;letter-spacing:1.1px}
        .jd-card-content>strong{display:block;min-height:42px;margin-top:7px;color:#1a304b;font-size:14px;font-weight:750;line-height:1.5}
        .jd-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding-top:11px;border-top:1px solid #edf1f5}
        .jd-card-footer>span:first-child{color:#8492a5;font-size:10px;font-weight:600}
        .jd-card-link{color:#147f8c;font-size:10px;font-weight:750}.jd-card-link b{padding-left:3px;font-size:14px}
        .jd-overlay{position:fixed;z-index:10050;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,15,29,.72);backdrop-filter:blur(5px);animation:jdFade .18s ease}
        .jd-modal{display:flex;flex-direction:column;width:min(1420px,100%);max-height:min(94vh,1000px);overflow:hidden;border:1px solid rgba(255,255,255,.55);border-radius:17px;background:#f5f8fc;box-shadow:0 28px 90px rgba(0,0,0,.32);animation:jdRise .24s ease}
        .jd-modal-header{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:17px 27px;background:linear-gradient(110deg,#09213d,#123d61);color:#fff}
        .jd-modal-heading{display:flex;align-items:center;gap:13px}
        .jd-modal-symbol{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(151,218,225,.35);border-radius:12px;background:rgba(68,177,185,.16);color:#9ce2df;font-size:13px;font-weight:850;letter-spacing:1px}
        .jd-modal-kicker{display:block;margin-bottom:4px;color:#8bcbd3;font-size:8px;font-weight:800;letter-spacing:1.45px}
        .jd-modal-header h2{margin:0;color:#fff;font-size:20px;font-weight:750;letter-spacing:-.3px}
        .jd-close{width:36px;height:36px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font-size:25px;line-height:1;cursor:pointer;transition:background .2s}
        .jd-close:hover{background:rgba(255,255,255,.19)}
        .jd-modal-scroll{overflow:auto;padding:22px 25px 25px}
        .jd-modal-content{display:grid;grid-template-columns:minmax(0, .92fr) minmax(0,1.08fr);gap:19px;align-items:start}
        .jd-left-column,.jd-right-column{display:grid;gap:15px;min-width:0}
        .jd-panel{min-width:0;padding:19px 20px;border:1px solid #e4ebf3;border-radius:12px;background:#fff;box-shadow:0 3px 12px rgba(19,48,77,.025)}
        .jd-panel-heading{display:flex;align-items:center;gap:11px;margin-bottom:14px}
        .jd-step{width:29px;height:29px;flex-shrink:0;display:grid;place-items:center;border-radius:8px;background:#eaf5f6;color:#16858e;font-size:10px;font-weight:850}
        .jd-panel-kicker{margin-bottom:3px;color:#8a9aab;font-size:8px;letter-spacing:1.15px}
        .jd-panel h3{margin:0;color:#19334f;font-size:15px;font-weight:750;letter-spacing:-.2px}
        .jd-description>p,.jd-panel-description{margin:0;color:#607187;font-size:12px;line-height:1.85}
        .jd-count-pill{margin-left:auto;padding:5px 9px;border:1px solid #dcecef;border-radius:20px;background:#f1f9fa;color:#16858e;font-size:9px;font-weight:750}
        .jd-subclass-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none}
        .jd-subclass-list li{display:flex;align-items:center;gap:9px;min-width:0;padding:9px 10px;border:1px solid #edf1f5;border-radius:8px;background:#fbfcfe;color:#40536a;font-size:11px;font-weight:600;line-height:1.45}
        .jd-subclass-number{flex-shrink:0;color:#15949a;font-size:9px;font-weight:850}
        .jd-subclass-arrow{margin-left:auto;color:#9aabba;font-size:12px}
        .jd-table-wrap{overflow-x:auto;border:1px solid #e8edf3;border-radius:8px}
        .jd-table{width:100%;border-collapse:collapse;font-size:11px}
        .jd-table th{padding:10px 11px;background:#f0f4f8;color:#52657b;text-align:left;font-size:9px;font-weight:800;letter-spacing:.35px;white-space:nowrap}
        .jd-table th:first-child,.jd-table td:first-child{width:45px;text-align:center}
        .jd-table th:last-child,.jd-table td:last-child{text-align:right;white-space:nowrap}
        .jd-table td{padding:10px 11px;border-top:1px solid #edf1f5;color:#53657b;line-height:1.45}
        .jd-table td strong{color:#183b5a;font-size:10px;font-weight:750}
        .jd-table-number{color:#93a2b2;font-size:10px;font-weight:700}
        .jd-table-note{display:flex;align-items:flex-start;gap:7px;margin-top:10px;color:#8997a7;font-size:9px;line-height:1.6}
        .jd-note-dot{width:6px;height:6px;flex-shrink:0;margin-top:4px;border-radius:50%;background:#22a6a1}
        .jd-chart-panel{padding-bottom:14px}
        .jd-chart-panel .jd-panel-heading{margin-bottom:9px}
        .jd-panel-description{max-width:570px;font-size:11px}
        .jd-chart-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 8px}
        .jd-chart-summary>div{padding:11px 13px;border:1px solid #e8eef4;border-radius:9px;background:#f8fafc}
        .jd-summary-label{display:block;margin-bottom:5px;color:#8997a7;font-size:9px;font-weight:650}
        .jd-chart-summary strong{color:#183b5a;font-size:21px;font-weight:800;letter-spacing:-.5px}
        .jd-chart-summary small{margin-left:2px;color:#168b91;font-size:12px}
        .jd-chart-area{position:relative;width:100%;height:clamp(260px,38vh,430px);min-height:230px;margin-top:8px}
        .jd-chart-footnote{display:flex;align-items:center;gap:7px;padding-top:11px;border-top:1px solid #edf1f5;color:#78889a;font-size:9px}
        .jd-legend-dot{width:8px;height:8px;border-radius:3px;background:#168b91}
        .jd-chart-scale{margin-left:auto;color:#a0adba}
        .jd-insight{display:flex;gap:11px;padding:14px 15px;border:1px solid #dcecef;border-radius:10px;background:#f0f8f9}
        .jd-insight-icon{width:22px;height:22px;flex-shrink:0;display:grid;place-items:center;border-radius:50%;background:#d7eeee;color:#137d87;font-family:Georgia,serif;font-size:14px;font-weight:800}
        .jd-insight strong{display:block;margin:1px 0 4px;color:#23616c;font-size:10px}
        .jd-insight p{margin:0;color:#617e87;font-size:10px;line-height:1.65}
        .jd-modal-footer{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 25px;border-top:1px solid #e4ebf2;background:#fff}
        .jd-modal-footer>span{display:flex;align-items:center;gap:8px;color:#98a5b3;font-size:8px;font-weight:800;letter-spacing:1px}
        .jd-modal-footer>span i{width:6px;height:6px;border-radius:50%;background:#1ba49b}
        .jd-modal-footer button{padding:8px 12px;border:1px solid #dce6ee;border-radius:7px;background:#fff;color:#34516b;font-size:10px;font-weight:700;cursor:pointer}
        .jd-modal-footer button b{padding-left:8px;color:#168b91;font-size:14px}
        @keyframes jdFade{from{opacity:0}to{opacity:1}}
        @keyframes jdRise{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:1050px){.jd-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.jd-modal-content{grid-template-columns:1fr 1fr}.jd-modal-scroll{padding:17px}.jd-panel{padding:16px}}
        @media(max-width:760px){.jd-page{padding:18px 14px 42px}.jd-intro{min-height:165px;padding:25px 22px}.jd-intro-mark{width:90px;margin-right:0;transform:scale(.78)}.jd-intro h1{font-size:25px}.jd-intro p{font-size:12px}.jd-eyebrow{font-size:8px;letter-spacing:1px}.jd-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.jd-card-image{height:115px}.jd-card-content{padding:13px}.jd-card-content>strong{font-size:12px}.jd-section-heading{margin-top:27px}.jd-modal{max-height:96vh}.jd-modal-content{grid-template-columns:1fr}.jd-chart-area{height:300px}.jd-modal-header{padding:14px 17px}.jd-modal-scroll{padding:13px}.jd-modal-footer{padding:10px 14px}.jd-modal-footer>span{font-size:7px}}
        @media(max-width:440px){.jd-intro-mark{display:none}.jd-intro{min-height:155px}.jd-grid{grid-template-columns:1fr 1fr;gap:9px}.jd-card-image{height:92px}.jd-card-content{padding:11px}.jd-card-content>strong{min-height:54px;font-size:11px}.jd-card-footer{align-items:flex-start;flex-direction:column;gap:5px}.jd-subclass-list{grid-template-columns:1fr}.jd-section-heading h2{font-size:18px}.jd-class-count{padding:7px 9px}.jd-modal-header h2{font-size:16px}.jd-panel{padding:14px}.jd-modal-footer>span{max-width:190px;line-height:1.5}}
        @media(prefers-reduced-motion:reduce){.jd-card,.jd-card-image img,.jd-overlay,.jd-modal{animation:none;transition:none}}
      `}</style>
    </main>
  );
}
