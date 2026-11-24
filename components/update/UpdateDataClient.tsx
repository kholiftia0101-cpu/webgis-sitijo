"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Database,
  Edit3,
  LoaderCircle,
  Map,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Group = {
  id: string;
  label: string;
  tables: string[];
};

type Column = {
  name: string;
  type: string;
  editable: boolean;
};

type RowData = Record<string, unknown> & {
  __geometry?: unknown;
};

type Dataset = {
  table: string;
  label: string;
  primaryKey: string;
  columns: Column[];
  rows: RowData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  geometryColumn: string | null;
};

const UpdateMap = dynamic(() => import("./UpdateMap"), {
  ssr: false,
  loading: () => (
    <div className="ud-map-loading">Memuat peta...</div>
  ),
});

const PAGE_SIZE = 25;

const valueText = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "—"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

export default function UpdateDataClient({
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

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [editing, setEditing] = useState<RowData | null>(null);
  const [editValues, setEditValues] = useState<
    Record<string, string>
  >({});

  const [deleting, setDeleting] = useState<RowData | null>(null);
  const [deleteName, setDeleteName] = useState(username);
  const [deleteUnit, setDeleteUnit] = useState(unit);
  const [deleteReason, setDeleteReason] = useState("");

  const [saving, setSaving] = useState(false);

  // Mengidentifikasi permintaan API terbaru.
  // Respons dari permintaan sebelumnya akan diabaikan.
  const requestIdRef = useRef(0);

  // Dataset hanya boleh digunakan jika sesuai dengan subkelas aktif.
  const currentDataset =
    dataset?.table === table ? dataset : null;

  const loadGroups = useCallback(async () => {
    const response = await fetch("/api/data/update", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Gagal memuat daftar data."
      );
    }

    setGroups(result.groups || []);
    setLabels(result.labels || {});
  }, []);

  // Memuat data berdasarkan subkelas yang sedang dipilih.
  const loadData = useCallback(
    async (
      targetTable: string,
      targetPage = 1,
      targetSearch = search
    ) => {
      if (!targetTable) {
        setDataset(null);
        return;
      }

      const requestId = ++requestIdRef.current;

      setLoading(true);
      setMessage(null);

      try {
        const query = new URLSearchParams({
          table: targetTable,
          page: String(targetPage),
          limit: String(PAGE_SIZE),
          search: targetSearch,
        });

        const response = await fetch(
          `/api/data/update?${query}`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal mengambil data."
          );
        }

        // Abaikan respons jika sudah ada permintaan yang lebih baru.
        if (requestId !== requestIdRef.current) {
          return;
        }

        // Pastikan API mengembalikan tabel yang diminta.
        if (result.table !== targetTable) {
          throw new Error(
            "Data yang diterima tidak sesuai dengan subkelas aktif."
          );
        }

        setDataset(result);
        setPage(targetPage);
        setSelectedId(null);

      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setDataset(null);

        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan.",
        });

      } finally {
        // Jangan biarkan request lama mengubah status loading
        // milik request yang lebih baru.
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [search]
  );

  useEffect(() => {
    loadGroups().catch((error) =>
      setMessage({
        type: "error",
        text: error.message,
      })
    );
  }, [loadGroups]);

  // Memuat ulang data setiap kali subkelas, halaman,
  // atau pencarian berubah.
  useEffect(() => {
    if (table) {
      loadData(table, page, search);
    }
  }, [table, page, search, loadData]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groups, groupId]
  );

  const visibleColumns = useMemo(
    () =>
      (currentDataset?.columns || [])
        .filter((column) => column.name !== "__geometry")
        .slice(0, 7),
    [currentDataset]
  );

  const startNumber = currentDataset
    ? (currentDataset.page - 1) * currentDataset.limit + 1
    : 0;

  const endNumber = currentDataset
    ? Math.min(
        currentDataset.page * currentDataset.limit,
        currentDataset.total
      )
    : 0;

  // Mengganti kelas sekaligus membatalkan request sebelumnya.
  function chooseGroup(value: string) {
    requestIdRef.current++;

    setGroupId(value);
    setTable("");
    setDataset(null);
    setSelectedId(null);

    setSearch("");
    setSearchInput("");
    setPage(1);

    setLoading(false);
    setEditing(null);
    setDeleting(null);
    setMessage(null);
  }

  // Mengganti subkelas dan langsung membersihkan peta lama.
  function chooseTable(value: string) {
    requestIdRef.current++;

    setTable(value);
    setDataset(null);
    setSelectedId(null);

    setPage(1);
    setSearch("");
    setSearchInput("");

    setLoading(false);
    setEditing(null);
    setDeleting(null);
    setMessage(null);
  }

  function openEdit(row: RowData) {
    if (!currentDataset) return;

    const values: Record<string, string> = {};

    for (
      const column of currentDataset.columns.filter(
        (item) => item.editable
      )
    ) {
      values[column.name] =
        row[column.name] === null ||
        row[column.name] === undefined
          ? ""
          : String(row[column.name]);
    }

    setEditing(row);
    setEditValues(values);
    setMessage(null);
  }

  async function saveEdit() {
    if (!currentDataset || !editing) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/data/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table,
          id: editing[currentDataset.primaryKey],
          values: editValues,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal menyimpan perubahan."
        );
      }

      setEditing(null);

      setMessage({
        type: "success",
        text: result.message,
      });

      await loadData(table, page, search);

    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan.",
      });

    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!currentDataset || !deleting) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/data/update", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table,
          id: deleting[currentDataset.primaryKey],
          nama_penghapus: deleteName,
          unit_penghapus: deleteUnit,
          alasan_penghapusan: deleteReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal menghapus data."
        );
      }

      setDeleting(null);
      setDeleteReason("");

      setMessage({
        type: "success",
        text: result.message,
      });

      await loadData(table, page, search);

    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Gagal menghapus.",
      });

    } finally {
      setSaving(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSearch(searchInput.trim());
    setPage(1);
    setSelectedId(null);
  }

  // Identitas layer berubah ketika subkelas, halaman,
  // atau kumpulan fitur yang ditampilkan berubah.
  const mapKey = currentDataset
    ? `${currentDataset.table}-${currentDataset.page}-${currentDataset.rows
        .map((row) =>
          String(row[currentDataset.primaryKey] ?? "")
        )
        .join("|")}`
    : table;

  return (
    <main className="ud-page">

      <div className="ud-container">
        <div
          className="ud-title-row"
          style={{
            display: "block",
            marginBottom: 24,
          }}
        >
          <div>
            <Link
              href="/"
              className="ud-back-home"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
                color: "#365779",
                fontSize: 14,
                fontWeight: 400,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} />
              Kembali ke Beranda
            </Link>

            <h1
              style={{
                margin: "0 0 8px",
                color: "#0b3c66",
                fontSize: 28,
                lineHeight: 1.25,
                fontWeight: 700,
              }}
            >
              Update Data Infrastruktur
            </h1>
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              Pilih jenis infrastruktur untuk melihat, memperbarui, atau menghapus data.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`ud-alert ${message.type}`}
            role="status"
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* PILIH KELAS DAN SUBKELAS */}
        <section className="ud-card ud-filter-card">
          <div className="ud-card-heading">
            <div className="ud-heading-icon">
              <Database size={18} />
            </div>

            <div>
              <h2>Pilih Data Infrastruktur</h2>
              <p>
                Tentukan kelas dan subkelas data yang akan
                dikelola.
              </p>
            </div>
          </div>

          <div className="ud-filter-grid">
            <label>
              Kelas Infrastruktur

              <select
                value={groupId}
                onChange={(event) =>
                  chooseGroup(event.target.value)
                }
              >
                <option value="">Pilih kelas...</option>

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
                onChange={(event) =>
                  chooseTable(event.target.value)
                }
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

        {table && (
          <>
            {/* PETA */}
            <section className="ud-card ud-map-card">
              <div className="ud-card-heading">
                <div className="ud-heading-icon">
                  <Map size={18} />
                </div>

                <div>
                  <h2>
                    Peta Sebaran {labels[table] || table}
                  </h2>

                  <p>
                    Geometri mengikuti subkelas yang dipilih.
                    Pilih baris tabel untuk menyorot objek.
                  </p>
                </div>

                <button
                  className="ud-icon-button"
                  onClick={() => loadData(table, page, search)}
                  title="Muat ulang"
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {currentDataset && (
                <UpdateMap
                  key={mapKey}
                  rows={currentDataset.rows}
                  selectedId={selectedId}
                  primaryKey={currentDataset.primaryKey}
                />
              )}

              {!currentDataset && (
                <div className="ud-map-loading">
                  {loading
                    ? "Memuat geometri subkelas..."
                    : "Peta akan tampil setelah data berhasil dimuat."}
                </div>
              )}
            </section>

            {/* TABEL */}
            <section className="ud-card ud-table-card">
              <div className="ud-table-top">
                <div>
                  <h2>
                    Data {labels[table] || table}
                  </h2>

                  <p>
                    {currentDataset
                      ? `${currentDataset.total.toLocaleString(
                          "id-ID"
                        )} data tersedia`
                      : "Memuat tabel data..."}
                  </p>
                </div>

                <form
                  className="ud-search"
                  onSubmit={submitSearch}
                >
                  <Search size={17} />

                  <input
                    value={searchInput}
                    onChange={(event) =>
                      setSearchInput(event.target.value)
                    }
                    placeholder="Cari atribut data..."
                  />

                  <button type="submit">Cari</button>
                </form>
              </div>

              <div className="ud-table-scroll">
                <table className="ud-table">
                  <thead>
                    <tr>
                      {visibleColumns.map((column) => (
                        <th key={column.name}>
                          {column.name.replaceAll("_", " ")}
                        </th>
                      ))}

                      <th className="ud-action-head">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={visibleColumns.length + 1}
                          className="ud-empty"
                        >
                          <LoaderCircle
                            className="ud-spin"
                            size={20}
                          />
                          Memuat data...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      currentDataset?.rows.map((row, index) => {
                        const id = String(
                          row[currentDataset.primaryKey] ?? ""
                        );

                        return (
                          <tr
                            key={`${id}-${index}`}
                            className={
                              selectedId === id ? "selected" : ""
                            }
                            onClick={() => setSelectedId(id)}
                          >
                            {visibleColumns.map((column) => (
                              <td
                                key={column.name}
                                title={valueText(row[column.name])}
                              >
                                {valueText(row[column.name])}
                              </td>
                            ))}

                            <td>
                              <div className="ud-actions">
                                <button
                                  className="ud-edit"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEdit(row);
                                  }}
                                >
                                  <Edit3 size={14} />
                                  Edit
                                </button>

                                <button
                                  className="ud-delete"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeleting(row);
                                    setDeleteName(username);
                                    setDeleteUnit(unit);
                                  }}
                                >
                                  <Trash2 size={14} />
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {!loading &&
                      currentDataset?.rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={visibleColumns.length + 1}
                            className="ud-empty"
                          >
                            Tidak ada data yang cocok dengan
                            pencarian.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {currentDataset && (
                <div className="ud-pagination">
                  <span>
                    Menampilkan{" "}
                    {currentDataset.total ? startNumber : 0}
                    –{endNumber} dari{" "}
                    {currentDataset.total.toLocaleString("id-ID")}{" "}
                    data
                  </span>

                  <div>
                    <button
                      disabled={page <= 1 || loading}
                      onClick={() =>
                        setPage((value) =>
                          Math.max(1, value - 1)
                        )
                      }
                    >
                      <ChevronLeft size={16} />
                      Sebelumnya
                    </button>

                    <span>
                      Halaman {currentDataset.page} /{" "}
                      {currentDataset.totalPages}
                    </span>

                    <button
                      disabled={
                        page >= currentDataset.totalPages ||
                        loading
                      }
                      onClick={() =>
                        setPage((value) => value + 1)
                      }
                    >
                      Berikutnya
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {!table && (
          <div className="ud-placeholder">
            <Database size={34} />
            <strong>Belum ada data dipilih</strong>
            <span>
              Pilih kelas dan subkelas infrastruktur untuk
              mulai mengelola data.
            </span>
          </div>
        )}

        <footer className="ud-footer">
          © 2026 DPUPKP Kota Yogyakarta · SITIJO
        </footer>
      </div>

      {/* MODAL EDIT */}
      {editing && currentDataset && (
        <div
          className="ud-modal-backdrop"
          role="presentation"
        >
          <section
            className="ud-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ud-edit-title"
          >
            <div className="ud-modal-head">
              <div>
                <h2 id="ud-edit-title">
                  Edit Data {labels[table] || table}
                </h2>

                <p>
                  ID:{" "}
                  {valueText(
                    editing[currentDataset.primaryKey]
                  )}{" "}
                  · Primary key tidak dapat diubah
                </p>
              </div>

              <button
                onClick={() => setEditing(null)}
                aria-label="Tutup"
              >
                <X />
              </button>
            </div>

            <div className="ud-form-grid">
              {currentDataset.columns
                .filter((column) => column.editable)
                .map((column) => (
                  <label key={column.name}>
                    {column.name.replaceAll("_", " ")}

                    <input
                      value={editValues[column.name] ?? ""}
                      onChange={(event) =>
                        setEditValues((current) => ({
                          ...current,
                          [column.name]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
            </div>

            <div className="ud-modal-actions">
              <button
                className="ud-cancel"
                onClick={() => setEditing(null)}
              >
                Batal
              </button>

              <button
                className="ud-primary"
                disabled={saving}
                onClick={saveEdit}
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL HAPUS */}
      {deleting && currentDataset && (
        <div
          className="ud-modal-backdrop"
          role="presentation"
        >
          <section
            className="ud-modal ud-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ud-delete-title"
          >
            <div className="ud-modal-head">
              <div>
                <h2 id="ud-delete-title">
                  Konfirmasi Penghapusan
                </h2>

                <p>
                  Data ID{" "}
                  {valueText(
                    deleting[currentDataset.primaryKey]
                  )}{" "}
                  dari {labels[table] || table}
                </p>
              </div>

              <button
                onClick={() => setDeleting(null)}
                aria-label="Tutup"
              >
                <X />
              </button>
            </div>

            <div className="ud-warning">
              Data yang dihapus tidak dapat dipulihkan.
              Alasan penghapusan akan disimpan ke log.
            </div>

            <div className="ud-form-grid one">
              <label>
                Nama Penghapus

                <input
                  value={deleteName}
                  onChange={(event) =>
                    setDeleteName(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Unit / Bidang

                <input
                  value={deleteUnit}
                  onChange={(event) =>
                    setDeleteUnit(event.target.value)
                  }
                  required
                />
              </label>

              <label className="ud-full">
                Alasan Penghapusan

                <textarea
                  value={deleteReason}
                  onChange={(event) =>
                    setDeleteReason(event.target.value)
                  }
                  rows={4}
                  placeholder="Tuliskan alasan penghapusan..."
                  required
                />
              </label>
            </div>

            <div className="ud-modal-actions">
              <button
                className="ud-cancel"
                onClick={() => setDeleting(null)}
              >
                Batal
              </button>

              <button
                className="ud-danger-confirm"
                disabled={
                  saving ||
                  !deleteName.trim() ||
                  !deleteUnit.trim() ||
                  !deleteReason.trim()
                }
                onClick={confirmDelete}
              >
                {saving ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
