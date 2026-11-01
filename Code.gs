/**
 * Toko Sembako si Ucox | Code.gs
 * Versi: Tahap 3 (Autentikasi & Peran + Master Data + Inventaris) - berbasis versi FINAL FIX 01 Nov 2026
 * Jalur lama (halaman toko + kunci sinkron) tetap utuh. Jalur multi-user ada di bagian MODUL 1 di bawah.
 */

const TAB = { kategori: 'Kategori', produk: 'Produk', supplier: 'Supplier', log: '_Log' };

const KOLOM = {
  kategori: ['id', 'nama', 'ikon'],
  produk: ['id', 'nama', 'kategori', 'satuan', 'harga_beli', 'harga_jual', 'stok', 'gambar', 'barcode'],
  supplier: ['id', 'nama', 'kontak', 'telepon', 'kota', 'kategori', 'termin_hari']
};

const KOLOM_TEKS = {
  kategori: ['id', 'nama', 'ikon'],
  produk: ['id', 'nama', 'kategori', 'satuan', 'gambar', 'barcode'],
  supplier: ['id', 'nama', 'kontak', 'telepon', 'kota', 'kategori']
};

const KOLOM_ANGKA_PRODUK = ['harga_beli', 'harga_jual', 'stok'];
const KOLOM_OPSI = { produk: ['stok_min'] };   // kolom tambahan: boleh belum ada di Sheet (halaman toko tetap jalan)

/* ================= MENU ================= */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Warung Ucox')
    .addItem('Cek data', 'cekData')
    .addItem('Siapkan tabel (rapikan format)', 'siapkanTabel')
    .addSeparator()
    .addItem('Atur kunci sinkron', 'aturKunci')
    .addSeparator()
    .addItem('Siapkan tabel multi-user', 'siapkanMultiUser')
    .addItem('Reset kata sandi akun (darurat)', 'resetSandiDarurat')
    .addItem('Izinkan akses Drive (foto produk)', 'izinkanDrive')
    .addItem('Siapkan inventaris (tab Mutasi, stok minimum)', 'siapkanInventaris')
    .addToUi();
}

function aturKunci() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Atur kunci sinkron','Ketik kunci baru (minimal 10 karakter, campur huruf dan angka).', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const k = r.getResponseText().trim();
  if (k.length < 10) { ui.alert('Kunci terlalu pendek. Minimal 10 karakter.'); return; }
  PropertiesService.getScriptProperties().setProperty('KUNCI', k);
  ui.alert('Kunci tersimpan! Masukkan kunci yang sama di website: Kelola > Isi kunci');
}

function siapkanTabel() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(KOLOM).forEach((nama) => {
    const sh = ss.getSheetByName(TAB[nama]);
    if (!sh) throw new Error('Tab "' + TAB[nama] + '" tidak ditemukan.');
    const peta = petaKolom_(sh);
    KOLOM[nama].forEach((k) => { if (!(k in peta)) throw new Error('Tab "' + TAB[nama] + '" kehilangan kolom "' + k + '".'); });
    const baris = Math.max(sh.getMaxRows() - 1, 1);
    KOLOM_TEKS[nama].forEach((k) => sh.getRange(2, peta[k] + 1, baris, 1).setNumberFormat('@'));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#DCEBF5');
  });
  siapkanLog_();
  SpreadsheetApp.getUi().alert('Selesai. Format kolom sudah dirapikan.');
}

function cekData() {
  const masalah = periksa_();
  SpreadsheetApp.getUi().alert(masalah.length ? 'Ditemukan ' + masalah.length + ' masalah:\n\n' + masalah.slice(0,25).join('\n') : 'Data aman. Tidak ada masalah.');
}

/* ================= API - INI YANG DIPERBAIKI ================= */
function keluar_(obj) {
  // FIX: paksa lowercase di level paling atas biar app.js tidak bingung
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  // WAJIB ADA biar POST dari D:/ tidak diblok Chrome
  return keluar_({});
}

function doGet(e) {
  const aksi = (e && e.parameter && e.parameter.aksi) || 'publik';
  if (aksi === 'ping') return keluar_({ ok: true });
  if (aksi !== 'publik') return keluar_({ ok: false, galat: 'aksi_tidak_dikenal' });
  try {
    // PAKSA KUNCI LOWERCASE: ini yang bikin screenshot kamu jadi "Kategori" besar kemarin
    const raw = ambilData_(false);
    const dataFix = {
      kategori: raw.kategori,
      produk: raw.produk,
      toko: tokoPublik_()
    };
    return keluar_({ ok: true, waktu: new Date().toISOString(), data: dataFix });
  } catch (err) {
    return keluar_({ ok: false, galat: String(err.message || err) });
  }
}

function doPost(e) {
  let isi;
  try { isi = JSON.parse(e.postData.contents); } catch (err) { return keluar_({ ok: false, galat: 'permintaan_rusak' }); }
  if (isi && isi.aksi) return keluar_(apiBaru_(isi));   // jalur baru multi-user (panel.html)
  const cek = cekKunci_(isi.kunci);
  if (cek) return keluar_({ ok: false, galat: cek });

  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return keluar_({ ok: false, galat: 'sibuk_coba_lagi' }); }
  try {
    const hasil = (isi.ops || []).slice(0, 100).map(jalankanOp_);
    const raw = ambilData_(true);
    const dataFix = {
      kategori: raw.kategori,
      produk: raw.produk,
      supplier: raw.supplier,
      toko: tokoPublik_()
    };
    return keluar_({ ok: true, waktu: new Date().toISOString(), hasil: hasil, data: dataFix });
  } catch (err) {
    return keluar_({ ok: false, galat: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function cekKunci_(kirim) {
  const cache = CacheService.getScriptCache();
  const gagal = Number(cache.get('gagal') || 0);
  if (gagal >= 10) return 'terkunci_sementara';
  const asli = PropertiesService.getScriptProperties().getProperty('KUNCI');
  if (!asli) return 'kunci_belum_diatur';
  if (typeof kirim !== 'string' || kirim !== asli) {
    cache.put('gagal', String(gagal + 1), 600);
    return 'kunci_salah';
  }
  cache.remove('gagal');
  return '';
}

/* ================= BACA / TULIS ================= */
function petaKolom_(sh) {
  const kepala = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  const peta = {};
  kepala.forEach((h, i) => { const k = String(h).trim().toLowerCase(); if (k) peta[k] = i; });
  return peta;
}

function bacaTab_(nama) {
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB[nama]);
  if (!sh) throw new Error('Tab "' + TAB[nama] + '" tidak ditemukan');
  const peta = petaKolom_(sh);
  KOLOM[nama].forEach((k) => { if (!(k in peta)) throw new Error('Tab "' + TAB[nama] + '" kehilangan kolom "' + k + '"'); });
  const n = sh.getLastRow() - 1;
  const nilai = n > 0 ? sh.getRange(2, 1, n, sh.getLastColumn()).getValues() : [];
  const baris = [];
  nilai.forEach((r, i) => {
    const o = { _baris: i + 2 };
    KOLOM[nama].forEach((k) => { o[k] = r[peta[k]]; });
    (KOLOM_OPSI[nama] || []).forEach((k) => { o[k] = k in peta ? r[peta[k]] : ''; });
    if (String(o.id).trim() !== '') baris.push(o);
  });
  return { sh: sh, peta: peta, baris: baris };
}

const teks_ = (v) => (v === null || v === undefined ? '' : String(v).trim());
const angka_ = (v) => { const n = Math.round(Number(v)); return isFinite(n) ? Math.max(0, n) : 0; };
const daftar_ = (v) => teks_(v).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

function ambilData_(penuh) {
  const kategori = bacaTab_('kategori').baris.map((r) => ({
    id: teks_(r.id).toLowerCase(), nama: teks_(r.nama), ikon: teks_(r.ikon) || 'package'
  }));
  const produk = bacaTab_('produk').baris.map((r) => {
    const p = {
      id: teks_(r.id), nama: teks_(r.nama), kategori: teks_(r.kategori).toLowerCase(), satuan: teks_(r.satuan),
      harga_beli: angka_(r.harga_beli), harga_jual: angka_(r.harga_jual), stok: angka_(r.stok),
      gambar: teks_(r.gambar), barcode: teks_(r.barcode),
      stok_min: teks_(r.stok_min) === '' ? null : angka_(r.stok_min)   // null = pakai batas stok menipis toko
    };
    if (!penuh) delete p.harga_beli;
    return p;
  });
  const data = { kategori: kategori, produk: produk };
  if (penuh) {
    data.supplier = bacaTab_('supplier').baris.map((r) => ({
      id: teks_(r.id), nama: teks_(r.nama), kontak: teks_(r.kontak), telepon: teks_(r.telepon), kota: teks_(r.kota),
      kategori: daftar_(r.kategori), termin_hari: angka_(r.termin_hari)
    }));
  }
  return data;
}

function siapkanLog_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(TAB.log);
  if (!sh) {
    sh = ss.insertSheet(TAB.log);
    sh.getRange(1, 1, 1, 6).setValues([['waktu', 'op_id', 'aksi', 'produk', 'perubahan', 'catatan']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('@');
  }
  return sh;
}

function opSudahDiproses_(logSh, opId) {
  const n = logSh.getLastRow() - 1;
  if (n < 1) return false;
  const awal = Math.max(2, logSh.getLastRow() - 999);
  return logSh.getRange(awal, 2, logSh.getLastRow() - awal + 1, 1).getValues().some((r) => String(r[0]) === opId);
}

function jalankanOp_(op) {
  const opId = teks_(op && op.opId);
  if (!opId) return { opId: '', status: 'galat', pesan: 'op_id_kosong' };
  const logSh = siapkanLog_();
  if (opSudahDiproses_(logSh, opId)) return { opId: opId, status: 'sudah' };
  const t = bacaTab_('produk');
  const idx = {}; t.baris.forEach((r) => { idx[teks_(r.id)] = r; });
  const sekarang = new Date();
  const catatan = [];
  const kolomKe = (k) => t.peta[k] + 1;

  if (op.aksi === 'jual') {
    (op.item || []).forEach((i) => {
      const r = idx[teks_(i.id)];
      const qty = angka_(i.qty);
      if (!r || !qty) { catatan.push('lewati ' + teks_(i.id)); return; }
      const lama = angka_(r.stok);
      const baru = Math.max(0, lama - qty);
      if (lama - qty < 0) catatan.push(teks_(r.nama) + ': stok kurang ' + (qty - lama));
      t.sh.getRange(r._baris, kolomKe('stok')).setValue(baru);
      catatMutasiLama_(r, 'penjualan', lama, baru, opId, 'toko-online', lama - qty < 0 ? 'stok kurang ' + (qty - lama) : '');
      logSh.appendRow([sekarang, opId, 'jual', teks_(r.id) + ' ' + teks_(r.nama), 'stok ' + lama + ' -> ' + baru + ' (-' + qty + ')', '']);
    });
    return { opId: opId, status: 'ok', catatan: catatan };
  }

  if (op.aksi === 'ubah') {
    const r = idx[teks_(op.id)];
    if (!r) return { opId: opId, status: 'galat', pesan: 'produk_tidak_ada' };
    const ubah = [];
    KOLOM_ANGKA_PRODUK.forEach((k) => {
      if (op.set && k in op.set) {
        const lama = angka_(r[k]); const baru = angka_(op.set[k]);
        t.sh.getRange(r._baris, kolomKe(k)).setValue(baru);
        ubah.push(k + ' ' + lama + ' -> ' + baru);
        if (k === 'stok' && lama !== baru) catatMutasiLama_(r, 'koreksi_kelola', lama, baru, opId, 'kelola-lama', '');
      }
    });
    if (ubah.length) logSh.appendRow([sekarang, opId, 'ubah', teks_(r.id) + ' ' + teks_(r.nama), ubah.join('; '), '']);
    return { opId: opId, status: 'ok', catatan: [] };
  }
  return { opId: opId, status: 'galat', pesan: 'aksi_tidak_dikenal' };
}

function catatMutasiLama_(r, jenis, sebelum, sesudah, ref, pelaku, catatan) {   // jalur lama ikut tercatat; kegagalan mencatat tidak boleh menggagalkan penjualan
  try { catatMutasi_({ produk_id: teks_(r.id), nama: teks_(r.nama), jenis: jenis, jumlah: sesudah - sebelum, sebelum: sebelum, sesudah: sesudah, ref: ref, catatan: catatan, user: pelaku }); }
  catch (err) { Logger.log('mutasi lama gagal: ' + err); }
}

function periksa_() {
  const m = [];
  const kat = bacaTab_('kategori').baris;
  const idKat = {};
  kat.forEach((r) => {
    const id = teks_(r.id).toLowerCase();
    if (idKat[id]) m.push('Kategori baris ' + r._baris + ': ID "' + id + '" kembar');
    idKat[id] = r._baris;
    if (!teks_(r.nama)) m.push('Kategori baris ' + r._baris + ': nama kosong');
  });
  const prod = bacaTab_('produk').baris;
  const idProd = {}; const barcode = {};
  prod.forEach((r) => {
    const id = teks_(r.id);
    if (idProd[id]) m.push('Produk baris ' + r._baris + ': ID "' + id + '" kembar');
    idProd[id] = r._baris;
    if (!idKat[teks_(r.kategori).toLowerCase()]) m.push('Produk baris ' + r._baris + ': kategori "' + teks_(r.kategori) + '" tidak ada');
    const b = teks_(r.barcode);
    if (b) {
      if (barcode[b]) m.push('Produk baris ' + r._baris + ': barcode ' + b + ' kembar');
      barcode[b] = r._baris;
    }
    KOLOM_ANGKA_PRODUK.forEach((k) => {
      if (isNaN(Number(r[k])) || Number(r[k]) < 0) m.push('Produk baris ' + r._baris + ': ' + k + ' harus angka >=0');
    });
    if (Number(r.harga_jual) < Number(r.harga_beli)) m.push('Produk baris ' + r._baris + ': harga jual < beli (rugi)');
  });
  return m;
}

/* =====================================================================
 * MODUL 1: AUTENTIKASI & MANAJEMEN PERAN (multi-user)
 * Jalur lama (kunci sinkron untuk halaman toko) tetap berjalan.
 * Jalur baru: POST { aksi, token, ... } dari panel.html.
 * ===================================================================== */
const TAB_BARU = { pengguna: 'Pengguna', sesi: 'Sesi', pengaturan: 'Pengaturan', audit: 'Audit', mutasi: 'Mutasi' };
const KOLOM_BARU = {
  pengguna: ['id', 'username', 'nama', 'peran', 'hash', 'garam', 'aktif', 'dibuat', 'login_terakhir', 'wajib_ganti'],
  sesi: ['token_hash', 'user_id', 'dibuat', 'kedaluwarsa'],
  pengaturan: ['kunci', 'nilai'],
  audit: ['waktu', 'username', 'peran', 'aksi', 'target', 'detail'],
  mutasi: ['id', 'waktu', 'produk_id', 'produk', 'jenis', 'jumlah', 'stok_sebelum', 'stok_sesudah', 'harga_beli', 'supplier_id', 'ref', 'catatan', 'user']
};
const KOLOM_TEKS_BARU = {
  pengguna: ['id', 'username', 'nama', 'peran', 'hash', 'garam', 'aktif', 'dibuat', 'login_terakhir', 'wajib_ganti'],
  sesi: ['token_hash', 'user_id'],
  pengaturan: ['kunci', 'nilai'],
  audit: ['waktu', 'username', 'peran', 'aksi', 'target', 'detail'],
  mutasi: ['id', 'waktu', 'produk_id', 'produk', 'jenis', 'supplier_id', 'ref', 'catatan', 'user']
};

const PERAN = ['owner', 'admin', 'kasir'];
// Matriks hak akses. Setiap aksi API memeriksa salah satu kunci di sini.
const IZIN = {
  dashboard: ['owner', 'admin', 'kasir'],
  produk: ['owner', 'admin'],
  kategori_supplier: ['owner', 'admin'],
  pos: ['owner', 'admin', 'kasir'],
  barang_masuk: ['owner', 'admin'],
  penyesuaian_stok: ['owner', 'admin'],
  laporan: ['owner', 'admin'],
  pengeluaran: ['owner', 'admin'],
  pengguna: ['owner'],
  pengaturan: ['owner'],
  audit: ['owner', 'admin']
};
const SESI_JAM = 12;          // sesi berlaku sekian jam sejak aktivitas terakhir
const HASH_ULANG = 600;       // jumlah putaran SHA-256 untuk kata sandi
const BATAS_GAGAL = 5;        // salah sandi berturut-turut per akun
const BATAS_GAGAL_GLOBAL = 40;
const KUNCI_LOGIN_DETIK = 300;
const ZONA = 'Asia/Jakarta';
const PENGATURAN_AWAL = {
  nama_toko: 'Toko Sembako si Ucox',
  alamat: 'Jl. Curug Raya Gg. Rukun 2 No. 6, Curug, Bojongsari, Kota Depok',
  wa_nomor: '628989921788',
  wa_tampil: '0898-9921-788',
  stok_menipis: '10',
  pesan_struk: 'Terima kasih sudah belanja!'
};

/* ---------- Tabel ---------- */
function tabBaru_(k) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(TAB_BARU[k]);
  if (!sh) {
    sh = ss.insertSheet(TAB_BARU[k]);
    const kol = KOLOM_BARU[k];
    sh.getRange(1, 1, 1, kol.length).setValues([kol]).setFontWeight('bold').setBackground('#DCEBF5');
    sh.setFrozenRows(1);
    KOLOM_TEKS_BARU[k].forEach((n) => sh.getRange(1, kol.indexOf(n) + 1, sh.getMaxRows(), 1).setNumberFormat('@'));
    if (k === 'pengaturan') Object.keys(PENGATURAN_AWAL).forEach((n) => sh.appendRow([n, PENGATURAN_AWAL[n]]));
  }
  return sh;
}

function bacaBaru_(k) {
  const sh = tabBaru_(k);
  const kol = KOLOM_BARU[k];
  const n = sh.getLastRow() - 1;
  const nilai = n > 0 ? sh.getRange(2, 1, n, kol.length).getValues() : [];
  const baris = [];
  nilai.forEach((r, i) => {
    const o = { _baris: i + 2 };
    kol.forEach((c, j) => { o[c] = r[j]; });
    if (teks_(o[kol[0]]) !== '') baris.push(o);
  });
  return { sh: sh, kol: kol, baris: baris };
}

function tulisBaris_(t, o) {   // tulis satu baris utuh (pakai o._baris)
  t.sh.getRange(o._baris, 1, 1, t.kol.length).setValues([t.kol.map((c) => (o[c] === undefined ? '' : o[c]))]);
}

/* ---------- Utilitas ---------- */
const waktu_ = () => Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd HH:mm:ss');

function hex_(bytes) { return bytes.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join(''); }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function garam_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 16); }
function hashSandi_(sandi, garam) {
  let h = sandi + ':' + garam;
  for (let i = 0; i < HASH_ULANG; i++) h = sha_(h + garam);
  return h;
}
function sama_(a, b) {   // perbandingan waktu-tetap
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function idBaru_(awalan) { return awalan + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(); }

function audit_(u, aksi, target, detail) {
  tabBaru_('audit').appendRow([waktu_(), u ? u.username : '-', u ? u.peran : '-', aksi, teks_(target), teks_(detail)]);
}

/* ---------- Pengaturan toko ---------- */
function ambilPengaturan_(buat) {
  const hasil = {};
  Object.keys(PENGATURAN_AWAL).forEach((k) => { hasil[k] = PENGATURAN_AWAL[k]; });
  const sh = buat ? tabBaru_('pengaturan') : SpreadsheetApp.getActive().getSheetByName(TAB_BARU.pengaturan);
  if (!sh || sh.getLastRow() < 2) return hasil;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach((r) => {
    const k = teks_(r[0]);
    if (k in PENGATURAN_AWAL && teks_(r[1]) !== '') hasil[k] = teks_(r[1]);
  });
  return hasil;
}

function tokoPublik_() {   // dibaca halaman toko; tidak boleh melempar galat
  try {
    const p = ambilPengaturan_(false);
    return { nama: p.nama_toko, alamat: p.alamat, waNumber: p.wa_nomor, waTampil: p.wa_tampil, stokMenipis: angka_(p.stok_menipis) };
  } catch (err) { return null; }
}

/* ---------- Sesi ---------- */
function infoPengguna_(r) {
  return { id: teks_(r.id), username: teks_(r.username), nama: teks_(r.nama), peran: teks_(r.peran), wajib_ganti: teks_(r.wajib_ganti) === 'ya' ? 'ya' : 'tidak' };
}

function infoSesi_(user) {
  const izin = Object.keys(IZIN).filter((k) => IZIN[k].indexOf(user.peran) >= 0);
  return { pengguna: user, izin: izin, toko: ambilPengaturan_(false) };
}

function buatSesi_(user) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const sh = tabBaru_('sesi');
  const sekarang = Date.now();
  bersihSesi_(sekarang);
  sh.appendRow([sha_(token), user.id, sekarang, sekarang + SESI_JAM * 3600000]);
  return token;
}

function bersihSesi_(sekarang) {
  const t = bacaBaru_('sesi');
  t.baris.slice().reverse().forEach((r) => { if (Number(r.kedaluwarsa) < sekarang) t.sh.deleteRow(r._baris); });
}

function cabutSesiUser_(userId, kecualiHash) {
  const t = bacaBaru_('sesi');
  t.baris.slice().reverse().forEach((r) => {
    if (teks_(r.user_id) === teks_(userId) && teks_(r.token_hash) !== (kecualiHash || '')) t.sh.deleteRow(r._baris);
  });
}

function cariSesi_(token) {
  if (typeof token !== 'string' || token.length < 40 || token.length > 100) return null;
  const h = sha_(token);
  const sekarang = Date.now();
  const ts = bacaBaru_('sesi');
  const s = ts.baris.filter((r) => sama_(teks_(r.token_hash), h))[0];
  if (!s || Number(s.kedaluwarsa) < sekarang) return null;
  const tp = bacaBaru_('pengguna');
  const u = tp.baris.filter((r) => teks_(r.id) === teks_(s.user_id))[0];
  if (!u || teks_(u.aktif) !== 'ya' || PERAN.indexOf(teks_(u.peran)) < 0) return null;
  if (Number(s.kedaluwarsa) - sekarang < (SESI_JAM - 1) * 3600000) {   // perpanjang paling sering sekali per jam
    ts.sh.getRange(s._baris, 4).setValue(sekarang + SESI_JAM * 3600000);
  }
  return { hash: h, user: infoPengguna_(u), baris: u };
}

/* ---------- Validasi ---------- */
const USERNAME_OK = /^[a-z0-9._-]{3,20}$/;
function cekSandi_(s) {
  s = String(s === undefined || s === null ? '' : s);
  if (s.length < 6) return 'sandi_pendek';
  if (s.length > 64) return 'sandi_panjang';
  return '';
}
function cekNama_(n) { n = teks_(n); return n.length >= 2 && n.length <= 40 ? '' : 'nama_tidak_valid'; }

/* ---------- Aksi tanpa sesi ---------- */
function aksiStatus_() {
  return { ok: true, perlu_setup: bacaBaru_('pengguna').baris.length === 0, toko: ambilPengaturan_(true) };
}

function aksiSetupOwner_(p) {
  const cek = cekKunci_(p.kunci);
  if (cek) return { ok: false, galat: cek };
  const t = bacaBaru_('pengguna');
  if (t.baris.length) return { ok: false, galat: 'sudah_ada_pengguna' };
  const uname = teks_(p.username).toLowerCase();
  if (!USERNAME_OK.test(uname)) return { ok: false, galat: 'username_tidak_valid' };
  const gn = cekNama_(p.nama); if (gn) return { ok: false, galat: gn };
  const gs = cekSandi_(p.sandi); if (gs) return { ok: false, galat: gs };
  const g = garam_();
  const o = { id: idBaru_('U'), username: uname, nama: teks_(p.nama), peran: 'owner', hash: hashSandi_(String(p.sandi), g), garam: g,
              aktif: 'ya', dibuat: waktu_(), login_terakhir: waktu_(), wajib_ganti: 'tidak' };
  t.sh.appendRow(t.kol.map((c) => o[c]));
  const u = infoPengguna_(o);
  audit_(u, 'setup_owner', uname, 'Akun Owner pertama dibuat');
  return Object.assign({ ok: true, token: buatSesi_(u) }, infoSesi_(u));
}

function aksiLogin_(p) {
  const uname = teks_(p.username).toLowerCase();
  const sandi = String(p.sandi === undefined || p.sandi === null ? '' : p.sandi);
  const cache = CacheService.getScriptCache();
  const kk = 'gagal_' + uname.slice(0, 30);
  if (Number(cache.get('gagal_semua') || 0) >= BATAS_GAGAL_GLOBAL) return { ok: false, galat: 'terkunci_sementara' };
  if (Number(cache.get(kk) || 0) >= BATAS_GAGAL) return { ok: false, galat: 'terkunci_sementara' };
  const t = bacaBaru_('pengguna');
  const u = USERNAME_OK.test(uname) ? t.baris.filter((r) => teks_(r.username).toLowerCase() === uname)[0] : null;
  const h = hashSandi_(sandi.slice(0, 64), u ? teks_(u.garam) : 'xxxxxxxxxxxxxxxx');   // selalu hitung agar waktu respons seragam
  if (!u || !sama_(h, teks_(u.hash))) {
    cache.put(kk, String(Number(cache.get(kk) || 0) + 1), KUNCI_LOGIN_DETIK);
    cache.put('gagal_semua', String(Number(cache.get('gagal_semua') || 0) + 1), KUNCI_LOGIN_DETIK * 2);
    audit_(null, 'login_gagal', uname.slice(0, 30), '');
    return { ok: false, galat: 'login_salah' };
  }
  if (teks_(u.aktif) !== 'ya') { audit_(infoPengguna_(u), 'login_ditolak', uname, 'akun nonaktif'); return { ok: false, galat: 'akun_nonaktif' }; }
  cache.remove(kk);
  u.login_terakhir = waktu_();
  tulisBaris_(t, u);
  const user = infoPengguna_(u);
  audit_(user, 'login', uname, '');
  return Object.assign({ ok: true, token: buatSesi_(user) }, infoSesi_(user));
}

/* ---------- Aksi dengan sesi ---------- */
function aksiSesi_(s) { return Object.assign({ ok: true }, infoSesi_(s.user)); }

function aksiLogout_(s) {   // keluar hanya mencabut sesi perangkat ini; perangkat lain tetap masuk
  const t = bacaBaru_('sesi');
  t.baris.slice().reverse().forEach((r) => { if (teks_(r.token_hash) === s.hash) t.sh.deleteRow(r._baris); });
  audit_(s.user, 'logout', s.user.username, '');
  return { ok: true };
}

function aksiGantiSandi_(s, p) {
  const t = bacaBaru_('pengguna');
  const u = t.baris.filter((r) => teks_(r.id) === s.user.id)[0];
  if (!sama_(hashSandi_(String(p.lama || '').slice(0, 64), teks_(u.garam)), teks_(u.hash))) return { ok: false, galat: 'sandi_lama_salah' };
  const g = cekSandi_(p.baru); if (g) return { ok: false, galat: g };
  if (String(p.baru) === String(p.lama)) return { ok: false, galat: 'sandi_sama' };
  const garam = garam_();
  u.garam = garam; u.hash = hashSandi_(String(p.baru), garam); u.wajib_ganti = 'tidak';
  tulisBaris_(t, u);
  cabutSesiUser_(s.user.id, s.hash);   // perangkat lain harus masuk ulang
  audit_(s.user, 'ganti_sandi', s.user.username, '');
  const baru = infoPengguna_(u);
  return Object.assign({ ok: true }, infoSesi_(baru));
}

function aksiPenggunaDaftar_() {
  const t = bacaBaru_('pengguna');
  return { ok: true, pengguna: t.baris.map((r) => Object.assign(infoPengguna_(r), { aktif: teks_(r.aktif) === 'ya', dibuat: teks_(r.dibuat), login_terakhir: teks_(r.login_terakhir) })) };
}

function jumlahOwnerAktif_(t, kecualiId) {
  return t.baris.filter((r) => teks_(r.peran) === 'owner' && teks_(r.aktif) === 'ya' && teks_(r.id) !== kecualiId).length;
}

function aksiPenggunaSimpan_(s, p) {
  const d = p.pengguna || {};
  const t = bacaBaru_('pengguna');
  const gn = cekNama_(d.nama); if (gn) return { ok: false, galat: gn };
  if (PERAN.indexOf(d.peran) < 0) return { ok: false, galat: 'peran_tidak_valid' };
  const aktif = d.aktif === false || d.aktif === 'tidak' ? 'tidak' : 'ya';

  if (!d.id) {   // tambah pengguna baru
    const uname = teks_(d.username).toLowerCase();
    if (!USERNAME_OK.test(uname)) return { ok: false, galat: 'username_tidak_valid' };
    if (t.baris.some((r) => teks_(r.username).toLowerCase() === uname)) return { ok: false, galat: 'username_terpakai' };
    const gs = cekSandi_(d.sandi); if (gs) return { ok: false, galat: gs };
    const g = garam_();
    const o = { id: idBaru_('U'), username: uname, nama: teks_(d.nama), peran: d.peran, hash: hashSandi_(String(d.sandi), g), garam: g,
                aktif: aktif, dibuat: waktu_(), login_terakhir: '', wajib_ganti: 'ya' };   // wajib ganti sandi saat masuk pertama
    t.sh.appendRow(t.kol.map((c) => o[c]));
    audit_(s.user, 'pengguna_tambah', uname, 'peran ' + d.peran);
    return aksiPenggunaDaftar_();
  }

  const u = t.baris.filter((r) => teks_(r.id) === teks_(d.id))[0];
  if (!u) return { ok: false, galat: 'pengguna_tidak_ada' };
  const ubah = [];
  if (teks_(u.id) === s.user.id && (d.peran !== teks_(u.peran) || aktif !== teks_(u.aktif))) return { ok: false, galat: 'tidak_boleh_ubah_diri' };
  if (teks_(u.peran) === 'owner' && (d.peran !== 'owner' || aktif !== 'ya') && jumlahOwnerAktif_(t, teks_(u.id)) < 1) return { ok: false, galat: 'owner_terakhir' };
  if (teks_(u.nama) !== teks_(d.nama)) ubah.push('nama');
  if (teks_(u.peran) !== d.peran) ubah.push('peran ' + teks_(u.peran) + ' -> ' + d.peran);
  if (teks_(u.aktif) !== aktif) ubah.push('aktif ' + teks_(u.aktif) + ' -> ' + aktif);
  const cabut = teks_(u.peran) !== d.peran || teks_(u.aktif) !== aktif;
  u.nama = teks_(d.nama); u.peran = d.peran; u.aktif = aktif;
  tulisBaris_(t, u);
  if (cabut) cabutSesiUser_(u.id, '');
  if (ubah.length) audit_(s.user, 'pengguna_ubah', teks_(u.username), ubah.join('; '));
  return aksiPenggunaDaftar_();
}

function aksiPenggunaResetSandi_(s, p) {
  const t = bacaBaru_('pengguna');
  const u = t.baris.filter((r) => teks_(r.id) === teks_(p.id))[0];
  if (!u) return { ok: false, galat: 'pengguna_tidak_ada' };
  if (teks_(u.id) === s.user.id) return { ok: false, galat: 'pakai_ganti_sandi' };
  const g = cekSandi_(p.sandi); if (g) return { ok: false, galat: g };
  const garam = garam_();
  u.garam = garam; u.hash = hashSandi_(String(p.sandi), garam); u.wajib_ganti = 'ya';
  tulisBaris_(t, u);
  cabutSesiUser_(u.id, '');
  audit_(s.user, 'pengguna_reset_sandi', teks_(u.username), '');
  return { ok: true };
}

function aksiPengaturanAmbil_() { return { ok: true, pengaturan: ambilPengaturan_(true) }; }

function aksiPengaturanSimpan_(s, p) {
  const d = p.pengaturan || {};
  const baru = {};
  const nama = teks_(d.nama_toko); if (nama.length < 2 || nama.length > 60) return { ok: false, galat: 'nama_toko_tidak_valid' };
  baru.nama_toko = nama;
  baru.alamat = teks_(d.alamat).slice(0, 200);
  const wa = teks_(d.wa_nomor).replace(/\D/g, ''); if (!/^62\d{8,13}$/.test(wa)) return { ok: false, galat: 'wa_tidak_valid' };
  baru.wa_nomor = wa;
  baru.wa_tampil = teks_(d.wa_tampil).slice(0, 30);
  const sm = Number(d.stok_menipis); if (!isFinite(sm) || sm < 0 || sm > 9999) return { ok: false, galat: 'stok_menipis_tidak_valid' };
  baru.stok_menipis = String(Math.round(sm));
  baru.pesan_struk = teks_(d.pesan_struk).slice(0, 80);
  const lama = ambilPengaturan_(true);
  const sh = tabBaru_('pengaturan');
  const baris = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach((r, i) => { baris[teks_(r[0])] = i + 2; });
  const ubah = [];
  Object.keys(baru).forEach((k) => {
    if (lama[k] === baru[k]) return;
    ubah.push(k);
    if (baris[k]) sh.getRange(baris[k], 2).setNumberFormat('@').setValue(baru[k]); else sh.appendRow([k, baru[k]]);   // kolom bertipe teks: aman dari rumus
  });
  if (ubah.length) audit_(s.user, 'pengaturan_ubah', 'toko', ubah.join(', '));
  return { ok: true, pengaturan: ambilPengaturan_(true) };
}

function aksiAuditDaftar_(s, p) {
  const sh = tabBaru_('audit');
  const batas = Math.min(Math.max(angka_(p.limit) || 100, 1), 500);
  const n = sh.getLastRow() - 1;
  if (n < 1) return { ok: true, audit: [] };
  const awal = Math.max(2, sh.getLastRow() - batas + 1);
  const nilai = sh.getRange(awal, 1, sh.getLastRow() - awal + 1, 6).getValues().reverse();
  return { ok: true, audit: nilai.map((r) => ({ waktu: teks_(r[0]), username: teks_(r[1]), peran: teks_(r[2]), aksi: teks_(r[3]), target: teks_(r[4]), detail: teks_(r[5]) })) };
}

function aksiDashboard_(s) {
  const d = ambilData_(true);
  const batas = angka_(ambilPengaturan_(false).stok_menipis);
  const lihatModal = IZIN.laporan.indexOf(s.user.peran) >= 0;
  const menipis = d.produk.filter((p) => p.stok > 0 && p.stok <= stokMinEfektif_(p.stok_min, batas)).sort((a, b) => a.stok - b.stok);
  const out = {
    ok: true,
    jumlah_produk: d.produk.length,
    jumlah_kategori: d.kategori.length,
    stok_habis: d.produk.filter((p) => p.stok <= 0).length,
    jumlah_menipis: menipis.length,
    menipis: menipis.slice(0, 8).map((p) => ({ id: p.id, nama: p.nama, stok: p.stok, satuan: p.satuan })),
    nilai_persediaan: lihatModal ? d.produk.reduce((a, p) => a + p.stok * p.harga_beli, 0) : null,
    pengguna_aktif: null
  };
  if (s.user.peran === 'owner') out.pengguna_aktif = bacaBaru_('pengguna').baris.filter((r) => teks_(r.aktif) === 'ya').length;
  return out;
}

/* ---------- Pintu masuk API baru ---------- */
function apiBaru_(p) {
  const aksi = teks_(p.aksi);
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return { ok: false, galat: 'sibuk_coba_lagi' }; }
  try {
    if (aksi === 'status') return aksiStatus_();
    if (aksi === 'setup_owner') return aksiSetupOwner_(p);
    if (aksi === 'login') return aksiLogin_(p);
    const s = cariSesi_(p.token);
    if (!s) return { ok: false, galat: 'sesi_habis' };
    const h = HANDLER_[aksi];
    if (!h) return { ok: false, galat: 'aksi_tidak_dikenal' };
    if (h.izin && IZIN[h.izin].indexOf(s.user.peran) < 0) {
      audit_(s.user, 'akses_ditolak', aksi, '');
      return { ok: false, galat: 'tidak_berhak' };
    }
    if (s.user.wajib_ganti === 'ya' && ['sesi', 'logout', 'ganti_sandi'].indexOf(aksi) < 0) return { ok: false, galat: 'wajib_ganti_sandi' };
    return h.jalan(s, p);
  } catch (err) {
    return { ok: false, galat: 'galat_server: ' + String(err.message || err) };
  } finally {
    lock.releaseLock();
  }
}

const HANDLER_ = {
  sesi: { izin: '', jalan: (s) => aksiSesi_(s) },
  logout: { izin: '', jalan: (s) => aksiLogout_(s) },
  ganti_sandi: { izin: '', jalan: (s, p) => aksiGantiSandi_(s, p) },
  dashboard: { izin: 'dashboard', jalan: (s) => aksiDashboard_(s) },
  pengaturan_ambil: { izin: 'pengaturan', jalan: () => aksiPengaturanAmbil_() },
  pengaturan_simpan: { izin: 'pengaturan', jalan: (s, p) => aksiPengaturanSimpan_(s, p) },
  pengguna_daftar: { izin: 'pengguna', jalan: () => aksiPenggunaDaftar_() },
  pengguna_simpan: { izin: 'pengguna', jalan: (s, p) => aksiPenggunaSimpan_(s, p) },
  pengguna_reset_sandi: { izin: 'pengguna', jalan: (s, p) => aksiPenggunaResetSandi_(s, p) },
  audit_daftar: { izin: 'audit', jalan: (s, p) => aksiAuditDaftar_(s, p) },
  // Tahap 2: Master Data
  master_ambil: { izin: 'produk', jalan: () => dataMaster_() },
  produk_simpan: { izin: 'produk', jalan: (s, p) => aksiProdukSimpan_(s, p) },
  produk_hapus: { izin: 'produk', jalan: (s, p) => aksiProdukHapus_(s, p) },
  gambar_unggah: { izin: 'produk', jalan: (s, p) => aksiGambarUnggah_(s, p) },
  kategori_simpan: { izin: 'kategori_supplier', jalan: (s, p) => aksiKategoriSimpan_(s, p) },
  kategori_hapus: { izin: 'kategori_supplier', jalan: (s, p) => aksiKategoriHapus_(s, p) },
  supplier_simpan: { izin: 'kategori_supplier', jalan: (s, p) => aksiSupplierSimpan_(s, p) },
  supplier_hapus: { izin: 'kategori_supplier', jalan: (s, p) => aksiSupplierHapus_(s, p) },
  // Tahap 3: Inventaris
  inventaris_ambil: { izin: 'barang_masuk', jalan: () => dataInventaris_() },
  masuk_simpan: { izin: 'barang_masuk', jalan: (s, p) => aksiMasukSimpan_(s, p) },
  stok_sesuaikan: { izin: 'penyesuaian_stok', jalan: (s, p) => aksiStokSesuaikan_(s, p) },
  stok_min_simpan: { izin: 'penyesuaian_stok', jalan: (s, p) => aksiStokMinSimpan_(s, p) },
  mutasi_daftar: { izin: 'barang_masuk', jalan: (s, p) => aksiMutasiDaftar_(s, p) }
};

/* ---------- Menu Google Sheets ---------- */
function siapkanMultiUser() {
  Object.keys(TAB_BARU).forEach((k) => tabBaru_(k));
  SpreadsheetApp.getUi().alert('Tab Pengguna, Sesi, Pengaturan, Audit, dan Mutasi sudah siap.\n\nLangkah berikutnya: buka panel.html di website, lalu buat akun Owner pertama memakai kunci sinkron.');
}

function resetSandiDarurat() {   // untuk Owner yang lupa kata sandi; hanya bisa dijalankan oleh editor Spreadsheet
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Reset kata sandi (darurat)', 'Username akun yang akan direset:', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt('Reset kata sandi (darurat)', 'Kata sandi baru (minimal 6 karakter). Pengguna wajib menggantinya saat masuk:', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  const uname = a.getResponseText().trim().toLowerCase();
  const sandi = b.getResponseText();
  if (cekSandi_(sandi)) { ui.alert('Kata sandi tidak valid (6 sampai 64 karakter).'); return; }
  const t = bacaBaru_('pengguna');
  const u = t.baris.filter((r) => teks_(r.username).toLowerCase() === uname)[0];
  if (!u) { ui.alert('Username tidak ditemukan.'); return; }
  const g = garam_();
  u.garam = g; u.hash = hashSandi_(sandi, g); u.wajib_ganti = 'ya'; u.aktif = 'ya';
  tulisBaris_(t, u);
  cabutSesiUser_(u.id, '');
  CacheService.getScriptCache().remove('gagal_' + uname.slice(0, 30));
  audit_({ username: 'editor-sheet', peran: 'sistem' }, 'reset_sandi_darurat', uname, '');
  ui.alert('Kata sandi untuk "' + uname + '" sudah direset.');
}

/* =====================================================================
 * MODUL 2: MASTER DATA (kategori, produk, supplier, gambar, barcode)
 * Stok TIDAK diubah dari sini (kecuali stok awal saat produk baru dibuat);
 * perubahan stok dilakukan lewat Inventaris (Tahap 3) agar tercatat sebagai mutasi.
 * ===================================================================== */
const gal_ = (kode) => ({ ok: false, galat: kode });
const bulat_ = (v, min, max) => {   // bilangan bulat dalam rentang, atau null
  if (teks_(v) === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const cocokNama_ = (a, b) => teks_(a).toLowerCase() === teks_(b).toLowerCase();

function tulisSel_(t, nama, nomorBaris, k, nilai) {
  const c = t.sh.getRange(nomorBaris, t.peta[k] + 1);
  if (KOLOM_TEKS[nama].indexOf(k) >= 0) c.setNumberFormat('@');   // format teks: nilai tidak pernah dibaca sebagai rumus/angka
  c.setValue(nilai);
}
function tambahBaris_(t, nama, o) {
  const nomor = t.sh.getLastRow() + 1;
  KOLOM[nama].forEach((k) => tulisSel_(t, nama, nomor, k, o[k] === undefined ? '' : o[k]));
  return nomor;
}
function idBerikut_(baris, awalan, lebar) {
  // ID tidak pernah dipakai ulang, walau barisnya sudah dihapus: riwayat mutasi dan transaksi merujuk ID ini.
  let maks = 0;
  baris.forEach((r) => { const m = new RegExp('^' + awalan + '(\\d+)$').exec(teks_(r.id)); if (m) maks = Math.max(maks, Number(m[1])); });
  const props = PropertiesService.getScriptProperties();
  const kunci = 'URUTAN_' + awalan;
  const n = Math.max(maks, Number(props.getProperty(kunci)) || 0) + 1;
  props.setProperty(kunci, String(n));
  return awalan + ('0000' + n).slice(-Math.max(lebar, String(n).length));
}
function dataMaster_() {
  const d = ambilData_(true);
  return { ok: true, kategori: d.kategori, produk: d.produk, supplier: d.supplier };
}
function selisih_(lama, baru, kunci) {   // daftar perubahan untuk audit
  return kunci.filter((k) => String(lama[k]) !== String(baru[k])).map((k) => k + ' ' + (teks_(lama[k]) || '-') + ' -> ' + (teks_(baru[k]) || '-'));
}

/* ---------- Kategori ---------- */
const IKON_OK = /^[a-z0-9-]{2,40}$/;
function aksiKategoriSimpan_(s, p) {
  const d = p.kategori || {};
  const t = bacaTab_('kategori');
  const nama = teks_(d.nama); if (nama.length < 2 || nama.length > 30) return gal_('nama_kategori_tidak_valid');
  const ikon = teks_(d.ikon).toLowerCase() || 'package'; if (!IKON_OK.test(ikon)) return gal_('ikon_tidak_valid');
  const lainnya = t.baris.filter((r) => teks_(r.id).toLowerCase() !== teks_(d.id).toLowerCase());
  if (lainnya.some((r) => cocokNama_(r.nama, nama))) return gal_('nama_kategori_kembar');
  if (!d.id) {
    let id = nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'kategori';
    const dasar = id; let n = 2;
    while (t.baris.some((r) => teks_(r.id).toLowerCase() === id)) id = dasar + '-' + n++;
    tambahBaris_(t, 'kategori', { id: id, nama: nama, ikon: ikon });
    audit_(s.user, 'kategori_tambah', id, nama);
  } else {
    const r = t.baris.filter((x) => teks_(x.id).toLowerCase() === teks_(d.id).toLowerCase())[0];
    if (!r) return gal_('kategori_tidak_ada');
    const ubah = selisih_(r, { nama: nama, ikon: ikon }, ['nama', 'ikon']);
    if (ubah.length) {
      tulisSel_(t, 'kategori', r._baris, 'nama', nama);
      tulisSel_(t, 'kategori', r._baris, 'ikon', ikon);
      audit_(s.user, 'kategori_ubah', teks_(r.id), ubah.join('; '));
    }
  }
  return dataMaster_();
}

function aksiKategoriHapus_(s, p) {
  const id = teks_(p.id).toLowerCase();
  const t = bacaTab_('kategori');
  const r = t.baris.filter((x) => teks_(x.id).toLowerCase() === id)[0];
  if (!r) return gal_('kategori_tidak_ada');
  const dipakai = bacaTab_('produk').baris.filter((x) => teks_(x.kategori).toLowerCase() === id).length;
  if (dipakai) return { ok: false, galat: 'kategori_dipakai', jumlah: dipakai };
  t.sh.deleteRow(r._baris);
  // lepaskan dari daftar kategori milik supplier
  const ts = bacaTab_('supplier');
  ts.baris.forEach((x) => {
    const lama = daftar_(x.kategori);
    if (lama.indexOf(id) >= 0) tulisSel_(ts, 'supplier', x._baris, 'kategori', lama.filter((k) => k !== id).join(','));
  });
  audit_(s.user, 'kategori_hapus', id, teks_(r.nama));
  return dataMaster_();
}

/* ---------- Produk ---------- */
const GAMBAR_OK = /^(https:\/\/[^\s"'<>\\]{4,500}|img\/[A-Za-z0-9._-]{1,100})$/;   // tanpa tanda kutip/kurung sudut: aman disisipkan ke HTML
const BARCODE_OK = /^\d{6,14}$/;
function aksiProdukSimpan_(s, p) {
  const d = p.produk || {};
  const t = tabProduk_();
  const nama = teks_(d.nama); if (nama.length < 2 || nama.length > 60) return gal_('nama_produk_tidak_valid');
  const kat = teks_(d.kategori).toLowerCase();
  if (!bacaTab_('kategori').baris.some((r) => teks_(r.id).toLowerCase() === kat)) return gal_('kategori_tidak_ada');
  const satuan = teks_(d.satuan); if (!satuan || satuan.length > 15) return gal_('satuan_tidak_valid');
  const hb = bulat_(d.harga_beli, 0, 100000000), hj = bulat_(d.harga_jual, 0, 100000000);
  if (hb === null || hj === null) return gal_('harga_tidak_valid');
  const gambar = teks_(d.gambar); if (gambar && !GAMBAR_OK.test(gambar)) return gal_('gambar_tidak_valid');
  const barcode = teks_(d.barcode); if (barcode && !BARCODE_OK.test(barcode)) return gal_('barcode_tidak_valid');
  const stokMin = teks_(d.stok_min) === '' ? '' : bulat_(d.stok_min, 0, 100000); if (stokMin === null) return gal_('stok_min_tidak_valid');
  const lain = t.baris.filter((r) => teks_(r.id) !== teks_(d.id));
  if (barcode && lain.some((r) => teks_(r.barcode) === barcode)) return gal_('barcode_terpakai');
  if (lain.some((r) => cocokNama_(r.nama, nama) && cocokNama_(r.satuan, satuan))) return gal_('produk_kembar');
  const baru = { nama: nama, kategori: kat, satuan: satuan, harga_beli: hb, harga_jual: hj, gambar: gambar, barcode: barcode };

  if (!d.id) {
    const stok = bulat_(d.stok === undefined || teks_(d.stok) === '' ? 0 : d.stok, 0, 1000000);
    if (stok === null) return gal_('stok_tidak_valid');
    const id = idBerikut_(t.baris, 'P', 3);
    const nomor = tambahBaris_(t, 'produk', Object.assign({ id: id, stok: stok }, baru));
    if (stokMin !== '') tulisSel_(t, 'produk', nomor, 'stok_min', stokMin);
    if (stok > 0) catatMutasi_({ produk_id: id, nama: nama, jenis: 'stok_awal', jumlah: stok, sebelum: 0, sesudah: stok, harga_beli: hb, user: s.user.username });
    audit_(s.user, 'produk_tambah', id + ' ' + nama, 'jual ' + hj + ', beli ' + hb + ', stok awal ' + stok);
    const out = dataMaster_(); out.id = id; return out;
  }
  const r = t.baris.filter((x) => teks_(x.id) === teks_(d.id))[0];
  if (!r) return gal_('produk_tidak_ada');
  const lama = { nama: teks_(r.nama), kategori: teks_(r.kategori).toLowerCase(), satuan: teks_(r.satuan), harga_beli: angka_(r.harga_beli),
                 harga_jual: angka_(r.harga_jual), gambar: teks_(r.gambar), barcode: teks_(r.barcode) };
  const kunci = Object.keys(baru);
  const ubah = selisih_(lama, baru, kunci.filter((k) => k !== 'gambar'));
  if (lama.gambar !== gambar) ubah.push('gambar ' + (lama.gambar ? 'diganti' : 'ditambah'));
  kunci.forEach((k) => { if (String(lama[k]) !== String(baru[k])) tulisSel_(t, 'produk', r._baris, k, baru[k]); });   // kolom stok sengaja tidak disentuh
  if (teks_(r.stok_min) !== String(stokMin)) { ubah.push('stok_min ' + (teks_(r.stok_min) || 'default') + ' -> ' + (stokMin === '' ? 'default' : stokMin)); tulisSel_(t, 'produk', r._baris, 'stok_min', stokMin); }
  if (ubah.length) audit_(s.user, 'produk_ubah', teks_(r.id) + ' ' + lama.nama, ubah.join('; '));
  const out = dataMaster_(); out.id = teks_(r.id); return out;
}

function aksiProdukHapus_(s, p) {
  const t = bacaTab_('produk');
  const r = t.baris.filter((x) => teks_(x.id) === teks_(p.id))[0];
  if (!r) return gal_('produk_tidak_ada');
  t.sh.deleteRow(r._baris);
  audit_(s.user, 'produk_hapus', teks_(r.id) + ' ' + teks_(r.nama), 'stok terakhir ' + angka_(r.stok) + ', jual ' + angka_(r.harga_jual));
  return dataMaster_();
}

/* ---------- Supplier ---------- */
const TELEPON_OK = /^[0-9 +()-]{5,20}$/;
function aksiSupplierSimpan_(s, p) {
  const d = p.supplier || {};
  const t = bacaTab_('supplier');
  const nama = teks_(d.nama); if (nama.length < 2 || nama.length > 60) return gal_('nama_supplier_tidak_valid');
  const kontak = teks_(d.kontak).slice(0, 60), kota = teks_(d.kota).slice(0, 40);
  const telepon = teks_(d.telepon); if (telepon && !TELEPON_OK.test(telepon)) return gal_('telepon_tidak_valid');
  const termin = bulat_(teks_(d.termin_hari) === '' ? 0 : d.termin_hari, 0, 365); if (termin === null) return gal_('termin_tidak_valid');
  const idKat = bacaTab_('kategori').baris.map((r) => teks_(r.id).toLowerCase());
  const kat = (Array.isArray(d.kategori) ? d.kategori : daftar_(d.kategori)).map((k) => teks_(k).toLowerCase());
  if (kat.some((k) => idKat.indexOf(k) < 0)) return gal_('kategori_tidak_ada');
  if (t.baris.some((r) => teks_(r.id) !== teks_(d.id) && cocokNama_(r.nama, nama))) return gal_('supplier_kembar');
  const baru = { nama: nama, kontak: kontak, telepon: telepon, kota: kota, kategori: kat.join(','), termin_hari: termin };
  if (!d.id) {
    const id = idBerikut_(t.baris, 'S', 2);
    tambahBaris_(t, 'supplier', Object.assign({ id: id }, baru));
    audit_(s.user, 'supplier_tambah', id + ' ' + nama, 'termin ' + termin + ' hari');
  } else {
    const r = t.baris.filter((x) => teks_(x.id) === teks_(d.id))[0];
    if (!r) return gal_('supplier_tidak_ada');
    const lama = { nama: teks_(r.nama), kontak: teks_(r.kontak), telepon: teks_(r.telepon), kota: teks_(r.kota), kategori: daftar_(r.kategori).join(','), termin_hari: angka_(r.termin_hari) };
    const ubah = selisih_(lama, baru, Object.keys(baru));
    Object.keys(baru).forEach((k) => { if (String(lama[k]) !== String(baru[k])) tulisSel_(t, 'supplier', r._baris, k, baru[k]); });
    if (ubah.length) audit_(s.user, 'supplier_ubah', teks_(r.id) + ' ' + lama.nama, ubah.join('; '));
  }
  return dataMaster_();
}

function aksiSupplierHapus_(s, p) {
  const t = bacaTab_('supplier');
  const r = t.baris.filter((x) => teks_(x.id) === teks_(p.id))[0];
  if (!r) return gal_('supplier_tidak_ada');
  t.sh.deleteRow(r._baris);
  audit_(s.user, 'supplier_hapus', teks_(r.id) + ' ' + teks_(r.nama), '');
  return dataMaster_();
}

/* ---------- Gambar produk (disimpan di Google Drive, tautan disimpan di Sheet) ---------- */
function folderGambar_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_GAMBAR');
  if (id) { try { return DriveApp.getFolderById(id); } catch (err) { /* folder terhapus: buat ulang */ } }
  const f = DriveApp.createFolder('Warung Ucox - Gambar Produk');
  props.setProperty('FOLDER_GAMBAR', f.getId());
  return f;
}

function aksiGambarUnggah_(s, p) {
  const b64 = teks_(p.data).replace(/^data:[^,]*,/, '');
  if (!b64) return gal_('gambar_kosong');
  if (b64.length > 700000) return gal_('gambar_terlalu_besar');   // sekitar 500 KB; browser sudah mengecilkan ke sekitar 60 KB
  let bytes;
  try { bytes = Utilities.base64Decode(b64); } catch (err) { return gal_('gambar_format'); }
  if (!(bytes.length > 3 && bytes[0] === -1 && bytes[1] === -40 && bytes[2] === -1)) return gal_('gambar_format');   // hanya JPEG
  let file;
  try {
    file = folderGambar_().createFile(Utilities.newBlob(bytes, 'image/jpeg', 'produk-' + Date.now() + '.jpg'));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) { return gal_('drive_belum_diizinkan'); }
  audit_(s.user, 'gambar_unggah', file.getId(), Math.round(bytes.length / 1024) + ' KB');
  return { ok: true, url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w600' };
}

function izinkanDrive() {   // dijalankan sekali dari menu agar Google meminta izin Drive
  const f = folderGambar_();
  SpreadsheetApp.getUi().alert('Akses Drive aktif. Foto produk akan disimpan di folder "' + f.getName() + '" di Google Drive Anda.');
}

/* =====================================================================
 * MODUL 3: INVENTARIS (barang masuk, penyesuaian stok, stok minimum, mutasi)
 * Semua perubahan stok WAJIB lewat ubahStok_() agar tercatat di buku Mutasi
 * (stok sebelum, stok sesudah, pelaku, alasan). POS (Tahap 4) memakai fungsi yang sama.
 * ===================================================================== */
const JENIS_MUTASI = {
  stok_awal: 'Stok awal', masuk: 'Barang masuk', temuan: 'Ditemukan', opname: 'Hitung ulang (opname)',
  rusak: 'Rusak', kadaluarsa: 'Kadaluarsa', hilang: 'Hilang', pakai_sendiri: 'Dipakai sendiri', retur_supplier: 'Retur ke supplier',
  penjualan: 'Penjualan', koreksi_kelola: 'Koreksi (menu Kelola lama)'
};
const SESUAI_ARAH = { rusak: -1, kadaluarsa: -1, hilang: -1, pakai_sendiri: -1, retur_supplier: -1, temuan: 1, opname: 0 };
const SESUAI_WAJIB_CATATAN = ['hilang', 'temuan', 'opname'];
const STOK_MAKS = 1000000;

function pastikanStokMin_() {   // tambah kolom opsional stok_min di tab Produk bila belum ada (tidak mengubah kolom lain)
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB.produk);
  if (!sh) throw new Error('Tab "Produk" tidak ditemukan');
  if ('stok_min' in petaKolom_(sh)) return;
  sh.getRange(1, sh.getLastColumn() + 1).setValue('stok_min').setFontWeight('bold').setBackground('#DCEBF5');
}
function tabProduk_() { pastikanStokMin_(); return bacaTab_('produk'); }
const stokMinEfektif_ = (stokMin, batasToko) => (stokMin === null || stokMin === undefined ? batasToko : stokMin);

function catatMutasi_(m) {
  const sh = tabBaru_('mutasi');
  const id = 'M' + ('000000' + sh.getLastRow()).slice(-6);   // baris tidak pernah dihapus, jadi urutan selalu naik
  sh.appendRow([id, waktu_(), m.produk_id, m.nama, m.jenis, m.jumlah, m.sebelum, m.sesudah,
    m.harga_beli === undefined || m.harga_beli === null ? '' : m.harga_beli, m.supplier || '', m.ref || '', teks_(m.catatan).slice(0, 200), m.user || '-']);
  return id;
}

/* Satu-satunya pintu perubahan stok. Menolak stok negatif; mengembalikan {sebelum, sesudah}. */
function ubahStok_(t, r, delta, meta) {
  const sebelum = angka_(r.stok);
  const sesudah = sebelum + delta;
  if (sesudah < 0) { const e = new Error('stok_tidak_cukup'); e.tersedia = sebelum; throw e; }
  if (sesudah > STOK_MAKS) throw new Error('stok_melebihi_batas');
  tulisSel_(t, 'produk', r._baris, 'stok', sesudah);
  r.stok = sesudah;
  catatMutasi_(Object.assign({ produk_id: teks_(r.id), nama: teks_(r.nama), jumlah: delta, sebelum: sebelum, sesudah: sesudah }, meta));
  return { sebelum: sebelum, sesudah: sesudah };
}

function refBaru_(awalan) {   // contoh: BM-261101-001 (nomor urut per hari)
  const tgl = waktu_().slice(2, 10).replace(/-/g, '');
  const sh = tabBaru_('mutasi'); const akhir = sh.getLastRow();
  let maks = 0;
  if (akhir > 1) {
    const awal = Math.max(2, akhir - 499);
    sh.getRange(awal, 11, akhir - awal + 1, 1).getValues().forEach((x) => {
      const m = new RegExp('^' + awalan + '-' + tgl + '-(\\d+)$').exec(teks_(x[0])); if (m) maks = Math.max(maks, Number(m[1]));
    });
  }
  return awalan + '-' + tgl + '-' + ('00' + (maks + 1)).slice(-3);
}

function dataInventaris_() {
  const d = dataMaster_();
  d.batas_toko = angka_(ambilPengaturan_(false).stok_menipis);
  return d;
}

/* ---------- Barang masuk ---------- */
function aksiMasukSimpan_(s, p) {
  const d = p.masuk || {};
  const items = Array.isArray(d.items) ? d.items : [];
  if (!items.length) return gal_('item_kosong');
  if (items.length > 50) return gal_('item_terlalu_banyak');
  const t = tabProduk_();
  const idx = {}; t.baris.forEach((r) => { idx[teks_(r.id)] = r; });
  const supplier = teks_(d.supplier);
  if (supplier && !bacaTab_('supplier').baris.some((r) => teks_(r.id) === supplier)) return gal_('supplier_tidak_ada');
  const faktur = teks_(d.faktur).slice(0, 30), catatan = teks_(d.catatan).slice(0, 100);
  const sudah = {}; const rencana = [];
  for (let i = 0; i < items.length; i++) {   // validasi SEMUA item dulu; tidak ada yang ditulis bila ada satu yang salah
    const it = items[i] || {};
    const r = idx[teks_(it.produk_id)];
    if (!r) return { ok: false, galat: 'produk_tidak_ada', produk_id: teks_(it.produk_id) };
    if (sudah[teks_(r.id)]) return gal_('item_kembar');
    sudah[teks_(r.id)] = true;
    const qty = bulat_(it.qty, 1, 100000); if (qty === null) return { ok: false, galat: 'jumlah_tidak_valid', produk_id: teks_(r.id) };
    const beli = bulat_(it.harga_beli, 0, 100000000); if (beli === null) return { ok: false, galat: 'harga_tidak_valid', produk_id: teks_(r.id) };
    if (angka_(r.stok) + qty > STOK_MAKS) return { ok: false, galat: 'stok_melebihi_batas', produk_id: teks_(r.id) };
    rencana.push({ r: r, qty: qty, beli: beli });
  }
  const ref = refBaru_('BM');
  let total = 0; let modalBerubah = 0;
  rencana.forEach((x) => {
    ubahStok_(t, x.r, x.qty, { jenis: 'masuk', harga_beli: x.beli, supplier: supplier, ref: ref, catatan: [faktur ? 'Faktur ' + faktur : '', catatan].filter(Boolean).join('. '), user: s.user.username });
    total += x.qty * x.beli;
    if (d.perbarui_modal !== false && x.beli !== angka_(x.r.harga_beli)) { tulisSel_(t, 'produk', x.r._baris, 'harga_beli', x.beli); modalBerubah++; }
  });
  audit_(s.user, 'barang_masuk', ref, rencana.length + ' item, total Rp' + total + (supplier ? ', supplier ' + supplier : '') + (modalBerubah ? ', ' + modalBerubah + ' harga modal diperbarui' : ''));
  const out = dataInventaris_(); out.ref = ref; out.total = total; out.jumlah_item = rencana.length; return out;
}

/* ---------- Penyesuaian stok ---------- */
function aksiStokSesuaikan_(s, p) {
  const jenis = teks_(p.jenis);
  if (!(jenis in SESUAI_ARAH)) return gal_('jenis_tidak_valid');
  const catatan = teks_(p.catatan).slice(0, 120);
  if (SESUAI_WAJIB_CATATAN.indexOf(jenis) >= 0 && catatan.length < 3) return gal_('catatan_wajib');
  const t = tabProduk_();
  const r = t.baris.filter((x) => teks_(x.id) === teks_(p.produk_id))[0];
  if (!r) return gal_('produk_tidak_ada');
  const qty = bulat_(p.jumlah, jenis === 'opname' ? 0 : 1, STOK_MAKS); if (qty === null) return gal_('jumlah_tidak_valid');
  const lama = angka_(r.stok);
  const delta = jenis === 'opname' ? qty - lama : SESUAI_ARAH[jenis] * qty;
  if (delta === 0) return gal_('tidak_ada_perubahan');
  const supplier = teks_(p.supplier);
  if (supplier && !bacaTab_('supplier').baris.some((x) => teks_(x.id) === supplier)) return gal_('supplier_tidak_ada');
  let hasil;
  try { hasil = ubahStok_(t, r, delta, { jenis: jenis, supplier: jenis === 'retur_supplier' ? supplier : '', ref: refBaru_('PS'), catatan: catatan, user: s.user.username }); }
  catch (err) { if (err.message === 'stok_tidak_cukup') return { ok: false, galat: 'stok_tidak_cukup', tersedia: err.tersedia }; throw err; }
  audit_(s.user, 'stok_sesuaikan', teks_(r.id) + ' ' + teks_(r.nama), JENIS_MUTASI[jenis] + ': ' + hasil.sebelum + ' -> ' + hasil.sesudah + (catatan ? ' (' + catatan + ')' : ''));
  const out = dataInventaris_(); out.sebelum = hasil.sebelum; out.sesudah = hasil.sesudah; return out;
}

/* ---------- Stok minimum ---------- */
function aksiStokMinSimpan_(s, p) {
  const t = tabProduk_();
  const r = t.baris.filter((x) => teks_(x.id) === teks_(p.produk_id))[0];
  if (!r) return gal_('produk_tidak_ada');
  const kosong = teks_(p.stok_min) === '';
  const baru = kosong ? '' : bulat_(p.stok_min, 0, 100000);
  if (baru === null) return gal_('stok_min_tidak_valid');
  const lama = teks_(r.stok_min);
  if (String(lama) !== String(baru)) {
    tulisSel_(t, 'produk', r._baris, 'stok_min', baru);
    audit_(s.user, 'stok_min_ubah', teks_(r.id) + ' ' + teks_(r.nama), (lama === '' ? 'default toko' : lama) + ' -> ' + (kosong ? 'default toko' : baru));
  }
  return dataInventaris_();
}

/* ---------- Riwayat mutasi ---------- */
function aksiMutasiDaftar_(s, p) {
  const sh = tabBaru_('mutasi'); const kol = KOLOM_BARU.mutasi;
  const batas = Math.min(Math.max(angka_(p.limit) || 100, 1), 500);
  const akhir = sh.getLastRow();
  if (akhir < 2) return { ok: true, mutasi: [] };
  const awal = Math.max(2, akhir - (p.produk_id ? 3000 : 1000) + 1);
  const nilai = sh.getRange(awal, 1, akhir - awal + 1, kol.length).getValues();
  const pid = teks_(p.produk_id);
  const hasil = [];
  for (let i = nilai.length - 1; i >= 0 && hasil.length < batas; i--) {
    const o = {}; kol.forEach((c, j) => { o[c] = nilai[i][j]; });
    if (pid && teks_(o.produk_id) !== pid) continue;
    hasil.push({ id: teks_(o.id), waktu: teks_(o.waktu), produk_id: teks_(o.produk_id), produk: teks_(o.produk), jenis: teks_(o.jenis), jumlah: Number(o.jumlah) || 0,
      sebelum: Number(o.stok_sebelum) || 0, sesudah: Number(o.stok_sesudah) || 0, harga_beli: teks_(o.harga_beli) === '' ? null : Number(o.harga_beli),
      supplier_id: teks_(o.supplier_id), ref: teks_(o.ref), catatan: teks_(o.catatan), user: teks_(o.user) });
  }
  return { ok: true, mutasi: hasil };
}

function siapkanInventaris() {   // menu: menyiapkan tab Mutasi dan kolom stok_min
  tabBaru_('mutasi'); pastikanStokMin_();
  SpreadsheetApp.getUi().alert('Inventaris siap: tab Mutasi dan kolom stok_min (tab Produk) sudah tersedia.');
}
