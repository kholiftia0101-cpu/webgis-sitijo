# Catatan audit awal dari ZIP PHP

Temuan awal:
- `backend/gis/utilitas1.php` sampai `utilitas17.php`: endpoint data utilitas dan konfigurasi style.
- `backend/gis/mvt.php`: endpoint MVT; allowlist awal memuat `bangunan`.
- `backend/data/`: upload GeoJSON, tambah, update, hapus, download.
- `backend/auth/`: pemeriksaan role, sign-in, sign-out.
- `backend/log/`: pencatatan aktivitas.
- `frontend/peta.php`, `index.php`, dan `js/`: halaman peta dan antarmuka.

Aturan migrasi:
- Jangan mengubah nama tabel/kolom Supabase tanpa koordinasi.
- Pertahankan kontrak response endpoint lama sampai frontend baru siap.
- Gunakan query berparameter dan allowlist untuk nama tabel/kolom dinamis.
- MVT idealnya tetap dihasilkan PostGIS; hindari memuat seluruh fitur ke Node.js.
- Uji dengan layer dan extent yang sama; bandingkan jumlah fitur, atribut, CRS, dan waktu respons.
