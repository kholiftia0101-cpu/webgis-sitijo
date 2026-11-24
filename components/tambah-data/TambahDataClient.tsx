
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileJson,
  FileUp,
  FolderOpen,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

type Group = {
  id: string;
  label: string;
  tables: string[];
};

type UploadResult = {
  status?: string;
  message?: string;
  jumlah_data?: number;
  jenis_geometri?: string[];
};

const ASSET_BASE = (
  process.env.NEXT_PUBLIC_ASSET_BASE ||
  "https://sitijo-assets.ruli-andaru.workers.dev"
).replace(/\/+$/, "");

const labelFallback = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function TambahDataClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [kelas, setKelas] = useState("");
  const [subkelas, setSubkelas] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      try {
        const response = await fetch("/api/data/download", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gagal mengambil daftar kelas.");
        }

        if (active) {
          setGroups(data.groups || []);
          setLabels(data.labels || {});
        }
      } catch (error) {
        if (active) {
          setMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Gagal memuat daftar kelas.",
          });
        }
      } finally {
        if (active) setLoadingGroups(false);
      }
    }

    loadGroups();

    return () => {
      active = false;
    };
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === kelas),
    [groups, kelas]
  );

  const templateUrl = subkelas
    ? `${ASSET_BASE}/assets/form/${encodeURIComponent(subkelas)}.zip`
    : "";

  function handleClassChange(value: string) {
    setKelas(value);
    setSubkelas("");
    setFile(null);
    setResult(null);
    setMessage(null);

    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubclassChange(value: string) {
    setSubkelas(value);
    setFile(null);
    setResult(null);
    setMessage(null);

    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setResult(null);
    setMessage(null);

    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".geojson")) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessage({
        type: "error",
        text: "Format file harus .geojson.",
      });
      return;
    }

    if (selectedFile.size > 30 * 1024 * 1024) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessage({
        type: "error",
        text: "Ukuran file maksimal 30 MB.",
      });
    }
  }

  async function handleUpload() {
    if (!kelas || !subkelas) {
      setMessage({
        type: "error",
        text: "Pilih kelas dan subkelas terlebih dahulu.",
      });
      return;
    }

    if (!file) {
      setMessage({
        type: "error",
        text: "Pilih file GeoJSON yang akan diunggah.",
      });
      return;
    }

    setUploading(true);
    setMessage({
      type: "success",
      text: "Sedang mengunggah dan menyimpan data...",
    });
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("kelas", kelas);
      formData.append("subkelas", subkelas);
      formData.append("geojson_file", file);

      const response = await fetch("/api/data/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResult = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Upload gagal.");
      }

      setResult(data);
      setMessage({
        type: "success",
        text: data.message || "Data berhasil ditambahkan.",
      });

      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat upload.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="td-page">
      <div className="td-container">
        <div className="td-heading">
          <div>
            <Link href="/" className="td-back">
              <ArrowLeft size={16} />
              Kembali ke Beranda
            </Link>
            <h1>Tambah Data Infrastruktur</h1>
            <p>
              Unduh template Shapefile, lengkapi data melalui aplikasi GIS,
              kemudian unggah GeoJSON untuk menambahkan data ke SITIJO.
            </p>
          </div>
        </div>

        <section className="td-card">
          <div className="td-card-title">
            <div className="td-title-icon">
              <Download size={21} />
            </div>
            <div>
              <h2>Unduh Template Shapefile</h2>
              <p>
                Pilih kelas dan subkelas untuk mendapatkan template yang sesuai.
              </p>
            </div>
          </div>

          <div className="td-form-grid">
            <div className="td-field">
              <label htmlFor="td-kelas">Kelas</label>
              <select
                id="td-kelas"
                value={kelas}
                onChange={(event) => handleClassChange(event.target.value)}
                disabled={loadingGroups || uploading}
              >
                <option value="">
                  {loadingGroups ? "Memuat kelas..." : "-- Pilih Kelas --"}
                </option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="td-field">
              <label htmlFor="td-subkelas">Subkelas</label>
              <select
                id="td-subkelas"
                value={subkelas}
                onChange={(event) => handleSubclassChange(event.target.value)}
                disabled={!selectedGroup || uploading}
              >
                <option value="">-- Pilih Subkelas --</option>
                {selectedGroup?.tables.map((table) => (
                  <option key={table} value={table}>
                    {labels[table] || labelFallback(table)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {subkelas && (
            <div className="td-template">
              <div className="td-template-info">
                <FileUp size={23} />
                <div>
                  <strong>{labels[subkelas] || labelFallback(subkelas)}.zip</strong>
                  <small>Template Shapefile untuk {subkelas}</small>
                </div>
              </div>
              <a
                href={templateUrl}
                className="td-button td-button-secondary"
                download
                target="_blank"
                rel="noreferrer"
              >
                <Download size={17} />
                Unduh Template
              </a>
            </div>
          )}

          <div className="td-note">
            <AlertCircle size={17} />
            <span>
              Ekstrak ZIP, lengkapi data menggunakan QGIS atau aplikasi GIS
              lainnya, lalu ekspor sebagai GeoJSON dengan CRS EPSG:4326.
            </span>
          </div>
        </section>

        <section className="td-card">
          <div className="td-card-title">
            <div className="td-title-icon td-title-green">
              <FileJson size={21} />
            </div>
            <div>
              <h2>Upload GeoJSON</h2>
              <p>
                Unggah file GeoJSON yang sudah dilengkapi untuk ditambahkan
                sebagai record baru.
              </p>
            </div>
          </div>

          <div className="td-upload-area">
            <input
              ref={fileRef}
              type="file"
              accept=".geojson,application/geo+json,application/json"
              id="td-file"
              onChange={(event) =>
                handleFileChange(event.target.files?.[0] || null)
              }
              disabled={!subkelas || uploading}
            />

            <label htmlFor="td-file" className="td-file-label">
              <FolderOpen size={30} />
              <strong>
                {file ? file.name : "Pilih file GeoJSON"}
              </strong>
              <span>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : "Klik untuk memilih file .geojson (maksimal 30 MB)"}
              </span>
            </label>

            {file && (
              <button
                type="button"
                className="td-clear-file"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                disabled={uploading}
                aria-label="Hapus file"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="td-upload-summary">
            <div>
              <span>Kelas</span>
              <strong>{selectedGroup?.label || "Belum dipilih"}</strong>
            </div>
            <div>
              <span>Subkelas</span>
              <strong>
                {subkelas
                  ? labels[subkelas] || labelFallback(subkelas)
                  : "Belum dipilih"}
              </strong>
            </div>
            <div>
              <span>File</span>
              <strong>{file ? "Siap diunggah" : "Belum dipilih"}</strong>
            </div>
          </div>

          <button
            type="button"
            className="td-button td-button-primary td-submit"
            onClick={handleUpload}
            disabled={!kelas || !subkelas || !file || uploading}
          >
            {uploading ? (
              <>
                <LoaderCircle className="td-spin" size={18} />
                Mengunggah dan Menyimpan...
              </>
            ) : (
              <>
                <FileUp size={18} />
                Upload dan Simpan
              </>
            )}
          </button>

          {message && (
            <div
              className={`td-message ${
                message.type === "success" ? "td-message-success" : "td-message-error"
              }`}
              role="status"
            >
              {message.type === "success" ? (
                <CheckCircle2 size={19} />
              ) : (
                <AlertCircle size={19} />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {result?.status === "success" && (
            <div className="td-result">
              <strong>Ringkasan upload</strong>
              <div>
                Jumlah fitur ditambahkan:{" "}
                <b>{result.jumlah_data?.toLocaleString("id-ID")}</b>
              </div>
              <div>
                Jenis geometri:{" "}
                <b>{result.jenis_geometri?.join(", ") || "—"}</b>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
