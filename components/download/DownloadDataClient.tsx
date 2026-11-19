"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import shpwrite from "@mapbox/shp-write";
import {
  ArrowLeft,
  Database,
  Download,
  FileArchive,
  FileJson,
  LoaderCircle,
  Map,
} from "lucide-react";

type Group = {
  id: string;
  label: string;
  tables: string[];
};

type FeatureCollection = {
  type: "FeatureCollection";
  table: string;
  label: string;
  total: number;
  srid: number;
  crsWkt: string | null;
  features: Array<{
    type: "Feature";
    geometry: unknown;
    properties: Record<string, unknown>;
  }>;
};

type Format = "geojson" | "shapefile";

const formatNumber = (value: number) =>
  value.toLocaleString("id-ID");

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DownloadDataClient({
  username,
  unit,
}: {
  username: string;
  unit: string;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [groupId, setGroupId] = useState("");
  const [table, setTable] = useState("");
  const [format, setFormat] = useState<Format>("geojson");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      try {
        const response = await fetch("/api/data/download", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Gagal memuat daftar data.");
        }

        if (active) {
          setGroups(result.groups || []);
          setLabels(result.labels || {});
        }
      } catch (error) {
        if (active) {
          setMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Gagal memuat daftar data.",
          });
        }
      } finally {
        if (active) {
          setLoadingGroups(false);
        }
      }
    }

    loadGroups();

    return () => {
      active = false;
    };
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groups, groupId]
  );

  const selectedLabel = labels[table] || table;

  function chooseGroup(value: string) {
    setGroupId(value);
    setTable("");
    setMessage(null);
  }

  async function handleDownload() {
    if (!table || downloading) return;

    setDownloading(true);
    setMessage({
      type: "info",
      text: "Sedang mengambil data dari database...",
    });

    try {
      const response = await fetch(
        `/api/data/download?table=${encodeURIComponent(table)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil data.");
      }

      const data = result as FeatureCollection;

      if (!data.features?.length) {
        throw new Error("Tidak ada data geometri untuk diunduh.");
      }

      const filename = safeFilename(data.label || table);

      // ==========================================
      // FORMAT GEOJSON
      // ==========================================
      if (format === "geojson") {
        const blob = new Blob(
          [JSON.stringify(data, null, 2)],
          {
            type: "application/geo+json;charset=utf-8",
          }
        );

        saveBlob(blob, `${filename}.geojson`);
      }

      // ==========================================
      // FORMAT SHAPEFILE
      // ==========================================
      else {
        const geometryTypes = new Set(
          data.features.map((feature) => {
            const geometry = feature.geometry as
              | { type?: string }
              | null;

            return geometry?.type || "Unknown";
          })
        );

        const supportedTypes = [
          "Point",
          "MultiPoint",
          "LineString",
          "MultiLineString",
          "Polygon",
          "MultiPolygon",
        ];

        const unsupported = [...geometryTypes].filter(
          (type) => !supportedTypes.includes(type)
        );

        if (unsupported.length) {
          throw new Error(
            `Tipe geometri tidak didukung Shapefile: ${unsupported.join(", ")}`
          );
        }

        if (geometryTypes.size > 1) {
          throw new Error(
            "Data memiliki lebih dari satu tipe geometri. Shapefile harus dibuat dengan satu tipe geometri yang sama. Silakan gunakan GeoJSON untuk data campuran."
          );
        }

        const zipData = await shpwrite.zip(
          data as unknown as Parameters<typeof shpwrite.zip>[0],
          {
            folder: filename,
            filename,
            outputType: "blob",
            compression: "STORE",
            ...(data.crsWkt ? { prj: data.crsWkt } : {}),
            types: {
              point: filename,
              polygon: filename,
              line: filename,
              multipolygon: filename,
              multiline: filename,
            },
          }
        );

        const blob =
          zipData instanceof Blob
            ? zipData
            : new Blob(
                [zipData as unknown as BlobPart],
                { type: "application/zip" }
              );

        saveBlob(blob, `${filename}.zip`);
      }

      setMessage({
        type: "success",
        text: `${formatNumber(data.total)} fitur ${data.label} berhasil disiapkan untuk diunduh.`,
      });

      if (format === "shapefile" && !data.crsWkt) {
        setMessage({
          type: "info",
          text:
            "Shapefile berhasil dibuat, tetapi SRID data tidak ditemukan. File .prj mungkin tidak tersedia. Periksa sistem koordinat data sebelum digunakan.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat unduhan.",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="dd-page">
      <header className="dd-header">
        <div className="dd-brand-wrap">
          <Link href="/" className="dd-brand">
            SITIJO
          </Link>
          <span>Sistem Informasi Infrastruktur Kota Yogyakarta</span>
        </div>

        <Link href="/peta" className="dd-back">
          <ArrowLeft size={16} />
          Kembali ke Peta
        </Link>
      </header>

      <div className="dd-container">
        <div className="dd-title-row">
          <div>
            <div className="dd-eyebrow">
              PENGELOLAAN DATA INFRASTRUKTUR
            </div>

            <h1>Download Data Infrastruktur</h1>

            <p>
              Unduh data infrastruktur berdasarkan kelas dan subkelas
              dalam format GeoJSON atau Shapefile.
            </p>
          </div>

          <div className="dd-user">
            <strong>{username}</strong>
            <small>{unit}</small>
          </div>
        </div>

        {message && (
          <div
            className={`dd-alert ${message.type}`}
            role="status"
          >
            <span>{message.text}</span>
            {downloading && (
              <LoaderCircle className="dd-spin" size={17} />
            )}
          </div>
        )}

        <section className="dd-card">
          <div className="dd-card-heading">
            <div className="dd-heading-icon">
              <Database size={19} />
            </div>

            <div>
              <h2>Pilih Data Infrastruktur</h2>
              <p>
                Tentukan kelas dan subkelas data yang akan diunduh.
              </p>
            </div>
          </div>

          <div className="dd-filter-grid">
            <label>
              Kelas Infrastruktur

              <select
                value={groupId}
                disabled={loadingGroups}
                onChange={(event) => chooseGroup(event.target.value)}
              >
                <option value="">
                  {loadingGroups ? "Memuat kelas..." : "Pilih kelas..."}
                </option>

                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Subkelas Infrastruktur

              <select
                value={table}
                disabled={!selectedGroup}
                onChange={(event) => {
                  setTable(event.target.value);
                  setMessage(null);
                }}
              >
                <option value="">Pilih subkelas...</option>

                {(selectedGroup?.tables || []).map((name) => (
                  <option key={name} value={name}>
                    {labels[name] || name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="dd-card">
          <div className="dd-card-heading">
            <div className="dd-heading-icon">
              <Download size={19} />
            </div>

            <div>
              <h2>Format Unduhan</h2>
              <p>
                Pilih format file yang sesuai dengan kebutuhan.
              </p>
            </div>
          </div>

          <div className="dd-format-grid">
            <button
              type="button"
              className={`dd-format-option ${
                format === "geojson" ? "active" : ""
              }`}
              onClick={() => setFormat("geojson")}
            >
              <FileJson size={28} />

              <span>
                <strong>GeoJSON</strong>
                <small>
                  .geojson · Data geometri dan atribut
                </small>
              </span>

              <span className="dd-radio">
                {format === "geojson" ? "✓" : ""}
              </span>
            </button>

            <button
              type="button"
              className={`dd-format-option ${
                format === "shapefile" ? "active" : ""
              }`}
              onClick={() => setFormat("shapefile")}
            >
              <FileArchive size={28} />

              <span>
                <strong>Shapefile</strong>
                <small>.zip · SHP, SHX, DBF, PRJ</small>
              </span>

              <span className="dd-radio">
                {format === "shapefile" ? "✓" : ""}
              </span>
            </button>
          </div>

          <div className="dd-format-note">
            {format === "geojson" ? (
              <>
                GeoJSON dapat digunakan pada QGIS, aplikasi WebGIS, dan
                berbagai perangkat lunak GIS lainnya.
              </>
            ) : (
              <>
                Shapefile akan dikemas dalam ZIP. Nama kolom pada DBF
                mengikuti batas 10 karakter Shapefile. Sistem koordinat
                mengikuti SRID sumber jika tersedia. Data dengan tipe
                geometri campuran perlu diunduh dalam format GeoJSON.
              </>
            )}
          </div>

          <div className="dd-download-summary">
            <div>
              <span>Data terpilih</span>
              <strong>
                {table ? selectedLabel : "Belum ada subkelas dipilih"}
              </strong>
            </div>

            <button
              type="button"
              className="dd-download-button"
              disabled={!table || downloading}
              onClick={handleDownload}
            >
              {downloading ? (
                <LoaderCircle className="dd-spin" size={18} />
              ) : (
                <Download size={18} />
              )}

              {downloading ? "Menyiapkan..." : "Download Data"}
            </button>
          </div>
        </section>

        <div className="dd-help">
          <Map size={18} />

          <div>
            <strong>Informasi</strong>
            <p>
              Data yang diunduh berasal dari database infrastruktur SITIJO.
              Seluruh fitur dengan geometri akan disertakan dalam file.
            </p>
          </div>
        </div>

        <footer className="dd-footer">
          © 2026 DPUPKP Kota Yogyakarta · SITIJO
        </footer>
      </div>
    </main>
  );
}
