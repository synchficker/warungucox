/* Warung Ucox | config.js | Pengaturan bersama halaman toko (index.html) dan panel staf (panel.html) */

const CONFIG = {
  nama: 'Toko Sembako si Ucox',
  waNumber: '628989921788',
  waTampil: '0898-9921-788',
  lamaBukaMenit: 10,   // PIN berlaku sekian menit sejak aksi terakhir
  alamat: 'Jl. Curug Raya Gg. Rukun 2 No. 6, Curug, Bojongsari, Kota Depok',
  pakaiGambar: false,   // ubah ke true setelah foto produk ada di folder img/
  stokMenipis: 10,      // stok sama atau di bawah angka ini diberi label menipis
  // Alamat Web App Google Apps Script (berakhiran /exec). Kosong = mode lokal (data hanya di perangkat ini).
  sheetsUrl: 'https://script.google.com/macros/s/AKfycbyfXcb6LFgkd8KVTstsl5PKCSIeIOT2yYU3kLAXSzeS8m7FXe9pgV0C0UJE_rNPJ96Y/exec',
  sinkronDetik: 60,     // data diperbarui otomatis tiap sekian detik saat layar terbuka
  // Tautan media sosial footer. GANTI dengan akun asli toko (sementara masih halaman utama masing-masing situs).
  sosmed: {
    facebook:  'https://www.facebook.com/',
    x:         'https://x.com/',
    instagram: 'https://www.instagram.com/',
    tiktok:    'https://www.tiktok.com/',
    threads:   'https://www.threads.com/'
  }
};
