/* Warung Ucox | panel/core.js | Inti panel staf: helper, API ke Google Apps Script, sesi, router, navigasi per peran */

const KEY_TOKEN = 'ucox_panel_token';   // token sesi (bukan kata sandi). Disimpan di perangkat ini saja.
const S = { token: '', pengguna: null, izin: [], toko: null, rute: '', renderId: 0 };
const AKSI = {};   // aksi tombol: data-aksi="nama"
const FORM = {};   // penanganan form: data-form="nama"
const VIEW = {};   // halaman panel: VIEW.nama = { judul, ikon, izin, html(), setelah() }

/* ---------- Helper ---------- */
const $ = (id) => document.getElementById(id);
const ic = (nama, kelas = 'w-5 h-5') => `<i data-lucide="${nama}" class="${kelas}"></i>`;
const icons = () => {
  if (!window.lucide) return;
  lucide.createIcons();
  document.querySelectorAll('svg[data-lucide]').forEach((s) => s.removeAttribute('data-lucide'));
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = (n) => (n < 0 ? '-' : '') + 'Rp' + Math.abs(Number(n) || 0).toLocaleString('id-ID');
const simpanToken = (t) => { try { t ? localStorage.setItem(KEY_TOKEN, t) : localStorage.removeItem(KEY_TOKEN); } catch (e) { /* diblokir */ } };
const bacaToken = () => { try { return localStorage.getItem(KEY_TOKEN) || ''; } catch (e) { return ''; } };
const waktuPendek = (s) => {   // "2026-11-01 10:22:11" -> "01/11 10:22"
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(String(s || ''));
  return m ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : (s || '-');
};

const PERAN = {
  owner: { nama: 'Owner', kelas: 'bg-jingga/30 text-amber-900', info: 'Akses penuh, termasuk pengguna dan pengaturan toko.' },
  admin: { nama: 'Admin', kelas: 'bg-langit/15 text-biru', info: 'Mengelola produk, stok, laporan, dan audit.' },
  kasir: { nama: 'Kasir', kelas: 'bg-stone-200 text-stone-700', info: 'Dashboard dan transaksi POS.' }
};
const FITUR = {
  dashboard: 'Dashboard', produk: 'Master produk', kategori_supplier: 'Kategori & supplier', pos: 'Transaksi POS',
  barang_masuk: 'Barang masuk', penyesuaian_stok: 'Penyesuaian stok', laporan: 'Laporan keuangan', pengeluaran: 'Pengeluaran',
  pengguna: 'Manajemen pengguna', pengaturan: 'Pengaturan toko', audit: 'Audit aktivitas'
};
const lencana = (peran) => `<span class="rounded-full px-2 py-0.5 text-[11px] font-extrabold ${(PERAN[peran] || PERAN.kasir).kelas}">${(PERAN[peran] || { nama: peran }).nama}</span>`;

const PESAN = {
  login_salah: 'Username atau kata sandi salah.',
  terkunci_sementara: 'Terlalu banyak percobaan. Coba lagi sekitar 5 menit lagi.',
  akun_nonaktif: 'Akun ini dinonaktifkan. Hubungi Owner.',
  sesi_habis: 'Sesi berakhir. Silakan masuk lagi.',
  tidak_berhak: 'Anda tidak punya hak untuk melakukan ini.',
  wajib_ganti_sandi: 'Ganti kata sandi dulu sebelum melanjutkan.',
  sibuk_coba_lagi: 'Server sedang sibuk. Coba lagi sebentar lagi.',
  kunci_salah: 'Kunci sinkron salah. Periksa huruf besar dan kecilnya.',
  kunci_belum_diatur: 'Kunci sinkron belum dibuat. Buka Google Sheets, menu Warung Ucox, Atur kunci sinkron.',
  sudah_ada_pengguna: 'Akun Owner sudah dibuat. Silakan masuk.',
  username_tidak_valid: 'Username 3 sampai 20 karakter: huruf kecil, angka, titik, garis bawah, atau strip.',
  username_terpakai: 'Username itu sudah dipakai.',
  nama_tidak_valid: 'Nama harus 2 sampai 40 karakter.',
  sandi_pendek: 'Kata sandi minimal 6 karakter.',
  sandi_panjang: 'Kata sandi maksimal 64 karakter.',
  sandi_lama_salah: 'Kata sandi lama salah.',
  sandi_sama: 'Kata sandi baru harus berbeda dari yang lama.',
  peran_tidak_valid: 'Peran tidak valid.',
  pengguna_tidak_ada: 'Pengguna tidak ditemukan.',
  tidak_boleh_ubah_diri: 'Anda tidak bisa mengubah peran atau menonaktifkan akun sendiri.',
  owner_terakhir: 'Harus ada minimal satu Owner aktif.',
  pakai_ganti_sandi: 'Untuk akun sendiri, pakai menu Akun, Ganti kata sandi.',
  nama_toko_tidak_valid: 'Nama toko harus 2 sampai 60 karakter.',
  wa_tidak_valid: 'Nomor WhatsApp harus berawalan 62, contoh 628123456789.',
  stok_menipis_tidak_valid: 'Batas stok menipis harus angka 0 sampai 9999.',
  nama_kategori_tidak_valid: 'Nama kategori harus 2 sampai 30 karakter.',
  nama_kategori_kembar: 'Nama kategori itu sudah ada.',
  ikon_tidak_valid: 'Nama ikon tidak valid. Pilih dari daftar ikon.',
  kategori_tidak_ada: 'Kategori tidak ditemukan. Muat ulang halaman lalu coba lagi.',
  kategori_dipakai: 'Kategori masih dipakai produk. Pindahkan atau hapus produk terkait dulu.',
  nama_produk_tidak_valid: 'Nama produk harus 2 sampai 60 karakter.',
  satuan_tidak_valid: 'Satuan wajib diisi (maksimal 15 karakter).',
  harga_tidak_valid: 'Harga harus berupa angka bulat (rupiah), 0 sampai 100.000.000.',
  stok_tidak_valid: 'Stok harus angka bulat 0 sampai 1.000.000.',
  barcode_tidak_valid: 'Barcode harus 6 sampai 14 angka.',
  barcode_terpakai: 'Barcode itu sudah dipakai produk lain.',
  produk_kembar: 'Produk dengan nama dan satuan yang sama sudah ada.',
  produk_tidak_ada: 'Produk tidak ditemukan. Mungkin sudah dihapus oleh pengguna lain.',
  gambar_tidak_valid: 'Tautan gambar harus diawali https:// dan tanpa tanda kutip.',
  gambar_kosong: 'Pilih foto dulu.',
  gambar_terlalu_besar: 'Foto terlalu besar. Coba foto lain.',
  gambar_format: 'Format foto tidak didukung.',
  drive_belum_diizinkan: 'Akses Google Drive belum diizinkan. Di Google Sheets, jalankan menu Warung Ucox, Izinkan akses Drive.',
  nama_supplier_tidak_valid: 'Nama supplier harus 2 sampai 60 karakter.',
  supplier_kembar: 'Supplier dengan nama itu sudah ada.',
  supplier_tidak_ada: 'Supplier tidak ditemukan.',
  telepon_tidak_valid: 'Nomor telepon hanya boleh angka, spasi, +, -, dan tanda kurung.',
  termin_tidak_valid: 'Termin bayar harus 0 sampai 365 hari.',
  aksi_tidak_dikenal: 'Fitur ini belum tersedia di server. Pastikan Code.gs terbaru sudah di-deploy (New version).',
  item_kosong: 'Tambahkan minimal satu barang.',
  item_terlalu_banyak: 'Maksimal 50 barang per penerimaan.',
  item_kembar: 'Ada barang yang dimasukkan dua kali. Gabungkan jumlahnya.',
  jumlah_tidak_valid: 'Jumlah harus angka bulat lebih dari 0.',
  stok_melebihi_batas: 'Stok akan melebihi batas 1.000.000.',
  stok_tidak_cukup: 'Stok tidak cukup untuk dikurangi sebanyak itu.',
  jenis_tidak_valid: 'Pilih jenis penyesuaian.',
  catatan_wajib: 'Catatan wajib diisi (minimal 3 huruf) untuk jenis ini.',
  tidak_ada_perubahan: 'Hasil hitung sama dengan stok saat ini. Tidak ada yang diubah.',
  stok_min_tidak_valid: 'Stok minimum harus angka 0 sampai 100.000, atau kosongkan untuk memakai batas toko.',
  jaringan: 'Tidak bisa terhubung ke Google Sheets. Periksa internet lalu coba lagi.'
};
const pesanGalat = (e) => {
  const dasar = pesanDasar(e); const d = (e && e.data) || {};
  const p = d.produk_id && typeof M !== 'undefined' ? M.produk.find((x) => x.id === d.produk_id) : null;
  return dasar + (p ? ` (${p.nama})` : '') + (d.tersedia !== undefined ? ` Stok tersedia: ${d.tersedia}.` : '');
};
const pesanDasar = (e) => PESAN[e && e.kode] || (e && e.kode && e.kode.startsWith('galat_server') ? 'Server menolak permintaan: ' + e.kode.replace('galat_server: ', '') : 'Terjadi kesalahan. Coba lagi.');

/* ---------- API ke Google Apps Script ---------- */
async function api(aksi, data = {}) {
  const kontrol = new AbortController();
  const batas = setTimeout(() => kontrol.abort(), 30000);
  let j;
  try {
    const r = await fetch(CONFIG.sheetsUrl, { method: 'POST', body: JSON.stringify({ aksi, token: S.token, ...data }), signal: kontrol.signal });
    j = await r.json();
  } catch (e) {
    const err = new Error('jaringan'); err.kode = 'jaringan'; throw err;
  } finally { clearTimeout(batas); }
  if (!j || !j.ok) {
    const err = new Error((j && j.galat) || 'server'); err.kode = (j && j.galat) || 'server'; err.data = j || {};
    if (err.kode === 'sesi_habis' && S.pengguna) keluarLokal(PESAN.sesi_habis);
    throw err;
  }
  return j;
}

/* ---------- UI umum ---------- */
let timerToast = 0;
function toast(teks, galat = false) {
  const el = $('toast');
  el.innerHTML = `<div class="mx-auto flex w-fit max-w-[440px] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg ${galat ? 'bg-tomat' : 'bg-malam'}">${ic(galat ? 'triangle-alert' : 'circle-check', 'w-4 h-4 shrink-0')}<span>${esc(teks)}</span></div>`;
  el.classList.remove('hidden'); icons();
  clearTimeout(timerToast); timerToast = setTimeout(() => el.classList.add('hidden'), 3200);
}

const kepala = (judul, ikon) => `
  <div class="flex items-center justify-between border-b border-stone-100 px-4 py-3">
    <h2 class="flex items-center gap-2 font-display text-xl font-extrabold text-biru">${ic(ikon)}${esc(judul)}</h2>
    <button type="button" data-aksi="tutup" aria-label="Tutup" class="grid h-9 w-9 place-items-center rounded-full bg-stone-100">${ic('x')}</button>
  </div>`;
const kakiStyle = 'padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem)';
function bukaModal(html) { $('modal-isi').innerHTML = html; icons(); if (!$('modal').open) $('modal').showModal(); }
function tutupModal() { if ($('modal').open) $('modal').close(); }
AKSI.tutup = () => tutupModal();
$('modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) tutupModal(); });

const kolom = (nama, label, o = {}) => `
  <label class="block text-sm font-semibold text-stone-600">${label}
    <input name="${nama}" type="${o.tipe || 'text'}" ${o.wajib === false ? '' : 'required'} value="${esc(o.nilai || '')}" placeholder="${esc(o.contoh || '')}"
      autocomplete="${o.auto || 'off'}" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.maks ? `maxlength="${o.maks}"` : ''} ${o.min ? `minlength="${o.min}"` : ''}
      ${o.nonaktif ? 'disabled' : ''} autocapitalize="none" spellcheck="false"
      class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base font-semibold text-stone-800 disabled:bg-stone-100 disabled:text-stone-500">
    ${o.bantu ? `<span class="mt-1 block text-xs font-normal text-stone-500">${o.bantu}</span>` : ''}
  </label>`;
const kolomSandi = (nama, label, auto = 'new-password', bantu = '') => `
  <label class="block text-sm font-semibold text-stone-600">${label}
    <span class="relative mt-1 block">
      <input name="${nama}" type="password" required minlength="6" maxlength="64" autocomplete="${auto}" autocapitalize="none" spellcheck="false"
        class="w-full rounded-xl border border-stone-200 py-2.5 pl-3 pr-11 text-base font-semibold text-stone-800">
      <button type="button" data-aksi="lihat-sandi" aria-label="Tampilkan kata sandi" class="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500">${ic('eye', 'w-5 h-5')}</button>
    </span>
    ${bantu ? `<span class="mt-1 block text-xs font-normal text-stone-500">${bantu}</span>` : ''}
  </label>`;
AKSI['lihat-sandi'] = (el) => {
  const inp = el.parentElement.querySelector('input'); if (!inp) return;
  const buka = inp.type === 'password'; inp.type = buka ? 'text' : 'password';
  el.innerHTML = ic(buka ? 'eye-off' : 'eye', 'w-5 h-5'); icons();
};

const galatForm = (form, teks) => { const p = form.querySelector('[data-galat]'); if (p) p.textContent = teks || ''; };
async function jalankan(form, teksSibuk, fn) {   // kunci tombol kirim selama proses, tampilkan galat di form
  const tombol = form.querySelector('[type="submit"]');
  const awal = tombol ? tombol.innerHTML : '';
  if (tombol) { tombol.disabled = true; tombol.textContent = teksSibuk; }
  galatForm(form, '');
  try { return await fn(); }
  catch (e) { galatForm(form, pesanGalat(e)); return null; }
  finally { if (tombol && tombol.isConnected) { tombol.disabled = false; tombol.innerHTML = awal; icons(); } }
}

const kartuKosong = (ikon, judul, teks) => `<div class="py-12 text-center text-stone-500">${ic(ikon, 'mx-auto h-10 w-10 text-stone-400')}
  <p class="mt-3 font-bold text-stone-700">${esc(judul)}</p><p class="text-sm">${esc(teks)}</p></div>`;
const memuatHtml = `<div class="py-20 text-center text-stone-500">${ic('refresh-cw', 'mx-auto h-8 w-8 animate-spin text-stone-400')}<p class="mt-3 text-sm font-semibold">Memuat...</p></div>`;

/* ---------- Event bersama ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-aksi]'); if (!el) return;
  const f = AKSI[el.dataset.aksi];
  if (f) { if (el.tagName !== 'A' || !el.getAttribute('href')) e.preventDefault(); f(el, e); }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const h = FORM[f.dataset.form]; if (h) h(f, Object.fromEntries(new FormData(f)));
});

/* ---------- Cangkang: header, navigasi, router ---------- */
const bolehLihat = (v) => !v.izin || S.izin.includes(v.izin);

function renderHeader() {
  const nama = (S.toko && S.toko.nama_toko) || CONFIG.nama;
  $('p-header').innerHTML = `
    <div class="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-3 md:max-w-3xl">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-biru text-white">${ic('store', 'w-6 h-6')}</span>
      <div class="min-w-0">
        <h1 class="truncate font-display text-lg font-extrabold leading-tight text-biru">${esc(nama)}</h1>
        <p class="text-xs font-semibold text-stone-500">Panel staf</p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        ${S.pengguna ? `<a href="index.html" aria-label="Lihat toko" title="Lihat toko" class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-600 transition hover:bg-langit/10 hover:text-biru">${ic('external-link')}</a>` : ''}
      </div>
    </div>`;
  icons();
}

function kelompokNav() {
  const semua = Object.entries(VIEW).filter(([, v]) => v.nav !== false && bolehLihat(v));
  return { utama: semua.filter(([, v]) => v.grup !== 'lainnya'), lain: semua.filter(([, v]) => v.grup === 'lainnya') };
}

function renderNav() {
  const { utama, lain } = kelompokNav();
  const item = utama.slice();
  if (lain.length === 1) item.push(lain[0]); else if (lain.length) item.push(['lainnya', VIEW.lainnya]);   // halaman sekunder dikumpulkan di "Lainnya"
  const nav = $('p-nav');
  nav.classList.toggle('hidden', !S.pengguna);
  if (!S.pengguna) return;
  nav.innerHTML = `
    <div class="mx-auto flex max-w-[480px] items-stretch justify-around border-t border-stone-200 bg-white px-2 pt-1.5 shadow-[0_-4px_16px_rgba(16,24,40,.06)] md:max-w-3xl">
      ${item.map(([k, v]) => {
        const aktif = k === S.rute || (k === 'lainnya' && lain.some(([n]) => n === S.rute));
        return `<button type="button" data-aksi="pindah" data-ke="${k}" aria-current="${aktif ? 'page' : 'false'}"
          class="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-bold transition ${aktif ? 'text-biru' : 'text-stone-500 hover:bg-latar'}">
          <span class="grid h-7 w-12 place-items-center rounded-full transition ${aktif ? 'bg-langit/15' : ''}">${ic(v.ikon, 'w-5 h-5')}</span>${esc(v.judul)}</button>`;
      }).join('')}
    </div>`;
  icons();
}

VIEW.lainnya = {
  judul: 'Lainnya', ikon: 'ellipsis', nav: false,
  async html() {
    const { lain } = kelompokNav();
    return `<div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl">
      <h2 class="font-display text-xl font-extrabold">Menu lainnya</h2>
      <ul class="mt-3 divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
        ${lain.map(([k, v]) => `<li><button type="button" data-aksi="pindah" data-ke="${k}" class="flex w-full items-center gap-3 py-3.5 text-left">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-langit/15 text-biru">${ic(v.ikon, 'w-5 h-5')}</span>
          <span class="min-w-0 flex-1"><span class="block text-sm font-bold">${esc(v.judulPanjang || v.judul)}</span><span class="block text-xs text-stone-500">${esc(v.info || '')}</span></span>
          ${ic('chevron-right', 'h-4 w-4 shrink-0 text-stone-400')}</button></li>`).join('')}
      </ul></div>`;
  }
};
AKSI.pindah = (el) => { if (location.hash === '#' + el.dataset.ke) tampilRute(); else location.hash = el.dataset.ke; };

async function tampilRute() {
  if (!S.pengguna) return;
  const minta = (location.hash || '').slice(1);
  const nama = VIEW[minta] && bolehLihat(VIEW[minta]) ? minta : 'dashboard';
  S.rute = nama;
  const id = ++S.renderId;
  renderNav();
  $('p-main').innerHTML = memuatHtml; icons();
  let html;
  try { html = await VIEW[nama].html(); }
  catch (e) {
    if (id !== S.renderId || !S.pengguna) return;
    html = `<div class="px-4 pt-6">${kartuKosong('cloud-off', 'Halaman belum bisa dimuat', pesanGalat(e))}
      <div class="text-center"><button type="button" data-aksi="muat-ulang" class="rounded-full bg-biru px-6 py-2.5 text-sm font-bold text-white">Coba lagi</button></div></div>`;
  }
  if (id !== S.renderId) return;   // pengguna sudah pindah halaman
  $('p-main').innerHTML = html; icons();
  if (VIEW[nama].setelah) VIEW[nama].setelah();
  window.scrollTo(0, 0);
}
AKSI['muat-ulang'] = () => tampilRute();
window.addEventListener('hashchange', tampilRute);
