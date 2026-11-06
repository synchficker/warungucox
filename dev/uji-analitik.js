/* Uji Tahap 6 (analitik). Dataset 10 hari dengan jam palsu. Harapan dihitung ulang di sini dengan cara TERPISAH dari kode server
   (rumus dua-langkah untuk simpangan baku, penjumlahan biasa), lalu dibandingkan. Jalankan: node dev/uji-analitik.js */
const assert = require('assert');
const { post, setJam } = require('./mock-gas.js');
let ok = 0; const cek = (n, f) => { try { f(); ok++; console.log('  ok  ', n); } catch (e) { console.log('  GAGAL', n, '\n       ', e.message); process.exitCode = 1; } };
const login = (u, p) => { const r = post({ aksi: 'login', username: u, sandi: p }); if (!r.ok) throw new Error('login ' + u + ': ' + r.galat); return r.token; };
const kirim = (tok, aksi, o = {}) => post(Object.assign({ aksi, token: tok }, o));
const dekat = (a, b, tol = 0.51) => Math.abs(a - b) <= tol;
const HARI = Array.from({ length: 10 }, (_, i) => '2026-10-' + String(i + 1).padStart(2, '0'));
let nId = 0; const idk = () => 'an' + (++nId) + '-abcdefgh';

// ---------- persiapan (28 September) ----------
setJam('2026-09-28T08:00:00Z');
let tOwner = post({ aksi: 'setup_owner', kunci: 'KunciRahasia123', username: 'ucox', nama: 'Pak Ucox', sandi: 'rahasia1' }).token;
kirim(tOwner, 'pengguna_simpan', { pengguna: { nama: 'Bu Admin', username: 'admin1', peran: 'admin', sandi: 'sementara1' } });
kirim(tOwner, 'pengguna_simpan', { pengguna: { nama: 'Si Kasir', username: 'kasir1', peran: 'kasir', sandi: 'sementara2' } });
let t = login('admin1', 'sementara1'); kirim(t, 'ganti_sandi', { lama: 'sementara1', baru: 'adminBaru1' }); t = login('kasir1', 'sementara2'); kirim(t, 'ganti_sandi', { lama: 'sementara2', baru: 'kasirBaru1' });
let tAdmin = login('admin1', 'adminBaru1'), tKasir = login('kasir1', 'kasirBaru1');
const buat = (nama, beli, jual, stok) => kirim(tOwner, 'produk_simpan', { produk: { nama, kategori: 'beras', satuan: 'pcs', harga_beli: beli, harga_jual: jual, stok } }).id;
const A = buat('Produk A', 6000, 10000, 20), B = buat('Produk B', 2000, 2500, 200), C = buat('Produk C', 1000, 800, 100), D = buat('Produk D', 5000, 7000, 30);
const HARGA = { [A]: [6000, 10000], [B]: [2000, 2500], [C]: [1000, 800] }; const NAMA = { [A]: 'Produk A', [B]: 'Produk B', [C]: 'Produk C' };

// ---------- pencatat penjualan + harapan independen ----------
const jual = [];   // {tgl, jam, kasir, items:[[pid,qty]], dt:{jenis,nilai}|null}
function catat(tgl, jam, tok, kasir, items, dt = null, { batal = false } = {}) {
  const r = kirim(tok, 'transaksi_buat', { trx: { id_klien: idk(), metode: 'tunai', items: items.map(([produk_id, qty]) => ({ produk_id, qty })), diskon_trx: dt || undefined, bayar: 9999999 } });
  if (!r.ok) throw new Error('transaksi gagal ' + tgl + ': ' + r.galat);
  if (batal) { assert(kirim(tAdmin, 'transaksi_batal', { no: r.trx.no, alasan: 'uji batal' }).ok); jual.push({ tgl, jam, kasir, items, dt, batal: true }); } else jual.push({ tgl, jam, kasir, items, dt, batal: false });
}
// periode sebelumnya (21-30 Sep): B x4 (28 Sep), B x6 (29 Sep)
catat('2026-09-28', 10, tAdmin, 'admin1', [[B, 4]]);
setJam('2026-09-29T10:00:00Z'); tAdmin = login('admin1', 'adminBaru1'); catat('2026-09-29', 10, tAdmin, 'admin1', [[B, 6]]);

const qA = [2, 0, 3, 1, 0, 4, 2, 0, 1, 3];
HARI.forEach((tgl, i) => {
  setJam(tgl + 'T10:00:00Z'); tOwner = login('ucox', 'rahasia1'); tAdmin = login('admin1', 'adminBaru1'); tKasir = login('kasir1', 'kasirBaru1');
  const aSingle = tgl === HARI[9] ? qA[i] - 1 : qA[i];
  if (aSingle > 0) catat(tgl, 10, tAdmin, 'admin1', [[A, aSingle]]);
  if (tgl === HARI[8]) kirim(tOwner, 'produk_simpan', { produk: { nama: 'Produk E', kategori: 'beras', satuan: 'pcs', harga_beli: 3000, harga_jual: 4000, stok: 10 } });   // produk BARU (hari 9)
  setJam(tgl + 'T17:00:00Z');
  const kasirHari = [HARI[2], HARI[3], HARI[4]].includes(tgl);
  if (tgl === HARI[9]) { catat(tgl, 17, tAdmin, 'admin1', [[B, 3]]); catat(tgl, 17, tAdmin, 'admin1', [[A, 1], [B, 2]], { jenis: 'rupiah', nilai: 1000 }); }
  else if (kasirHari) catat(tgl, 17, tKasir, 'kasir1', [[B, 5]], { jenis: 'persen', nilai: 10 });
  else catat(tgl, 17, tAdmin, 'admin1', [[B, 5]]);
  if (tgl === HARI[4]) { catat(tgl, 17, tAdmin, 'admin1', [[C, 10]]); assert(kirim(tAdmin, 'keuangan_catat', { entri: { jenis: 'pengeluaran', kategori: 'gaji', jumlah: 30000, tanggal: tgl, metode: 'tunai' } }).ok); }
  if (tgl === HARI[5]) catat(tgl, 17, tAdmin, 'admin1', [[B, 1]], null, { batal: true });
  if (tgl === HARI[7]) {
    assert(kirim(tAdmin, 'keuangan_catat', { entri: { jenis: 'pengeluaran', kategori: 'listrik_air', jumlah: 10000, tanggal: tgl, metode: 'tunai' } }).ok);
    ['rusak:4:', 'temuan:1:ketemu', 'pakai_sendiri:2:'].forEach((x) => { const [jenis, jumlah, catatan] = x.split(':'); assert(kirim(tAdmin, 'stok_sesuaikan', { produk_id: B, jenis, jumlah: Number(jumlah), catatan }).ok); });
  }
});
const hasil = kirim(tAdmin, 'analitik', { dari: HARI[0], sampai: HARI[9] });

// ---------- harapan independen ----------
const sah = jual.filter((x) => !x.batal && x.tgl >= HARI[0] && x.tgl <= HARI[9]);
const hitungSatu = (x) => {
  const bruto = x.items.map(([pid, q]) => HARGA[pid][1] * q), kotor = bruto.reduce((a, b) => a + b, 0);
  const dTrx = !x.dt ? 0 : x.dt.jenis === 'persen' ? Math.floor(kotor * x.dt.nilai / 100) : x.dt.nilai;
  return { bruto, kotor, dTrx, total: kotor - dTrx, hpp: x.items.reduce((a, [pid, q]) => a + HARGA[pid][0] * q, 0) };
};
const X = { omzet: 0, hpp: 0, kotor: 0, diskon: 0, qty: 0, perProduk: {}, jam: Array(24).fill(0), jamOmzet: Array(24).fill(0), kasir: {}, perHari: {} };
sah.forEach((x) => {
  const h = hitungSatu(x); X.omzet += h.total; X.hpp += h.hpp; X.kotor += h.kotor; X.diskon += h.dTrx; X.jam[x.jam]++; X.jamOmzet[x.jam] += h.total;
  x.items.forEach(([pid, q], i) => {
    const p = X.perProduk[pid] || (X.perProduk[pid] = { qty: 0, omzet: 0, hpp: 0, harian: {} }); X.qty += q;
    p.qty += q; p.omzet += h.bruto[i] - h.dTrx * h.bruto[i] / h.kotor; p.hpp += HARGA[pid][0] * q; p.harian[x.tgl] = (p.harian[x.tgl] || 0) + q;
  });
  const k = X.kasir[x.kasir] || (X.kasir[x.kasir] = { n: 0, omzet: 0, kotor: 0, diskon: 0 }); k.n++; k.omzet += h.total; k.kotor += h.kotor; k.diskon += h.dTrx;
  const d = X.perHari[x.tgl] || (X.perHari[x.tgl] = { n: 0, omzet: 0 }); d.n++; d.omzet += h.total;
});
const NTRX = sah.length, LABA_KOTOR = X.omzet - X.hpp;

console.log('Ringkasan & pembanding');
cek('hitungan manual yang dijangkarkan: 19 transaksi, omzet 288.250, HPP 206.000, laba kotor 82.250', () => { assert.deepEqual([NTRX, X.omzet, X.hpp, LABA_KOTOR], [19, 288250, 206000, 82250]); });
cek('ringkasan server = harapan independen', () => {
  const r = hasil.ringkas; assert(hasil.ok, hasil.galat);
  assert.deepEqual([r.omzet, r.transaksi, r.hpp, r.laba_kotor, r.diskon, r.hari_aktif, r.batal, r.rata_harian], [288250, 19, 206000, 82250, 4750, 10, 1, 28825]);
  assert.equal(r.aov, Math.round(X.omzet / NTRX)); assert.equal(r.item_per_transaksi, X.qty / NTRX); assert.equal(r.margin, Math.round(LABA_KOTOR * 1000 / X.omzet) / 10); assert.equal(r.diskon_persen, Math.round(X.diskon * 1000 / X.kotor) / 10);
});
cek('perbandingan dengan 10 hari sebelumnya (omzet 25.000, 2 transaksi, laba kotor 5.000)', () => {
  const b = hasil.banding; assert.deepEqual([b.dari, b.sampai, b.omzet, b.transaksi, b.laba_kotor], ['2026-09-21', '2026-09-30', 25000, 2, 5000]);
  assert.equal(b.omzet_pct, Math.round((288250 - 25000) / 25000 * 1000) / 10); assert.equal(b.transaksi_pct, 850); assert.equal(b.laba_kotor_pct, 1545);
});
cek('tren harian: 10 titik, jumlah = total, tiap hari cocok', () => {
  assert.equal(hasil.harian.length, 10); assert.equal(hasil.harian.reduce((a, d) => a + d.omzet, 0), X.omzet);
  hasil.harian.forEach((d) => { const e = X.perHari[d.tanggal]; assert.equal(d.omzet, e.omzet, d.tanggal); assert.equal(d.transaksi, e.n, d.tanggal); });
});
cek('pola jam: jam 10 = 7 transaksi, jam 17 = 12 transaksi; jumlah omzet cocok', () => {
  assert.equal(hasil.jam.length, 24); hasil.jam.forEach((j) => { assert.equal(j.transaksi, X.jam[j.jam], 'jam ' + j.jam); assert.equal(j.omzet, X.jamOmzet[j.jam]); });
  assert.equal(hasil.jam[10].transaksi, 7); assert.equal(hasil.jam[17].transaksi, 12);
});
cek('pola hari: rata-rata omzet per hari-dalam-pekan (Kamis & Jumat & Sabtu muncul 2 kali)', () => {
  const peta = {}; HARI.forEach((tgl) => { const g = (new Date(tgl + 'T12:00:00Z').getUTCDay() + 6) % 7; peta[g] = peta[g] || { hari: 0, omzet: 0 }; peta[g].hari++; peta[g].omzet += (X.perHari[tgl] || { omzet: 0 }).omzet; });
  hasil.hari_minggu.forEach((h, g) => { assert.equal(h.hari, peta[g].hari, h.nama); assert.equal(h.rata_omzet, Math.round(peta[g].omzet / peta[g].hari), h.nama); });
  assert.deepEqual(hasil.hari_minggu.map((h) => h.hari), [1, 1, 1, 2, 2, 2, 1]);
});

console.log('Produk: laba, margin, terlaris');
cek('omzet bersih, HPP, laba, margin per produk (diskon transaksi dibagi menurut porsi nilai)', () => {
  [A, B, C].forEach((pid) => {
    const p = hasil.terlaris_qty.find((x) => x.id === pid), e = X.perProduk[pid];
    assert.equal(p.qty, e.qty, NAMA[pid]); assert(dekat(p.omzet, e.omzet), NAMA[pid] + ' omzet ' + p.omzet + ' vs ' + e.omzet); assert.equal(p.hpp, e.hpp); assert(dekat(p.laba, e.omzet - e.hpp));
    assert.equal(p.margin, Math.round((e.omzet - e.hpp) * 1000 / e.omzet) / 10);
  });
  assert.deepEqual([hasil.terlaris_qty.find((x) => x.id === A).margin, hasil.terlaris_qty.find((x) => x.id === B).margin, hasil.terlaris_qty.find((x) => x.id === C).margin], [39.7, 17.3, -25]);
});
cek('jumlah omzet bersih produk = total penjualan (tidak ada rupiah yang hilang saat pembagian diskon)', () => {
  assert(dekat(hasil.terlaris_qty.reduce((a, p) => a + p.omzet, 0), X.omzet, 2));
});
cek('urutan terlaris berdasarkan jumlah (B 50, A 16, C 10) dan berdasarkan laba (B? A? C terakhir)', () => {
  assert.deepEqual(hasil.terlaris_qty.map((p) => p.id), [B, A, C]); assert.equal(hasil.terlaris_laba.at(-1).id, C); assert(hasil.terlaris_laba[0].laba >= hasil.terlaris_laba[1].laba);
});

console.log('ABC / Pareto');
cek('klasifikasi ABC sesuai aturan 80% / 95% (hitung ulang terpisah)', () => {
  const urut = [A, B, C].map((pid) => ({ pid, o: X.perProduk[pid].omzet })).sort((a, b) => b.o - a.o), tot = urut.reduce((a, x) => a + x.o, 0); let kum = 0; const k = {};
  urut.forEach((x) => { const sebelum = kum / tot; k[x.pid] = sebelum < 0.8 ? 'A' : sebelum < 0.95 ? 'B' : 'C'; kum += x.o; });
  assert.deepEqual(k, { [A]: 'A', [B]: 'A', [C]: 'C' }); hasil.produk_abc.forEach((p) => assert.equal(p.kelas, k[p.id]));
  assert.deepEqual([hasil.abc.A.produk, hasil.abc.B.produk, hasil.abc.C.produk], [2, 0, 1]); assert(dekat(hasil.abc.A.persen + hasil.abc.B.persen + hasil.abc.C.persen, 100, 0.2));
  assert.equal(hasil.produk_abc.at(-1).kumulatif, 100);
});

console.log('Saran restok (titik pesan ulang & stok pengaman)');
cek('Produk A: rata-rata 1,6/hari, simpangan baku 1,43, titik pesan ulang 8,9, stok target 20,1, saran beli 17', () => {
  const x = qA, n = x.length, mean = x.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(x.reduce((a, v) => a + (v - mean) * (v - mean), 0) / (n - 1));   // rumus dua langkah
  const rop = mean * 3 + 1.65 * sd * Math.sqrt(3), target = rop + mean * 7;
  const p = hasil.restok.find((r) => r.id === A); assert(p, 'A harus perlu restok');
  assert.equal(p.rata_harian, 1.6); assert.equal(p.sd_harian, Math.round(sd * 100) / 100); assert.equal(p.sd_harian, 1.43);
  assert.equal(p.rop, Math.round(rop * 10) / 10); assert.equal(p.rop, 8.9); assert.equal(p.target, Math.round(target * 10) / 10); assert.equal(p.target, 20.1);
  assert.equal(p.stok, 4); assert.equal(p.hari_stok, 2.5); assert.equal(p.saran_qty, Math.ceil(target - 4)); assert.equal(p.saran_qty, 17); assert.equal(p.biaya_saran, 17 * 6000);
});
cek('Produk B dan C tidak masuk daftar restok (stok jauh di atas titik pesan ulang); B: simpangan 0, titik 15', () => {
  assert(!hasil.restok.some((r) => r.id === B || r.id === C));
  const b = hasil.terlaris_qty.find((x) => x.id === B); assert.deepEqual([b.rata_harian, b.sd_harian, b.rop, b.stok], [5, 0, 15, 135]);   // 200 - 10 (periode lalu) - 50 - 4 rusak + 1 temuan - 2 pribadi
  const c = hasil.terlaris_qty.find((x) => x.id === C); assert.equal(c.sd_harian, 3.16); assert.equal(c.rop, Math.round((1 * 3 + 1.65 * Math.sqrt(10) * Math.sqrt(3)) * 10) / 10);
});
cek('parameter restok bisa diubah Owner dan langsung dipakai', () => {
  const set = (o) => kirim(tOwner, 'pengaturan_simpan', { pengaturan: Object.assign({ nama_toko: 'Warung Ucox', alamat: 'Depok', wa_nomor: '628123456789', wa_tampil: '', stok_menipis: 8, pesan_struk: '' }, o) });
  const mean = 1.6, sd = Math.sqrt(18.4 / 9);
  // lead time 1, cakupan 14: titik pesan ulang = 1,6 + 1,65 x 1,43 x 1 = 3,96 < stok 4  ->  A TIDAK perlu restok
  assert(set({ lead_time_hari: 1, hari_cakupan: 14 }).ok); let r = kirim(tAdmin, 'analitik', { dari: HARI[0], sampai: HARI[9] }), a = r.terlaris_qty.find((x) => x.id === A);
  assert.deepEqual([r.param.lead_time, r.param.hari_cakupan], [1, 14]); assert.equal(a.rop, Math.round((mean * 1 + 1.65 * sd) * 10) / 10); assert.equal(a.rop, 4); assert.equal(a.target, Math.round((mean + 1.65 * sd + mean * 14) * 10) / 10);
  assert.equal(a.perlu_restok, false); assert.equal(a.saran_qty, 0); assert(!r.restok.some((x) => x.id === A));
  // lead time 2: titik pesan ulang = 3,2 + 1,65 x 1,43 x sqrt(2) = 6,54 > stok 4  ->  perlu restok, saran = ceil(6,54 + 22,4 - 4) = 25
  assert(set({ lead_time_hari: 2, hari_cakupan: 14 }).ok); r = kirim(tAdmin, 'analitik', { dari: HARI[0], sampai: HARI[9] }); a = r.restok.find((x) => x.id === A);
  assert(a); assert.equal(a.saran_qty, Math.ceil(mean * 2 + 1.65 * sd * Math.sqrt(2) + mean * 14 - 4)); assert.equal(a.saran_qty, 25);
  assert.equal(set({ lead_time_hari: 0 }).galat, 'lead_time_tidak_valid'); assert.equal(set({ hari_cakupan: 99 }).galat, 'cakupan_tidak_valid'); assert.equal(set({ lead_time_hari: 2.5 }).galat, 'lead_time_tidak_valid');
  assert(set({ lead_time_hari: 3, hari_cakupan: 7 }).ok);
});

console.log('Persediaan, stok mati, titik impas, proyeksi');
cek('nilai persediaan modal & jual = jumlah stok x harga (dihitung ulang dari daftar produk)', () => {
  const prod = kirim(tOwner, 'master_ambil').produk, modal = prod.reduce((a, p) => a + p.stok * p.harga_beli, 0), jualN = prod.reduce((a, p) => a + p.stok * p.harga_jual, 0), p = hasil.persediaan;
  assert.deepEqual([p.nilai_modal, p.nilai_jual, p.potensi_laba, p.produk], [modal, jualN, jualN - modal, prod.length]);
  assert.equal(p.habis, prod.filter((x) => x.stok <= 0).length);
});
cek('perputaran persediaan = HPP / nilai persediaan; hari persediaan = nilai / (HPP per hari); GMROI tahunan', () => {
  const p = hasil.persediaan, modal = p.nilai_modal;
  assert.equal(p.perputaran, Math.round(206000 / modal * 100) / 100); assert.equal(p.hari_persediaan, Math.round(modal / (206000 / 10) * 10) / 10);
  assert.equal(p.perputaran_tahunan, Math.round(206000 * 365 / 10 / modal * 10) / 10); assert.equal(p.gmroi_tahunan, Math.round(82250 * 365 / 10 / modal * 100) / 100);
});
cek('stok mati: produk D (30 x 5.000 = 150.000) tercantum; produk E (baru dibuat hari 9) TIDAK dianggap mati', () => {
  const d = hasil.stok_mati.daftar.find((x) => x.id === D); assert(d); assert.equal(d.nilai, 150000);
  assert(!hasil.stok_mati.daftar.some((x) => x.nama === 'Produk E'), 'produk baru tidak boleh dicap stok mati');
  const prod = kirim(tOwner, 'master_ambil').produk, harapan = prod.filter((p) => p.stok > 0 && ![A, B, C].includes(p.id) && p.nama !== 'Produk E').reduce((a, p) => a + p.stok * p.harga_beli, 0);
  assert.equal(hasil.stok_mati.nilai, harapan);
});
cek('titik impas: biaya tetap 4.000/hari, rasio laba kotor 0,2853, impas Rp14.019/hari, rata-rata 28.825 di atas impas', () => {
  const rasio = 82250 / 288250, bep = (40000 / 10) / rasio, i = hasil.impas;
  assert.deepEqual([i.biaya_tetap_harian, i.margin_rasio, i.omzet_impas_harian, i.omzet_rata_harian, i.status], [4000, Math.round(rasio * 10000) / 10000, Math.round(bep), 28825, 'di_atas']);
  assert.equal(i.selisih, Math.round(28825 - bep)); assert.equal(i.transaksi_impas_harian, Math.round(bep / (288250 / 19) * 10) / 10);
});
cek('proyeksi akhir bulan (laju harian x 31 hari) hanya untuk periode "bulan ini"', () => {
  assert.deepEqual(hasil.proyeksi, { hari_berlalu: 10, hari_bulan: 31, omzet: Math.round(288250 / 10 * 31), laba_kotor: Math.round(82250 / 10 * 31) });
  assert.equal(kirim(tAdmin, 'analitik', { dari: HARI[1], sampai: HARI[9] }).proyeksi, null);
});
cek('susut stok periode: bersih 6.000 (rusak 8.000 - temuan 2.000); pemakaian pribadi 4.000 tidak mengurangi', () => {
  assert.deepEqual([hasil.susut.kerugian, hasil.susut.pemulihan, hasil.susut.bersih, hasil.susut.pribadi], [8000, 2000, 6000, 4000]);
});

console.log('Kinerja kasir & saran otomatis');
cek('kinerja per kasir: transaksi, omzet, rata-rata, diskon %, batal', () => {
  const k = hasil.kasir.find((x) => x.username === 'kasir1'), a = hasil.kasir.find((x) => x.username === 'admin1');
  assert.deepEqual([k.transaksi, k.omzet, k.rata, k.diskon, k.diskon_persen, k.batal], [3, 33750, 11250, 3750, 10, 0]);
  assert.deepEqual([a.transaksi, a.omzet, a.batal], [16, 254500, 1]); assert.equal(hasil.kasir[0].username, 'admin1', 'urut menurut omzet');
});
cek('saran muncul sesuai data DAN menyertakan angka bukti', () => {
  const kode = hasil.saran.map((s) => s.kode); ['restok_mendesak', 'jual_rugi', 'andalan_tipis', 'di_atas_impas', 'stok_mati', 'susut_tinggi', 'diskon_kasir', 'jam_ramai'].forEach((k) => assert(kode.includes(k), 'tidak ada saran ' + k + ' (ada: ' + kode + ')'));
  assert(!kode.includes('data_sedikit') && !kode.includes('di_bawah_impas'));
  const r = hasil.saran.find((s) => s.kode === 'restok_mendesak'); assert(/Produk A: stok 4 ÷ 1.6\/hari = 2.5 hari < 3 hari/.test(r.bukti[0]), r.bukti[0]);
  const j = hasil.saran.find((s) => s.kode === 'jual_rugi'); assert(/Produk C.*-Rp2\.000/.test(j.bukti[0]), j.bukti[0]);
  const tp = hasil.saran.find((s) => s.kode === 'andalan_tipis'); assert(/Produk B: margin 17\.3%/.test(tp.bukti[0]) && /2\.797/.test(tp.bukti[0]), tp.bukti[0]);
  assert(/2,9%/.test(hasil.saran.find((s) => s.kode === 'susut_tinggi').teks) || /2\.9%/.test(hasil.saran.find((s) => s.kode === 'susut_tinggi').teks));
});

console.log('Keamanan & batas');
cek('hanya Owner/Admin; Kasir ditolak; rentang > 92 hari ditolak; tanpa parameter = 30 hari terakhir', () => {
  assert.equal(kirim(tKasir, 'analitik', {}).galat, 'tidak_berhak');
  assert.equal(kirim(tAdmin, 'analitik', { dari: '2026-06-01', sampai: HARI[9] }).galat, 'rentang_analitik_terlalu_panjang'); assert.equal(kirim(tAdmin, 'analitik', { dari: HARI[5], sampai: HARI[2] }).galat, 'rentang_tidak_valid');
  const d = kirim(tAdmin, 'analitik', {}); assert(d.ok); assert.equal(d.hari, 30); assert.equal(d.sampai, HARI[9]);
});
cek('rentang tanpa data: semua nol, tidak ada pembagian nol / NaN', () => {
  const r = kirim(tAdmin, 'analitik', { dari: '2026-08-01', sampai: '2026-08-10' }); assert(r.ok); assert.deepEqual([r.ringkas.omzet, r.ringkas.transaksi, r.ringkas.margin, r.ringkas.aov], [0, 0, null, 0]);
  assert.equal(r.impas.omzet_impas_harian, null); assert.equal(r.banding.omzet_pct, null); assert(!JSON.stringify(r).includes('NaN') && !JSON.stringify(r).includes('Infinity'));
  assert(r.saran.some((s) => s.kode === 'data_sedikit'));
});
console.log(`\n${ok} pengujian analitik lolos${process.exitCode ? ' (ADA YANG GAGAL)' : ''}`);
