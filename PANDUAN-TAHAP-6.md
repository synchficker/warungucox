# Warung Ucox — Tahap 6: Analitik, Susut Stok, dan Pesanan WhatsApp

Tahap ini menambah tiga hal, dua di antaranya adalah usulan yang Anda setujui:

1. **Susut stok masuk hitungan laba** (barang rusak, kadaluarsa, hilang, selisih opname).
2. **Pesanan WhatsApp bisa dicatat sebagai penjualan** (tanpa mengurangi stok dua kali) atau dibatalkan (stok kembali).
3. **Analitik**: tren dan perbandingan periode, pola jam/hari, produk terlaris, klasifikasi ABC, saran restok berbasis statistik, stok mati, perputaran persediaan,
   titik impas, kinerja kasir, dan **Temuan & saran** yang selalu menyertakan angka buktinya. Beranda Owner/Admin ikut diperkaya.

## Pembaruan yang perlu dipasang (urut)

1. **Ganti isi `Code.gs`** di Apps Script, lalu *Save*.
2. **Deploy ulang:** *Deploy > Manage deployments > pensil > Version: New version > Deploy*. URL tetap sama, tidak ada izin baru.
3. Muat ulang Google Sheet dan jalankan **Warung Ucox > Siapkan tabel multi-user** satu kali. Tab **Transaksi** Anda otomatis mendapat dua kolom baru di ujung kanan
   (`sumber`, `ref_wa`); data lama tidak diubah (transaksi lama dianggap bersumber kasir). Ini juga berjalan otomatis saat pertama dipakai.
4. **Unggah seluruh isi folder** ke website.
5. Owner: **Lainnya > Pengaturan toko > Saran restok**. Isi *lama barang datang setelah dipesan* sesuai kenyataan (nilai awal 3 hari) dan *hari cakupan* (nilai awal 7 hari).

## 1. Susut stok dalam laba

Laba bersih sekarang = penjualan − harga pokok + pemasukan lain − pengeluaran operasional − **susut stok bersih**.

| Jenis penyesuaian | Perlakuan |
| --- | --- |
| Rusak, kadaluarsa, hilang | **Kerugian** (mengurangi laba) |
| Opname yang hasil hitungnya **kurang** dari catatan | **Kerugian** |
| Barang ditemukan; opname yang hasil hitungnya **lebih** | **Pemulihan** (menambah laba) |
| Dipakai sendiri | Bukan kerugian usaha (pengambilan pemilik). Hanya informasi |
| Retur ke supplier | Bukan kerugian (dikembalikan ke pemasok). Hanya informasi |

Nilai = jumlah × **harga modal saat penyesuaian dicatat** (kini disimpan di setiap penyesuaian). Penyesuaian lama yang belum punya catatan modal dinilai dengan modal produk saat ini
dan ditandai *estimasi*. Kerugian dibebankan pada **hari kejadian**.

## 2. Pesanan WhatsApp

Pesanan dari halaman toko mengurangi stok saat dikirim. Admin/Owner kini menanganinya dari **Kasir > ikon WhatsApp** (lencana merah = jumlah yang menunggu):

- **Catat sebagai penjualan**: barang diambil dari catatan pesanan (tidak bisa diubah dari browser), harga memakai harga sekarang, boleh diberi diskon, lalu dibayar seperti biasa.
  **Stok tidak dikurangi lagi.** Transaksinya bertanda sumber *WA* dan ikut omzet.
- **Batalkan pesanan**: stok dikembalikan penuh (alasan wajib, tercatat di Audit).
- Bila transaksi WA dibatalkan, pesanannya kembali ke daftar (stok tetap, karena pengurangan aslinya belum dibatalkan).
- Hanya Admin/Owner (mencegah penjualan tanpa pengurangan stok oleh kasir). Pesanan tidak bisa dicatat dua kali. Keranjang pesanan WA **tidak disimpan** di perangkat,
  agar tidak terpulihkan sebagai keranjang biasa yang akan mengurangi stok dua kali.

## 3. Analitik: semua rumus

Buka **Lainnya > Analitik** (periode 7/30/90 hari, bulan ini, atau tanggal bebas; maksimal 92 hari). Setiap bagian punya *Cara menghitung*. Ringkasnya:

| Metrik | Rumus |
| --- | --- |
| Penjualan, laba kotor | Jumlah tagihan transaksi selesai; laba kotor = penjualan − Σ(jumlah × modal saat transaksi) |
| Perubahan % | (sekarang − sebelumnya) ÷ sebelumnya × 100, terhadap periode sebelumnya yang sama panjang. Kosong bila sebelumnya nol |
| Penjualan produk | harga × jumlah − diskon barang − bagian diskon transaksi (dibagi menurut porsi nilai barang) |
| Margin produk | (penjualan produk − modal) ÷ penjualan produk × 100 |
| ABC (Pareto) | Urut menurut penjualan produk. A: porsi kumulatif *sebelum* produk itu masih < 80%; B: < 95%; C: sisanya |
| Kecepatan jual **d** | Jumlah terjual ÷ hari efektif (hari kalender termasuk hari tanpa penjualan; produk baru dihitung sejak dibuat) |
| Simpangan baku **s** | √[ Σ(x − d)² ÷ (n − 1) ], x = terjual per hari |
| Titik pesan ulang | **d × L + 1,65 × s × √L** (L = lead time; 1,65 = tingkat layanan 95%) |
| Stok target dan saran beli | target = titik pesan ulang + d × R (R = hari cakupan); beli = ⌈target − stok⌉ bila stok ≤ titik pesan ulang |
| Titik impas harian | (pengeluaran operasional ÷ hari) ÷ (laba kotor ÷ penjualan) |
| Perputaran persediaan | Harga pokok periode ÷ nilai persediaan sekarang; ×365÷hari untuk per tahun |
| Hari persediaan | Nilai persediaan ÷ (harga pokok ÷ hari) |
| GMROI | Laba kotor setahun ÷ nilai persediaan (laba kotor per Rp1 modal persediaan) |
| Stok mati | Stok > 0, tidak terjual sama sekali di periode, dan bukan produk yang baru dibuat di periode |
| Proyeksi akhir bulan | Hanya untuk "Bulan ini": penjualan ÷ hari berlalu × jumlah hari dalam bulan |
| Pola hari | Total penjualan hari itu ÷ berapa kali hari itu muncul di periode (rata-rata, bukan total) |

**Contoh nyata (dari pengujian, sepuluh hari):** Produk A terjual 2,0,3,1,0,4,2,0,1,3 per hari → d = 1,6; s = 1,43; stok pengaman = 1,65 × 1,43 × √3 = 4,09;
titik pesan ulang = 1,6 × 3 + 4,09 = **8,9**; stok target = 8,9 + 1,6 × 7 = **20,1**; stok tinggal 4 (cukup 4 ÷ 1,6 = 2,5 hari, kurang dari lead time 3 hari) → **beli 17**.

### Bagaimana angka-angka ini diverifikasi
Dataset sepuluh hari (penjualan tunggal dan multi-barang, diskon transaksi, diskon kasir, transaksi batal, produk rugi, produk baru, stok mati, susut) dibuat dengan jam palsu.
Hasil yang diharapkan **dihitung ulang dengan kode terpisah** (misalnya simpangan baku dengan rumus dua-langkah, bukan rumus yang dipakai server) lalu dibandingkan, ditambah
angka-angka yang saya hitung manual (jumlah omzet Rp288.250, harga pokok Rp206.000, laba kotor Rp82.250, margin 28,5%, titik impas Rp14.019 per hari, dst.).
Termasuk pemeriksaan bahwa total penjualan per produk setelah pembagian diskon sama dengan total penjualan (tidak ada rupiah yang hilang).

### Temuan & saran otomatis
Aturan tetap, masing-masing dengan angka bukti yang bisa dibuka: restok mendesak (stok habis sebelum barang datang), produk dijual di bawah modal, produk andalan (kelas A) bermargin
tipis (disertai harga yang dibutuhkan untuk mencapai margin rata-rata toko), penjualan di bawah/atas titik impas, modal tertahan di stok mati, susut stok > 2% dari harga pokok,
diskon kasir yang lebih dari dua kali rata-rata toko, jam tersibuk, dan peringatan bila datanya masih kurang dari 7 hari. Ini bahan pertimbangan, bukan perintah.

## Batasan yang jujur

1. **Saran restok mengasumsikan permintaan relatif stabil.** Lonjakan musiman (Ramadan, Lebaran, tahun ajaran baru) tidak tertangkap. Makin sedikit data (kurang dari 7 hari), makin kasar.
2. **Hari saat stok kosong terbaca sebagai "tidak ada penjualan"**, sehingga kecepatan jual produk yang sering kosong cenderung **diremehkan**. Untuk produk seperti itu, angkanya batas bawah.
3. Produk yang dibuat dengan stok awal 0 tidak punya catatan pembuatan, sehingga dianggap sudah ada sepanjang periode (kecepatan jualnya bisa terlalu rendah).
4. **Perputaran persediaan memakai nilai persediaan sekarang**, bukan rata-rata periode (rata-rata historis tidak disimpan).
5. **Titik impas menganggap semua pengeluaran operasional sebagai biaya tetap.**
6. Pesanan WhatsApp: jumlah yang dicatat adalah jumlah yang benar-benar mengurangi stok. Bila stok kurang saat dipesan, jumlah itu bisa lebih kecil dari yang dipesan pelanggan.
   Hanya pesanan dalam 20.000 mutasi terakhir yang terlihat.
7. Koreksi stok lewat menu Kelola lama (kini disembunyikan) dan stok awal produk tidak dihitung sebagai susut.
8. Beranda Owner/Admin kini menghitung analitik 7 hari setiap dibuka, jadi bisa terasa beberapa detik lebih lama di Google Sheets. Mohon dicoba langsung dan kabari bila terlalu lambat.
9. Jam transaksi mengikuti waktu server (WIB).

## Perbaikan yang ditemukan saat pengujian tahap ini

- Lencana jumlah pesanan WhatsApp tidak berkurang setelah pesanan dicatat sampai halaman dimuat ulang. Sudah diperbaiki.
- Teks saran menulis angka negatif sebagai "Rp-2.000" dan bergantung pada `toLocaleString`, yang perilakunya di Apps Script tidak bisa dipastikan. Diganti pemformat rupiah sendiri ("-Rp2.000").

## Tahap berikutnya

**Tahap 7, Audit & Keamanan:** log aktivitas lengkap yang bisa dicari dan diekspor, penguncian hari yang sudah ditutup, validasi tambahan, dan **backup** otomatis/berkala data Sheets.
