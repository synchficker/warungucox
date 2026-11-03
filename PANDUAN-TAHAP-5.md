# Warung Ucox — Tahap 5: Keuangan

Menu **Keuangan** (Owner dan Admin) dengan tiga tab: **Laporan** (laba rugi), **Catatan kas** (pengeluaran dan pemasukan lain), dan **Tutup kas** (cocokkan uang di laci).
Panduan Tahap 1 sampai 4 tetap berlaku.

## Pembaruan yang perlu dipasang (urut)

1. **Ganti isi `Code.gs`** di Apps Script, lalu *Save*.
2. **Deploy ulang:** *Deploy > Manage deployments > pensil > Version: New version > Deploy*. URL tetap sama, tidak ada izin baru.
3. Muat ulang Google Sheet dan jalankan menu **Warung Ucox > Siapkan tabel multi-user** satu kali. Ini membuat tab **Keuangan** dan **TutupKas**
   (juga dibuat otomatis saat pertama dipakai).
4. **Unggah seluruh isi folder** ke website.

## Cara menghitung laba (agar Anda bisa memeriksanya sendiri)

```
Penjualan                     = jumlah tagihan transaksi yang selesai (sudah dikurangi diskon, termasuk pembulatan tunai)
− Harga pokok barang terjual  = jumlah (qty × harga modal saat transaksi) dari setiap barang terjual
= Laba kotor
+ Pemasukan lain              (jasa, komisi pulsa/token, dll.)
− Pengeluaran operasional      (listrik & air, sewa, gaji, transportasi, perlengkapan, perawatan, pajak, lain-lain)
= Laba bersih
```

- Transaksi yang **dibatalkan** tidak dihitung. Transaksi berstatus **tidak tuntas** dilaporkan terpisah dan tidak dihitung sampai diperiksa.
- **Pembelian stok (barang masuk) dan "Pembayaran ke supplier" tidak mengurangi laba**, karena modal barang sudah terhitung lewat harga pokok saat barangnya terjual.
  Kalau keduanya dikurangkan, biaya yang sama akan terhitung dua kali. Pembayaran ke supplier tetap memengaruhi **kas di laci** (lihat Tutup kas).
- Harga modal yang dipakai adalah harga modal produk **pada saat transaksi**. Pastikan harga modal diperbarui saat barang masuk dengan harga baru
  (centang "Perbarui harga modal produk" di form Barang masuk), supaya margin akurat.

## Cara pakai

**Laporan.** Pilih periode: Hari ini, 7 hari, Bulan ini, Bulan lalu, atau Pilih tanggal (maksimal 366 hari). Tampil ringkasan penjualan, laba kotor beserta margin,
pengeluaran, dan laba bersih; rincian laba rugi; pembayaran menurut metode (tunai, QRIS, transfer); informasi lain (diskon, transaksi batal, pembelian stok, pesanan WhatsApp);
dan tabel per hari. **Unduh CSV** menghasilkan berkas yang terbuka rapi di Excel versi Indonesia (pemisah titik koma).

**Catatan kas.** *Catat pengeluaran / pemasukan*: pilih jenis, kategori, tanggal, jumlah, dan dibayar lewat tunai/transfer/QRIS. Kategori "Lain-lain" wajib diberi keterangan.
Catatan bisa diubah (jenis tidak bisa diganti) atau **dibatalkan** dengan alasan. Catatan tidak pernah dihapus, jadi jejaknya utuh dan tercatat di Audit.

**Tutup kas.** Pilih tanggal. Aplikasi menghitung **kas seharusnya** = modal awal + penjualan tunai + pemasukan lain tunai − pengeluaran tunai (termasuk bayar supplier tunai).
Hitung uang di laci, ketik hasilnya, dan selisihnya langsung tampil. Bila ada selisih, **catatan penyebab wajib diisi**. Modal awal terisi otomatis dari kas hasil hitung penutupan sebelumnya.
Tanggal yang sama bisa ditutup ulang (baris diperbarui, bukan ditambah). Bila setelah ditutup ada transaksi dibatalkan atau catatan diubah, muncul tanda
**"berubah sejak ditutup"**, sedangkan angka saat penutupan tetap tersimpan.

## Keputusan yang saya ambil (belum Anda jawab di akhir Tahap 4)

**Pesanan WhatsApp dari halaman toko tidak dihitung sebagai penjualan.** Pesanan itu mengurangi stok saat dikirim, tetapi belum tentu dibayar atau diambil, jadi memasukkannya ke omzet
bisa membuat laporan melebihi uang yang benar-benar diterima. Di laporan, jumlahnya tampil terpisah ("Pesanan WhatsApp toko: N pesanan, N unit, tidak dihitung").
**Jangan memasukkan ulang pesanan itu di Kasir**, karena stoknya sudah dikurangi dan akan berkurang dua kali.
Alternatif yang bisa kita kerjakan bila Anda mau: tombol "Pesanan WhatsApp" di Kasir yang mencatat penjualan **tanpa** mengurangi stok lagi (hanya Admin/Owner agar tidak disalahgunakan).

**Tutup kas hanya oleh Owner/Admin,** satu penutupan per hari (satu laci), sesuai matriks hak akses awal (Kasir tidak punya akses laporan keuangan).

## Batasan yang perlu Anda ketahui

1. **Kerugian stok belum masuk laba.** Barang rusak, kadaluarsa, atau hilang (lewat Penyesuaian stok) mengurangi stok tetapi **belum dikurangkan dari laba**, sehingga laba bersih bisa terlihat
   sedikit lebih tinggi dari kenyataan. Usulan: dimasukkan sebagai "susut stok" di Tahap 6 (Analitik).
2. **Belum ada piutang/bon, utang ke supplier, maupun kas bank terpisah.** Yang dihitung hanya apa yang dicatat; "Pembayaran ke supplier" dicatat saat dibayar.
3. **Satu laci per hari.** Belum ada penutupan per kasir atau per shift.
4. **Hari yang sudah ditutup belum dikunci.** Angka masih bisa berubah (dan ditandai). Penguncian ada di Tahap 7 (Audit & Keamanan).
5. Tanggal "hari ini" mengikuti jam server (WIB). Bila perangkat Anda memakai zona waktu lain, pilihan periode cepat bisa bergeser satu hari menjelang tengah malam.
6. Catatan kas tidak boleh bertanggal di masa depan atau lebih dari 2 tahun lalu. Kategori bersifat tetap (daftar di `Code.gs`, konstanta `KAT_KEU`); menambah kategori butuh perubahan kode kecil.

## Perbaikan yang ditemukan saat pengujian tahap ini

- **Angka 0 tampil kosong di semua formulir.** Akibatnya antara lain: produk dengan stok minimum 0 (Tahap 3) tampil kosong dan, bila disimpan, kembali memakai batas toko;
  di Tutup kas, "Modal awal 0" kosong sehingga formulir tak bisa dikirim. Sudah diperbaiki di satu tempat untuk semua formulir.
- **Mengubah catatan kas gagal** karena kolom jenis yang dikunci tidak ikut terkirim. Sudah diperbaiki.
- Perhitungan laporan diuji dengan **jam palsu lintas tiga hari** dan dibandingkan dengan hitungan manual (penjualan, HPP, diskon, pembulatan, pembatalan, pengeluaran, kas),
  termasuk hari tanpa penjualan, rentang kosong, dan perubahan susulan pada hari yang sudah ditutup.

## Tahap berikutnya

**Tahap 6, Analitik Dashboard:** omzet dan transaksi dalam grafik, produk terlaris, margin per produk, nilai persediaan, dan (bila Anda setuju) susut stok.
