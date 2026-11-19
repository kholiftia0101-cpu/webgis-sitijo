"use client";

import JSZip from "jszip";
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

type Geometry = {
  type?: string;
  coordinates?: unknown;
  paths?: unknown;
  [key: string]: unknown;
};

type Feature = {
  type: "Feature";
  geometry: Geometry | null;
  properties: Record<string, unknown>;
};

type FeatureCollection = {
  type: "FeatureCollection";
  table: string;
  label: string;
  total: number;
  srid: number;
  crsWkt: string | null;
  features: Feature[];
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

// =====================================================
// NORMALISASI GEOMETRI
// =====================================================

function normalizeGeometry(
  geometry: Geometry | null
): Geometry | null {
  if (!geometry) return null;

  const rawType = String(
    geometry.type || ""
  ).toLowerCase();

  // GeoJSON standar
  if (
    [
      "point",
      "multipoint",
      "linestring",
      "multilinestring",
      "polygon",
      "multipolygon",
    ].includes(rawType)
  ) {
    return geometry;
  }

  // ArcGIS Polyline menggunakan paths
  if (rawType === "polyline") {
    if (Array.isArray(geometry.paths)) {
      const paths = geometry.paths;

      if (!paths.length) {
        throw new Error("Polyline tidak memiliki paths.");
      }

      if (paths.length === 1) {
        return {
          type: "LineString",
          coordinates: paths[0],
        };
      }

      return {
        type: "MultiLineString",
        coordinates: paths,
      };
    }

    // Polyline dengan struktur coordinates
    if (Array.isArray(geometry.coordinates)) {
      const coordinates = geometry.coordinates;

      if (!coordinates.length) {
        throw new Error("Koordinat Polyline kosong.");
      }

      const first = coordinates[0];

      if (
        Array.isArray(first) &&
        typeof first[0] === "number"
      ) {
        return {
          type: "LineString",
          coordinates,
        };
      }

      return {
        type: "MultiLineString",
        coordinates,
      };
    }
  }

  if (rawType === "multipolyline") {
    const coordinates = geometry.coordinates;

    if (!Array.isArray(coordinates) || !coordinates.length) {
      throw new Error("Koordinat MultiPolyline tidak valid.");
    }

    return {
      type: "MultiLineString",
      coordinates,
    };
  }

  throw new Error(
    `Tipe geometri tidak didukung: ${geometry.type || "Unknown"}`
  );
}

// =====================================================
// EXPORTER KHUSUS POLYLINE
// Setiap Feature GeoJSON ditulis sebagai satu record SHP.
// Tidak menggunakan shpwrite.zip() untuk data garis.
// =====================================================

async function createPolylineZip(
  features: Feature[],
  filename: string,
  crsWkt: string | null
): Promise<Blob> {
  type LineCoordinates = number[][][];

  const attributes = features.map((feature) => {
    const properties = feature.properties || {};

    return Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        value !== null && typeof value === "object"
          ? JSON.stringify(value)
          : value,
      ])
    );
  });

  // Satu elemen array = satu fitur Shapefile.
  // LineString: [ [x,y], [x,y], ... ]
  // MultiLineString: [ garis1, garis2, ... ]
  const geometries: LineCoordinates[] = features.map(
    (feature, index) => {
      const geometry = feature.geometry;

      if (!geometry) {
        throw new Error(
          `Geometri fitur ke-${index + 1} kosong.`
        );
      }

      const type = geometry.type;
      const coordinates = geometry.coordinates;

      if (
        type !== "LineString" &&
        type !== "MultiLineString"
      ) {
        throw new Error(
          `Tipe geometri fitur ke-${index + 1} bukan garis.`
        );
      }

      if (
        !Array.isArray(coordinates) ||
        coordinates.length === 0
      ) {
        throw new Error(
          `Koordinat fitur ke-${index + 1} kosong.`
        );
      }

      if (type === "LineString") {
        // Jangan membungkus seluruh kumpulan fitur menjadi satu geometri.
        return coordinates as LineCoordinates;
      }
      // MultiLineString tetap satu fitur dengan beberapa bagian.
      return coordinates as LineCoordinates;
    }
  );

  if (attributes.length !== geometries.length) {
    throw new Error(
      "Jumlah atribut dan geometri tidak sama."
    );
  }

  const shpwriteApi = shpwrite as unknown as {
    write: (
      rows: Record<string, unknown>[],
      geometryType: string,
      geometries: LineCoordinates[],
      callback: (
        error: Error | null,
        result?: {
          shp: DataView;
          shx: DataView;
          dbf: DataView;
        }
      ) => void
    ) => void;
  };

  const result = await new Promise<{
    shp: DataView;
    shx: DataView;
    dbf: DataView;
  }>((resolve, reject) => {
    shpwriteApi.write(
      attributes,
      "POLYLINE",
      geometries,
      (error, output) => {
        if (error) {
          reject(error);
          return;
        }

        if (!output) {
          reject(
            new Error("Gagal membentuk file Shapefile.")
          );
          return;
        }

        resolve(output);
      }
    );
  });

  const toBytes = (view: DataView) =>
    new Uint8Array(
      view.buffer,
      view.byteOffset,
      view.byteLength
    );

  const zip = new JSZip();

  // Struktur folder tetap mengikuti nama subkelas.
  const folder = zip.folder(filename);

  if (!folder) {
    throw new Error("Gagal membuat folder ZIP.");
  }

  folder.file(`${filename}.shp`, toBytes(result.shp));
  folder.file(`${filename}.shx`, toBytes(result.shx));
  folder.file(`${filename}.dbf`, toBytes(result.dbf));
  folder.file(`${filename}.cpg`, "UTF-8");

  if (crsWkt) {
    folder.file(`${filename}.prj`, crsWkt);
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "STORE",
  });

  return blob;
}

// =====================================================
// KOMPONEN DOWNLOAD DATA
// =====================================================

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

  // ===================================================
  // LOAD KELAS DAN SUBKELAS
  // ===================================================

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      try {
        const response = await fetch(
          "/api/data/download",
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal memuat daftar data."
          );
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

  // ===================================================
  // DOWNLOAD DATA
  // ===================================================

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
        throw new Error(
          result.error || "Gagal mengambil data."
        );
      }

      const data = result as FeatureCollection;

      if (!data.features?.length) {
        throw new Error(
          "Tidak ada data geometri untuk diunduh."
        );
      }

      const filename = safeFilename(
        data.label || table
      );

      // ================================================
      // FORMAT GEOJSON
      // ================================================

      if (format === "geojson") {
        const blob = new Blob(
          [JSON.stringify(data, null, 2)],
          {
            type: "application/geo+json;charset=utf-8",
          }
        );

        saveBlob(blob, `${filename}.geojson`);
      }

      // ================================================
      // FORMAT SHAPEFILE
      // ================================================

      else {
        const normalizedFeatures = data.features.map(
          (feature, index) => {
            try {
              return {
                ...feature,
                geometry: normalizeGeometry(feature.geometry),
              };
            } catch (error) {
              throw new Error(
                `Fitur ke-${index + 1}: ${
                  error instanceof Error
                    ? error.message
                    : "Geometri tidak valid."
                }`
              );
            }
          }
        );

        const shapefileData = {
          ...data,
          features: normalizedFeatures,
        };

        const geometryTypes = new Set(
          shapefileData.features.map(
            (feature) =>
              feature.geometry?.type || "Unknown"
          )
        );

        if (geometryTypes.has("Unknown")) {
          throw new Error(
            "Terdapat fitur tanpa geometri yang valid."
          );
        }

        if (geometryTypes.size > 1) {
          throw new Error(
            "Data memiliki tipe geometri campuran. Gunakan GeoJSON."
          );
        }

        const geometryType = Array.from(geometryTypes)[0];

        let blob: Blob;

        // ----------------------------------------------
        // GARIS: PAKAI LOW-LEVEL WRITE
        // ----------------------------------------------

        if (
          geometryType === "LineString" ||
          geometryType === "MultiLineString"
        ) {
          blob = await createPolylineZip(
            normalizedFeatures,
            filename,
            data.crsWkt
          );
        }

        // ----------------------------------------------
        // POINT / POLYGON: TETAP PAKAI ZIP
        // ----------------------------------------------

        else {
          const zipData = await shpwrite.zip(
            shapefileData as unknown as Parameters<
              typeof shpwrite.zip
            >[0],
            {
              folder: filename,
              filename,
              outputType: "blob",
              compression: "STORE",
              ...(data.crsWkt
                ? { prj: data.crsWkt }
                : {}),
              types: {
                point: filename,
                polygon: filename,
                polyline: filename,
              } as unknown as {
                point?: string;
                polygon?: string;
                line?: string;
                multipolygon?: string;
                multiline?: string;
              },
            }
          );

          // Ubah hasil ZIP menjadi Blob
          const originalBlob =
            zipData instanceof Blob
              ? zipData
              : new Blob(
                  [zipData as unknown as BlobPart],
                  {
                    type: "application/zip",
                  }
                );
          
          // Buka ZIP
          const zip = await JSZip.loadAsync(originalBlob);
          
          // Cari file DBF
          const dbfPath = Object.keys(zip.files).find(
            (path) =>
              !zip.files[path].dir &&
              path.toLowerCase().endsWith(".dbf")
          );
          
          if (!dbfPath) {
            throw new Error(
              "File DBF tidak ditemukan dalam ZIP Shapefile."
            );
          }
          
          // Tambahkan CPG dengan nama yang sama seperti DBF
          const cpgPath = dbfPath.replace(/\.dbf$/i, ".cpg");
          
          zip.file(cpgPath, "UTF-8");
          
          // Buat ulang ZIP
          blob = await zip.generateAsync({
            type: "blob",
            compression: "STORE",
          });
        }

        saveBlob(blob, `${filename}.zip`);
      }

      setMessage({
        type: "success",
        text: `${formatNumber(data.features.length)} fitur ${data.label} berhasil disiapkan untuk diunduh.`,
      });

      if (format === "shapefile" && !data.crsWkt) {
        setMessage({
          type: "info",
          text:
            "Shapefile berhasil dibuat, tetapi SRID data tidak ditemukan. File .prj mungkin tidak tersedia.",
        });
      }
    } catch (error) {
      console.error("Download data error:", error);

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

  // ===================================================
  // UI
  // ===================================================

  return (
    <main className="dd-page">
      <header className="dd-header">
        <div className="dd-brand-wrap">
          <Link href="/" className="dd-brand">
            SITIJO
          </Link>

          <span>
            Sistem Informasi Infrastruktur Kota Yogyakarta
          </span>
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
              <LoaderCircle
                className="dd-spin"
                size={17}
              />
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
                onChange={(event) =>
                  chooseGroup(event.target.value)
                }
              >
                <option value="">
                  {loadingGroups
                    ? "Memuat kelas..."
                    : "Pilih kelas..."}
                </option>

                {groups.map((group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
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
                <option value="">
                  Pilih subkelas...
                </option>

                {(selectedGroup?.tables || []).map(
                  (name) => (
                    <option key={name} value={name}>
                      {labels[name] || name}
                    </option>
                  )
                )}
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
                <small>
                  .zip · SHP, SHX, DBF, PRJ
                </small>
              </span>

              <span className="dd-radio">
                {format === "shapefile" ? "✓" : ""}
              </span>
            </button>
          </div>

          <div className="dd-format-note">
            {format === "geojson" ? (
              <>
                GeoJSON dapat digunakan pada QGIS, aplikasi WebGIS,
                dan berbagai perangkat lunak GIS lainnya.
              </>
            ) : (
              <>
                Shapefile akan dikemas dalam ZIP. Nama kolom pada
                DBF mengikuti batas 10 karakter Shapefile.
                Sistem koordinat mengikuti SRID sumber jika tersedia.
                Data dengan tipe geometri campuran perlu diunduh
                dalam format GeoJSON.
              </>
            )}
          </div>

          <div className="dd-download-summary">
            <div>
              <span>Data terpilih</span>

              <strong>
                {table
                  ? selectedLabel
                  : "Belum ada subkelas dipilih"}
              </strong>
            </div>

            <button
              type="button"
              className="dd-download-button"
              disabled={!table || downloading}
              onClick={handleDownload}
            >
              {downloading ? (
                <LoaderCircle
                  className="dd-spin"
                  size={18}
                />
              ) : (
                <Download size={18} />
              )}

              {downloading
                ? "Menyiapkan..."
                : "Download Data"}
            </button>
          </div>
        </section>

        <div className="dd-help">
          <Map size={18} />

          <div>
            <strong>Informasi</strong>

            <p>
              Data yang diunduh berasal dari database infrastruktur
              SITIJO. Seluruh fitur dengan geometri akan disertakan
              dalam file.
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
