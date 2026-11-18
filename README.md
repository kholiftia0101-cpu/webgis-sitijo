# Web Sitijo Next.js — Migration Lab

Repository eksperimen migrasi WebGIS Sitijo dari PHP ke Next.js + TypeScript/TSX.

## Status

Ini adalah **scaffold awal**, bukan hasil migrasi seluruh fitur PHP. Supabase produksi belum disentuh. Peta awal hanya menampilkan basemap OSM dan Esri.

## Menjalankan lokal

1. Install Node.js 20+.
2. Salin `.env.example` menjadi `.env.local`.
3. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` bila perlu koneksi Supabase.
4. Jalankan:

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

## Prinsip keamanan

- Jangan commit `.env.local`.
- Jangan pernah mengekspos `service_role` atau password database di browser.
- Operasi data harus mengikuti RLS dan hak akses yang sudah disepakati pengelola Supabase.
- Jangan jalankan migrasi SQL atau mengubah schema produksi tanpa persetujuan pengelola database.

## Rencana migrasi

1. Inventarisasi endpoint PHP dan kontrak request/response.
2. Migrasi endpoint GIS utilitas dengan allowlist tabel.
3. Migrasi MVT/BBOX dan uji kesetaraan jumlah fitur/geometri.
4. Migrasi CRUD, upload/download GeoJSON.
5. Migrasi autentikasi, role, dan audit log.
6. Migrasi halaman dan komponen UI.
7. Uji performa dan regresi sebelum deployment.

## Referensi sumber lama

Folder `legacy-reference/` berisi salinan kode PHP lama untuk pembacaan dan perbandingan saja. Jangan deploy folder tersebut sebagai bagian dari aplikasi Next.js.
