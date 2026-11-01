# Warung Ucox — Tahap 1: Autentikasi & Manajemen Peran

Versi ini menambahkan **panel staf multi-user** (`panel.html`) tanpa mengubah tampilan halaman toko
dan tanpa memutus koneksi Google Sheets yang sudah berjalan.

## Yang baru

| Bagian | Isi |
| --- | --- |
| `panel.html` + folder `panel/` | Panel staf: masuk, Beranda, Pengguna, Pengaturan Toko, Audit, Akun |
| `Code.gs` | Ditambah lapisan multi-user (sesi, peran, audit). Jalur lama (kunci sinkron) **tetap utuh** |
| `config.js` | `CONFIG` dipindah dari `app.js` supaya dipakai bersama toko dan panel |
| `app.js` | Dua perubahan kecil: gembok footer kini menuju `panel.html`, dan nama/alamat/WA/batas stok toko dibaca dari Sheets |
| `dev/` | Uji otomatis `Code.gs` (`node dev/uji-code-gs.js`) untuk dipakai di tahap berikutnya |

Tab baru di Google Sheets (dibuat otomatis): **Pengguna**, **Sesi**, **Pengaturan**, **Audit**.
Tab lama (Kategori, Produk, Supplier, _Log) tidak diubah.

## Cara memasang (urut, sekitar 5 menit)

1. **Perbarui Apps Script.** Buka Google Sheet, *Extensions > Apps Script*. Ganti seluruh isi `Code.gs` dengan `Code.gs` dari ZIP ini, lalu *Save*.
2. **Deploy ulang tanpa mengganti URL.** *Deploy > Manage deployments*, klik ikon pensil, pada *Version* pilih **New version**, lalu *Deploy*. URL `/exec` Anda tetap sama, jadi `config.js` tidak perlu diubah.
3. **Siapkan tabel.** Muat ulang Google Sheet, lalu menu **Warung Ucox > Siapkan tabel multi-user** (izinkan bila diminta).
4. **Unggah file website** seperti biasa (seluruh isi folder `warungucox`).
5. **Buat akun Owner.** Buka `panel.html`. Pada kunjungan pertama muncul "Siapkan akun Owner": isi **kunci sinkron** yang sudah Anda pakai, lalu nama, username, dan kata sandi. Setelah itu, tambahkan Admin dan Kasir lewat menu **Pengguna**.

## Hak akses (ditegakkan di server, bukan hanya disembunyikan di layar)

| Fitur | Owner | Admin | Kasir | Status |
| --- | :-: | :-: | :-: | --- |
| Dashboard | ✓ | ✓ | ✓ | Aktif (ringkasan stok) |
| Manajemen pengguna | ✓ | – | – | **Aktif** |
| Pengaturan toko | ✓ | – | – | **Aktif** |
| Audit aktivitas | ✓ | ✓ | – | **Aktif** (login & manajemen akun) |
| Master produk, kategori & supplier | ✓ | ✓ | – | Tahap 2 |
| Barang masuk, penyesuaian stok | ✓ | ✓ | – | Tahap 3 |
| Transaksi POS | ✓ | ✓ | ✓ | Tahap 4 |
| Pengeluaran, laporan keuangan | ✓ | ✓ | – | Tahap 5 |

Matriks ada di satu tempat: konstanta `IZIN` di `Code.gs`. Tahap berikutnya cukup mendaftarkan aksi baru ke matriks itu.

## Perilaku keamanan yang sudah berjalan

- Kata sandi disimpan sebagai hash bergaram (600 putaran SHA-256), tidak pernah sebagai teks asli. Token sesi hanya disimpan dalam bentuk hash di tab Sesi.
- 5 kali salah sandi mengunci akun itu 5 menit. Ada juga batas global terhadap tebakan banyak username.
- Sesi berlaku 12 jam sejak aktivitas terakhir. **Keluar** hanya mencabut sesi di perangkat itu.
- Menonaktifkan akun, mengubah peran, atau mereset sandi **langsung memutus semua sesi** akun tersebut.
- Akun baru atau hasil reset wajib mengganti kata sandi sementara saat masuk pertama.
- Owner tidak bisa menurunkan atau menonaktifkan dirinya sendiri, dan selalu harus tersisa minimal satu Owner aktif.
- Input diberi perlindungan terhadap rumus berbahaya di Sheets (awalan `=`, `+`, `-`, `@`).
- Lupa sandi Owner? Menu **Warung Ucox > Reset kata sandi akun (darurat)** (hanya bisa dijalankan editor Spreadsheet).

## Batasan yang perlu Anda ketahui

1. **Siapa pun yang punya akses edit ke Google Sheet bisa melihat dan mengubah semuanya**, termasuk tab Pengguna. Batasi berbagi Sheet hanya untuk Owner. Hash sandi melindungi dari pembacaan kata sandi asli, bukan dari editor Sheet.
2. Apps Script tidak menyediakan bcrypt/argon2. 600 putaran SHA-256 bergaram adalah kompromi antara keamanan dan batas waktu Apps Script. Cukup untuk toko, namun gunakan kata sandi yang tidak mudah ditebak.
3. Menu **Kelola** dan **Kasir** lama di halaman toko (PIN lokal + riwayat di `localStorage`) masih ada supaya operasional hari ini tidak terganggu. Keduanya akan digantikan oleh Master Data (Tahap 2), Inventaris (Tahap 3), dan POS (Tahap 4), lalu dipensiunkan.
4. Kunci sinkron lama masih dipakai jalur lama dan untuk pembuatan Owner pertama. **Saran: ganti kunci tersebut** lewat menu *Atur kunci sinkron* setelah Owner dibuat, terutama jika kunci pernah dibagikan lewat chat atau pesan.

## Rencana tahap berikutnya

2. **Master Data**: CRUD kategori, produk, supplier, gambar, barcode (dengan hak Owner/Admin)
3. **Inventaris**: barang masuk, penyesuaian, stok minimum, mutasi stok
4. **POS**: keranjang, scanner barcode, diskon, pembayaran, struk, transaksi tersimpan di Sheets (menggantikan riwayat lokal)
5. **Keuangan**: pengeluaran, pemasukan, laba
6. **Analitik**: omzet, terlaris, nilai persediaan, grafik
7. **Audit & Keamanan**: log transaksi/stok lengkap, penguncian transaksi bersamaan, backup
