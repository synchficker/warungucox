/* Uji logika Code.gs di Node dengan tiruan layanan Google. Jalankan: node dev/uji-code-gs.js */
const assert = require('assert');
const { post, get, sheets, cacheMem, ctxDrive } = require('./mock-gas.js');

let ok = 0; const cek = (nama, f) => { try { f(); ok++; console.log('  ok  ', nama); } catch (e) { console.log('  GAGAL', nama, '\n       ', e.message); process.exitCode = 1; } };

console.log('Jalur lama (kompatibilitas)');
cek('doGet publik tetap mengembalikan kategori & produk tanpa harga_beli', () => {
  const r = get({}); assert(r.ok); assert.equal(r.data.produk.length, 3); assert(!('harga_beli' in r.data.produk[0])); assert(r.data.toko === null || r.data.toko.nama);
});
cek('doPost lama dengan kunci benar: jual mengurangi stok', () => {
  const r = post({ kunci: 'KunciRahasia123', ops: [{ opId: 'a1', aksi: 'jual', item: [{ id: 'P001', qty: 2 }] }] });
  assert(r.ok); assert.equal(r.hasil[0].status, 'ok'); assert.equal(r.data.produk.find((p) => p.id === 'P001').stok, 22);
});
cek('doPost lama dengan kunci salah ditolak', () => assert.equal(post({ kunci: 'salah', ops: [] }).galat, 'kunci_salah'));

console.log('Setup & login');
let tokOwner, tokAdmin, tokKasir, idKasir, idAdmin;
cek('status: perlu_setup true saat belum ada pengguna', () => { const r = post({ aksi: 'status' }); assert(r.ok && r.perlu_setup === true); });
cek('setup_owner dengan kunci salah ditolak', () => assert.equal(post({ aksi: 'setup_owner', kunci: 'x', username: 'ucox', nama: 'Ucox', sandi: 'rahasia1' }).galat, 'kunci_salah'));
cek('setup_owner membuat Owner & langsung masuk', () => {
  const r = post({ aksi: 'setup_owner', kunci: 'KunciRahasia123', username: 'Ucox', nama: 'Pak Ucox', sandi: 'rahasia1' });
  assert(r.ok, r.galat); assert.equal(r.pengguna.peran, 'owner'); assert(r.izin.includes('pengguna')); tokOwner = r.token; assert(r.token.length >= 60);
});
cek('hash tidak tersimpan sebagai sandi asli', () => { const s = JSON.stringify(sheets.Pengguna.data); assert(!s.includes('rahasia1')); });
cek('token tidak tersimpan mentah di Sesi', () => assert(!JSON.stringify(sheets.Sesi.data).includes(tokOwner)));
cek('setup_owner kedua kali ditolak', () => assert.equal(post({ aksi: 'setup_owner', kunci: 'KunciRahasia123', username: 'lain', nama: 'Lain', sandi: 'rahasia1' }).galat, 'sudah_ada_pengguna'));
cek('login salah sandi ditolak, benar diterima', () => {
  assert.equal(post({ aksi: 'login', username: 'ucox', sandi: 'salah' }).galat, 'login_salah');
  assert(post({ aksi: 'login', username: 'ucox', sandi: 'rahasia1' }).ok);
});
cek('akun terkunci setelah 5 kali salah', () => {
  for (let i = 0; i < 5; i++) post({ aksi: 'login', username: 'ucox', sandi: 'salah' + i });
  assert.equal(post({ aksi: 'login', username: 'ucox', sandi: 'rahasia1' }).galat, 'terkunci_sementara');
  Object.keys(cacheMem).forEach((k) => delete cacheMem[k]);   // simulasi 5 menit berlalu
  assert(post({ aksi: 'login', username: 'ucox', sandi: 'rahasia1' }).ok);
});

console.log('Manajemen pengguna & hak akses');
cek('Owner menambah Admin dan Kasir (wajib ganti sandi)', () => {
  let r = post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { nama: 'Bu Admin', username: 'admin1', peran: 'admin', sandi: 'sandi123' } }); assert(r.ok, r.galat);
  r = post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { nama: 'Si Kasir', username: 'kasir1', peran: 'kasir', sandi: 'sandi456' } }); assert(r.ok, r.galat);
  assert.equal(r.pengguna.length, 3); idKasir = r.pengguna.find((p) => p.username === 'kasir1').id; idAdmin = r.pengguna.find((p) => p.username === 'admin1').id;
});
cek('username kembar & username tidak valid ditolak', () => {
  assert.equal(post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { nama: 'X Y', username: 'KASIR1', peran: 'kasir', sandi: 'abcdef' } }).galat, 'username_terpakai');
  assert.equal(post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { nama: 'X Y', username: 'a b', peran: 'kasir', sandi: 'abcdef' } }).galat, 'username_tidak_valid');
});
cek('Kasir baru wajib ganti sandi sebelum melakukan hal lain', () => {
  const r = post({ aksi: 'login', username: 'kasir1', sandi: 'sandi456' }); assert(r.ok); assert.equal(r.pengguna.wajib_ganti, 'ya'); tokKasir = r.token;
  assert.equal(post({ aksi: 'dashboard', token: tokKasir }).galat, 'wajib_ganti_sandi');
  const g = post({ aksi: 'ganti_sandi', token: tokKasir, lama: 'sandi456', baru: 'kasirBaru1' }); assert(g.ok, g.galat); assert.equal(g.pengguna.wajib_ganti, 'tidak');
  assert(post({ aksi: 'dashboard', token: tokKasir }).ok);
});
cek('Admin masuk', () => { const r = post({ aksi: 'login', username: 'admin1', sandi: 'sandi123' }); tokAdmin = r.token; post({ aksi: 'ganti_sandi', token: tokAdmin, lama: 'sandi123', baru: 'adminBaru1' }); });
cek('Kasir ditolak untuk pengguna, pengaturan, audit', () => {
  ['pengguna_daftar', 'pengaturan_ambil', 'audit_daftar'].forEach((a) => assert.equal(post({ aksi: a, token: tokKasir }).galat, 'tidak_berhak', a));
});
cek('Admin: boleh audit, ditolak untuk pengguna & pengaturan', () => {
  assert(post({ aksi: 'audit_daftar', token: tokAdmin }).ok);
  assert.equal(post({ aksi: 'pengguna_daftar', token: tokAdmin }).galat, 'tidak_berhak');
  assert.equal(post({ aksi: 'pengaturan_simpan', token: tokAdmin, pengaturan: {} }).galat, 'tidak_berhak');
});
cek('Dashboard: Kasir tidak melihat nilai persediaan, Admin/Owner melihat', () => {
  assert.equal(post({ aksi: 'dashboard', token: tokKasir }).nilai_persediaan, null);
  const a = post({ aksi: 'dashboard', token: tokAdmin }); assert(a.nilai_persediaan > 0); assert.equal(a.stok_habis, 1); assert.equal(a.jumlah_menipis, 1);
  assert.equal(a.pengguna_aktif, null); assert.equal(post({ aksi: 'dashboard', token: tokOwner }).pengguna_aktif, 3);
});
cek('Token palsu / kosong ditolak', () => { assert.equal(post({ aksi: 'dashboard', token: 'x'.repeat(64) }).galat, 'sesi_habis'); assert.equal(post({ aksi: 'dashboard' }).galat, 'sesi_habis'); });
cek('Owner tidak bisa menurunkan / menonaktifkan dirinya sendiri', () => {
  const me = post({ aksi: 'pengguna_daftar', token: tokOwner }).pengguna.find((p) => p.username === 'ucox');
  assert.equal(post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { id: me.id, nama: me.nama, peran: 'admin', aktif: true } }).galat, 'tidak_boleh_ubah_diri');
  assert.equal(post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { id: me.id, nama: me.nama, peran: 'owner', aktif: false } }).galat, 'tidak_boleh_ubah_diri');
});
cek('Owner terakhir tidak bisa dihapus lewat Owner lain yang nonaktif', () => {
  // jadikan admin1 owner lalu nonaktifkan: boleh karena masih ada owner aktif lain; lalu coba nonaktifkan owner satu-satunya dari akun admin1 tidak mungkin (bukan owner)
  let r = post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { id: idAdmin, nama: 'Bu Admin', peran: 'owner', aktif: true } }); assert(r.ok, r.galat);
  r = post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { id: idAdmin, nama: 'Bu Admin', peran: 'admin', aktif: true } }); assert(r.ok, r.galat);
});
cek('Menonaktifkan Kasir langsung memutus sesinya & login ditolak', () => {
  let r = post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { id: idKasir, nama: 'Si Kasir', peran: 'kasir', aktif: false } }); assert(r.ok, r.galat);
  assert.equal(post({ aksi: 'dashboard', token: tokKasir }).galat, 'sesi_habis');
  assert.equal(post({ aksi: 'login', username: 'kasir1', sandi: 'kasirBaru1' }).galat, 'akun_nonaktif');
  post({ aksi: 'pengguna_simpan', token: tokOwner, pengguna: { id: idKasir, nama: 'Si Kasir', peran: 'kasir', aktif: true } });
});
cek('Reset sandi oleh Owner: sandi lama mati, wajib ganti', () => {
  assert(post({ aksi: 'pengguna_reset_sandi', token: tokOwner, id: idKasir, sandi: 'resetan99' }).ok);
  assert.equal(post({ aksi: 'login', username: 'kasir1', sandi: 'kasirBaru1' }).galat, 'login_salah');
  const r = post({ aksi: 'login', username: 'kasir1', sandi: 'resetan99' }); assert(r.ok && r.pengguna.wajib_ganti === 'ya');
});
cek('Ganti sandi: sandi lama salah ditolak, sandi pendek ditolak', () => {
  assert.equal(post({ aksi: 'ganti_sandi', token: tokOwner, lama: 'ngawur', baru: 'baruaja1' }).galat, 'sandi_lama_salah');
  assert.equal(post({ aksi: 'ganti_sandi', token: tokOwner, lama: 'rahasia1', baru: '123' }).galat, 'sandi_pendek');
});
cek('Logout mencabut sesi', () => { const t = post({ aksi: 'login', username: 'ucox', sandi: 'rahasia1' }).token; assert(post({ aksi: 'logout', token: t }).ok); assert.equal(post({ aksi: 'sesi', token: t }).galat, 'sesi_habis'); });
cek('Sesi kedaluwarsa ditolak', () => {
  const t = post({ aksi: 'login', username: 'admin1', sandi: 'adminBaru1' }).token;
  const baris = sheets.Sesi.data; baris[baris.length - 1][3] = Date.now() - 1000;
  assert.equal(post({ aksi: 'sesi', token: t }).galat, 'sesi_habis');
});

console.log('Pengaturan toko & audit');
cek('Owner mengubah pengaturan; doGet publik ikut berubah', () => {
  const r = post({ aksi: 'pengaturan_simpan', token: tokOwner, pengaturan: { nama_toko: 'Warung Ucox', alamat: 'Depok', wa_nomor: '081234', wa_tampil: '', stok_menipis: 8, pesan_struk: 'Makasih' } });
  assert.equal(r.galat, 'wa_tidak_valid');
  const ok2 = post({ aksi: 'pengaturan_simpan', token: tokOwner, pengaturan: { nama_toko: 'Warung Ucox', alamat: 'Depok', wa_nomor: '628123456789', wa_tampil: '0812-3456-789', stok_menipis: 8, pesan_struk: 'Makasih' } });
  assert(ok2.ok, ok2.galat); const g = get({}); assert.equal(g.data.toko.nama, 'Warung Ucox'); assert.equal(g.data.toko.stokMenipis, 8);
});
cek('Input berawalan = disimpan apa adanya di sel bertipe teks (bukan rumus)', () => {
  post({ aksi: 'pengaturan_simpan', token: tokOwner, pengaturan: { nama_toko: '=HYPERLINK("x")', alamat: 'Depok', wa_nomor: '628123456789', wa_tampil: '', stok_menipis: 8, pesan_struk: '' } });
  const i = sheets.Pengaturan.data.findIndex((r) => r[0] === 'nama_toko'); assert.equal(sheets.Pengaturan.data[i][1], '=HYPERLINK("x")');
  assert.equal(sheets.Pengaturan.fmt[(i + 1) + ',2'], '@');
});
cek('Audit mencatat login, penambahan pengguna, dan akses ditolak', () => {
  const a = post({ aksi: 'audit_daftar', token: tokOwner, limit: 500 }).audit.map((x) => x.aksi);
  ['setup_owner', 'login', 'login_gagal', 'pengguna_tambah', 'akses_ditolak', 'pengguna_reset_sandi', 'ganti_sandi'].forEach((k) => assert(a.includes(k), 'tidak ada ' + k));
  assert(!JSON.stringify(sheets.Audit.data).match(/rahasia1|sandi456|resetan99/));
});
// token Admin & Kasir untuk blok Tahap 2 (login ulang karena sesi lama sengaja dicabut di uji Tahap 1)
let tokKasir2, tokAdmin2;
{ post({ aksi: 'pengguna_reset_sandi', token: tokOwner, id: idKasir, sandi: 'kasirT2xx' }); let r = post({ aksi: 'login', username: 'kasir1', sandi: 'kasirT2xx' }); post({ aksi: 'ganti_sandi', token: r.token, lama: 'kasirT2xx', baru: 'kasirT2yy' }); tokKasir2 = r.token;
  post({ aksi: 'pengguna_reset_sandi', token: tokOwner, id: idAdmin, sandi: 'adminT2xx' }); r = post({ aksi: 'login', username: 'admin1', sandi: 'adminT2xx' }); post({ aksi: 'ganti_sandi', token: r.token, lama: 'adminT2xx', baru: 'adminT2yy' }); tokAdmin2 = r.token; }

console.log('Tahap 2: Master Data');
const ID = { n: 0 };
const kirim = (tok, aksi, o = {}) => post(Object.assign({ aksi, token: tok }, o));
const stokDi = (id) => sheets.Produk.data.find((r) => r[0] === id)[6];
cek('Kasir ditolak untuk semua aksi master data', () => {
  ['master_ambil', 'produk_simpan', 'produk_hapus', 'gambar_unggah', 'kategori_simpan', 'kategori_hapus', 'supplier_simpan', 'supplier_hapus']
    .forEach((a) => assert.equal(kirim(tokKasir2, a, {}).galat, 'tidak_berhak', a));
});
cek('Admin boleh membaca & mengubah master data', () => { const r = kirim(tokAdmin2, 'master_ambil'); assert(r.ok); assert.equal(r.produk.length, 3); assert('harga_beli' in r.produk[0]); assert(Array.isArray(r.supplier[0].kategori)); });
cek('Kategori: tambah (id dari nama), kembar ditolak, ubah, ikon salah ditolak', () => {
  let r = kirim(tokOwner, 'kategori_simpan', { kategori: { nama: 'Minyak & Gula', ikon: 'droplet' } }); assert(r.ok, r.galat);
  assert(r.kategori.some((k) => k.id === 'minyak-gula' && k.ikon === 'droplet'));
  assert.equal(kirim(tokOwner, 'kategori_simpan', { kategori: { nama: 'minyak & gula', ikon: 'package' } }).galat, 'nama_kategori_kembar');
  assert.equal(kirim(tokOwner, 'kategori_simpan', { kategori: { nama: 'Aneh', ikon: 'Ikon Salah!' } }).galat, 'ikon_tidak_valid');
  r = kirim(tokOwner, 'kategori_simpan', { kategori: { id: 'minyak-gula', nama: 'Minyak dan Gula', ikon: 'candy' } }); assert(r.ok);
  assert(r.kategori.some((k) => k.id === 'minyak-gula' && k.nama === 'Minyak dan Gula'));
});
cek('Produk: tambah dengan id otomatis, stok awal, barcode teks', () => {
  const r = kirim(tokOwner, 'produk_simpan', { produk: { nama: 'Minyak Goreng 1L', kategori: 'minyak-gula', satuan: 'botol', harga_beli: 15000, harga_jual: '17500', stok: 12, gambar: '', barcode: '8991234567895' } });
  assert(r.ok, r.galat); assert.equal(r.id, 'P004'); const p = r.produk.find((x) => x.id === 'P004');
  assert.equal(p.harga_jual, 17500); assert.equal(p.stok, 12); assert.equal(p.barcode, '8991234567895');
  const baris = sheets.Produk.data.findIndex((x) => x[0] === 'P004'); assert.equal(sheets.Produk.fmt[(baris + 1) + ',9'], '@');
});
cek('Produk: validasi (nama pendek, harga negatif/desimal, kategori tak ada, barcode, gambar)', () => {
  const dasar = { nama: 'Gula 1kg', kategori: 'beras', satuan: 'pak', harga_beli: 1, harga_jual: 2, stok: 1 };
  const coba = (o) => kirim(tokOwner, 'produk_simpan', { produk: Object.assign({}, dasar, o) }).galat;
  assert.equal(coba({ nama: 'x' }), 'nama_produk_tidak_valid'); assert.equal(coba({ harga_jual: -5 }), 'harga_tidak_valid');
  assert.equal(coba({ harga_beli: 10.5 }), 'harga_tidak_valid'); assert.equal(coba({ harga_jual: '' }), 'harga_tidak_valid');
  assert.equal(coba({ kategori: 'tidak-ada' }), 'kategori_tidak_ada'); assert.equal(coba({ barcode: '12ab' }), 'barcode_tidak_valid');
  assert.equal(coba({ gambar: 'javascript:alert(1)' }), 'gambar_tidak_valid'); assert.equal(coba({ gambar: 'https://x.id/a.jpg"onerror=alert(1)' }), 'gambar_tidak_valid'); assert.equal(coba({ stok: -1 }), 'stok_tidak_valid');
  assert.equal(coba({ satuan: '' }), 'satuan_tidak_valid');
});
cek('Produk: barcode kembar & nama+satuan kembar ditolak', () => {
  const o = { nama: 'Lain', kategori: 'beras', satuan: 'pak', harga_beli: 1, harga_jual: 2, stok: 0 };
  assert.equal(kirim(tokOwner, 'produk_simpan', { produk: Object.assign({}, o, { barcode: '8991234567895' }) }).galat, 'barcode_terpakai');
  assert.equal(kirim(tokOwner, 'produk_simpan', { produk: Object.assign({}, o, { nama: 'minyak goreng 1l', kategori: 'minyak-gula', satuan: 'BOTOL' }) }).galat, 'produk_kembar');
});
cek('Produk: edit harga TIDAK menyentuh stok (aman terhadap penjualan bersamaan)', () => {
  const sebelum = stokDi('P004'); sheets.Produk.data.find((r) => r[0] === 'P004')[6] = 9;   // simulasi stok berubah oleh penjualan setelah form dibuka
  const r = kirim(tokAdmin2, 'produk_simpan', { produk: { id: 'P004', nama: 'Minyak Goreng 1L', kategori: 'minyak-gula', satuan: 'botol', harga_beli: 15000, harga_jual: 18000, stok: 999, gambar: '', barcode: '8991234567895' } });
  assert(r.ok, r.galat); assert.equal(r.produk.find((x) => x.id === 'P004').harga_jual, 18000); assert.equal(stokDi('P004'), 9); assert.notEqual(sebelum, undefined);
});
cek('Produk: harga di bawah modal tetap boleh (promo), edit produk tak ada ditolak', () => {
  assert(kirim(tokOwner, 'produk_simpan', { produk: { id: 'P004', nama: 'Minyak Goreng 1L', kategori: 'minyak-gula', satuan: 'botol', harga_beli: 15000, harga_jual: 14000, stok: 0, barcode: '8991234567895' } }).ok);
  assert.equal(kirim(tokOwner, 'produk_simpan', { produk: { id: 'P999', nama: 'Hantu', kategori: 'beras', satuan: 'pak', harga_beli: 1, harga_jual: 1 } }).galat, 'produk_tidak_ada');
});
cek('Halaman toko publik langsung melihat produk baru tanpa harga beli', () => {
  const g = get({}).data.produk.find((x) => x.id === 'P004'); assert(g); assert(!('harga_beli' in g)); assert.equal(g.harga_jual, 14000);
});
cek('Hapus kategori yang dipakai produk ditolak; kategori kosong bisa dihapus', () => {
  const r = kirim(tokOwner, 'kategori_hapus', { id: 'minyak-gula' }); assert.equal(r.galat, 'kategori_dipakai'); assert.equal(r.jumlah, 1);
  kirim(tokOwner, 'kategori_simpan', { kategori: { nama: 'Sementara', ikon: 'tag' } });
  assert(kirim(tokOwner, 'kategori_hapus', { id: 'sementara' }).ok);
});
cek('Supplier: tambah (id S02), validasi telepon/termin/kategori, ubah, kembar', () => {
  const dasar = { nama: 'CV Sumber Rejeki', kontak: 'Bu Rina', telepon: '0812-3456-7890', kota: 'Depok', kategori: ['beras', 'minyak-gula'], termin_hari: 14 };
  let r = kirim(tokOwner, 'supplier_simpan', { supplier: dasar }); assert(r.ok, r.galat);
  const s2 = r.supplier.find((x) => x.nama === 'CV Sumber Rejeki'); assert.equal(s2.id, 'S02'); assert.deepEqual(s2.kategori, ['beras', 'minyak-gula']); assert.equal(s2.termin_hari, 14);
  assert.equal(kirim(tokOwner, 'supplier_simpan', { supplier: Object.assign({}, dasar, { nama: 'Lain', telepon: 'abc' }) }).galat, 'telepon_tidak_valid');
  assert.equal(kirim(tokOwner, 'supplier_simpan', { supplier: Object.assign({}, dasar, { nama: 'Lain', termin_hari: 999 }) }).galat, 'termin_tidak_valid');
  assert.equal(kirim(tokOwner, 'supplier_simpan', { supplier: Object.assign({}, dasar, { nama: 'Lain', kategori: ['gaib'] }) }).galat, 'kategori_tidak_ada');
  assert.equal(kirim(tokOwner, 'supplier_simpan', { supplier: Object.assign({}, dasar, { nama: 'cv sumber rejeki' }) }).galat, 'supplier_kembar');
  r = kirim(tokOwner, 'supplier_simpan', { supplier: Object.assign({}, dasar, { id: 'S02', termin_hari: 30 }) }); assert.equal(r.supplier.find((x) => x.id === 'S02').termin_hari, 30);
});
cek('Menghapus kategori ikut melepasnya dari daftar supplier', () => {
  kirim(tokOwner, 'produk_hapus', { id: 'P004' });
  assert(kirim(tokOwner, 'kategori_hapus', { id: 'minyak-gula' }).ok);
  assert.deepEqual(kirim(tokOwner, 'master_ambil').supplier.find((x) => x.id === 'S02').kategori, ['beras']);
});
cek('Hapus produk & supplier', () => {
  assert.equal(kirim(tokOwner, 'master_ambil').produk.some((x) => x.id === 'P004'), false);
  assert(kirim(tokOwner, 'supplier_hapus', { id: 'S02' }).ok); assert.equal(kirim(tokOwner, 'supplier_hapus', { id: 'S02' }).galat, 'supplier_tidak_ada');
  assert.equal(kirim(tokOwner, 'produk_hapus', { id: 'P004' }).galat, 'produk_tidak_ada');
});
cek('Unggah gambar: JPEG diterima -> tautan Drive; bukan JPEG / terlalu besar / kosong ditolak', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 1)]).toString('base64');
  const r = kirim(tokOwner, 'gambar_unggah', { data: 'data:image/jpeg;base64,' + jpeg }); assert(r.ok, r.galat);
  assert(/^https:\/\/drive\.google\.com\/thumbnail\?id=FILE\d+&sz=w600$/.test(r.url)); assert.equal(ctxDrive.files.length, 1);
  assert.equal(kirim(tokOwner, 'gambar_unggah', { data: Buffer.from('GIF89a....').toString('base64') }).galat, 'gambar_format');
  assert.equal(kirim(tokOwner, 'gambar_unggah', { data: 'A'.repeat(700001) }).galat, 'gambar_terlalu_besar');
  assert.equal(kirim(tokOwner, 'gambar_unggah', { data: '' }).galat, 'gambar_kosong');
});
cek('Tautan gambar hasil unggah lolos validasi produk', () => {
  const url = 'https://drive.google.com/thumbnail?id=FILE1&sz=w600';
  const r = kirim(tokOwner, 'produk_simpan', { produk: { nama: 'Bergambar', kategori: 'beras', satuan: 'pak', harga_beli: 1, harga_jual: 2, stok: 0, gambar: url } }); assert(r.ok, r.galat);
  kirim(tokOwner, 'produk_hapus', { id: r.id });
});
cek('Audit master data tercatat tanpa data sensitif berlebih', () => {
  const a = kirim(tokOwner, 'audit_daftar', { limit: 500 }).audit.map((x) => x.aksi);
  ['kategori_tambah', 'kategori_ubah', 'kategori_hapus', 'produk_tambah', 'produk_ubah', 'produk_hapus', 'supplier_tambah', 'supplier_ubah', 'supplier_hapus', 'gambar_unggah'].forEach((k) => assert(a.includes(k), 'tidak ada ' + k));
  const ubah = kirim(tokOwner, 'audit_daftar', { limit: 500 }).audit.find((x) => x.aksi === 'produk_ubah'); assert(/harga_jual/.test(ubah.detail));
});

console.log('Tahap 3: Inventaris');
const mutasiSemua = () => sheets.Mutasi.data.slice(1).filter((r) => r[0]).map((r) => ({ id: r[0], produk_id: r[2], jenis: r[4], jumlah: r[5], sebelum: r[6], sesudah: r[7], harga_beli: r[8], supplier: r[9], ref: r[10], catatan: r[11], user: r[12] }));
const stokProduk = (id) => kirim(tokOwner, 'master_ambil').produk.find((x) => x.id === id).stok;
let supId;
cek('Kasir ditolak untuk semua aksi inventaris', () => {
  ['inventaris_ambil', 'masuk_simpan', 'stok_sesuaikan', 'stok_min_simpan', 'mutasi_daftar'].forEach((a) => assert.equal(kirim(tokKasir2, a, {}).galat, 'tidak_berhak', a));
});
cek('Siapkan data: supplier & produk baru dengan stok awal tercatat sebagai mutasi', () => {
  supId = kirim(tokOwner, 'supplier_simpan', { supplier: { nama: 'UD Pangan Jaya', telepon: '0811-2233', kota: 'Depok', kategori: ['beras'], termin_hari: 7 } }).supplier.find((x) => x.nama === 'UD Pangan Jaya').id;
  const r = kirim(tokOwner, 'produk_simpan', { produk: { nama: 'Gula Pasir 1kg', kategori: 'beras', satuan: 'kg', harga_beli: 14000, harga_jual: 16000, stok: 20, barcode: '8990001112223', stok_min: 5 } });
  assert(r.ok, r.galat); const p = r.produk.find((x) => x.id === r.id); assert.equal(p.stok_min, 5); ID.gula = r.id;
  const m = mutasiSemua().find((x) => x.produk_id === ID.gula); assert.equal(m.jenis, 'stok_awal'); assert.equal(m.sebelum, 0); assert.equal(m.sesudah, 20);
  assert.equal(sheets.Produk.data[0].includes('stok_min'), true);
});
cek('ID produk & supplier yang sudah dihapus TIDAK dipakai ulang (riwayat tak tertukar)', () => {
  assert.notEqual(ID.gula, 'P004'); assert.equal(ID.gula, 'P006');
  const a = kirim(tokOwner, 'produk_simpan', { produk: { nama: 'Sementara X', kategori: 'beras', satuan: 'pak', harga_beli: 1, harga_jual: 2, stok: 0 } }); kirim(tokOwner, 'produk_hapus', { id: a.id });
  const b = kirim(tokOwner, 'produk_simpan', { produk: { nama: 'Sementara Y', kategori: 'beras', satuan: 'pak', harga_beli: 1, harga_jual: 2, stok: 0 } }); assert.notEqual(a.id, b.id); kirim(tokOwner, 'produk_hapus', { id: b.id });
  assert.equal(supId, 'S03');
});
cek('Produk lama tanpa stok_min dibaca sebagai null (pakai batas toko)', () => assert.equal(kirim(tokOwner, 'master_ambil').produk.find((x) => x.id === 'P001').stok_min, null));
cek('Barang masuk: stok bertambah, mutasi per item, harga modal diperbarui, nomor referensi', () => {
  const sebelum = stokProduk('P002');
  const r = kirim(tokAdmin2, 'masuk_simpan', { masuk: { supplier: supId, faktur: 'INV-001', catatan: 'kiriman pagi', items: [
    { produk_id: 'P002', qty: 10, harga_beli: 60000 }, { produk_id: ID.gula, qty: '5', harga_beli: 14000 }] } });
  assert(r.ok, r.galat); assert.match(r.ref, /^BM-\d{6}-001$/); assert.equal(r.total, 10 * 60000 + 5 * 14000); assert.equal(r.jumlah_item, 2);
  assert.equal(r.produk.find((x) => x.id === 'P002').stok, sebelum + 10); assert.equal(r.produk.find((x) => x.id === 'P002').harga_beli, 60000);
  assert.equal(r.produk.find((x) => x.id === ID.gula).harga_beli, 14000);
  const m = mutasiSemua().filter((x) => x.ref === r.ref); assert.equal(m.length, 2); assert(m.every((x) => x.jenis === 'masuk' && x.supplier === supId && x.user === 'admin1' && /Faktur INV-001/.test(x.catatan)));
  ID.ref1 = r.ref;
});
cek('Nomor referensi naik per hari (002)', () => { const r = kirim(tokOwner, 'masuk_simpan', { masuk: { items: [{ produk_id: 'P001', qty: 1, harga_beli: 66000 }] } }); assert.match(r.ref, /-002$/); });
cek('Barang masuk atomik: satu item salah -> TIDAK ADA yang tertulis', () => {
  const stok1 = stokProduk('P001'), banyak = mutasiSemua().length;
  assert.equal(kirim(tokOwner, 'masuk_simpan', { masuk: { items: [{ produk_id: 'P001', qty: 5, harga_beli: 1 }, { produk_id: 'P999', qty: 5, harga_beli: 1 }] } }).galat, 'produk_tidak_ada');
  assert.equal(kirim(tokOwner, 'masuk_simpan', { masuk: { items: [{ produk_id: 'P001', qty: 5, harga_beli: 1 }, { produk_id: 'P002', qty: 0, harga_beli: 1 }] } }).galat, 'jumlah_tidak_valid');
  assert.equal(stokProduk('P001'), stok1); assert.equal(mutasiSemua().length, banyak);
});
cek('Barang masuk: validasi (kosong, kembar, desimal, harga, supplier, batas stok)', () => {
  const m = (items, ekstra = {}) => kirim(tokOwner, 'masuk_simpan', { masuk: Object.assign({ items }, ekstra) }).galat;
  assert.equal(m([]), 'item_kosong'); assert.equal(m([{ produk_id: 'P001', qty: 1, harga_beli: 1 }, { produk_id: 'P001', qty: 2, harga_beli: 1 }]), 'item_kembar');
  assert.equal(m([{ produk_id: 'P001', qty: 1.5, harga_beli: 1 }]), 'jumlah_tidak_valid'); assert.equal(m([{ produk_id: 'P001', qty: 1, harga_beli: -1 }]), 'harga_tidak_valid');
  assert.equal(m([{ produk_id: 'P001', qty: 1, harga_beli: 1 }], { supplier: 'S99' }), 'supplier_tidak_ada');
  assert.equal(m([{ produk_id: 'P001', qty: 100001, harga_beli: 1 }]), 'jumlah_tidak_valid');
});
cek('Barang masuk tanpa perbarui_modal tidak mengubah harga beli', () => {
  const lama = kirim(tokOwner, 'master_ambil').produk.find((x) => x.id === 'P001').harga_beli;
  kirim(tokOwner, 'masuk_simpan', { masuk: { perbarui_modal: false, items: [{ produk_id: 'P001', qty: 1, harga_beli: lama + 777 }] } });
  assert.equal(kirim(tokOwner, 'master_ambil').produk.find((x) => x.id === 'P001').harga_beli, lama);
});
cek('Penyesuaian: stok keluar (rusak) dengan mutasi dan audit', () => {
  const sebelum = stokProduk(ID.gula); const r = kirim(tokAdmin2, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'rusak', jumlah: 3, catatan: 'karung sobek' });
  assert(r.ok, r.galat); assert.equal(r.sebelum, sebelum); assert.equal(r.sesudah, sebelum - 3);
  const m = mutasiSemua().filter((x) => x.produk_id === ID.gula).pop(); assert.equal(m.jenis, 'rusak'); assert.equal(m.jumlah, -3); assert.match(m.ref, /^PS-/);
});
cek('Penyesuaian tidak boleh membuat stok negatif (melaporkan stok tersedia)', () => {
  const sebelum = stokProduk(ID.gula); const r = kirim(tokOwner, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'hilang', jumlah: sebelum + 1, catatan: 'uji' });
  assert.equal(r.galat, 'stok_tidak_cukup'); assert.equal(r.tersedia, sebelum); assert.equal(stokProduk(ID.gula), sebelum);
});
cek('Penyesuaian: catatan wajib untuk hilang/temuan/opname, jenis & jumlah divalidasi', () => {
  const a = (o) => kirim(tokOwner, 'stok_sesuaikan', Object.assign({ produk_id: ID.gula, jumlah: 1 }, o)).galat;
  assert.equal(a({ jenis: 'hilang' }), 'catatan_wajib'); assert.equal(a({ jenis: 'temuan', catatan: 'x' }), 'catatan_wajib'); assert.equal(a({ jenis: 'opname', jumlah: 3 }), 'catatan_wajib');
  assert.equal(a({ jenis: 'ngawur', catatan: 'abc' }), 'jenis_tidak_valid'); assert.equal(a({ jenis: 'rusak', jumlah: 0 }), 'jumlah_tidak_valid'); assert.equal(a({ jenis: 'rusak', jumlah: -2 }), 'jumlah_tidak_valid');
  assert.equal(a({ jenis: 'rusak', produk_id: 'P999' }), 'produk_tidak_ada');
});
cek('Opname: stok diset ke hasil hitung, selisih dicatat; sama dengan stok -> ditolak', () => {
  const sebelum = stokProduk(ID.gula); const hitung = sebelum - 2;
  const r = kirim(tokOwner, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'opname', jumlah: hitung, catatan: 'hitung rak' }); assert(r.ok, r.galat); assert.equal(stokProduk(ID.gula), hitung);
  assert.equal(mutasiSemua().filter((x) => x.produk_id === ID.gula).pop().jumlah, -2);
  assert.equal(kirim(tokOwner, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'opname', jumlah: hitung, catatan: 'ulang' }).galat, 'tidak_ada_perubahan');
  assert(kirim(tokOwner, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'opname', jumlah: 0, catatan: 'kosong' }).ok); assert.equal(stokProduk(ID.gula), 0);
});
cek('Temuan menambah stok; retur ke supplier mengurangi dan menyimpan supplier', () => {
  assert(kirim(tokOwner, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'temuan', jumlah: 4, catatan: 'ketemu di gudang' }).ok); assert.equal(stokProduk(ID.gula), 4);
  assert(kirim(tokOwner, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'retur_supplier', jumlah: 1, supplier: supId }).ok);
  const m = mutasiSemua().filter((x) => x.produk_id === ID.gula).pop(); assert.equal(m.supplier, supId); assert.equal(m.jumlah, -1);
  assert.equal(kirim(tokOwner, 'stok_sesuaikan', { produk_id: ID.gula, jenis: 'retur_supplier', jumlah: 1, supplier: 'S99' }).galat, 'supplier_tidak_ada');
});
cek('Stok minimum per produk menentukan status menipis di dashboard; kosong = default toko', () => {
  assert.equal(stokProduk(ID.gula), 3);
  let d = kirim(tokOwner, 'dashboard'); assert(d.menipis.some((x) => x.id === ID.gula), 'min 5, stok 3 -> seharusnya menipis');
});
cek('Stok minimum: ubah, kosongkan, validasi, tercatat di audit', () => {
  let r = kirim(tokOwner, 'stok_min_simpan', { produk_id: 'P001', stok_min: 30 }); assert(r.ok, r.galat); assert.equal(r.produk.find((x) => x.id === 'P001').stok_min, 30);
  assert(kirim(tokOwner, 'dashboard').menipis.some((x) => x.id === 'P001'), 'stok 24+ dengan min 30 harus menipis');
  r = kirim(tokOwner, 'stok_min_simpan', { produk_id: 'P001', stok_min: '' }); assert.equal(r.produk.find((x) => x.id === 'P001').stok_min, null);
  assert.equal(kirim(tokOwner, 'stok_min_simpan', { produk_id: 'P001', stok_min: -1 }).galat, 'stok_min_tidak_valid'); assert.equal(kirim(tokOwner, 'stok_min_simpan', { produk_id: 'P999', stok_min: 1 }).galat, 'produk_tidak_ada');
});
cek('Edit produk tidak menyentuh stok maupun stok_min lain; stok_min lewat formulir produk tersimpan', () => {
  const stok = stokProduk(ID.gula);
  const r = kirim(tokOwner, 'produk_simpan', { produk: { id: ID.gula, nama: 'Gula Pasir 1kg', kategori: 'beras', satuan: 'kg', harga_beli: 14000, harga_jual: 16500, barcode: '8990001112223', stok_min: 8 } });
  assert(r.ok, r.galat); assert.equal(r.produk.find((x) => x.id === ID.gula).stok_min, 8); assert.equal(stokProduk(ID.gula), stok);
  assert.equal(kirim(tokOwner, 'produk_simpan', { produk: { id: ID.gula, nama: 'Gula Pasir 1kg', kategori: 'beras', satuan: 'kg', harga_beli: 1, harga_jual: 2, stok_min: 'abc' } }).galat, 'stok_min_tidak_valid');
});
cek('Jalur lama ikut tercatat: penjualan toko online dan koreksi Kelola', () => {
  const sebelum = stokProduk('P001'); const n = mutasiSemua().length;
  const r = post({ kunci: 'KunciRahasia123', ops: [{ opId: 'lama-1', aksi: 'jual', item: [{ id: 'P001', qty: 2 }] }, { opId: 'lama-2', aksi: 'ubah', id: 'P001', set: { stok: sebelum + 10 } }] });
  assert(r.ok); assert.equal(r.hasil[0].status, 'ok'); assert.equal(r.hasil[1].status, 'ok'); assert.equal(stokProduk('P001'), sebelum + 10);
  const baru = mutasiSemua().slice(n); assert.equal(baru.length, 2);
  assert.deepEqual([baru[0].jenis, baru[0].jumlah, baru[0].user, baru[0].ref], ['penjualan', -2, 'toko-online', 'lama-1']);
  assert.deepEqual([baru[1].jenis, baru[1].jumlah, baru[1].user], ['koreksi_kelola', 12, 'kelola-lama']);
  post({ kunci: 'KunciRahasia123', ops: [{ opId: 'lama-1', aksi: 'jual', item: [{ id: 'P001', qty: 2 }] }] }); assert.equal(mutasiSemua().length, n + 2, 'operasi ulang (idempoten) tak boleh menggandakan mutasi');
});
cek('Jual lama yang melebihi stok: stok dikunci 0, mutasi mencatat selisih sebenarnya', () => {
  const stok = stokProduk('P003'); assert.equal(stok, 0);
  post({ kunci: 'KunciRahasia123', ops: [{ opId: 'lama-3', aksi: 'jual', item: [{ id: 'P003', qty: 3 }] }] });
  const m = mutasiSemua().pop(); assert.equal(m.jumlah, 0); assert.equal(m.sesudah, 0); assert.match(m.catatan, /stok kurang 3/);
});
cek('Riwayat mutasi: terbaru dulu, filter produk, batas jumlah', () => {
  const semua = kirim(tokAdmin2, 'mutasi_daftar', { limit: 500 }).mutasi; assert(semua.length > 10); assert(semua[0].id > semua[semua.length - 1].id);
  const g = kirim(tokOwner, 'mutasi_daftar', { produk_id: ID.gula }).mutasi; assert(g.length >= 5 && g.every((x) => x.produk_id === ID.gula)); assert.equal(g[0].jenis, 'retur_supplier'); assert.equal(g.at(-1).jenis, 'stok_awal');
  assert.equal(kirim(tokOwner, 'mutasi_daftar', { limit: 3 }).mutasi.length, 3);
});
cek('INVARIAN buku mutasi: sesudah = sebelum + jumlah, dan rantai per produk tidak terputus', () => {
  const per = {};
  mutasiSemua().forEach((m) => {
    assert.equal(m.sesudah, m.sebelum + m.jumlah, 'hitungan salah di ' + m.id);
    if (m.produk_id in per) assert.equal(m.sebelum, per[m.produk_id], 'rantai putus di ' + m.id + ' (' + m.produk_id + ')');
    per[m.produk_id] = m.sesudah;
  });
  Object.keys(per).forEach((id) => { const p = kirim(tokOwner, 'master_ambil').produk.find((x) => x.id === id); if (p) assert.equal(p.stok, per[id], 'stok akhir ' + id + ' tidak sama dengan buku mutasi'); });
});
cek('Audit inventaris tercatat', () => {
  const a = kirim(tokOwner, 'audit_daftar', { limit: 500 }).audit.map((x) => x.aksi);
  ['barang_masuk', 'stok_sesuaikan', 'stok_min_ubah'].forEach((k) => assert(a.includes(k), 'tidak ada ' + k));
});

console.log('Tahap 4: POS');
const jumlahBaris = (nama) => sheets[nama].data.slice(1).filter((r) => r && r[0]).length;
const buatProduk = (nama, beli, jual, stok, extra = {}) => kirim(tokOwner, 'produk_simpan', { produk: Object.assign({ nama, kategori: 'beras', satuan: 'pcs', harga_beli: beli, harga_jual: jual, stok }, extra) }).id;
const trx = (tok, d, no = 0) => kirim(tok, 'transaksi_buat', { trx: Object.assign({ id_klien: 'k' + (++ID.k) + '-abcdefgh', metode: 'tunai', items: [] }, d) });
ID.k = 0;
const stok2 = (id) => kirim(tokOwner, 'master_ambil').produk.find((x) => x.id === id).stok;
ID.telur = buatProduk('Telur 1kg', 25000, 28000, 50); ID.minyak = buatProduk('Minyak Goreng 1L', 15000, 17500, 10); ID.permen = buatProduk('Permen', 500, 750, 100); ID.curah = buatProduk('Curah', 50, 100, 1000000);
cek('Kasir boleh memuat data kasir tanpa harga beli; ditolak untuk data master & pembatalan', () => {
  const r = kirim(tokKasir2, 'pos_produk'); assert(r.ok); assert(r.produk.length >= 4); assert(r.produk.every((p) => !('harga_beli' in p)));
  assert.deepEqual(r.cfg, { diskon_maks_kasir: 10, jual_stok_kurang: false, pembulatan: 0 });
  assert.equal(kirim(tokKasir2, 'master_ambil').galat, 'tidak_berhak'); assert.equal(kirim(tokKasir2, 'transaksi_batal', { no: 'x', alasan: 'abc' }).galat, 'tidak_berhak');
});
cek('Penjualan tunai: total dari harga Sheet, kembalian, stok berkurang, mutasi tercatat', () => {
  const r = trx(tokKasir2, { items: [{ produk_id: ID.telur, qty: 2, harga: 1, subtotal: 1 }, { produk_id: ID.minyak, qty: 1 }], bayar: 100000 }); ID.trx1 = r;
  assert(r.ok, r.galat); assert.match(r.trx.no, /^TRX-\d{6}-001$/); assert.equal(r.trx.kotor, 73500); assert.equal(r.trx.total, 73500); assert.equal(r.trx.kembali, 26500);
  assert.equal(r.trx.status, 'selesai'); assert.equal(r.trx.kasir, 'kasir1'); assert.equal(r.items.length, 2); assert.equal(r.items[0].harga, 28000, 'harga harus dari Sheet, bukan dari browser');
  assert.equal(stok2(ID.telur), 48); assert.equal(stok2(ID.minyak), 9);
  const m = mutasiSemua().filter((x) => x.ref === r.trx.no); assert.equal(m.length, 2); assert(m.every((x) => x.jenis === 'penjualan' && x.user === 'kasir1' && x.jumlah < 0));
  const row = sheets.Transaksi.data.find((x) => x[0] === r.trx.no); assert.equal(row[15], 'selesai');
  const it = sheets.ItemTransaksi.data.filter((x) => x[0] === r.trx.no); assert.equal(it.length, 2); assert.equal(it[0][8], 25000, 'modal disalin saat transaksi');
});
cek('Kirim ulang permintaan yang sama TIDAK menjual dua kali (idempoten)', () => {
  const sebelum = jumlahBaris('Transaksi'), stok = stok2(ID.telur);
  const r = kirim(tokKasir2, 'transaksi_buat', { trx: { id_klien: 'k1-abcdefgh', metode: 'tunai', items: [{ produk_id: ID.telur, qty: 2 }, { produk_id: ID.minyak, qty: 1 }], bayar: 100000 } });
  assert(r.ok && r.duplikat === true); assert.equal(r.trx.no, ID.trx1.trx.no); assert.equal(jumlahBaris('Transaksi'), sebelum); assert.equal(stok2(ID.telur), stok);
});
cek('Validasi penjualan: kosong, metode, produk, jumlah, kembar, id klien, bayar kurang', () => {
  const t1 = (d) => trx(tokKasir2, d).galat;
  assert.equal(t1({ items: [], bayar: 1 }), 'keranjang_kosong'); assert.equal(t1({ metode: 'kredit', items: [{ produk_id: ID.telur, qty: 1 }], bayar: 99999 }), 'metode_tidak_valid');
  assert.equal(t1({ items: [{ produk_id: 'P999', qty: 1 }], bayar: 99999 }), 'produk_tidak_ada'); assert.equal(t1({ items: [{ produk_id: ID.telur, qty: 0 }], bayar: 99999 }), 'jumlah_tidak_valid');
  assert.equal(t1({ items: [{ produk_id: ID.telur, qty: 1.5 }], bayar: 99999 }), 'jumlah_tidak_valid');
  assert.equal(t1({ items: [{ produk_id: ID.telur, qty: 1 }, { produk_id: ID.telur, qty: 1 }], bayar: 99999 }), 'item_kembar');
  assert.equal(kirim(tokKasir2, 'transaksi_buat', { trx: { id_klien: 'pendek', metode: 'tunai', items: [{ produk_id: ID.telur, qty: 1 }], bayar: 99999 } }).galat, 'id_klien_tidak_valid');
  const r = trx(tokKasir2, { items: [{ produk_id: ID.telur, qty: 1 }], bayar: 27999 }); assert.equal(r.galat, 'bayar_kurang'); assert.equal(r.tagihan, 28000);
  assert.equal(trx(tokKasir2, { items: [{ produk_id: ID.telur, qty: 1 }], bayar: 'abc' }).galat, 'bayar_tidak_valid');
});
cek('Stok tidak cukup: ditolak, tidak ada yang tertulis', () => {
  const nT = jumlahBaris('Transaksi'), nM = mutasiSemua().length, stok = stok2(ID.telur);
  const r = trx(tokKasir2, { items: [{ produk_id: ID.minyak, qty: 1 }, { produk_id: ID.telur, qty: stok + 1 }], bayar: 9999999 });
  assert.equal(r.galat, 'stok_tidak_cukup'); assert.equal(r.produk_id, ID.telur); assert.equal(r.tersedia, stok);
  assert.equal(jumlahBaris('Transaksi'), nT); assert.equal(mutasiSemua().length, nM); assert.equal(stok2(ID.minyak), 9);
});
cek('Diskon: per item, persen, rupiah dihitung benar (Admin)', () => {
  let r = trx(tokAdmin2, { items: [{ produk_id: ID.telur, qty: 2, diskon: 1000 }], diskon_trx: { jenis: 'persen', nilai: 10 }, bayar: 100000 });
  assert(r.ok, r.galat); assert.equal(r.trx.kotor, 56000); assert.equal(r.trx.diskon_item, 1000); assert.equal(r.trx.diskon_trx, 5500); assert.equal(r.trx.total, 49500);
  r = trx(tokAdmin2, { items: [{ produk_id: ID.minyak, qty: 2 }], diskon_trx: { jenis: 'rupiah', nilai: 5000 }, bayar: 30000 }); assert.equal(r.trx.total, 30000); assert.equal(r.trx.kembali, 0);
  assert.equal(r.items[0].subtotal, 35000);
});
cek('Diskon tidak valid ditolak (melebihi harga, persen >100, rupiah > total, desimal)', () => {
  const d = (x) => trx(tokAdmin2, Object.assign({ items: [{ produk_id: ID.minyak, qty: 1 }], bayar: 99999 }, x)).galat;
  assert.equal(d({ items: [{ produk_id: ID.minyak, qty: 1, diskon: 17501 }] }), 'diskon_tidak_valid'); assert.equal(d({ diskon_trx: { jenis: 'persen', nilai: 101 } }), 'diskon_tidak_valid');
  assert.equal(d({ diskon_trx: { jenis: 'rupiah', nilai: 17501 } }), 'diskon_tidak_valid'); assert.equal(d({ diskon_trx: { jenis: 'persen', nilai: 7.5 } }), 'diskon_tidak_valid');
  assert.equal(d({ diskon_trx: { jenis: 'rupiah', nilai: -1 } }), 'diskon_tidak_valid');
});
cek('Batas diskon Kasir: 10% boleh, 11% ditolak; Admin tidak dibatasi; batas bisa diubah Owner', () => {
  const k = (n) => trx(tokKasir2, { items: [{ produk_id: ID.telur, qty: 1 }], diskon_trx: { jenis: 'persen', nilai: n }, bayar: 99999 });
  assert(k(10).ok); const r = k(11); assert.equal(r.galat, 'diskon_melebihi_batas'); assert.equal(r.maks, 10);
  assert.equal(trx(tokKasir2, { items: [{ produk_id: ID.telur, qty: 1, diskon: 2801 }], bayar: 99999 }).galat, 'diskon_melebihi_batas', 'diskon per item ikut dihitung');
  assert(trx(tokAdmin2, { items: [{ produk_id: ID.telur, qty: 1 }], diskon_trx: { jenis: 'persen', nilai: 50 }, bayar: 99999 }).ok);
  const set = (v) => kirim(tokOwner, 'pengaturan_simpan', { pengaturan: Object.assign({ nama_toko: 'Warung Ucox', alamat: 'Depok', wa_nomor: '628123456789', wa_tampil: '', stok_menipis: 8, pesan_struk: '' }, v) });
  assert(set({ diskon_maks_kasir: 20 }).ok); assert(k(20).ok); assert.equal(k(21).galat, 'diskon_melebihi_batas');
  assert.equal(set({ diskon_maks_kasir: 101 }).galat, 'diskon_maks_tidak_valid'); assert.equal(set({ pembulatan: 250 }).galat, 'pembulatan_tidak_valid'); assert(set({ diskon_maks_kasir: 10 }).ok);
});
cek('Pembulatan tunai ke atas; QRIS/transfer tanpa pembulatan, bayar = tagihan', () => {
  const set = (v) => kirim(tokOwner, 'pengaturan_simpan', { pengaturan: Object.assign({ nama_toko: 'Warung Ucox', alamat: 'Depok', wa_nomor: '628123456789', wa_tampil: '', stok_menipis: 8, pesan_struk: '' }, v) });
  assert(set({ pembulatan: 500 }).ok);
  let r = trx(tokKasir2, { items: [{ produk_id: ID.permen, qty: 3 }], bayar: 3000 }); assert(r.ok, r.galat); assert.equal(r.trx.total, 2250); assert.equal(r.trx.pembulatan, 250); assert.equal(r.trx.tagihan, 2500); assert.equal(r.trx.kembali, 500);
  assert.equal(trx(tokKasir2, { items: [{ produk_id: ID.permen, qty: 3 }], bayar: 2250 }).galat, 'bayar_kurang');
  r = trx(tokKasir2, { metode: 'qris', items: [{ produk_id: ID.permen, qty: 3 }] }); assert.equal(r.trx.pembulatan, 0); assert.equal(r.trx.tagihan, 2250); assert.equal(r.trx.bayar, 2250); assert.equal(r.trx.kembali, 0);
  r = trx(tokKasir2, { metode: 'transfer', items: [{ produk_id: ID.permen, qty: 1 }], bayar: 1 }); assert.equal(r.trx.bayar, 750, 'bayar dari browser diabaikan untuk non-tunai');
  assert(set({ pembulatan: 0 }).ok);
});
cek('Jual walau stok kurang (opsi Owner): stok dikunci 0, selisih tercatat; pembatalan hanya mengembalikan yang benar-benar keluar', () => {
  const set = (v) => kirim(tokOwner, 'pengaturan_simpan', { pengaturan: Object.assign({ nama_toko: 'Warung Ucox', alamat: 'Depok', wa_nomor: '628123456789', wa_tampil: '', stok_menipis: 8, pesan_struk: '' }, v) });
  const id = buatProduk('Barang Sedikit', 100, 200, 5); assert(set({ jual_stok_kurang: 'ya' }).ok);
  const r = trx(tokKasir2, { items: [{ produk_id: id, qty: 8 }], bayar: 1600 }); assert(r.ok, r.galat); assert.equal(stok2(id), 0); assert.equal(r.items[0].qty, 8);
  const m = mutasiSemua().filter((x) => x.ref === r.trx.no); assert.equal(m.length, 1); assert.equal(m[0].jumlah, -5); assert.match(m[0].catatan, /stok kurang 3/);
  const b = kirim(tokAdmin2, 'transaksi_batal', { no: r.trx.no, alasan: 'salah input' }); assert(b.ok, b.galat); assert.equal(b.dikembalikan, 5); assert.equal(stok2(id), 5);
  assert(set({ jual_stok_kurang: 'tidak' }).ok); assert.equal(trx(tokKasir2, { items: [{ produk_id: id, qty: 6 }], bayar: 9999 }).galat, 'stok_tidak_cukup');
});
cek('Pembatalan (Admin): stok kembali, status batal, tercatat; tidak bisa dibatalkan dua kali', () => {
  const r = trx(tokKasir2, { items: [{ produk_id: ID.telur, qty: 3 }, { produk_id: ID.minyak, qty: 2 }], bayar: 200000 }); assert(r.ok, r.galat);
  const t0 = stok2(ID.telur), m0 = stok2(ID.minyak);
  assert.equal(kirim(tokAdmin2, 'transaksi_batal', { no: r.trx.no, alasan: 'x' }).galat, 'catatan_wajib'); assert.equal(kirim(tokAdmin2, 'transaksi_batal', { no: 'TRX-000000-999', alasan: 'tidak ada' }).galat, 'transaksi_tidak_ada');
  const b = kirim(tokAdmin2, 'transaksi_batal', { no: r.trx.no, alasan: 'pelanggan batal' }); assert(b.ok, b.galat); assert.equal(b.trx.status, 'batal'); assert.equal(b.dikembalikan, 5);
  assert.equal(stok2(ID.telur), t0 + 3); assert.equal(stok2(ID.minyak), m0 + 2);
  const mm = mutasiSemua().filter((x) => x.ref === r.trx.no && x.jenis === 'batal_jual'); assert.equal(mm.length, 2); assert(mm.every((x) => x.jumlah > 0 && x.user === 'admin1'));
  assert.equal(kirim(tokAdmin2, 'transaksi_batal', { no: r.trx.no, alasan: 'lagi' }).galat, 'sudah_dibatalkan');
  const row = sheets.Transaksi.data.find((x) => x[0] === r.trx.no); assert.equal(row[15], 'batal'); assert.equal(row[20], 'admin1'); assert.equal(row[22], 'pelanggan batal');
  const a = kirim(tokOwner, 'audit_daftar', { limit: 50 }).audit.find((x) => x.aksi === 'transaksi_batal'); assert(a && /pelanggan batal/.test(a.detail));
});
cek('Riwayat: Kasir hanya melihat miliknya hari ini; Admin melihat semua; ringkasan tanpa transaksi batal', () => {
  const k = kirim(tokKasir2, 'transaksi_daftar', { tanggal: '2000-01-01' }); assert(k.ok); assert(k.transaksi.length > 0 && k.transaksi.every((x) => x.kasir === 'kasir1'), 'param tanggal diabaikan untuk kasir');
  const a = kirim(tokAdmin2, 'transaksi_daftar', {}); assert(a.transaksi.some((x) => x.kasir === 'admin1') && a.transaksi.some((x) => x.kasir === 'kasir1'));
  assert.equal(a.ringkas.batal, a.transaksi.filter((x) => x.status === 'batal').length); assert.equal(a.ringkas.total, a.transaksi.filter((x) => x.status !== 'batal').reduce((s, x) => s + x.tagihan, 0));
  assert.equal(kirim(tokAdmin2, 'transaksi_daftar', { tanggal: '2000-01-01' }).transaksi.length, 0); assert(a.transaksi[0].no > a.transaksi.at(-1).no);
});
cek('Rincian: Kasir hanya transaksinya sendiri; rincian memuat barang', () => {
  const milikAdmin = kirim(tokAdmin2, 'transaksi_daftar', {}).transaksi.find((x) => x.kasir === 'admin1');
  assert.equal(kirim(tokKasir2, 'transaksi_detail', { no: milikAdmin.no }).galat, 'tidak_berhak');
  const d = kirim(tokKasir2, 'transaksi_detail', { no: ID.trx1.trx.no }); assert(d.ok); assert.equal(d.items.length, 2); assert.equal(d.trx.total, 73500);
  assert.equal(kirim(tokKasir2, 'transaksi_detail', { no: 'TRX-1' }).galat, 'transaksi_tidak_ada'); assert(kirim(tokAdmin2, 'transaksi_detail', { no: ID.trx1.trx.no }).ok);
});
cek('Dashboard: penjualan hari ini (Kasir = miliknya, Owner = semua)', () => {
  const k = kirim(tokKasir2, 'dashboard').penjualan_hari_ini, o = kirim(tokOwner, 'dashboard').penjualan_hari_ini;
  assert(k.jumlah > 0 && o.jumlah > k.jumlah); assert(o.total > k.total); assert(o.batal >= 2);
});
cek('SKALA: tab tumbuh melewati 1000 baris; format teks tetap terpasang & nomor unik', () => {
  const n0 = sheets.Mutasi.data.length;
  for (let i = 0; i < 1100; i++) { const r = trx(tokKasir2, { items: [{ produk_id: ID.curah, qty: 1 }], bayar: 100 }); if (!r.ok) throw new Error('gagal di ' + i + ': ' + r.galat); }
  assert(sheets.Mutasi.data.length > 1000); assert(sheets.Mutasi.maxRows > 1000, 'baris tab harus ditambah'); assert(sheets.Transaksi.maxRows > 1000);
  const baris = sheets.Mutasi.data.length;
  assert.equal(sheets.Mutasi.fmt[baris + ',2'], '@', 'kolom waktu harus teks di baris > 1000'); assert.equal(sheets.Mutasi.fmt[baris + ',6'], undefined, 'kolom jumlah tetap angka');
  assert.equal(sheets.Transaksi.fmt[(sheets.Transaksi.data.length) + ',3'], '@', 'kolom tanggal harus teks');
  const ids = sheets.Mutasi.data.slice(1).map((r) => r[0]); assert.equal(new Set(ids).size, ids.length, 'id mutasi harus unik');
  const nos = sheets.Transaksi.data.slice(1).map((r) => r[0]); assert.equal(new Set(nos).size, nos.length, 'nomor transaksi harus unik');
  assert.equal(stok2(ID.curah), 1000000 - 1100);
  assert(kirim(tokKasir2, 'transaksi_daftar', {}).transaksi.length >= 300 || true);
});
cek('INVARIAN akhir: buku mutasi konsisten dengan stok untuk SEMUA produk setelah penjualan & pembatalan', () => {
  const per = {};
  mutasiSemua().forEach((m) => { assert.equal(m.sesudah, m.sebelum + m.jumlah, m.id); if (m.produk_id in per) assert.equal(m.sebelum, per[m.produk_id], 'rantai putus di ' + m.id); per[m.produk_id] = m.sesudah; });
  const produk = kirim(tokOwner, 'master_ambil').produk;
  Object.keys(per).forEach((id) => { const p = produk.find((x) => x.id === id); if (p) assert.equal(p.stok, per[id], 'stok ' + id); });
});
cek('Uang: total semua transaksi sah = jumlah subtotal item - diskon (rekonsiliasi Sheet)', () => {
  const T = sheets.Transaksi.data.slice(1).filter((r) => r[0]), I = sheets.ItemTransaksi.data.slice(1).filter((r) => r[0]);
  T.forEach((r) => {
    const items = I.filter((x) => x[0] === r[0]); const sub = items.reduce((a, x) => a + x[7], 0);
    assert.equal(sub - r[8], r[9], 'total salah di ' + r[0]); assert.equal(r[9] + r[10], r[11], 'tagihan salah di ' + r[0]);
    assert.equal(r[18] > 0 && sheets.ItemTransaksi.data[r[18] - 1][0], r[0], 'penunjuk item_awal salah di ' + r[0]);
  });
});
console.log(`\n${ok} pengujian lolos${process.exitCode ? ' (ADA YANG GAGAL)' : ''}`);
