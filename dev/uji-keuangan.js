/* Uji Tahap 5 (keuangan) dengan jam palsu lintas 3 hari. Angka harapan dihitung MANUAL di komentar, bukan dari kode.
   Jalankan: node dev/uji-keuangan.js */
const assert = require('assert');
const { post, sheets, setJam } = require('./mock-gas.js');
let ok = 0; const cek = (n, f) => { try { f(); ok++; console.log('  ok  ', n); } catch (e) { console.log('  GAGAL', n, '\n       ', e.message); process.exitCode = 1; } };
const login = (u, p) => { const r = post({ aksi: 'login', username: u, sandi: p }); if (!r.ok) throw new Error('login ' + u + ': ' + r.galat); return r.token; };
const kirim = (tok, aksi, o = {}) => post(Object.assign({ aksi, token: tok }, o));
const TGL = { d1: '2026-10-01', d2: '2026-10-02', d3: '2026-10-03' };
let n = 0; const trx = (tok, d) => kirim(tok, 'transaksi_buat', { trx: Object.assign({ id_klien: 'uji' + (++n) + '-abcdefgh', metode: 'tunai' }, d) });

console.log('Hari 1 (2026-10-01)');
setJam(TGL.d1 + 'T09:00:00Z');
const o1 = post({ aksi: 'setup_owner', kunci: 'KunciRahasia123', username: 'ucox', nama: 'Pak Ucox', sandi: 'rahasia1' }); let tOwner = o1.token;
kirim(tOwner, 'pengguna_simpan', { pengguna: { nama: 'Bu Admin', username: 'admin1', peran: 'admin', sandi: 'sementara1' } });
kirim(tOwner, 'pengguna_simpan', { pengguna: { nama: 'Si Kasir', username: 'kasir1', peran: 'kasir', sandi: 'sementara2' } });
let tAdmin = login('admin1', 'sementara1'); kirim(tAdmin, 'ganti_sandi', { lama: 'sementara1', baru: 'adminBaru1' });
let tKasir = login('kasir1', 'sementara2'); kirim(tKasir, 'ganti_sandi', { lama: 'sementara2', baru: 'kasirBaru1' });
tAdmin = login('admin1', 'adminBaru1'); tKasir = login('kasir1', 'kasirBaru1');
const A = kirim(tOwner, 'produk_simpan', { produk: { nama: 'Produk A', kategori: 'beras', satuan: 'pcs', harga_beli: 10000, harga_jual: 15000, stok: 100 } }).id;
const B = kirim(tOwner, 'produk_simpan', { produk: { nama: 'Produk B', kategori: 'beras', satuan: 'pcs', harga_beli: 2000, harga_jual: 3000, stok: 100 } }).id;
kirim(tAdmin, 'masuk_simpan', { masuk: { perbarui_modal: false, items: [{ produk_id: A, qty: 10, harga_beli: 9500 }] } });   // pembelian stok 95.000 (tidak mengubah modal)
const T1 = trx(tKasir, { items: [{ produk_id: A, qty: 2 }, { produk_id: B, qty: 1 }], bayar: 33000 });                       // 30.000 + 3.000 = 33.000, HPP 22.000
const T2 = trx(tKasir, { metode: 'qris', items: [{ produk_id: B, qty: 10 }] });                                              // 30.000, HPP 20.000
const T3 = trx(tKasir, { items: [{ produk_id: A, qty: 1, diskon: 1000 }], bayar: 14000 });                                  // 14.000 lalu DIBATALKAN
cek('transaksi hari 1 berhasil', () => { assert(T1.ok && T2.ok && T3.ok, JSON.stringify([T1.galat, T2.galat, T3.galat])); assert.equal(T1.trx.tagihan, 33000); });
cek('Admin membatalkan T3', () => assert(kirim(tAdmin, 'transaksi_batal', { no: T3.trx.no, alasan: 'salah scan' }).ok));
const keu = (tok, e) => kirim(tok, 'keuangan_catat', { entri: Object.assign({ tanggal: hariIni(), metode: 'tunai' }, e) });
let sekarang = TGL.d1; const hariIni = () => sekarang;   // tanggal menurut jam palsu (bukan jam komputer)
let idListrik, idSupplier, idJasa;
cek('catat pengeluaran listrik 5.000 (tunai), bayar supplier 20.000 (tunai), pemasukan jasa 2.000 (tunai)', () => {
  let r = keu(tAdmin, { jenis: 'pengeluaran', kategori: 'listrik_air', jumlah: 5000, keterangan: 'token' }); assert(r.ok, r.galat); idListrik = r.id;
  r = keu(tAdmin, { jenis: 'pengeluaran', kategori: 'bayar_supplier', jumlah: 20000 }); assert(r.ok, r.galat); idSupplier = r.id;
  r = keu(tOwner, { jenis: 'pemasukan', kategori: 'jasa', jumlah: 2000, keterangan: 'komisi pulsa' }); assert(r.ok, r.galat); idJasa = r.id;
  assert.equal(r.entri.length, 3); assert.equal(r.total.pemasukan, 2000); assert.equal(r.total.pengeluaran, 25000);
});
cek('LAPORAN hari 1 = hitungan manual (omzet 63.000, HPP 42.000, laba bersih 18.000)', () => {
  const r = kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d1, sampai: TGL.d1 }); assert(r.ok, r.galat);
  // omzet = 33.000 + 30.000 (T3 batal tidak dihitung); HPP = (2x10.000 + 1x2.000) + (10x2.000) = 42.000; laba kotor 21.000
  // laba bersih = 21.000 + pemasukan 2.000 - operasional 5.000 = 18.000 (bayar supplier 20.000 BUKAN beban)
  assert.deepEqual(r.ringkas, { transaksi: 2, omzet: 63000, hpp: 42000, laba_kotor: 21000, diskon: 0, pemasukan_lain: 2000, pengeluaran_operasional: 5000, bayar_supplier: 20000, laba_bersih: 18000, margin: 33.3 });
  assert.deepEqual(r.metode, { tunai: 33000, qris: 30000, transfer: 0 }); assert.deepEqual(r.batal, { jumlah: 1, total: 14000 }); assert.equal(r.tidak_tuntas, 0);
  assert.deepEqual(r.pembelian_stok, { nilai: 95000, penerimaan: 1, unit: 10 }); assert.equal(r.harian.length, 1); assert.equal(r.harian[0].laba_bersih, 18000);
  assert.deepEqual(r.pengeluaran_kategori.map((x) => [x.kategori, x.jumlah, x.operasional]), [['bayar_supplier', 20000, false], ['listrik_air', 5000, true]]);
});
cek('KAS hari 1: seharusnya 10.000 (0 + tunai 33.000 + jasa 2.000 - keluar 25.000); tutup tanpa selisih', () => {
  const h = kirim(tAdmin, 'kas_hitung', { tanggal: TGL.d1 }); assert.deepEqual(h.komponen, { penjualan_tunai: 33000, pemasukan_tunai: 2000, pengeluaran_tunai: 25000 }); assert.equal(h.modal_awal_usulan, 0); assert.equal(h.tutup, null);
  const t = kirim(tAdmin, 'kas_tutup', { tanggal: TGL.d1, modal_awal: 0, kas_hitung: 10000 }); assert(t.ok, t.galat); assert.equal(t.tutup.kas_seharusnya, 10000); assert.equal(t.tutup.selisih, 0); assert.equal(t.berubah, false);
});

console.log('Hari 2 (2026-10-02)');
setJam(TGL.d2 + 'T09:00:00Z'); sekarang = TGL.d2; tOwner = login('ucox', 'rahasia1'); tAdmin = login('admin1', 'adminBaru1'); tKasir = login('kasir1', 'kasirBaru1');
cek('Owner mengaktifkan pembulatan Rp1.000', () => assert(kirim(tOwner, 'pengaturan_simpan', { pengaturan: { nama_toko: 'Warung Ucox', alamat: 'Depok', wa_nomor: '628123456789', wa_tampil: '', stok_menipis: 8, pesan_struk: '', pembulatan: 1000 } }).ok));
const T4 = trx(tAdmin, { items: [{ produk_id: A, qty: 3 }], diskon_trx: { jenis: 'persen', nilai: 10 }, bayar: 50000 });   // kotor 45.000, diskon 4.500, total 40.500, pembulatan 500, tagihan 41.000, HPP 30.000
cek('T4: diskon 10% + pembulatan', () => { assert(T4.ok, T4.galat); assert.deepEqual([T4.trx.kotor, T4.trx.diskon_trx, T4.trx.total, T4.trx.pembulatan, T4.trx.tagihan, T4.trx.kembali], [45000, 4500, 40500, 500, 41000, 9000]); });
cek('catat gaji 7.000 (transfer); pesanan WhatsApp lama mengurangi stok 2 unit', () => {
  assert(keu(tAdmin, { jenis: 'pengeluaran', kategori: 'gaji', jumlah: 7000, metode: 'transfer' }).ok);
  assert.equal(post({ kunci: 'KunciRahasia123', ops: [{ opId: 'wa-1', aksi: 'jual', item: [{ id: A, qty: 2 }] }] }).hasil[0].status, 'ok');
});
cek('LAPORAN hari 2 (omzet 41.000 termasuk pembulatan, HPP 30.000, laba bersih 4.000)', () => {
  const r = kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d2, sampai: TGL.d2 });
  assert.deepEqual([r.ringkas.omzet, r.ringkas.hpp, r.ringkas.laba_kotor, r.ringkas.diskon, r.ringkas.pengeluaran_operasional, r.ringkas.laba_bersih], [41000, 30000, 11000, 4500, 7000, 4000]);
  assert.deepEqual(r.wa, { pesanan: 1, unit: 2 }, 'pesanan WhatsApp dilaporkan terpisah, tidak masuk omzet'); assert.equal(r.pembelian_stok.nilai, 0);
});
cek('KAS hari 2: modal usulan = kas hitung kemarin (10.000); seharusnya 51.000', () => {
  const h = kirim(tAdmin, 'kas_hitung', { tanggal: TGL.d2 }); assert.equal(h.modal_awal_usulan, 10000); assert.deepEqual(h.komponen, { penjualan_tunai: 41000, pemasukan_tunai: 0, pengeluaran_tunai: 0 });
});
cek('Tutup kas dengan selisih wajib catatan; bisa ditutup ulang tanpa menggandakan baris', () => {
  const g = kirim(tAdmin, 'kas_tutup', { tanggal: TGL.d2, modal_awal: 10000, kas_hitung: 50500 }); assert.equal(g.galat, 'catatan_selisih_wajib'); assert.equal(g.selisih, -500);
  const t = kirim(tAdmin, 'kas_tutup', { tanggal: TGL.d2, modal_awal: 10000, kas_hitung: 50500, catatan: 'kembalian kurang' }); assert(t.ok, t.galat); assert.equal(t.tutup.selisih, -500);
  const u = kirim(tAdmin, 'kas_tutup', { tanggal: TGL.d2, modal_awal: 10000, kas_hitung: 51000 }); assert(u.ok); assert.equal(u.tutup.selisih, 0);
  assert.equal(sheets.TutupKas.data.slice(1).filter((r) => r[0]).length, 2, 'hari 2 diperbarui, bukan ditambah');
});

console.log('Hari 3 (2026-10-03)');
setJam(TGL.d3 + 'T09:00:00Z'); sekarang = TGL.d3; tOwner = login('ucox', 'rahasia1'); tAdmin = login('admin1', 'adminBaru1'); tKasir = login('kasir1', 'kasirBaru1');
cek('validasi entri: kategori, jumlah, tanggal masa depan/lama/rusak, metode, keterangan wajib untuk "lain"', () => {
  const c = (e) => keu(tAdmin, Object.assign({ jenis: 'pengeluaran', kategori: 'lain', jumlah: 3000, keterangan: 'servis timbangan' }, e)).galat;
  assert.equal(c({ keterangan: '' }), 'keterangan_wajib'); assert.equal(c({ kategori: 'ngawur' }), 'kategori_tidak_valid'); assert.equal(c({ jenis: 'transfer' }), 'jenis_tidak_valid');
  assert.equal(c({ jumlah: 0 }), 'jumlah_tidak_valid'); assert.equal(c({ jumlah: 10.5 }), 'jumlah_tidak_valid'); assert.equal(c({ jumlah: -5 }), 'jumlah_tidak_valid');
  assert.equal(c({ tanggal: '2026-10-04' }), 'tanggal_tidak_valid'); assert.equal(c({ tanggal: '2026-02-30' }), 'tanggal_tidak_valid'); assert.equal(c({ tanggal: '2020-01-01' }), 'tanggal_tidak_valid'); assert.equal(c({ tanggal: 'kemarin' }), 'tanggal_tidak_valid');
  assert.equal(c({ metode: 'kredit' }), 'metode_tidak_valid'); assert.equal(c({ kategori: 'jasa' }), 'kategori_tidak_valid', 'kategori pemasukan tidak berlaku untuk pengeluaran');
});
cek('catat servis 3.000 (tunai) hari 3, dan perlengkapan 1.000 bertanggal mundur ke hari 1', () => {
  assert(keu(tAdmin, { jenis: 'pengeluaran', kategori: 'lain', jumlah: 3000, keterangan: 'servis timbangan' }).ok);
  assert(keu(tAdmin, { jenis: 'pengeluaran', kategori: 'perlengkapan', jumlah: 1000, tanggal: TGL.d1 }).ok);
});
cek('LAPORAN 3 hari: angka sesuai hitungan manual', () => {
  const r = kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d1, sampai: TGL.d3 });
  // omzet 63.000+41.000; HPP 42.000+30.000; laba kotor 32.000; operasional 5.000+1.000 (hari 1) + 7.000 (hari 2) + 3.000 (hari 3) = 16.000; laba bersih = 32.000 + 2.000 - 16.000 = 18.000
  assert.deepEqual([r.ringkas.transaksi, r.ringkas.omzet, r.ringkas.hpp, r.ringkas.laba_kotor, r.ringkas.diskon, r.ringkas.pemasukan_lain, r.ringkas.pengeluaran_operasional, r.ringkas.bayar_supplier, r.ringkas.laba_bersih],
    [3, 104000, 72000, 32000, 4500, 2000, 16000, 20000, 18000]);
  assert.deepEqual(r.metode, { tunai: 74000, qris: 30000, transfer: 0 }); assert.deepEqual(r.batal, { jumlah: 1, total: 14000 }); assert.equal(r.ringkas.margin, 30.8);
  assert.deepEqual(r.harian.map((d) => [d.tanggal, d.omzet, d.laba_bersih]), [[TGL.d1, 63000, 17000], [TGL.d2, 41000, 4000], [TGL.d3, 0, -3000]], 'hari tanpa penjualan tetap muncul bila ada pengeluaran');
  assert.equal(r.harian.reduce((a, d) => a + d.laba_bersih, 0), r.ringkas.laba_bersih, 'jumlah harian = total');
  assert.deepEqual(r.wa, { pesanan: 1, unit: 2 }); assert.deepEqual(r.pembelian_stok, { nilai: 95000, penerimaan: 1, unit: 10 });
});
cek('rentang tengah (hari 2 saja) dan rentang kosong', () => {
  assert.equal(kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d2, sampai: TGL.d2 }).ringkas.omzet, 41000);
  const k = kirim(tAdmin, 'laporan_keuangan', { dari: '2026-09-01', sampai: '2026-09-30' }); assert.equal(k.ringkas.omzet, 0); assert.equal(k.ringkas.margin, null); assert.deepEqual(k.harian, []);
  assert.equal(kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d3, sampai: TGL.d3 }).ringkas.transaksi, 0);
});
cek('validasi rentang laporan', () => {
  const l = (o) => kirim(tAdmin, 'laporan_keuangan', o).galat;
  assert.equal(l({ dari: TGL.d3, sampai: TGL.d1 }), 'rentang_tidak_valid'); assert.equal(l({ dari: 'x', sampai: TGL.d1 }), 'rentang_tidak_valid'); assert.equal(l({ dari: '2025-01-01', sampai: TGL.d3 }), 'rentang_terlalu_panjang');
  assert.equal(kirim(tAdmin, 'laporan_keuangan', {}).ok, true, 'tanpa parameter: bulan berjalan');
});
cek('transaksi tidak tuntas ("proses") dihitung terpisah, tidak masuk omzet', () => {
  const baris = sheets.Transaksi.data.findIndex((r) => r[0] === T2.trx.no); sheets.Transaksi.data[baris][15] = 'proses';
  const r = kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d1, sampai: TGL.d1 }); assert.equal(r.tidak_tuntas, 1); assert.equal(r.ringkas.omzet, 33000);
  sheets.Transaksi.data[baris][15] = 'selesai';
});
cek('daftar entri: urut terbaru, filter jenis, total hanya yang aktif', () => {
  const r = kirim(tAdmin, 'keuangan_daftar', { dari: TGL.d1, sampai: TGL.d3 }); assert.equal(r.entri.length, 6); assert(r.entri[0].tanggal >= r.entri.at(-1).tanggal);
  assert.equal(kirim(tAdmin, 'keuangan_daftar', { dari: TGL.d1, sampai: TGL.d3, jenis: 'pemasukan' }).entri.length, 1);
  assert.equal(r.kategori.pengeluaran.bayar_supplier[1], false); assert.equal(r.total.pengeluaran, 5000 + 20000 + 7000 + 3000 + 1000);
});
cek('ubah entri (diff tercatat di Audit); jenis tidak boleh berubah', () => {
  const r = keu(tAdmin, { id: idListrik, jenis: 'pengeluaran', kategori: 'listrik_air', jumlah: 6000, tanggal: TGL.d1, keterangan: 'token' }); assert(r.ok, r.galat);
  assert.equal(r.entri.find((x) => x.id === idListrik).jumlah, 6000); assert.equal(r.entri.find((x) => x.id === idListrik).diubah_oleh, 'admin1');
  const a = kirim(tOwner, 'audit_daftar', { limit: 50 }).audit.find((x) => x.aksi === 'keuangan_ubah'); assert(a && /jumlah 5000 -> 6000/.test(a.detail), a && a.detail);
  assert.equal(keu(tAdmin, { id: idListrik, jenis: 'pemasukan', kategori: 'jasa', jumlah: 6000, tanggal: TGL.d1 }).galat, 'jenis_tidak_valid');
  assert.equal(keu(tAdmin, { id: 'K999999', jenis: 'pengeluaran', kategori: 'sewa', jumlah: 1, tanggal: TGL.d1 }).galat, 'entri_tidak_ada');
});
cek('batalkan entri: butuh alasan; hilang dari laporan & kas; tidak bisa diubah/dibatalkan lagi', () => {
  assert.equal(kirim(tAdmin, 'keuangan_batal', { id: idSupplier, alasan: 'x' }).galat, 'catatan_wajib');
  const before = kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d1, sampai: TGL.d1 }).ringkas;
  assert(kirim(tAdmin, 'keuangan_batal', { id: idSupplier, alasan: 'salah catat' }).ok);
  assert.equal(kirim(tAdmin, 'laporan_keuangan', { dari: TGL.d1, sampai: TGL.d1 }).ringkas.bayar_supplier, 0); assert.equal(before.bayar_supplier, 20000);
  assert.equal(kirim(tAdmin, 'keuangan_batal', { id: idSupplier, alasan: 'lagi' }).galat, 'sudah_dibatalkan');
  assert.equal(keu(tAdmin, { id: idSupplier, jenis: 'pengeluaran', kategori: 'bayar_supplier', jumlah: 1, tanggal: TGL.d1 }).galat, 'sudah_dibatalkan');
  assert.equal(kirim(tAdmin, 'keuangan_daftar', { dari: TGL.d1, sampai: TGL.d1 }).entri.find((x) => x.id === idSupplier).status, 'batal', 'riwayat tetap ada, hanya berstatus batal');
});
cek('KAS hari 1 ditandai "berubah sejak ditutup" setelah ada perubahan susulan', () => {
  const h = kirim(tAdmin, 'kas_hitung', { tanggal: TGL.d1 }); assert.equal(h.berubah, true); assert.equal(h.tutup.kas_seharusnya, 10000, 'angka saat ditutup tetap tersimpan');
  assert.equal(h.komponen.pengeluaran_tunai, 6000 + 1000, 'sekarang: listrik 6.000 + perlengkapan 1.000 (bayar supplier dibatalkan)');
});
cek('Pembatalan penjualan susulan juga mengubah kas hari itu (terdeteksi)', () => {
  const h2 = kirim(tAdmin, 'kas_hitung', { tanggal: TGL.d2 }); assert.equal(h2.berubah, false);
  assert(kirim(tAdmin, 'transaksi_batal', { no: T4.trx.no, alasan: 'dibatalkan susulan' }).ok);
  const h3 = kirim(tAdmin, 'kas_hitung', { tanggal: TGL.d2 }); assert.equal(h3.berubah, true); assert.equal(h3.komponen.penjualan_tunai, 0);
});
cek('riwayat tutup kas terbaru dulu', () => { const r = kirim(tAdmin, 'kas_riwayat', {}).riwayat; assert.deepEqual(r.map((x) => x.tanggal), [TGL.d2, TGL.d1]); });
cek('tutup kas: tanggal masa depan & angka tidak valid ditolak', () => {
  assert.equal(kirim(tAdmin, 'kas_tutup', { tanggal: '2026-10-09', modal_awal: 0, kas_hitung: 0 }).galat, 'tanggal_tidak_valid');
  assert.equal(kirim(tAdmin, 'kas_tutup', { tanggal: TGL.d3, modal_awal: -1, kas_hitung: 0 }).galat, 'modal_awal_tidak_valid'); assert.equal(kirim(tAdmin, 'kas_tutup', { tanggal: TGL.d3, modal_awal: 0, kas_hitung: 1.5 }).galat, 'kas_hitung_tidak_valid');
  assert.equal(kirim(tAdmin, 'kas_hitung', { tanggal: '2026-10-09' }).galat, 'tanggal_tidak_valid');
});
cek('Kasir ditolak untuk SEMUA aksi keuangan', () => {
  ['keuangan_catat', 'keuangan_batal', 'keuangan_daftar', 'laporan_keuangan', 'kas_hitung', 'kas_tutup', 'kas_riwayat'].forEach((a) => assert.equal(kirim(tKasir, a, {}).galat, 'tidak_berhak', a));
});
cek('Audit keuangan lengkap', () => {
  const a = kirim(tOwner, 'audit_daftar', { limit: 200 }).audit.map((x) => x.aksi);
  ['keuangan_catat', 'keuangan_ubah', 'keuangan_batal', 'kas_tutup', 'kas_tutup_ulang'].forEach((k) => assert(a.includes(k), 'tidak ada ' + k));
});
cek('Format teks terpasang untuk sel keuangan baru (tanggal tidak berubah jadi Date)', () => {
  const baris = sheets.Keuangan.data.length; assert.equal(sheets.Keuangan.fmt[baris + ',2'], '@'); assert.equal(sheets.Keuangan.fmt[baris + ',5'], undefined, 'jumlah tetap angka');
});
console.log(`\n${ok} pengujian keuangan lolos${process.exitCode ? ' (ADA YANG GAGAL)' : ''}`);
