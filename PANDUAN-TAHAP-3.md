# Warung Ucox — Tahap 3: Inventaris

Menambahkan menu **Stok** di panel staf: ringkasan stok, **barang masuk** dari supplier, **penyesuaian stok**
(rusak, hilang, opname, dll.), **stok minimum per produk**, dan **riwayat mutasi stok**.
Panduan Tahap 1 dan 2 tetap berlaku.

## Pembaruan yang perlu dipasang (urut)

1. **Ganti isi `Code.gs`** di Apps Script dengan yang baru, lalu *Save*.
2. **Deploy ulang:** *Deploy > Manage deployments > pensil > Version: New version > Deploy*. URL tetap sama. Tidak ada izin baru.
3. Muat ulang Google Sheet, jalankan menu **Warung Ucox > Siapkan inventaris (tab Mutasi, stok minimum)** satu kali.
   Ini membuat tab **Mutasi** dan menambah kolom **stok_min** di ujung kanan tab Produk (kolom lain tidak diubah).
   Langkah ini juga akan berjalan otomatis saat fitur Stok pertama kali dipakai.
4. **Unggah seluruh isi folder** ke website.

Halaman toko tetap berjalan normal walau langkah 3 belum dilakukan.

## Navigasi baru

Menu bawah dirapikan menjadi **Beranda, Data, Stok, Lainnya**. Pengguna, Pengaturan toko, Audit, dan Akun kini ada di halaman **Lainnya**
(Kasir tetap melihat Beranda dan Akun langsung).

## Yang bisa dilakukan (Owner dan Admin)

**Ringkasan.** Nilai persediaan (pada harga beli), jumlah jenis produk, stok menipis, dan stok habis. Daftar diurutkan dari yang paling mendesak
(habis, lalu menipis). Filter Semua/Menipis/Habis dan pencarian nama atau barcode.

**Barang masuk.** Catat penerimaan dari supplier: pilih supplier dan no. faktur (opsional), tambahkan beberapa barang sekaligus,
isi jumlah dan harga beli. Barang bisa dipilih dari daftar, atau **pindai barcode** (scanner USB: ketik/pindai lalu Enter; atau tombol kamera di browser yang mendukung).
Total dihitung otomatis. Centang **Perbarui harga modal** bila ingin harga modal produk mengikuti harga beli terbaru.
Setiap penerimaan mendapat nomor, misalnya `BM-261102-001`. **Semua barang divalidasi dulu; bila satu salah, tidak ada yang tersimpan.**

**Penyesuaian stok.** Rusak, kadaluarsa, hilang, dipakai sendiri, retur ke supplier (mengurangi), ditemukan (menambah), atau
**opname** (mengatur stok sesuai hasil hitung fisik; selisihnya dicatat otomatis). Hilang, ditemukan, dan opname wajib diberi catatan.
Stok tidak bisa dikurangi sampai negatif.

**Stok minimum.** Diatur per produk (dari Stok > produk > Atur minimum, atau dari formulir produk). Kosong berarti memakai batas toko
(Lainnya > Pengaturan toko). Dashboard dan daftar Stok memakai aturan ini.

**Riwayat.** Buku mutasi: setiap perubahan stok dengan stok sebelum dan sesudah, siapa yang melakukan, kapan, nomor referensi, dan catatan.
Bisa difilter (Masuk, Penyesuaian, Penjualan) dan dicari. Riwayat per produk juga tampil di rincian produk.

## Hal penting untuk Anda ketahui

- **Semua perubahan stok kini tercatat**, termasuk dari jalur lama: tombol *Pesan via WhatsApp* di toko dicatat sebagai *Penjualan*
  (petugas `toko-online`), dan koreksi dari menu Kelola dicatat sebagai *Koreksi (menu Kelola)* (petugas `kelola-lama`).
  Dengan begitu riwayat stok tidak punya celah. Menu Kelola dan Kasir lama **tetap berfungsi** dan akan dipensiunkan saat POS (Tahap 4) siap;
  di Kelola sudah ada petunjuk menuju Panel Staf.
- **Perbaikan penting: ID produk/supplier tidak lagi dipakai ulang.** Sebelumnya produk yang dihapus bisa "mewariskan" ID-nya ke produk baru.
  Sekarang setelah ada buku mutasi, hal itu akan mencampur riwayat dua produk berbeda, jadi penghitung ID dibuat tidak pernah mundur.
- **Produk lama tidak punya riwayat sebelum hari ini.** Buku mutasi dimulai dari pemasangan Tahap 3. Stok awal produk lama sengaja tidak dibuatkan
  mutasi palsu; mutasi pertamanya akan menunjukkan stok sebelumnya apa adanya.
- Tab **Mutasi** bertambah terus. Sheets sanggup menampung puluhan ribu baris; pembersihan/arsip tahunan akan masuk di Tahap 7 (Audit & Keamanan).
- Hak akses mengikuti matriks: Owner dan Admin boleh semuanya di Stok; Kasir tidak punya akses dan ditolak server walau memanggil API langsung.

## Tahap berikutnya

**Tahap 4, Point of Sale:** keranjang, barcode scanner, diskon, pembayaran (tunai, QRIS/transfer), dan struk, dengan transaksi tersimpan di Sheets
dan stok berkurang lewat buku mutasi yang sama (jenis *Penjualan*). Setelah itu menu Kelola dan Kasir lama dipensiunkan.
