# Warung Ucox — Tahap 4: Point of Sale (Kasir)

Menu **Kasir** di panel staf: keranjang, pemindai barcode, diskon, pembayaran (tunai, QRIS, transfer), struk, dan riwayat transaksi.
Semua transaksi tersimpan di Google Sheets sehingga tetap ada walau kasir berganti perangkat. Panduan Tahap 1 sampai 3 tetap berlaku.

## Pembaruan yang perlu dipasang (urut)

1. **Ganti isi `Code.gs`** di Apps Script, lalu *Save*.
2. **Deploy ulang:** *Deploy > Manage deployments > pensil > Version: New version > Deploy*. URL tetap sama, tidak ada izin baru.
3. Muat ulang Google Sheet dan jalankan menu **Warung Ucox > Siapkan tabel multi-user** satu kali. Ini membuat tab **Transaksi** dan **ItemTransaksi**
   (juga dibuat otomatis saat transaksi pertama).
4. **Unggah seluruh isi folder** ke website.
5. Owner: buka **Lainnya > Pengaturan toko**, bagian **Pengaturan kasir**, dan periksa tiga nilai (di bawah). Nilai awalnya aman.

## Cara pakai kasir

1. Buka **Kasir**. Ketuk produk atau pindai barcode (scanner USB: pindai lalu Enter, kolom pencarian sudah siap; atau tombol kamera di browser yang mendukung).
2. Atur jumlah, beri **diskon per barang** atau **diskon transaksi** (persen atau rupiah) bila perlu. Total dan tombol **Bayar** selalu terlihat.
3. **Bayar.** Tunai: ketik uang diterima atau ketuk *Uang pas*/pecahan cepat; kembalian tampil langsung. QRIS/Transfer: konfirmasi setelah dana masuk.
4. **Struk** tampil: **Cetak**, kirim lewat **WhatsApp**, atau **Salin** teksnya. Lalu *Transaksi baru*.
5. Ikon jam di atas = **riwayat transaksi**. Kasir melihat transaksinya sendiri hari ini; Owner/Admin melihat semua dan bisa memilih tanggal.

Keranjang yang belum dibayar tersimpan di perangkat itu, jadi tidak hilang bila halaman dimuat ulang. Bila Anda keluar, keranjang dibersihkan.

## Keputusan desain (semuanya bisa diubah)

| Hal | Pilihan sekarang | Cara mengubah |
| --- | --- | --- |
| Batas diskon Kasir | **10%** dari harga sebelum diskon. Di atas itu hanya Admin/Owner | Pengaturan toko > Batas diskon untuk Kasir |
| Pembulatan tunai | **Tanpa pembulatan**. Pilihan: ke atas kelipatan Rp100/500/1.000. QRIS/transfer selalu pas | Pengaturan toko > Pembulatan |
| Stok tercatat kurang | **Penjualan ditolak** (stok tidak boleh negatif) | Pengaturan toko > Jika stok tercatat kurang: "Izinkan, stok dikunci 0" |
| Pembatalan transaksi | **Hanya Owner/Admin**, wajib alasan, stok dikembalikan, tercatat di Audit | Matriks hak akses di `Code.gs` (`IZIN`) |
| Menu lama di halaman toko (Kelola, Riwayat, Kasir) | **Disembunyikan**, diganti tombol *Panel staf* | `config.js`: `menuLamaAktif: true` untuk menampilkannya lagi |

## Jaminan keamanan data

- **Harga tidak dipercaya dari browser.** Server selalu memakai harga di Sheet saat transaksi, dan menghitung ulang semua total, diskon, pembulatan, dan kembalian.
- **Tidak bisa tercatat dua kali.** Bila koneksi putus tepat saat membayar dan kasir menekan Bayar lagi, server mengenali permintaan yang sama dan tidak mencatat ulang
  (diuji: server mencatat, balasan hilang, kirim ulang, hasilnya tetap 1 transaksi dan stok berkurang sekali).
- **Semua dicek sebelum ditulis.** Bila satu barang kurang stok atau satu diskon tidak valid, tidak ada yang tersimpan.
- Setiap transaksi menyimpan **salinan** nama, harga jual, dan harga modal saat itu, jadi riwayat tidak berubah bila harga produk diubah atau produk dihapus
  (siap untuk laporan laba di Tahap 5).
- Stok berkurang lewat buku mutasi yang sama (jenis *Penjualan*), dan pembatalan mengembalikan persis jumlah yang dulu keluar (jenis *Pembatalan penjualan*).
- Kasir tidak pernah menerima harga beli. Kasir hanya melihat transaksinya sendiri; server menolak walau API dipanggil langsung.

## Batasan yang perlu Anda ketahui

1. **Jumlah hanya bilangan bulat.** Belum bisa menjual 0,5 kg atau 1,25 liter. Bila dibutuhkan, produk dibuat per satuan kecil (misalnya "Gula 1/2 kg"). Dukungan desimal butuh perubahan stok dan mutasi, usulan untuk tahap lanjutan.
2. **QRIS dan transfer dikonfirmasi manual oleh kasir.** Tidak ada integrasi payment gateway, jadi aplikasi tidak bisa memastikan dana benar-benar masuk.
3. **Belum ada tutup kas/shift** (hitung uang laci vs penjualan tunai). Rencananya di Tahap 5 bersama keuangan.
4. **Belum ada piutang/bon pelanggan.**
5. **Pesanan WhatsApp dari halaman toko tetap mengurangi stok** (tercatat sebagai penjualan *toko-online* di Mutasi), tetapi **belum menjadi transaksi** di tab Transaksi,
   jadi belum masuk omzet. Perlu keputusan kita di Tahap 5: dijadikan transaksi otomatis, atau dicatat kasir saat pesanan diambil.
6. **Kecepatan.** Setiap transaksi menulis beberapa sel di Google Sheets; terasa beberapa detik per transaksi. Saya tidak bisa mengukurnya dari sini, jadi mohon dicoba
   langsung dan beri tahu bila terasa lambat. Beberapa kasir yang membayar bersamaan akan antre (server memproses satu per satu agar stok tidak bentrok).
7. **Cetak** memakai dialog cetak browser (lebar struk 72 mm). Printer thermal yang terpasang sebagai printer sistem bisa dipakai, tetapi belum diuji dengan perangkat keras sungguhan.
   Pindai kamera membutuhkan alamat **HTTPS**.
8. Riwayat penjualan lama di menu Kasir halaman toko tersimpan **hanya di perangkat itu** dan **tidak dipindahkan** ke Sheets.
9. Tab Transaksi, ItemTransaksi, dan Mutasi terus bertambah. Sheets sanggup menampung puluhan ribu baris; pengarsipan berkala masuk Tahap 7.

## Perbaikan yang ditemukan saat pengujian tahap ini

- Penomoran harian (transaksi, barang masuk, penyesuaian) kembali ke 000 setelah 999 sehingga bisa bentrok. Sekarang terus bertambah.
- Format teks hanya terpasang untuk 1.000 baris pertama setiap tab sehingga kolom seperti waktu dan tanggal bisa berubah menjadi tipe tanggal Sheets setelah itu.
  Sekarang format dipasang pada setiap baris baru (diuji 1.100 penjualan beruntun).
- Mengetik jumlah lalu langsung mengetuk tombol lain membuat ketukan hilang (keranjang digambar ulang saat fokus pindah). Sekarang angka diperbarui di tempat.
- Setelah kirim ulang akibat koneksi putus, stok di kartu produk tidak langsung diperbarui. Sekarang diambil ulang.

## Tahap berikutnya

**Tahap 5, Keuangan:** pengeluaran operasional, pemasukan, laba (dari harga modal yang sudah disalin di setiap transaksi), dan tutup kas harian.
