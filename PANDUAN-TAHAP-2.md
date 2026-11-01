# Warung Ucox — Tahap 2: Master Data

Menambahkan menu **Data** di panel staf untuk mengelola **produk, kategori, dan supplier**,
lengkap dengan **foto produk** dan **barcode**. Semua perubahan langsung tersimpan di Google Sheets
dan langsung terlihat di halaman toko. Panduan Tahap 1 tetap berlaku.

## Pembaruan yang perlu dipasang (urut)

1. **Ganti isi `Code.gs`** di Apps Script dengan yang baru, lalu *Save*.
2. **Deploy ulang:** *Deploy > Manage deployments > pensil > Version: New version > Deploy*.
   Google akan meminta izin baru (akses Google Drive untuk foto produk). Setujui. URL `/exec` tetap sama.
3. Muat ulang Google Sheet, lalu jalankan menu **Warung Ucox > Izinkan akses Drive (foto produk)** satu kali.
   Ini membuat folder *"Warung Ucox - Gambar Produk"* di Drive Anda.
4. **Unggah seluruh isi folder** ke website seperti biasa. Tidak ada tab Sheet baru pada tahap ini.

Jika menu **Data** muncul tetapi memuat galat "Fitur ini belum tersedia di server", berarti langkah 2 belum dijalankan (belum *New version*).

## Yang bisa dilakukan

| Menu | Owner | Admin | Kasir |
| --- | :-: | :-: | :-: |
| Data > Produk (tambah, ubah, hapus, foto, barcode, label) | ✓ | ✓ | – |
| Data > Kategori dan Supplier | ✓ | ✓ | – |

Hak akses dicek di server, jadi Kasir ditolak walau memanggil API langsung.

**Produk.** Cari berdasarkan nama atau barcode, filter per kategori. Formulir menghitung laba per satuan secara langsung
dan memberi peringatan bila harga jual di bawah modal (tetap boleh disimpan untuk promo).
Produk dengan nama dan satuan yang sama, atau barcode yang sama, ditolak.

**Foto.** Pilih foto dari galeri/kamera. Browser mengecilkannya otomatis (maks 600 px, JPEG, sekitar 50 KB) lalu mengunggahnya
ke Google Drive; tautannya disimpan di Sheet dan otomatis tampil di halaman toko. Anda juga bisa menempelkan tautan `https://` sendiri.
Foto lama tidak dihapus dari Drive saat diganti (folder bisa dibersihkan manual).

**Barcode.** Ketik, pindai dengan scanner USB (cukup arahkan kursor ke kolom barcode), atau pindai dengan kamera
(tombol muncul otomatis di browser yang mendukung, misalnya Chrome Android).
Produk tanpa barcode kemasan bisa memakai **Buat barcode internal** (EAN-13 berawalan 2, tidak bentrok dengan barcode pabrik).
**Label** mencetak barcode EAN-13 beserta nama dan harga, 1 sampai 60 label sekali cetak. Semua 50 barcode di data awal Anda adalah EAN-13 valid.

**Kategori.** Nama dan ikon (pilih dari daftar). Kategori yang masih dipakai produk tidak bisa dihapus.
Menghapus kategori otomatis melepasnya dari daftar kategori supplier.

**Supplier.** Kontak, kota, termin bayar, dan kategori yang dipasok.

Setiap tambah, ubah, atau hapus tercatat di **Audit** (siapa, apa, kapan, beserta nilai sebelum dan sesudah).

## Keputusan desain yang perlu Anda ketahui

- **Stok tidak bisa diubah dari formulir produk** (hanya stok awal saat produk baru). Ini disengaja: jika stok diedit dari sini,
  penjualan yang terjadi saat formulir terbuka bisa tertimpa. Perubahan stok akan dilakukan lewat **Inventaris (Tahap 3)**
  sebagai mutasi yang tercatat. Saat ini stok tetap bisa disesuaikan lewat menu Kelola lama di halaman toko.
- **Menghapus produk** menghapus barisnya dari Sheet. Transaksi POS (Tahap 4) nanti menyimpan salinan nama dan harga saat transaksi,
  sehingga riwayat tidak rusak oleh penghapusan produk.
- **Foto di Google Drive** dibagikan "siapa pun yang punya tautan" (hanya tampil, tidak bisa diubah) agar bisa tampil di halaman toko publik.
  Jangan unggah gambar yang bersifat rahasia.
- Dua catatan kecil hasil peninjauan: perlindungan rumus Sheets kini mengandalkan format sel bertipe teks (sebelumnya menambah tanda petik
  yang ikut tampil di data), dan tautan gambar yang mengandung tanda kutip ditolak agar tidak bisa menyisipkan kode ke halaman toko.

## Tahap berikutnya

**Tahap 3, Inventaris:** barang masuk (dari supplier), penyesuaian stok, stok minimum per produk, dan riwayat mutasi stok,
yang menggantikan menu Kelola lama.
