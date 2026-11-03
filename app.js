/* Toko Sembako si Ucox | app.js | Fase 5 + Sinkron Google Sheets (kategori, produk, supplier) | Tampilan: gaya Kitabisa + footer */

/* CONFIG dipindahkan ke config.js (dipakai bersama oleh halaman toko dan panel staf) */

const KEY_PRODUK = 'ucox_produk';          // perubahan stok dan harga
const KEY_KERANJANG = 'ucox_keranjang';    // isi keranjang
const KEY_PIN = 'ucox_pin';                // hash PIN (bukan PIN aslinya)
const KEY_RIWAYAT = 'ucox_riwayat';        // riwayat penjualan
const KEY_BUKA = 'ucox_buka';              // sesi: PIN terbuka sampai kapan
const KEY_KUNCI = 'ucox_kunci';            // sesi: terkunci sementara karena salah PIN
const KEY_CACHE = 'ucox_cache';            // salinan data terakhir (Google Sheets), dipakai saat offline
const KEY_ANTRIAN = 'ucox_antrian';        // perubahan stok/harga yang belum terkirim ke Google Sheets
const KEY_SKUNCI = 'ucox_kunci_sinkron';   // kunci sinkron milik pemilik (hanya di perangkat pemilik)
const state = { q: '', kat: 'semua' };
let modalAktif = null;
let kelolaQ = '';
let pin = null;
let strukAktif = null;
let form = { nama: '', wa: '', bayar: '' };
let gagal = 0;
let riwayatTgl = '';       // tanggal yang sedang dilihat di riwayat (kosong = hari ini)
let strukLama = false;     // true jika struk dibuka dari riwayat
let kunciForm = { galat: '', lanjut: null };

/* ---------- Helper ---------- */
const $ = (id) => document.getElementById(id);
const ic = (nama, kelas = 'w-5 h-5') => `<i data-lucide="${nama}" class="${kelas}"></i>`;
const icons = () => {   // dipanggil setelah setiap render
  if (!window.lucide) return;
  lucide.createIcons();
  // Ikon yang sudah jadi jangan diganti lagi pada render berikutnya (kalau diganti, ketukan jari yang sedang berlangsung bisa hilang)
  document.querySelectorAll('svg[data-lucide]').forEach((s) => s.removeAttribute('data-lucide'));
};
const rp = (n) => (n < 0 ? '-' : '') + 'Rp' + Math.abs(n).toLocaleString('id-ID');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const produk = (id) => PRODUCTS.find((p) => p.id === id);

const muat = (k, awal) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? awal; } catch (e) { return awal; }
};
const simpan = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penyimpanan diblokir atau penuh */ }
};

/* ---------- Data: Google Sheets (atau mode lokal bila sheetsUrl kosong) ---------- */
const SHEETS_AKTIF = !!CONFIG.sheetsUrl;
const ASLI = PRODUCTS.map((p) => ({ ...p }));   // data bawaan, dipakai tombol "Data awal" di mode lokal
const sinkron = { berjalan: false, ulang: false, waktu: null, galat: '', info: '' };
let antrian = muat(KEY_ANTRIAN, []);             // perubahan menunggu dikirim

const num = (v) => { const n = Math.round(Number(v)); return isFinite(n) ? Math.max(0, n) : 0; };
const kunciSinkron = () => { try { return localStorage.getItem(KEY_SKUNCI) || ''; } catch (e) { return ''; } };
const hapusKunci = () => { try { localStorage.removeItem(KEY_SKUNCI); } catch (e) { /* abaikan */ } };
const idOp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ikonAda = (nama) => {   // nama ikon salah di Sheet tidak boleh merusak tampilan
  if (!window.lucide || !lucide.icons) return true;
  return !!lucide.icons[String(nama).replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())];
};

function rapikanProduk(p) {
  const o = { ...p, harga_jual: num(p.harga_jual), stok: num(p.stok), barcode: String(p.barcode ?? '') };
  if (p.harga_beli !== undefined) o.harga_beli = num(p.harga_beli);
  return o;
}

function terapkanToko(t) {   // nama, alamat, WhatsApp, batas stok menipis dari tab Pengaturan (diubah Owner lewat panel)
  if (!t) return false;
  const baru = { nama: t.nama || CONFIG.nama, alamat: t.alamat || CONFIG.alamat, waNumber: t.waNumber || CONFIG.waNumber,
                 waTampil: t.waTampil || CONFIG.waTampil, stokMenipis: Number.isFinite(t.stokMenipis) ? t.stokMenipis : CONFIG.stokMenipis };
  const beda = Object.keys(baru).some((k) => CONFIG[k] !== baru[k]);
  Object.assign(CONFIG, baru);
  return beda;
}

function terapkanData(d, penuh) {   // isi ulang daftar di tempat (variabel global tetap sama)
  terapkanToko(d.toko);
  CATEGORIES.splice(0, CATEGORIES.length, ...(d.kategori || []));
  PRODUCTS.splice(0, PRODUCTS.length, ...(d.produk || []).map(rapikanProduk));
  SUPPLIERS.splice(0, SUPPLIERS.length, ...(penuh ? (d.supplier || []) : []));
}

function simpanCache() {
  simpan(KEY_CACHE, { sumber: SHEETS_AKTIF ? 'sheets' : 'lokal', waktu: sinkron.waktu,
    data: { kategori: CATEGORIES, produk: PRODUCTS, supplier: SUPPLIERS,
            toko: { nama: CONFIG.nama, alamat: CONFIG.alamat, waNumber: CONFIG.waNumber, waTampil: CONFIG.waTampil, stokMenipis: CONFIG.stokMenipis } } });
}

(function muatAwal() {
  const c = muat(KEY_CACHE, null);
  if (c && c.data && c.sumber === (SHEETS_AKTIF ? 'sheets' : 'lokal')) {
    terapkanData(c.data, true);
    sinkron.waktu = c.waktu || null;
  } else if (SHEETS_AKTIF) {   // belum pernah tersambung: jangan tampilkan data contoh ke pelanggan
    CATEGORIES.length = 0; PRODUCTS.length = 0; SUPPLIERS.length = 0;
  } else {                     // mode lokal: ambil perubahan lama (sebelum ada Google Sheets) bila ada
    const edit = muat(KEY_PRODUK, {});
    PRODUCTS.forEach((p) => Object.assign(p, edit[p.id] || {}));
  }
})();

function terapkanOp(op) {   // perubahan langsung terlihat di layar, lalu dikirim ke Google Sheets
  if (op.aksi === 'jual') {
    op.item.forEach((i) => { const p = produk(i.id); if (p) p.stok = Math.max(0, p.stok - i.qty); });
  } else if (op.aksi === 'ubah') {
    const p = produk(op.id);
    if (p) Object.assign(p, op.set);
  }
}

function catat(op) {   // satu-satunya pintu untuk mengubah stok/harga
  op.opId = idOp();
  terapkanOp(op);
  simpanCache();
  if (SHEETS_AKTIF) { antrian.push(op); simpan(KEY_ANTRIAN, antrian); sinkronkan(); }
}

async function panggil(url, opsi) {
  const kontrol = new AbortController();
  const batas = setTimeout(() => kontrol.abort(), 30000);
  try {
    const r = await fetch(url, { ...opsi, signal: kontrol.signal });
    try { return await r.json(); } catch (e) { throw new Error('respon'); }
  } finally { clearTimeout(batas); }
}
const kirimPost = (kunci, ops) => panggil(CONFIG.sheetsUrl, { method: 'POST', body: JSON.stringify({ kunci, ops }) });

function terimaHasil(res, kirim, penuh) {
  const info = [];
  if (penuh) {
    const ids = new Set(kirim.map((o) => o.opId));
    antrian = antrian.filter((o) => !ids.has(o.opId));
    simpan(KEY_ANTRIAN, antrian);
    (res.hasil || []).forEach((h) => {
      if (h.status === 'galat') info.push(h.pesan === 'produk_tidak_ada'
        ? 'Satu perubahan dilewati karena produknya sudah tidak ada di Google Sheets.' : 'Satu perubahan ditolak oleh Google Sheets.');
      (h.catatan || []).forEach((c) => { if (c.includes('stok kurang')) info.push(`Cek stok: ${c}.`); });
    });
  }
  const sebelum = JSON.stringify([CATEGORIES, PRODUCTS]);
  const pertama = !sinkron.waktu;
  const tokoBerubah = terapkanToko(res.data && res.data.toko);
  terapkanData(res.data, penuh);
  antrian.forEach(terapkanOp);   // perubahan yang belum terkirim tetap terlihat
  sinkron.waktu = res.waktu || new Date().toISOString();
  sinkron.info = [...new Set(info)].slice(0, 2).join(' ');
  simpanCache();
  try { localStorage.removeItem(KEY_PRODUK); } catch (e) { /* abaikan */ }
  rapikanKeranjang();
  if (state.kat !== 'semua' && !CATEGORIES.some((k) => k.id === state.kat)) state.kat = 'semua';
  if (tokoBerubah) { renderHeader(); renderFooter(); }
  if (pertama || JSON.stringify([CATEGORIES, PRODUCTS]) !== sebelum) {
    renderChips(); perbarui(); segarkanKelola();
  }
}

async function sinkronkan() {
  if (!SHEETS_AKTIF) return;
  if (sinkron.berjalan) { sinkron.ulang = true; return; }
  sinkron.berjalan = true; sinkron.ulang = false;
  renderSinkron();
  const kunci = kunciSinkron();
  const kirim = kunci ? antrian.slice(0, 50) : [];
  let ulangi = false;
  try {
    const res = kunci ? await kirimPost(kunci, kirim) : await panggil(`${CONFIG.sheetsUrl}?aksi=publik&_=${Date.now()}`, {});
    if (kunciSinkron() !== kunci) ulangi = true;   // kunci berubah selama menunggu: hasil ini dibuang
    else {
      if (!res.ok) throw new Error(res.galat || 'server');
      terimaHasil(res, kirim, !!kunci);
      sinkron.galat = !kunci && antrian.length ? 'kunci' : '';   // tanpa kunci, perubahan yang antre tidak bisa terkirim
      ulangi = sinkron.ulang || (!!kunci && antrian.length > 0);
    }
  } catch (e) {
    console.warn('Sinkron gagal:', e.message);
    sinkron.galat = e.message === 'kunci_salah' ? 'kunci' : e.message === 'terkunci_sementara' ? 'terkunci' : 'offline';
    if (sinkron.galat === 'kunci') hapusKunci();
  } finally {
    sinkron.berjalan = false;
    renderSinkron();
    renderGrid();   // ganti pesan "memuat" bila perlu
    if (ulangi) sinkronkan();
  }
}

function segarkanKelola() {   // perbarui nilai di tempat: jangan menimpa kolom yang sedang diketik, jangan melompatkan daftar
  if (modalAktif !== 'kelola') return;
  const d = $('daftar-kelola');
  if (!d || d.contains(document.activeElement)) return;
  const q = kelolaQ.trim().toLowerCase();
  const idBaru = PRODUCTS.filter((p) => !q || p.nama.toLowerCase().includes(q)).map((p) => p.id).join(',');
  const idLama = [...d.querySelectorAll('[data-row]')].map((li) => li.dataset.row).join(',');
  if (idBaru !== idLama) {   // ada produk baru/hilang di Google Sheets
    const y = d.scrollTop; d.innerHTML = daftarKelola(); d.scrollTop = y;
    return;
  }
  d.querySelectorAll('input[data-field]').forEach((inp) => {
    const p = produk(inp.dataset.id);
    const nilai = p ? String(p[inp.dataset.field] ?? '') : inp.value;
    if (inp.value !== nilai) inp.value = nilai;
  });
  d.querySelectorAll('[data-row]').forEach((li) => {
    const p = produk(li.dataset.row);
    if (!p) return;
    const laba = p.harga_jual - (p.harga_beli ?? 0);
    const info = li.querySelector('[data-laba]');
    info.textContent = `Laba per ${p.satuan}: ${rp(laba)}`;
    info.className = `mt-1 text-xs ${laba < 0 ? 'font-bold text-tomat' : 'text-stone-500'}`;
  });
}

function renderSinkron() {
  const n = antrian.length;
  const tunggu = n ? `, ${n} perubahan menunggu dikirim` : '';
  let pesan = ''; let tombol = ''; let ikon = 'cloud-off';
  if (SHEETS_AKTIF) {
    if (sinkron.galat === 'kunci') { pesan = 'Kunci sinkron tidak cocok. Perubahan menunggu sampai kunci diisi ulang.'; tombol = ['kunci', 'Isi kunci']; }
    else if (sinkron.galat === 'terkunci') { pesan = 'Terlalu banyak percobaan kunci. Coba lagi sekitar 10 menit lagi.'; }
    else if (sinkron.galat) { pesan = `Belum tersambung. Menampilkan data terakhir${tunggu}.`; tombol = ['segarkan', 'Coba lagi']; }
    else if (sinkron.info) { pesan = sinkron.info; tombol = ['tutup-info', 'Tutup']; ikon = 'triangle-alert'; }
  }
  const el = $('sync-banner');
  el.classList.toggle('hidden', !pesan);
  el.innerHTML = pesan ? `
    <div class="mx-auto flex max-w-[480px] items-center gap-2 bg-jingga/30 px-4 py-2 text-sm font-semibold text-amber-900">
      ${ic(ikon, 'w-4 h-4 shrink-0')}<span class="min-w-0 flex-1">${esc(pesan)}</span>
      ${tombol ? `<button type="button" data-aksi="${tombol[0]}" class="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-biru">${tombol[1]}</button>` : ''}
    </div>` : '';
  const waktu = sinkron.waktu ? waktuStruk(sinkron.waktu) : '';
  if ($('sync-info')) $('sync-info').textContent = SHEETS_AKTIF && waktu ? `Data diperbarui ${waktu}` : '';
  if ($('status-sinkron')) {
    $('status-sinkron').textContent = sinkron.berjalan ? 'Menyinkronkan dengan Google Sheets...'
      : sinkron.galat ? `Belum tersambung ke Google Sheets${tunggu}.`
      : n ? `${n} perubahan menunggu dikirim.`
      : `Tersinkron dengan Google Sheets${waktu ? ', ' + waktu : ''}.`;
  }
  icons();
}

function pastikanKunci(lanjut) {   // di perangkat pemilik: minta kunci sinkron sekali saja
  if (!SHEETS_AKTIF || kunciSinkron()) { lanjut(); sinkronkan(); return; }
  kunciForm = { galat: '', lanjut };
  bukaModal('kunci');
}

function setGalatKunci(teks) { kunciForm.galat = teks; renderModal(); $('kunci1').focus(); }

async function prosesKunci() {
  const k = ($('kunci1').value || '').trim();
  if (!k) return setGalatKunci('Kunci belum diisi.');
  const btn = $('btn-kunci'); btn.disabled = true; btn.textContent = 'Memeriksa...';
  try {
    const res = await kirimPost(k, []);
    if (!res.ok) {
      return setGalatKunci({ kunci_salah: 'Kunci salah. Periksa lagi huruf besar dan kecilnya.', kunci_belum_diatur: 'Kunci belum dibuat di Google Sheets (menu Warung Ucox).',
        terkunci_sementara: 'Terlalu banyak percobaan. Coba lagi sekitar 10 menit lagi.' }[res.galat] || 'Google Sheets menolak permintaan ini.');
    }
    try { localStorage.setItem(KEY_SKUNCI, k); } catch (e) { /* abaikan */ }
    terimaHasil(res, [], true);
    sinkron.galat = '';
    renderSinkron();
    kunciForm.lanjut();
    sinkronkan();
  } catch (e) { setGalatKunci('Tidak bisa terhubung. Periksa internet lalu coba lagi.'); }
}

/* ---------- Keranjang ---------- */
let keranjang = muat(KEY_KERANJANG, {});

function rapikanKeranjang() {   // buang produk hilang/habis dan batasi jumlah sesuai stok
  Object.keys(keranjang).forEach((id) => {
    const p = produk(id);
    const q = p ? Math.min(Number(keranjang[id]) || 0, p.stok) : 0;
    if (q > 0) keranjang[id] = q; else delete keranjang[id];
  });
  simpan(KEY_KERANJANG, keranjang);
}
rapikanKeranjang();

const jumlahItem = () => Object.values(keranjang).reduce((a, q) => a + q, 0);
const totalHarga = () => Object.entries(keranjang).reduce((a, [id, q]) => a + produk(id).harga_jual * q, 0);

function ubahQty(id, delta) {
  const p = produk(id);
  if (!p) return;
  const q = Math.min(p.stok, Math.max(0, (keranjang[id] || 0) + delta));
  if (q) keranjang[id] = q; else delete keranjang[id];
  simpan(KEY_KERANJANG, keranjang);
  perbarui();
}

function perbarui() {
  renderGrid();
  renderBar();
  if (modalAktif === 'keranjang') renderModal();
}

/* ---------- Filter ---------- */
function filterProduk() {
  const q = state.q.trim().toLowerCase();
  return PRODUCTS.filter((p) =>
    (state.kat === 'semua' || p.kategori === state.kat) &&
    (!q || p.nama.toLowerCase().includes(q) || p.barcode.includes(q)));
}

/* ---------- Render: header, chip, grid ---------- */
function renderHeader() {
  $('app-header').innerHTML = `
    <div class="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-3">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-biru text-white">${ic('store', 'w-6 h-6')}</span>
      <h1 class="font-display text-lg font-extrabold leading-tight text-biru">${CONFIG.nama}</h1>
      <div class="ml-auto flex items-center gap-2">
        ${CONFIG.menuLamaAktif
          ? `<button type="button" data-aksi="buka-riwayat" aria-label="Riwayat penjualan" title="Riwayat penjualan"
          class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-600 transition hover:bg-langit/10 hover:text-biru">${ic('history')}</button>
        <button type="button" data-aksi="kelola" class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-biru px-4 py-2 text-sm font-bold text-biru transition hover:bg-biru hover:text-white">
          ${ic('settings-2', 'w-4 h-4')}Kelola</button>`
          : `<a href="panel.html" class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-biru px-4 py-2 text-sm font-bold text-biru transition hover:bg-biru hover:text-white">
          ${ic('log-in', 'w-4 h-4')}Panel staf</a>`}
      </div>
    </div>`;
  icons();
}

function renderChips() {
  const semua = [{ id: 'semua', nama: 'Semua', ikon: 'layout-grid' }, ...CATEGORIES];
  $('chips').innerHTML = semua.map((k) => {
    const aktif = k.id === state.kat;
    return `
      <button type="button" data-kat="${k.id}" aria-pressed="${aktif}"
        class="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-xs font-bold transition ${
          aktif ? 'text-biru' : 'text-stone-600 hover:bg-latar'}">
        <span class="grid h-12 w-12 place-items-center rounded-full transition ${
          aktif ? 'bg-biru text-white shadow-md' : 'bg-langit/10 text-biru group-hover:bg-langit/20'}">${ic(ikonAda(k.ikon) ? k.ikon : 'package', 'w-6 h-6')}</span>
        ${esc(k.nama)}
      </button>`;
  }).join('');
  icons();
}

function labelStok(stok) {
  if (stok <= 0) return { teks: 'Habis', kelas: 'bg-tomat/10 text-tomat' };
  if (stok <= CONFIG.stokMenipis) return { teks: `Stok menipis (${stok})`, kelas: 'bg-jingga/30 text-amber-800' };
  return { teks: `Stok ${stok}`, kelas: 'bg-langit/10 text-biru' };
}

function stepper(p, kelas = '') {
  const q = keranjang[p.id] || 0;
  return `
    <div class="flex items-center gap-1 rounded-full bg-langit/10 p-1 ${kelas}">
      <button type="button" data-aksi="kurang" data-id="${p.id}" aria-label="Kurangi ${p.nama}"
        class="grid h-8 w-8 place-items-center rounded-full bg-white text-biru">${ic('minus', 'w-4 h-4')}</button>
      <span class="w-7 text-center font-extrabold">${q}</span>
      <button type="button" data-aksi="tambah" data-id="${p.id}" aria-label="Tambah ${p.nama}" ${q >= p.stok ? 'disabled' : ''}
        class="grid h-8 w-8 place-items-center rounded-full bg-biru text-white disabled:opacity-40">${ic('plus', 'w-4 h-4')}</button>
    </div>`;
}

function kartu(p) {
  const kat = CATEGORIES.find((k) => k.id === p.kategori) || {};
  const ikon = ikonAda(kat.ikon || 'package') ? (kat.ikon || 'package') : 'package';
  const s = labelStok(p.stok);
  const adaFoto = p.gambar && (CONFIG.pakaiGambar || /^https:\/\//.test(p.gambar));   // foto unggahan panel (tautan https) otomatis tampil
  const foto = adaFoto
    ? `<img src="${String(p.gambar).replace(/[&"'<>]/g, '')}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" class="absolute inset-0 h-full w-full object-cover">`
    : '';
  const aksi = p.stok <= 0 ? '' : (keranjang[p.id]
    ? stepper(p, 'mt-3 justify-between')
    : `<button type="button" data-aksi="tambah" data-id="${p.id}"
         class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-biru py-2.5 text-sm font-bold text-white transition hover:bg-[#0C6A9C]">
         ${ic('plus', 'w-4 h-4')} Tambah</button>`);
  return `
    <article class="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-md ${p.stok <= 0 ? 'opacity-60' : ''}">
      <div class="relative grid aspect-[4/3] place-items-center bg-gradient-to-br from-langit/20 to-langit/5 text-biru">
        <span class="grid h-16 w-16 place-items-center rounded-full bg-white/80 shadow-sm">${ic(ikon, 'w-8 h-8')}</span>
        ${foto}
        <span class="absolute left-2 top-2 z-10 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-stone-600 shadow-sm">${kat.nama || ''}</span>
      </div>
      <div class="flex flex-1 flex-col gap-1 p-3">
        <h3 class="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-stone-800">${p.nama}</h3>
        <p class="text-lg font-black text-biru">${rp(p.harga_jual)}
          <span class="text-xs font-semibold text-stone-500">/ ${p.satuan}</span></p>
        <span class="mt-auto w-fit rounded-full px-2 py-0.5 text-xs font-bold ${s.kelas}">${s.teks}</span>
        ${aksi}
      </div>
    </article>`;
}

function renderGrid() {
  if (SHEETS_AKTIF && !PRODUCTS.length && !sinkron.waktu) {   // belum ada data sama sekali
    const gagal = !!sinkron.galat && !sinkron.berjalan;
    $('count').textContent = '';
    $('product-grid').innerHTML = `<div class="col-span-full py-12 text-center text-stone-500">
      ${ic(gagal ? 'cloud-off' : 'refresh-cw', 'mx-auto w-10 h-10 text-stone-400' + (gagal ? '' : ' animate-spin'))}
      <p class="mt-3 font-bold text-stone-700">${gagal ? 'Produk belum bisa dimuat' : 'Memuat produk...'}</p>
      <p class="text-sm">${gagal ? 'Periksa internet, lalu coba lagi.' : 'Mohon tunggu sebentar.'}</p>
      ${gagal ? `<button type="button" data-aksi="segarkan" class="mt-4 rounded-full bg-biru px-6 py-2.5 text-sm font-bold text-white">Coba lagi</button>` : ''}</div>`;
    icons();
    return;
  }
  const hasil = filterProduk().sort((a, b) => (a.stok <= 0) - (b.stok <= 0));   // yang habis paling akhir
  const kat = CATEGORIES.find((k) => k.id === state.kat);
  const q = state.q.trim();
  $('count').textContent = `${hasil.length} produk` +
    (kat ? ` di kategori ${kat.nama}` : '') + (q ? ` untuk \u201C${q}\u201D` : '');

  $('product-grid').innerHTML = hasil.length
    ? hasil.map(kartu).join('')
    : `<div class="col-span-full py-12 text-center text-stone-500">
         ${ic('search-x', 'mx-auto w-10 h-10 text-stone-400')}
         <p class="mt-3 font-bold text-stone-700">Produk tidak ditemukan</p>
         <p class="text-sm">Coba kata kunci lain atau pilih kategori Semua.</p>
       </div>`;
  icons();
}

function renderBar() {
  const n = jumlahItem();
  $('cart-bar').classList.toggle('hidden', n === 0);
  if (!n) return;
  $('cart-bar').innerHTML = `
    <button type="button" data-aksi="keranjang"
      class="mx-auto flex w-full max-w-[448px] items-center justify-between rounded-2xl bg-biru px-4 py-3.5 text-white shadow-[0_8px_24px_rgba(15,120,176,.35)]">
      <span class="flex items-center gap-2 font-bold">${ic('shopping-cart')} ${n} barang</span>
      <span class="flex items-center gap-1 font-extrabold">${rp(totalHarga())}${ic('chevron-right')}</span>
    </button>`;
  icons();
}

/* ---------- Modal: keranjang dan kelola ---------- */
const kepala = (judul, ikon) => `
  <div class="flex items-center justify-between border-b border-stone-100 px-4 py-3">
    <h2 class="flex items-center gap-2 font-display text-xl font-extrabold text-biru">${ic(ikon)}${judul}</h2>
    <button type="button" data-aksi="tutup" aria-label="Tutup" class="grid h-9 w-9 place-items-center rounded-full bg-stone-100">${ic('x')}</button>
  </div>`;
const kakiStyle = 'padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem)';

function renderKeranjang() {
  const ids = Object.keys(keranjang);
  let isi;
  let kaki = '';
  if (!ids.length) {
    isi = `<div class="py-14 text-center text-stone-500">${ic('shopping-cart', 'mx-auto h-10 w-10 text-stone-400')}
      <p class="mt-3 font-bold text-stone-700">Keranjang masih kosong</p>
      <p class="text-sm">Pilih produk lalu tekan Tambah.</p></div>`;
  } else {
    isi = `<ul class="divide-y divide-stone-100">${ids.map((id) => {
      const p = produk(id); const q = keranjang[id];
      return `<li class="flex items-center gap-3 py-3">
        <div class="min-w-0 flex-1"><p class="text-sm font-bold leading-snug">${p.nama}</p>
          <p class="text-xs text-stone-500">${rp(p.harga_jual)} / ${p.satuan}</p></div>
        ${stepper(p)}
        <p class="w-20 text-right text-sm font-extrabold">${rp(p.harga_jual * q)}</p></li>`;
    }).join('')}</ul>`;
    const pesan = [`Halo ${CONFIG.nama}, saya mau pesan:`,
      ...ids.map((id) => `- ${produk(id).nama} x${keranjang[id]} = ${rp(produk(id).harga_jual * keranjang[id])}`),
      `Total: ${rp(totalHarga())}`].join('\n');
    kaki = `
      <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-stone-600">Total</span>
          <span class="font-display text-2xl font-extrabold text-biru">${rp(totalHarga())}</span></div>
        <a href="https://wa.me/${CONFIG.waNumber}?text=${encodeURIComponent(pesan)}" target="_blank" rel="noopener"
          class="flex w-full items-center justify-center gap-2 rounded-full bg-jingga py-3 font-extrabold text-stone-900">
          ${ic('message-circle')} Pesan via WhatsApp</a>
        ${CONFIG.menuLamaAktif ? `<button type="button" data-aksi="kasir" class="flex w-full items-center justify-center gap-2 rounded-full border border-biru py-2.5 text-sm font-bold text-biru">
          ${ic('lock', 'w-4 h-4')} Kasir: selesaikan dan kirim struk</button>` : ''}
        <button type="button" data-aksi="kosongkan" class="w-full rounded-full py-2 text-sm font-bold text-tomat">Kosongkan keranjang</button>
      </div>`;
  }
  $('modal-isi').innerHTML = kepala('Keranjang', 'shopping-cart') + `<div class="overflow-y-auto px-4">${isi}</div>` + kaki;
}

const field = (p, k, label) => `
  <label class="block text-xs font-semibold text-stone-500">${label}
    <input type="number" inputmode="numeric" min="0" step="${k === 'stok' ? 1 : 100}" value="${p[k] ?? ''}"
      data-id="${p.id}" data-field="${k}"
      class="mt-0.5 w-full rounded-xl border border-stone-200 px-2.5 py-2 text-base font-bold text-stone-800"></label>`;

function barisKelola(p) {
  const laba = p.harga_jual - (p.harga_beli ?? 0);
  return `<li data-row="${p.id}" class="py-3">
    <p class="text-sm font-bold">${p.nama}</p>
    <div class="mt-1.5 grid grid-cols-3 gap-2">
      ${field(p, 'harga_beli', 'Harga beli')}${field(p, 'harga_jual', 'Harga jual')}${field(p, 'stok', 'Stok')}
    </div>
    <p data-laba class="mt-1 text-xs ${laba < 0 ? 'font-bold text-tomat' : 'text-stone-500'}">Laba per ${p.satuan}: ${rp(laba)}</p>
  </li>`;
}

function daftarKelola() {
  const q = kelolaQ.trim().toLowerCase();
  const list = PRODUCTS.filter((p) => !q || p.nama.toLowerCase().includes(q));
  return list.length
    ? `<ul class="divide-y divide-stone-100">${list.map(barisKelola).join('')}</ul>`
    : '<p class="py-10 text-center text-stone-500">Produk tidak ditemukan.</p>';
}

function renderKelola() {
  $('modal-isi').innerHTML = kepala('Kelola stok dan harga', 'settings-2') + `
    <div class="px-4 pt-3">
      <label for="cari-kelola" class="sr-only">Cari produk</label>
      <input id="cari-kelola" type="search" autocomplete="off" placeholder="Cari produk" value="${esc(kelolaQ)}"
        class="w-full rounded-full border border-stone-200 px-4 py-2.5">
    </div>
    <p class="mx-4 mt-2 rounded-xl bg-langit/10 px-3 py-2 text-xs text-stone-700">${ic('info', 'mr-1 inline h-3.5 w-3.5 align-text-bottom')}Untuk barang masuk, penyesuaian stok, dan riwayat mutasi, pakai <a href="panel.html#stok" class="font-bold text-biru underline">Panel Staf &rsaquo; Stok</a>. Perubahan stok dari menu ini tetap tercatat di riwayat.</p>
    <div id="daftar-kelola" class="overflow-y-auto px-4">${daftarKelola()}</div>
    <div class="border-t border-stone-100 px-4 pt-2" style="${kakiStyle}">
      ${SHEETS_AKTIF ? '<p id="status-sinkron" class="text-xs text-stone-500" aria-live="polite"></p>'
                     : '<p class="text-xs text-stone-500">Perubahan tersimpan otomatis di perangkat ini.</p>'}
      <div class="mt-2 flex items-center gap-2">
        <button type="button" data-aksi="ganti-pin" class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-stone-600">
          ${ic('key-round', 'w-4 h-4')} Ganti PIN</button>
        ${SHEETS_AKTIF
          ? `<button type="button" data-aksi="segarkan" class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-biru">
              ${ic('refresh-cw', 'w-4 h-4')} Segarkan</button>`
          : `<button type="button" data-aksi="reset" class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-tomat">
              ${ic('rotate-ccw', 'w-4 h-4')} Data awal</button>`}
        <button type="button" data-aksi="tutup" class="ml-auto rounded-full bg-biru px-6 py-2.5 font-bold text-white">Selesai</button>
      </div>
    </div>`;
  renderSinkron();
}

/* ---------- Kunci sinkron (khusus pemilik) ---------- */
function renderKunci() {
  $('modal-isi').innerHTML = kepala('Kunci sinkron', 'key-round') + `
    <div class="space-y-3 px-4 py-4">
      <p class="text-sm text-stone-600">Perangkat ini belum tersambung ke Google Sheets sebagai pemilik. Isi kunci sinkron (dibuat lewat menu Warung Ucox di Google Sheets). Cukup sekali di perangkat ini.</p>
      <label class="block text-sm font-semibold text-stone-600">Kunci sinkron
        <input id="kunci1" data-kunci="1" autofocus type="password" autocomplete="off" autocapitalize="none" spellcheck="false"
          class="mt-1 w-full rounded-xl border border-stone-200 px-4 py-3 text-base font-bold"></label>
      <p role="alert" class="min-h-5 text-sm font-bold text-tomat">${esc(kunciForm.galat)}</p>
    </div>
    <div class="flex gap-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="button" data-aksi="tutup" class="rounded-full px-5 py-3 font-bold text-stone-500">Batal</button>
      <button type="button" id="btn-kunci" data-aksi="kunci-ok" class="flex-1 rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Sambungkan</button>
    </div>`;
}

/* ---------- PIN ---------- */
const sesi = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
};
const terbuka = () => Date.now() < Number(sesi.get(KEY_BUKA) || 0);
const perpanjang = () => sesi.set(KEY_BUKA, String(Date.now() + CONFIG.lamaBukaMenit * 60000));
const garam = () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

async function hashPin(angka, g) {
  const data = new TextEncoder().encode(`${g}:${angka}`);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;   // cadangan jika browser tidak menyediakan crypto
  data.forEach((b) => { h = ((h * 33) ^ b) >>> 0; });
  return 'x' + h.toString(16);
}

function butuhPin(lanjut) {   // jalankan `lanjut` hanya setelah PIN benar (dan kunci sinkron ada)
  const jalan = () => pastikanKunci(lanjut);
  if (terbuka()) { perpanjang(); jalan(); return; }
  pin = { mode: muat(KEY_PIN, null) ? 'masuk' : 'buat', lanjut: jalan, galat: '' };
  bukaModal('pin');
}

function renderPin() {
  const judul = { masuk: 'Masukkan PIN', buat: 'Buat PIN', ganti: 'Ganti PIN' }[pin.mode];
  const baru = pin.mode !== 'masuk';
  const kolom = (id, label, fokus) => `
    <label class="block text-sm font-semibold text-stone-600">${label}
      <input id="${id}" data-pin="1" ${fokus ? 'autofocus' : ''} type="password" inputmode="numeric" autocomplete="off" maxlength="6"
        class="mt-1 w-full rounded-xl border border-stone-200 px-4 py-3 text-center text-2xl font-extrabold tracking-[0.5em]"></label>`;
  $('modal-isi').innerHTML = kepala(judul, 'lock') + `
    <div class="space-y-3 px-4 py-4">
      <p class="text-sm text-stone-600">${baru ? 'PIN melindungi menu Kelola dan Kasir. Pakai 4 sampai 6 angka.' : 'Menu ini khusus pemilik warung.'}</p>
      ${kolom('pin1', baru ? 'PIN baru' : 'PIN', true)}${baru ? kolom('pin2', 'Ulangi PIN', false) : ''}
      <p role="alert" class="min-h-5 text-sm font-bold text-tomat">${pin.galat}</p>
    </div>
    <div class="flex gap-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="button" data-aksi="tutup" class="rounded-full px-5 py-3 font-bold text-stone-500">Batal</button>
      <button type="button" data-aksi="pin-ok" class="flex-1 rounded-full bg-biru py-3 font-extrabold text-white">${baru ? 'Simpan PIN' : 'Buka'}</button>
    </div>`;
}

function setGalat(teks) { pin.galat = teks; renderModal(); $('pin1').focus(); }
function lanjutPin() { perpanjang(); pin.lanjut(); }

async function prosesPin() {
  const a = $('pin1').value;
  const b = $('pin2') ? $('pin2').value : '';
  if (pin.mode === 'masuk') {
    const sisa = Math.ceil((Number(sesi.get(KEY_KUNCI) || 0) - Date.now()) / 1000);
    if (sisa > 0) return setGalat(`Terlalu banyak percobaan. Coba lagi dalam ${sisa} detik.`);
    const s = muat(KEY_PIN, null);
    if (s && (await hashPin(a, s.garam)) === s.hash) { gagal = 0; return lanjutPin(); }
    gagal += 1;
    if (gagal >= 5) {
      gagal = 0;
      sesi.set(KEY_KUNCI, String(Date.now() + 30000));
      return setGalat('PIN salah 5 kali. Tunggu 30 detik.');
    }
    return setGalat(`PIN salah. Sisa percobaan: ${5 - gagal}.`);
  }
  if (!/^\d{4,6}$/.test(a)) return setGalat('PIN harus 4 sampai 6 angka.');
  if (a !== b) return setGalat('Pengulangan PIN tidak sama.');
  const g = garam();
  simpan(KEY_PIN, { garam: g, hash: await hashPin(a, g) });
  return lanjutPin();
}

/* ---------- Pembayaran dan struk ---------- */
const inputForm = (k, label, tipe, contoh, mode = '') => `
  <label class="block text-sm font-semibold text-stone-600">${label}
    <input type="${tipe}" ${mode ? `inputmode="${mode}"` : ''} data-form="${k}" value="${esc(form[k])}"
      placeholder="${contoh}" autocomplete="off"
      class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base text-stone-800"></label>`;

function hitungBayar() {
  const total = totalHarga();
  const bayar = form.bayar === '' ? total : Number(form.bayar);
  const kurang = bayar < total;
  $('kembalian').textContent = kurang ? `Uang kurang ${rp(total - bayar)}` : `Kembalian ${rp(bayar - total)}`;
  $('kembalian').className = `text-sm font-bold ${kurang ? 'text-tomat' : 'text-biru'}`;
  $('btn-selesai').disabled = kurang;
}

function renderBayar() {
  $('modal-isi').innerHTML = kepala('Pembayaran', 'wallet') + `
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <div class="flex items-center justify-between rounded-2xl bg-langit/10 px-4 py-3">
        <span class="font-semibold text-stone-600">${jumlahItem()} barang</span>
        <span class="font-display text-2xl font-extrabold text-biru">${rp(totalHarga())}</span></div>
      ${inputForm('nama', 'Nama pelanggan (opsional)', 'text', 'Contoh: Bu Ani')}
      ${inputForm('wa', 'WhatsApp pelanggan (opsional)', 'tel', '08xxxxxxxxxx')}
      ${inputForm('bayar', 'Uang diterima (kosongkan jika uang pas)', 'text', 'Contoh: 150000', 'numeric')}
      <p id="kembalian"></p>
    </div>
    <div class="border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="button" id="btn-selesai" data-aksi="selesaikan"
        class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Selesaikan penjualan</button>
      <button type="button" data-aksi="keranjang" class="mt-1 w-full py-2 text-sm font-bold text-stone-500">Kembali ke keranjang</button>
    </div>`;
  hitungBayar();
}

const p2 = (n) => String(n).padStart(2, '0');
function nomorStruk(riwayat) {
  const d = new Date();
  const tgl = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
  const urut = riwayat.filter((t) => t.no.startsWith(`UCX-${tgl}`)).length + 1;
  return `UCX-${tgl}-${String(urut).padStart(3, '0')}`;
}
const waktuStruk = (iso) => new Date(iso).toLocaleString('id-ID',
  { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');

function selesaikanPenjualan() {
  const ids = Object.keys(keranjang);
  if (!ids.length) return;
  const total = totalHarga();
  const bayar = form.bayar === '' ? total : Number(form.bayar);
  if (bayar < total) return;
  const item = ids.map((id) => {
    const p = produk(id);
    return { id, nama: p.nama, satuan: p.satuan, harga: p.harga_jual, beli: p.harga_beli, qty: keranjang[id] };
  });
  catat({ aksi: 'jual', item: item.map((i) => ({ id: i.id, qty: i.qty })) });   // stok berkurang otomatis, ikut ke Google Sheets
  const riwayat = muat(KEY_RIWAYAT, []);
  strukAktif = { no: nomorStruk(riwayat), waktu: new Date().toISOString(), pelanggan: form.nama.trim(),
                 wa: form.wa.trim(), item, total, bayar, kembali: bayar - total };
  riwayat.push(strukAktif);
  simpan(KEY_RIWAYAT, riwayat.slice(-300));
  keranjang = {};
  simpan(KEY_KERANJANG, keranjang);
  form = { nama: '', wa: '', bayar: '' };
  renderGrid();
  renderBar();
  strukLama = false;
  bukaModal('struk');
}

const LEBAR = 32;   // lebar struk (karakter)
const garis = '-'.repeat(LEBAR);
const dua = (kiri, kanan) => kiri + ' '.repeat(Math.max(1, LEBAR - kiri.length - kanan.length)) + kanan;
const tengah = (s) => ' '.repeat(Math.max(0, Math.floor((LEBAR - s.length) / 2))) + s;
const bungkus = (s) => s.split(' ').reduce((b, k) => {
  const coba = (b[b.length - 1] + ' ' + k).trim();
  if (coba.length <= LEBAR) b[b.length - 1] = coba; else b.push(k);
  return b;
}, ['']);

function teksStruk(t) {
  return [
    tengah(CONFIG.nama.toUpperCase()), ...bungkus(CONFIG.alamat.replace(/No\. /g, 'No.\u00A0')).map((l) => tengah(l.replace(/\u00A0/g, ' '))), tengah('WA ' + CONFIG.waTampil), garis,
    `No    : ${t.no}`, `Waktu : ${waktuStruk(t.waktu)}`, ...(t.pelanggan ? [`Nama  : ${t.pelanggan}`] : []), garis,
    ...t.item.flatMap((i) => [i.nama, dua(`  ${i.qty} x ${rp(i.harga)}`, rp(i.harga * i.qty))]), garis,
    dua('TOTAL', rp(t.total)), dua('BAYAR', rp(t.bayar)), dua('KEMBALI', rp(t.kembali)), garis,
    tengah('Terima kasih sudah belanja!')
  ].join('\n');
}

function nomorWa(mentah) {   // 0812... atau +62812... menjadi 62812...
  let d = (mentah || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1); else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : '';
}

function renderStruk() {
  const t = strukAktif;
  const teks = teksStruk(t);
  const nomor = nomorWa(t.wa);
  const mono = '```';   // WhatsApp menampilkan teks di antara tiga backtick dengan huruf monospasi
  const href = `https://wa.me/${nomor}?text=${encodeURIComponent(`${mono}\n${teks}\n${mono}`)}`;
  $('modal-isi').innerHTML = kepala('Struk digital', 'receipt') + `
    <div class="overflow-y-auto px-4 py-3">
      ${strukLama ? '' : `<p class="mb-2 flex items-center gap-1.5 text-sm font-bold text-biru">${ic('circle-check', 'w-4 h-4')} Penjualan tersimpan, stok sudah dikurangi.</p>`}
      <pre class="overflow-x-auto rounded-2xl bg-stone-50 p-4 font-mono text-xs leading-relaxed">${esc(teks)}</pre>
      ${nomor ? '' : '<p class="mt-2 text-xs text-stone-500">Nomor pelanggan kosong atau tidak valid, jadi WhatsApp akan meminta Anda memilih kontak.</p>'}
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <a href="${href}" target="_blank" rel="noopener"
        class="flex w-full items-center justify-center gap-2 rounded-full bg-jingga py-3 font-extrabold text-stone-900">${ic('message-circle')} Kirim ke WhatsApp</a>
      <div class="flex gap-2">
        <button type="button" data-aksi="salin" class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('copy', 'w-4 h-4')} Salin struk</button>
        ${strukLama
          ? '<button type="button" data-aksi="riwayat" class="flex-1 rounded-full bg-biru py-2.5 text-sm font-bold text-white">Kembali</button>'
          : '<button type="button" data-aksi="tutup" class="flex-1 rounded-full bg-biru py-2.5 text-sm font-bold text-white">Selesai</button>'}
      </div>
    </div>`;
}

async function salinStruk(tombol) {
  try { await navigator.clipboard.writeText(teksStruk(strukAktif)); tombol.textContent = 'Tersalin'; }
  catch (e) { tombol.textContent = 'Gagal menyalin'; }
}

/* ---------- Riwayat penjualan ---------- */
const tglLokal = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const tglAktif = () => riwayatTgl || tglLokal(new Date().toISOString());
const jamStruk = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function ringkasHari(daftar) {
  let omzet = 0; let laba = 0; let barang = 0;
  const laris = {};
  daftar.forEach((t) => t.item.forEach((i) => {
    omzet += i.harga * i.qty;
    laba += (i.harga - (i.beli ?? i.harga)) * i.qty;   // laba memakai harga beli saat transaksi
    barang += i.qty;
    laris[i.nama] = (laris[i.nama] || 0) + i.qty;
  }));
  return { omzet, laba, barang, top: Object.entries(laris).sort((a, b) => b[1] - a[1]).slice(0, 3) };
}

const kotak = (label, nilai, kelas = 'bg-langit/10 text-biru') => `
  <div class="rounded-2xl p-3 ${kelas}"><p class="text-xs font-semibold text-stone-600">${label}</p>
    <p class="font-display text-xl font-extrabold">${nilai}</p></div>`;

function isiRiwayat() {
  const daftar = muat(KEY_RIWAYAT, []).filter((t) => tglLokal(t.waktu) === tglAktif()).reverse();
  if (!daftar.length) {
    return `<div class="py-12 text-center text-stone-500">${ic('receipt', 'mx-auto h-10 w-10 text-stone-400')}
      <p class="mt-3 font-bold text-stone-700">Belum ada penjualan</p>
      <p class="text-sm">Pilih tanggal lain atau selesaikan penjualan lewat Kasir.</p></div>`;
  }
  const r = ringkasHari(daftar);
  return `
    <div class="mt-3 grid grid-cols-2 gap-2">
      ${kotak('Penjualan', rp(r.omzet))}
      ${kotak('Laba', rp(r.laba), r.laba < 0 ? 'bg-tomat/10 text-tomat' : 'bg-jingga/30 text-stone-800')}
      ${kotak('Transaksi', daftar.length)}
      ${kotak('Barang terjual', r.barang)}
    </div>
    <p class="mt-3 text-sm text-stone-600"><span class="font-bold">Terlaris:</span> ${esc(r.top.map(([n, q]) => `${n} (${q})`).join(', '))}</p>
    <ul class="mt-2 divide-y divide-stone-100">${daftar.map((t) => `
      <li><button type="button" data-aksi="lihat-struk" data-id="${t.no}" class="flex w-full items-center gap-3 py-3 text-left">
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-bold">${esc(t.pelanggan || 'Tanpa nama')}</span>
          <span class="block text-xs text-stone-500">${jamStruk(t.waktu)}, ${t.item.reduce((a, i) => a + i.qty, 0)} barang, ${t.no}</span></span>
        <span class="text-sm font-extrabold">${rp(t.total)}</span>${ic('chevron-right', 'h-4 w-4 text-stone-400')}
      </button></li>`).join('')}</ul>`;
}

function renderRiwayat() {
  $('modal-isi').innerHTML = kepala('Riwayat penjualan', 'history') + `
    <div class="flex items-center gap-2 px-4 pt-3">
      <label for="tgl-riwayat" class="sr-only">Tanggal</label>
      <input id="tgl-riwayat" type="date" data-tgl="1" value="${tglAktif()}" max="${tglLokal(new Date().toISOString())}"
        class="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-base">
      <button type="button" data-aksi="hari-ini" class="rounded-full border border-stone-200 px-4 py-2.5 text-sm font-bold">Hari ini</button>
    </div>
    <div id="isi-riwayat" class="overflow-y-auto px-4 pb-4">${isiRiwayat()}</div>`;
}

const TAMPIL = { keranjang: renderKeranjang, kelola: renderKelola, pin: renderPin, kunci: renderKunci, bayar: renderBayar, struk: renderStruk, riwayat: renderRiwayat };
function renderModal() {
  TAMPIL[modalAktif]();
  icons();
}

function bukaModal(jenis) {
  modalAktif = jenis;
  if (jenis === 'kelola') kelolaQ = '';
  renderModal();
  if (!$('modal').open) $('modal').showModal();
}

function resetData() {
  if (!confirm('Kembalikan semua stok dan harga ke data awal?')) return;
  ASLI.forEach((a) => Object.assign(produk(a.id), a));
  simpanCache();
  rapikanKeranjang();
  renderGrid();
  renderBar();
  renderModal();
}

/* ---------- Footer: nama brand, kontak, sosmed, akses panel ---------- */
const SVG_SOSMED = 'class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"';
const SOSMED = [
  { id: 'facebook', nama: 'Facebook',
    svg: `<svg ${SVG_SOSMED} fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>` },
  { id: 'x', nama: 'X',
    svg: `<svg ${SVG_SOSMED} fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>` },
  { id: 'instagram', nama: 'Instagram',
    svg: `<svg ${SVG_SOSMED} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg>` },
  { id: 'tiktok', nama: 'TikTok',
    svg: `<svg ${SVG_SOSMED} fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>` },
  { id: 'threads', nama: 'Threads',
    svg: `<svg ${SVG_SOSMED} fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/></svg>` }
];

function renderFooter() {
  const tautanSosmed = SOSMED.map((s) => `
    <a href="${esc(CONFIG.sosmed[s.id] || '#')}" target="_blank" rel="noopener noreferrer"
      aria-label="${esc(CONFIG.nama)} di ${s.nama}" title="${s.nama}"
      class="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white hover:text-biru">${s.svg}</a>`).join('');

  $('app-footer').innerHTML = `
    <div class="mx-auto max-w-[480px] px-4 pb-24 pt-10 text-center">
      <div class="grid gap-8">
        <div class="flex flex-col items-center">
          <div class="flex items-center justify-center gap-2.5">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-white text-biru">${ic('store', 'w-6 h-6')}</span>
            <p class="font-display text-xl font-extrabold text-white">${esc(CONFIG.nama)}</p>
          </div>
          <p class="mt-3 max-w-xs text-sm leading-relaxed">Sembako lengkap dengan harga dan stok yang jelas. Pesan mudah lewat WhatsApp.</p>
        </div>
        <div>
          <h2 class="font-display text-base font-extrabold text-white">Hubungi kami</h2>
          <ul class="mt-3 space-y-2.5 text-sm">
            <li class="flex flex-col items-center gap-1">${ic('map-pin', 'h-4 w-4 shrink-0 text-white')}<span>${esc(CONFIG.alamat)}</span></li>
            <li class="flex items-center justify-center gap-2.5">${ic('message-circle', 'h-4 w-4 shrink-0 text-white')}
              <a href="https://wa.me/${CONFIG.waNumber}" target="_blank" rel="noopener noreferrer" class="underline-offset-2 hover:text-white hover:underline">WhatsApp ${esc(CONFIG.waTampil)}</a></li>
          </ul>
        </div>
        <div>
          <h2 class="font-display text-base font-extrabold text-white">Ikuti kami</h2>
          <div class="mt-3 flex flex-wrap justify-center gap-2.5">${tautanSosmed}</div>
        </div>
      </div>

      <div class="mt-8 flex flex-col items-center gap-1 border-t border-white/10 pt-4 text-xs text-white/60">
        <p>&copy; ${new Date().getFullYear()} ${esc(CONFIG.nama)}. Hak cipta dilindungi.</p>
        <p id="sync-info"></p>
        <a href="panel.html" aria-label="Masuk staf toko" title="Masuk staf"
          class="grid h-8 w-8 place-items-center text-white opacity-20 transition hover:opacity-100">${ic('lock', 'h-4 w-4')}</a>
      </div>
    </div>`;
  icons();
}

/* ---------- Event ---------- */
$('search').addEventListener('input', (e) => {
  state.q = e.target.value;
  $('clear').classList.toggle('hidden', !state.q);
  renderGrid();
});

$('clear').addEventListener('click', () => {
  $('search').value = '';
  state.q = '';
  $('clear').classList.add('hidden');
  renderGrid();
  $('search').focus();
});

$('chips').addEventListener('click', (e) => {
  const tombol = e.target.closest('[data-kat]');
  if (!tombol) return;
  state.kat = tombol.dataset.kat;
  renderChips();
  renderGrid();
});

/* Geser baris kategori dengan mouse (tarik ke kiri/kanan). Di layar sentuh tetap digeser dengan jari. */
(function () {
  const baris = $('chips');
  let tekan = false; let geser = false; let awalX = 0; let awalKiri = 0;
  baris.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    tekan = true; geser = false; awalX = e.clientX; awalKiri = baris.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!tekan) return;
    const dx = e.clientX - awalX;
    if (!geser && Math.abs(dx) > 5) { geser = true; baris.classList.add('menggeser'); }
    if (geser) baris.scrollLeft = awalKiri - dx;
  });
  window.addEventListener('pointerup', () => { tekan = false; baris.classList.remove('menggeser'); });
  baris.addEventListener('click', (e) => {   // setelah menggeser, jangan anggap sebagai klik kategori
    if (geser) { e.stopPropagation(); e.preventDefault(); geser = false; }
  }, true);
})();

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-aksi]');
  if (!el) return;
  const { aksi, id } = el.dataset;
  if (aksi === 'tambah') ubahQty(id, 1);
  else if (aksi === 'kurang') ubahQty(id, -1);
  else if (aksi === 'keranjang') bukaModal('keranjang');
  else if (aksi === 'kelola') butuhPin(() => bukaModal('kelola'));   // PIN keamanan untuk menu Kelola
  else if (aksi === 'kasir') butuhPin(() => bukaModal('bayar'));
  else if (aksi === 'ganti-pin') { pin = { mode: 'ganti', lanjut: () => bukaModal('kelola'), galat: '' }; bukaModal('pin'); }
  else if (aksi === 'pin-ok') prosesPin();
  else if (aksi === 'kunci-ok') prosesKunci();
  else if (aksi === 'kunci') butuhPin(() => $('modal').close());   // PIN dulu, lalu minta kunci sinkron
  else if (aksi === 'segarkan') { sinkron.galat = ''; sinkronkan(); }
  else if (aksi === 'tutup-info') { sinkron.info = ''; renderSinkron(); }
  else if (aksi === 'selesaikan') selesaikanPenjualan();
  else if (aksi === 'salin') salinStruk(el);
  else if (aksi === 'buka-riwayat') { riwayatTgl = ''; butuhPin(() => bukaModal('riwayat')); }
  else if (aksi === 'riwayat') butuhPin(() => bukaModal('riwayat'));
  else if (aksi === 'hari-ini') { riwayatTgl = ''; renderModal(); }
  else if (aksi === 'lihat-struk') {
    const t = muat(KEY_RIWAYAT, []).find((x) => x.no === id);
    if (t) { strukAktif = t; strukLama = true; bukaModal('struk'); }
  }
  else if (aksi === 'tutup') $('modal').close();
  else if (aksi === 'kosongkan') {
    if (confirm('Kosongkan keranjang?')) { keranjang = {}; simpan(KEY_KERANJANG, keranjang); perbarui(); }
  } else if (aksi === 'reset') resetData();
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'cari-kelola') {                       // pencarian di modal kelola
    kelolaQ = el.value;
    $('daftar-kelola').innerHTML = daftarKelola();
  } else if (el.dataset && el.dataset.pin) {           // PIN hanya angka
    el.value = el.value.replace(/\D/g, '');
  } else if (el.dataset && el.dataset.form) {          // form pembayaran
    if (el.dataset.form === 'bayar') el.value = el.value.replace(/\D/g, '');
    form[el.dataset.form] = el.value;
    if (el.dataset.form === 'bayar') hitungBayar();
  }
});

document.addEventListener('keydown', (e) => {          // Enter pada kolom PIN
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.pin) prosesPin();
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.kunci) prosesKunci();
});

document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.tgl) {   // ganti tanggal riwayat
    riwayatTgl = e.target.value;
    $('isi-riwayat').innerHTML = isiRiwayat();
    icons();
    return;
  }
  // simpan stok/harga yang diubah
  const el = e.target.closest('[data-field]');
  if (!el) return;
  const p = produk(el.dataset.id);
  const nilai = Math.max(0, Math.round(Number(el.value)) || 0);
  el.value = nilai;
  catat({ aksi: 'ubah', id: p.id, set: { [el.dataset.field]: nilai } });
  const laba = p.harga_jual - p.harga_beli;
  const info = el.closest('[data-row]').querySelector('[data-laba]');
  info.textContent = `Laba per ${p.satuan}: ${rp(laba)}`;
  info.className = `mt-1 text-xs ${laba < 0 ? 'font-bold text-tomat' : 'text-stone-500'}`;
  rapikanKeranjang();
  renderGrid();
  renderBar();
});

$('modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$('modal').addEventListener('close', () => { modalAktif = null; });

/* ---------- Mulai ---------- */
renderHeader();
renderFooter();
renderChips();
renderGrid();
renderBar();
renderSinkron();

if (SHEETS_AKTIF) {   // ambil data terbaru sekarang, lalu terus diperbarui
  sinkronkan();
  setInterval(() => {
    if (antrian.length || (!document.hidden && !$('modal').open)) sinkronkan();
  }, CONFIG.sinkronDetik * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sinkronkan(); });
  window.addEventListener('online', sinkronkan);
}
