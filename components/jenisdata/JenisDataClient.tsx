
"use client";

import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import Link from "next/link";

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

const softColors = [
  "#FFB3BA",
  "#fffcbaff",
  "#BAFFC9",
  "#bad7ffff",
  "#f1baffff",
  "#efccecff",
  "#D1C4E9",
  "#B2EBF2",
  "#F8BBD0",
  "#DCEDC8",
];

export default function JenisDataClient() {
  const [selectedKelas, setSelectedKelas] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const selectedData = selectedKelas
    ? dataManual[selectedKelas]
    : null;

  useEffect(() => {
    if (!selectedData || !canvasRef.current) return;

    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: selectedData.subkelas,
        datasets: [
          {
            label: "Jumlah (%)",
            data: selectedData.chartData,
            backgroundColor: selectedData.subkelas.map(
              (_, index) => softColors[index % softColors.length]
            ),
            borderColor: "#003366",
            borderWidth: 1.2,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.label}: ${context.raw}%`,
            },
          },
          title: {
            display: true,
            text: "Progres Ketersediaan Data Setiap Subkelas",
            color: "#000",
            font: {
              size: 12,
              weight: "bold",
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            min: 0,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
              color: "#333",
              font: {
                size: 11,
              },
            },
            title: {
              display: true,
              text: "Persentase Data (%)",
              color: "#000",
              font: {
                size: 12,
                weight: "bold",
              },
            },
            grid: {
              color: "#e5e5e5",
            },
          },
          y: {
            ticks: {
              color: "#000",
              font: {
                size: 12,
                weight: 500,
              },
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [selectedData]);

  return (
    <main className="jenisdata-page">
      {/* <header className="jenisdata-header">
        <Link href="/" className="jenisdata-brand">
          SITIJO
        </Link>
        <span>Jenis Data Infrastruktur</span>
        <Link href="/">⌂ Beranda</Link>
      </header> */}

      <div className="jenisdata-main">
        <div className="jenisdata-heading">
          <span className="section-kicker">
            SISTEM INFORMASI INFRASTRUKTUR KOTA YOGYAKARTA
          </span>
          <h1>Jenis Data Infrastruktur</h1>
          <p>
            Pilih kelas infrastruktur untuk melihat deskripsi,
            subkelas, ketersediaan data, dan statistik progres.
          </p>
        </div>

        <div className="jenisdata-grid">
          {Object.entries(dataManual).map(([kelas, meta]) => (
            <button
              type="button"
              className="jenisdata-card"
              key={kelas}
              onClick={() => setSelectedKelas(kelas)}
            >
              <img src={asset(meta.icon)} alt={kelas} />
              <span>{kelas}</span>
              <small>Lihat informasi →</small>
            </button>
          ))}
        </div>
      </div>

      {selectedKelas && selectedData && (
        <div
          className="jenisdata-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedKelas(null);
            }
          }}
        >
          <section
            className="jenisdata-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jenisdata-modal-title"
          >
            <header className="jenisdata-modal-header">
              <h2 id="jenisdata-modal-title">
                {selectedKelas}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedKelas(null)}
                aria-label="Tutup"
              >
                ×
              </button>
            </header>

            <div className="jenisdata-modal-body">
              <div className="jenisdata-modal-left">
                <h3>A. Deskripsi</h3>
                <p>{selectedData.desc}</p>

                <h3>B. Subkelas</h3>
                <ol>
                  {selectedData.subkelas.map((subkelas) => (
                    <li key={subkelas}>{subkelas}</li>
                  ))}
                </ol>

                <h3>C. Ketersediaan Data</h3>
                <div className="jenisdata-table-wrap">
                  <table className="jenisdata-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Subkelas</th>
                        <th>Jumlah Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedData.subkelas.map((subkelas, index) => (
                        <tr key={subkelas}>
                          <td>{index + 1}</td>
                          <td>{subkelas}</td>
                          <td>
                            {selectedData.jumlahData[index] ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="jenisdata-modal-right">
                <h3>
                  D. Statistika Progres Ketersediaan Data
                </h3>
                <p>
                  Statistika data disusun berdasarkan jumlah data
                  yang telah diperoleh dan diolah sesuai dengan
                  klasifikasi kelas dan subkelas.
                </p>
                <div className="jenisdata-chart">
                  <canvas ref={canvasRef} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
