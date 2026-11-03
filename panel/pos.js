/* Warung Ucox | panel/pos.js | Point of Sale: produk, keranjang, diskon, pembayaran, struk, riwayat transaksi */

const P = { produk: [], kategori: [], cfg: { diskon_maks_kasir: 10, jual_stok_kurang: false, pembulatan: 0 }, toko: {}, q: '', kat: 'semua',
  cart: [], dt: { jenis: 'persen', nilai: 0 }, catatan: '', idKlien: '', metode: 'tunai', bayar: '', modal: '', tgl: '', terakhir: null };
const angkaPos = (v) => Number(String(v ?? '').replace(/\D/g, '')) || 0;
const produkPos = (id) => P.produk.find((p) => p.id === id);
const kasirSaja = () => S.pengguna.peran === 'kasir';

/* ---------- Keranjang tersimpan di perangkat (draf saja; transaksi sebenarnya disimpan di Google Sheets) ---------- */
const KEY_KRJ = () => 'ucox_keranjang_' + (S.pengguna ? S.pengguna.id : 'x');
function simpanKrj() { try { localStorage.setItem(KEY_KRJ(), JSON.stringify({ cart: P.cart, dt: P.dt, catatan: P.catatan })); } catch (e) { /* diblokir */ } }
function muatKrj() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY_KRJ()) || 'null');
    if (!j || !Array.isArray(j.cart)) return;
    P.cart = j.cart.filter((c) => produkPos(c.id) && Number.isInteger(c.qty) && c.qty > 0).map((c) => ({ id: c.id, qty: c.qty, diskon: angkaPos(c.diskon), buka: !!c.buka }));
    P.dt = j.dt && ['persen', 'rupiah'].includes(j.dt.jenis) ? { jenis: j.dt.jenis, nilai: angkaPos(j.dt.nilai) } : { jenis: 'persen', nilai: 0 };
    P.catatan = String(j.catatan || '').slice(0, 100);
  } catch (e) { /* draf rusak: abaikan */ }
}
function kosongkanKrj() { P.cart = []; P.dt = { jenis: 'persen', nilai: 0 }; P.catatan = ''; P.idKlien = ''; P.bayar = ''; simpanKrj(); }
const ubahKrj = () => { P.idKlien = ''; simpanKrj(); };   // isi keranjang berubah = permintaan baru (kunci anti-ganda diganti)

function kosongPosMemori() { P.produk = []; P.cart = []; P.dt = { jenis: 'persen', nilai: 0 }; P.catatan = ''; P.idKlien = ''; P.bayar = ''; P.q = ''; P.kat = 'semua'; P.modal = ''; P.struk = null; P.terakhir = null; }   // dipanggil saat keluar: tak ada keranjang yang terbawa ke pengguna berikutnya

/* ---------- Hitungan uang: SAMA PERSIS dengan hitungTrx_() di Code.gs ---------- */
function hitungPos(metode = 'tunai') {
  let kotor = 0, dItem = 0;
  P.cart.forEach((c) => { const p = produkPos(c.id); const bruto = p.harga_jual * c.qty; kotor += bruto; dItem += Math.min(c.diskon, bruto); });
  const setelah = kotor - dItem; const v = angkaPos(P.dt.nilai);
  const dTrx = P.dt.jenis === 'persen' ? Math.floor(setelah * Math.min(100, v) / 100) : Math.min(v, setelah);
  const total = setelah - dTrx; const unit = P.cfg.pembulatan;
  const pembulatan = metode === 'tunai' && unit > 0 ? Math.ceil(total / unit) * unit - total : 0;
  return { kotor, dItem, dTrx, total, pembulatan, tagihan: total + pembulatan, pct: kotor ? (dItem + dTrx) * 100 / kotor : 0, jumlah: P.cart.reduce((a, c) => a + c.qty, 0) };
}
const melebihiBatas = (h) => kasirSaja() && h.kotor > 0 && (h.dItem + h.dTrx) * 100 > h.kotor * P.cfg.diskon_maks_kasir;

/* ---------- Memuat data ---------- */
async function muatProdukPos() {
  const r = await api('pos_produk');
  P.produk = r.produk; P.kategori = r.kategori; P.cfg = r.cfg; P.toko = r.toko;
  P.cart = P.cart.filter((c) => produkPos(c.id));   // produk yang dihapus pemilik hilang dari keranjang
}
VIEW.pos = {
  judul: 'Kasir', ikon: 'shopping-cart', izin: 'pos',
  async html() { await muatProdukPos(); if (!P.cart.length) muatKrj(); return kerangkaPos(); },
  setelah() { if (window.matchMedia && matchMedia('(pointer:fine)').matches) { const i = $('cari-pos'); if (i) i.focus(); } }
};

/* ---------- Tampilan utama ---------- */
const fotoPos = (p) => `<span class="relative grid h-[4.25rem] w-full place-items-center overflow-hidden bg-latar text-stone-300">${ic(ikonAman((P.kategori.find((k) => k.id === p.kategori) || {}).ikon), 'w-7 h-7')}
  ${fotoSah(p.gambar) ? `<img src="${esc(p.gambar)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" class="absolute inset-0 h-full w-full object-cover">` : ''}</span>`;
function kartuProduk(p) {
  const di = P.cart.find((c) => c.id === p.id); const habis = p.stok <= 0 && !P.cfg.jual_stok_kurang;
  return `<button type="button" data-aksi="pos-tambah" data-id="${esc(p.id)}" ${habis ? 'disabled aria-disabled="true"' : ''}
    class="relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5 transition active:scale-[.98] ${habis ? 'opacity-50' : ''}">
    ${fotoPos(p)}
    <span class="flex flex-1 flex-col p-2.5">
      <span class="text-sm font-bold leading-tight" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.1rem">${esc(p.nama)}</span>
      <span class="mt-1 flex items-center justify-between gap-1"><span class="text-sm font-extrabold text-biru">${rp(p.harga_jual)}</span>
        <span class="text-[11px] font-bold ${p.stok <= 0 ? 'text-tomat' : 'text-stone-500'}">${p.stok <= 0 ? 'Habis' : p.stok + ' ' + esc(p.satuan)}</span></span>
    </span>
    ${di ? `<span data-lencana class="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-biru px-1.5 text-xs font-extrabold text-white shadow">${di.qty}</span>` : ''}
  </button>`;
}
function produkPosTersaring() {
  const q = P.q.trim().toLowerCase();
  return P.produk.filter((p) => (P.kat === 'semua' || p.kategori === P.kat) && (!q || `${p.nama} ${p.barcode}`.toLowerCase().includes(q)));
}
function isiProdukPos() {
  const chip = (id, nama) => `<button type="button" data-aksi="pos-filter" data-id="${esc(id)}" class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${P.kat === id ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${esc(nama)}</button>`;
  const d = produkPosTersaring();
  return `<div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">${chip('semua', 'Semua')}${P.kategori.map((k) => chip(k.id, k.nama)).join('')}</div>
    ${d.length ? `<div class="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">${d.map(kartuProduk).join('')}</div>` : kartuKosong('search-x', 'Produk tidak ditemukan', 'Coba kata kunci lain atau pindai barcode.')}`;
}
function barKeranjang() {
  if (!P.cart.length) return '';
  const h = hitungPos();
  return `<div class="sticky z-10 mt-3 lg:hidden" style="bottom: calc(env(safe-area-inset-bottom, 0px) + 5rem)">
    <button type="button" data-aksi="pos-keranjang" class="flex w-full items-center justify-between rounded-full bg-biru px-5 py-3.5 text-white shadow-[0_6px_20px_rgba(15,120,176,.45)]">
      <span class="flex items-center gap-2 font-bold">${ic('shopping-cart', 'w-5 h-5')}${h.jumlah} barang</span><span class="font-display text-lg font-extrabold">${rp(h.total)}</span></button></div>`;
}
function kerangkaPos() {
  return `
  <div class="mx-auto max-w-[480px] px-4 pt-4 md:max-w-3xl lg:max-w-6xl">
    <div class="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-5">
      <section>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">${ic('search', 'w-5 h-5')}</span>
            <input id="cari-pos" type="search" autocomplete="off" value="${esc(P.q)}" placeholder="Cari atau pindai barcode" class="h-12 w-full rounded-full border border-stone-200 bg-white pl-12 pr-4 text-base"></div>
          ${bisaScan() ? `<button type="button" data-aksi="pos-scan" aria-label="Pindai dengan kamera" class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-biru text-white">${ic('scan-barcode', 'w-5 h-5')}</button>` : ''}
          <button type="button" data-aksi="pos-riwayat" aria-label="Riwayat transaksi" title="Riwayat transaksi" class="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-stone-200 bg-white text-stone-600">${ic('history', 'w-5 h-5')}</button>
        </div>
        <div id="wrap-pos" class="mt-3">${isiProdukPos()}</div>
      </section>
      <aside id="panel-krj" class="hidden lg:sticky lg:top-20 lg:block">${htmlKeranjang()}</aside>
    </div>
    <div id="bar-krj">${barKeranjang()}</div>
  </div>`;
}

/* ---------- Keranjang ---------- */
function barisKrj(c) {
  const p = produkPos(c.id); const bruto = p.harga_jual * c.qty;
  return `<li class="py-3">
    <div class="flex items-start justify-between gap-2">
      <span class="min-w-0"><span class="block truncate text-sm font-bold">${esc(p.nama)}</span><span class="block text-xs text-stone-500">${rp(p.harga_jual)} / ${esc(p.satuan)}</span></span>
      <span class="shrink-0 text-sm font-extrabold" data-sub="${esc(c.id)}">${rp(bruto - Math.min(c.diskon, bruto))}</span></div>
    <div class="mt-2 flex items-center gap-1.5">
      <button type="button" data-aksi="pos-minus" data-id="${esc(c.id)}" aria-label="Kurangi ${esc(p.nama)}" class="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-stone-700">${ic('minus', 'w-4 h-4')}</button>
      <input data-pos="qty" data-id="${esc(c.id)}" inputmode="numeric" maxlength="5" value="${c.qty}" aria-label="Jumlah ${esc(p.nama)}" class="h-9 w-14 rounded-lg border border-stone-200 text-center text-base font-bold">
      <button type="button" data-aksi="pos-plus" data-id="${esc(c.id)}" aria-label="Tambah ${esc(p.nama)}" class="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-stone-700">${ic('plus', 'w-4 h-4')}</button>
      <button type="button" data-aksi="pos-diskon-item" data-id="${esc(c.id)}" class="ml-auto inline-flex items-center gap-1 text-xs font-bold ${c.diskon > 0 ? 'text-tomat' : 'text-biru'}">${ic('tag', 'w-3.5 h-3.5')}<span data-dlabel="${esc(c.id)}">${c.diskon > 0 ? 'Diskon ' + rp(c.diskon) : 'Diskon'}</span></button>
      <button type="button" data-aksi="pos-hapus" data-id="${esc(c.id)}" aria-label="Hapus ${esc(p.nama)}" class="grid h-8 w-8 place-items-center rounded-full text-stone-400">${ic('x', 'w-4 h-4')}</button>
    </div>
    ${c.buka ? `<label class="mt-2 block text-xs font-semibold text-stone-500">Potongan harga untuk barang ini (Rp)
      <input data-pos="diskon-item" data-id="${esc(c.id)}" inputmode="numeric" maxlength="9" value="${c.diskon || ''}" placeholder="0" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-base font-bold"></label>` : ''}
  </li>`;
}
function htmlTotalKrj(h, lebih) {
  return `<dl class="space-y-1 text-sm">
      <div class="flex justify-between text-stone-600"><dt>Subtotal</dt><dd data-total="kotor">${rp(h.kotor)}</dd></div>
      <div class="flex justify-between text-stone-600"><dt>Diskon</dt><dd data-total="diskon">-${rp(h.dItem + h.dTrx)}</dd></div>
      <div class="flex items-baseline justify-between pt-1"><dt class="font-bold">Total</dt><dd data-total="total" class="font-display text-2xl font-extrabold text-biru">${rp(h.total)}</dd></div>
    </dl>
    <button type="button" data-aksi="pos-bayar" ${lebih ? 'disabled' : ''} class="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3.5 text-lg font-extrabold text-white disabled:opacity-40">${ic('wallet', 'w-5 h-5')} Bayar</button>`;
}
function htmlIsiKrj(h, lebih, judul) {
  return `<div class="flex items-center justify-between">${judul ? `<h3 class="font-display text-lg font-extrabold">Keranjang <span class="text-sm font-bold text-stone-500">(${h.jumlah})</span></h3>` : `<span class="text-sm font-bold text-stone-500">${h.jumlah} barang</span>`}
      <button type="button" data-aksi="pos-kosongkan" class="text-sm font-bold text-tomat">Kosongkan</button></div>
    <ul class="mt-1 divide-y divide-stone-100">${P.cart.map(barisKrj).join('')}</ul>
    <div class="mt-2 border-t border-stone-100 pt-3">
      <p class="text-sm font-semibold text-stone-600">Diskon transaksi</p>
      <div class="mt-1 flex gap-2">
        <select data-pos="dt-jenis" aria-label="Jenis diskon" class="w-[7.5rem] shrink-0 rounded-xl border border-stone-200 bg-white px-2 py-2 text-base font-semibold"><option value="persen" ${P.dt.jenis === 'persen' ? 'selected' : ''}>Persen</option><option value="rupiah" ${P.dt.jenis === 'rupiah' ? 'selected' : ''}>Rupiah</option></select>
        <input data-pos="dt-nilai" inputmode="numeric" maxlength="9" value="${P.dt.nilai || ''}" placeholder="0" aria-label="Nilai diskon" class="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-base font-bold"></div>
      <p data-peringatan class="mt-1 text-xs font-bold text-tomat ${lebih ? '' : 'hidden'}">Diskon ${Math.round(h.pct * 10) / 10}% melebihi batas kasir (${P.cfg.diskon_maks_kasir}%). Minta Admin atau Owner.</p>
      ${kasirSaja() && !lebih ? `<p class="mt-1 text-[11px] text-stone-400">Batas diskon kasir ${P.cfg.diskon_maks_kasir}%.</p>` : ''}
    </div>
    <label class="mt-3 block text-sm font-semibold text-stone-600">Catatan <span class="text-xs font-normal text-stone-400">(opsional)</span>
      <input data-pos="catatan" maxlength="100" value="${esc(P.catatan)}" autocomplete="off" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-base"></label>`;
}
const kosongKrj = () => `<div class="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${kartuKosong('shopping-cart', 'Keranjang kosong', 'Ketuk produk atau pindai barcode untuk memulai.')}</div>`;
function htmlKeranjang() {   // panel samping (layar lebar): isi dan total dalam satu kartu
  if (!P.cart.length) return kosongKrj();
  const h = hitungPos(); const lebih = melebihiBatas(h);
  return `<div class="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${htmlIsiKrj(h, lebih, true)}<div class="mt-3 border-t border-stone-100 pt-3">${htmlTotalKrj(h, lebih)}</div></div>`;
}
function segarLencana() {   // lencana jumlah di kartu produk diperbarui tanpa mengganti elemen (agar ketukan yang sedang berlangsung tidak hilang)
  document.querySelectorAll('#wrap-pos [data-aksi=pos-tambah]').forEach((b) => {
    const c = P.cart.find((x) => x.id === b.dataset.id); let t = b.querySelector('[data-lencana]');
    if (!c) { if (t) t.remove(); return; }
    if (!t) { t = document.createElement('span'); t.setAttribute('data-lencana', ''); t.className = 'absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-biru px-1.5 text-xs font-extrabold text-white shadow'; b.appendChild(t); }
    t.textContent = c.qty;
  });
}
function segarTotal() {   // hitung ulang angka tanpa menggambar ulang (fokus ketikan tetap)
  const h = hitungPos(); const lebih = melebihiBatas(h);
  document.querySelectorAll('[data-total=kotor]').forEach((e) => { e.textContent = rp(h.kotor); });
  document.querySelectorAll('[data-total=diskon]').forEach((e) => { e.textContent = '-' + rp(h.dItem + h.dTrx); });
  document.querySelectorAll('[data-total=total]').forEach((e) => { e.textContent = rp(h.total); });
  document.querySelectorAll('[data-sub]').forEach((e) => { const c = P.cart.find((x) => x.id === e.dataset.sub); if (c) { const b = produkPos(c.id).harga_jual * c.qty; e.textContent = rp(b - Math.min(c.diskon, b)); } });
  document.querySelectorAll('[data-dlabel]').forEach((e) => { const c = P.cart.find((x) => x.id === e.dataset.dlabel); if (c) e.textContent = c.diskon > 0 ? 'Diskon ' + rp(c.diskon) : 'Diskon'; });
  segarLencana();
  document.querySelectorAll('[data-peringatan]').forEach((e) => { e.classList.toggle('hidden', !lebih); e.textContent = `Diskon ${Math.round(h.pct * 10) / 10}% melebihi batas kasir (${P.cfg.diskon_maks_kasir}%). Minta Admin atau Owner.`; });
  document.querySelectorAll('[data-aksi=pos-bayar]').forEach((b) => { b.disabled = lebih; });
  const bar = $('bar-krj'); if (bar) { bar.innerHTML = barKeranjang(); icons(); }
}
function segarPos() {
  if (S.rute === 'pos') {
    const w = $('wrap-pos'); if (w) w.innerHTML = isiProdukPos();
    const a = $('panel-krj'); if (a) a.innerHTML = htmlKeranjang();
    const b = $('bar-krj'); if (b) b.innerHTML = barKeranjang();
  }
  if (P.modal === 'krj' && $('modal').open) $('modal-isi').innerHTML = htmlModalKeranjang();
  icons();
}
function htmlModalKeranjang() {   // HP: daftar bisa di-scroll, total + tombol Bayar selalu terlihat di bawah
  if (!P.cart.length) return kepala('Keranjang', 'shopping-cart') + `<div class="px-4 py-3" style="${kakiStyle}">${kosongKrj()}</div>`;
  const h = hitungPos(); const lebih = melebihiBatas(h);
  return kepala('Keranjang', 'shopping-cart') + `<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">${htmlIsiKrj(h, lebih, false)}</div>
    <div class="border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">${htmlTotalKrj(h, lebih)}</div>`;
}

/* ---------- Aksi: produk & keranjang ---------- */
function tambahKrj(id) {
  const p = produkPos(id); if (!p) return false;
  const c = P.cart.find((x) => x.id === id); const maks = P.cfg.jual_stok_kurang ? 10000 : p.stok;
  if ((c ? c.qty : 0) + 1 > maks) { toast(p.stok <= 0 ? `${p.nama} habis.` : `Stok ${p.nama} tinggal ${p.stok}.`, true); return false; }
  if (c) c.qty++; else P.cart.push({ id, qty: 1, diskon: 0, buka: false });
  ubahKrj(); return true;
}
AKSI['pos-tambah'] = (el) => { if (tambahKrj(el.dataset.id)) segarPos(); };
AKSI['pos-filter'] = (el) => { P.kat = el.dataset.id; $('wrap-pos').innerHTML = isiProdukPos(); icons(); };
AKSI['pos-plus'] = (el) => { if (tambahKrj(el.dataset.id)) segarPos(); };
AKSI['pos-minus'] = (el) => { const c = P.cart.find((x) => x.id === el.dataset.id); if (!c) return; if (c.qty <= 1) P.cart = P.cart.filter((x) => x !== c); else c.qty--; ubahKrj(); segarPos(); };
AKSI['pos-hapus'] = (el) => { P.cart = P.cart.filter((x) => x.id !== el.dataset.id); ubahKrj(); segarPos(); };
AKSI['pos-diskon-item'] = (el) => { const c = P.cart.find((x) => x.id === el.dataset.id); if (c) { c.buka = !c.buka; simpanKrj(); segarPos(); } };
AKSI['pos-kosongkan'] = () => { kosongkanKrj(); if (P.modal === 'krj') tutupModal(); segarPos(); };
AKSI['pos-keranjang'] = () => { P.modal = 'krj'; bukaModal(htmlModalKeranjang()); };
$('modal').addEventListener('close', () => { P.modal = ''; });

document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.pos; if (!k) return;
  const c = P.cart.find((x) => x.id === e.target.dataset.id);
  if (k === 'qty' && c) { const p = produkPos(c.id), maks = P.cfg.jual_stok_kurang ? 10000 : p.stok; let n = angkaPos(e.target.value); if (n > maks) { n = maks; toast(`Stok ${p.nama} tinggal ${p.stok}.`, true); } c.qty = Math.max(1, n); if (e.target.value !== '' && String(n) !== e.target.value) e.target.value = String(n); c.diskon = Math.min(c.diskon, p.harga_jual * c.qty); }
  else if (k === 'diskon-item' && c) { c.diskon = Math.min(angkaPos(e.target.value), produkPos(c.id).harga_jual * c.qty); if (e.target.value !== '' && String(c.diskon) !== e.target.value) e.target.value = String(c.diskon); }
  else if (k === 'dt-nilai') { let n = angkaPos(e.target.value); if (P.dt.jenis === 'persen' && n > 100) n = 100; P.dt.nilai = n; if (e.target.value !== '' && String(n) !== e.target.value) e.target.value = String(n); }
  else if (k === 'catatan') { P.catatan = e.target.value.slice(0, 100); simpanKrj(); return; }
  else return;
  ubahKrj(); segarTotal();
});
document.addEventListener('change', (e) => {   // JANGAN menggambar ulang di sini: perubahan terjadi saat fokus pindah, dan ketukan pengguna pada tombol lain akan hilang
  const k = e.target.dataset && e.target.dataset.pos; if (k !== 'dt-jenis') return;
  P.dt.jenis = e.target.value; if (P.dt.jenis === 'persen' && P.dt.nilai > 100) { P.dt.nilai = 100; document.querySelectorAll('[data-pos=dt-nilai]').forEach((i) => { i.value = '100'; }); }
  document.querySelectorAll('[data-pos=dt-jenis]').forEach((i) => { i.value = P.dt.jenis; });
  ubahKrj(); segarTotal();
});
document.addEventListener('input', (e) => { if (e.target.id === 'cari-pos') { P.q = e.target.value; $('wrap-pos').innerHTML = isiProdukPos(); icons(); } });
document.addEventListener('keydown', (e) => {   // pemindai USB mengetik barcode lalu Enter: langsung masuk keranjang
  if (e.target.id !== 'cari-pos' || e.key !== 'Enter') return;
  e.preventDefault(); const kode = e.target.value.trim(); if (!kode) return;
  const p = P.produk.find((x) => x.barcode === kode);
  if (p) { if (tambahKrj(p.id)) { toast(`${p.nama} ditambahkan.`); } P.q = ''; e.target.value = ''; segarPos(); }
  else { const d = produkPosTersaring(); if (d.length === 1) { if (tambahKrj(d[0].id)) { P.q = ''; e.target.value = ''; segarPos(); } } else toast('Barcode tidak dikenal.', true); }
});
AKSI['pos-scan'] = () => mulaiScan((kode) => {
  tutupModal(); const p = P.produk.find((x) => x.barcode === kode);
  if (p) { if (tambahKrj(p.id)) toast(`${p.nama} ditambahkan.`); segarPos(); } else toast(`Barcode ${kode} tidak dikenal.`, true);
}, () => tutupModal());

/* ---------- Pembayaran ---------- */
const METODE = { tunai: ['Tunai', 'banknote'], qris: ['QRIS', 'qr-code'], transfer: ['Transfer', 'landmark'] };
function uangCepat(tagihan) {
  const s = new Set();
  [5000, 10000, 20000, 50000, 100000].forEach((d) => { const v = Math.ceil(tagihan / d) * d; if (v > tagihan) s.add(v); });
  return [...s].slice(0, 3);
}
function htmlBayar() {
  const h = hitungPos(P.metode); const tunai = P.metode === 'tunai'; const diterima = angkaPos(P.bayar);
  return kepala('Pembayaran', 'wallet') + `
  <form id="form-bayar" data-form="bayar" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <div class="rounded-2xl bg-latar p-4 text-center"><p class="text-sm font-bold text-stone-500">Total tagihan</p>
        <p class="font-display text-4xl font-black text-biru" data-total="tagihan">${rp(h.tagihan)}</p>
        ${h.pembulatan ? `<p class="text-xs text-stone-500">sudah termasuk pembulatan ${rp(h.pembulatan)}</p>` : ''}</div>
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Metode pembayaran">
        ${Object.entries(METODE).map(([k, v]) => `<button type="button" role="radio" aria-checked="${k === P.metode}" data-aksi="pos-metode" data-m="${k}"
          class="flex flex-col items-center gap-1 rounded-2xl py-3 text-sm font-bold ring-1 ${k === P.metode ? 'bg-langit/10 text-biru ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${ic(v[1], 'w-6 h-6')}${v[0]}</button>`).join('')}</div>
      ${tunai ? `
        <label class="block text-sm font-semibold text-stone-600">Uang diterima
          <input id="uang-diterima" name="bayar" inputmode="numeric" maxlength="10" autocomplete="off" value="${diterima || ''}" placeholder="0" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-3 text-2xl font-extrabold text-stone-800">
          <span id="uang-eja" class="mt-0.5 block min-h-4 text-sm font-bold text-stone-500"></span></label>
        <div class="flex flex-wrap gap-2"><button type="button" data-aksi="uang-cepat" data-n="${h.tagihan}" class="rounded-full border border-biru px-4 py-2 text-sm font-bold text-biru">Uang pas</button>
          ${uangCepat(h.tagihan).map((n) => `<button type="button" data-aksi="uang-cepat" data-n="${n}" class="rounded-full border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700">${rp(n)}</button>`).join('')}</div>
        <p id="kembalian" class="rounded-xl px-4 py-3 text-center text-lg font-extrabold"></p>`
        : `<p class="rounded-xl bg-langit/10 px-4 py-3 text-sm text-stone-700">${P.metode === 'qris' ? 'Minta pelanggan memindai QRIS toko, lalu pastikan pembayaran sudah masuk sebelum menekan tombol di bawah.' : 'Pastikan transfer sudah masuk ke rekening toko sebelum menekan tombol di bawah.'} Pembayaran dicatat pas sesuai tagihan.</p>`}
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button id="btn-bayar" type="submit" class="flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3.5 text-lg font-extrabold text-white disabled:opacity-40">${ic('circle-check', 'w-5 h-5')} Selesaikan pembayaran</button>
      <button type="button" data-aksi="pos-keranjang" class="w-full rounded-full py-2 text-sm font-bold text-stone-500">Kembali ke keranjang</button>
    </div>
  </form>`;
}
function perbaruiKembalian() {
  const h = hitungPos(P.metode); const btn = $('btn-bayar'); if (!btn) return;
  if (P.metode !== 'tunai') { btn.disabled = false; return; }
  const k = $('kembalian'), diterima = angkaPos(P.bayar), sel = diterima - h.tagihan;
  const eja = $('uang-eja'); if (eja) eja.textContent = diterima ? rp(diterima) : '';
  if (!diterima) { k.textContent = ''; k.className = 'hidden'; btn.disabled = true; return; }
  k.className = 'rounded-xl px-4 py-3 text-center text-lg font-extrabold ' + (sel < 0 ? 'bg-tomat/10 text-tomat' : 'bg-langit/10 text-biru');
  k.textContent = sel < 0 ? `Kurang ${rp(-sel)}` : `Kembalian ${rp(sel)}`; btn.disabled = sel < 0;
}
AKSI['pos-bayar'] = () => {
  if (!P.cart.length) return;
  if (!P.idKlien) P.idKlien = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);   // kunci anti-ganda: dipakai ulang bila pengiriman diulang
  P.modal = 'bayar'; bukaModal(htmlBayar()); perbaruiKembalian();
  const i = $('uang-diterima'); if (i && window.matchMedia && matchMedia('(pointer:fine)').matches) i.focus();
};
AKSI['pos-metode'] = (el) => { P.metode = el.dataset.m; bukaModal(htmlBayar()); perbaruiKembalian(); };
AKSI['uang-cepat'] = (el) => { P.bayar = el.dataset.n; $('uang-diterima').value = P.bayar; perbaruiKembalian(); };
document.addEventListener('input', (e) => {
  if (e.target.id !== 'uang-diterima') return;
  const n = angkaPos(e.target.value); P.bayar = n ? String(n) : ''; if (e.target.value !== P.bayar) e.target.value = P.bayar; perbaruiKembalian();
});

FORM.bayar = (form) => jalankan(form, 'Memproses...', async () => {
  const h = hitungPos(P.metode);
  const items = P.cart.map((c) => { const bruto = produkPos(c.id).harga_jual * c.qty; return { produk_id: c.id, qty: c.qty, diskon: Math.min(c.diskon, bruto) }; });
  const setelah = h.kotor - h.dItem; const v = angkaPos(P.dt.nilai);
  const dt = v > 0 ? { jenis: P.dt.jenis, nilai: P.dt.jenis === 'persen' ? Math.min(100, v) : Math.min(v, setelah) } : undefined;
  let r;
  try { r = await api('transaksi_buat', { trx: { id_klien: P.idKlien, metode: P.metode, items, diskon_trx: dt, bayar: P.metode === 'tunai' ? angkaPos(P.bayar) : undefined, catatan: P.catatan.trim() } }); }
  catch (e) { if (['stok_tidak_cukup', 'produk_tidak_ada'].includes(e.kode)) { try { await muatProdukPos(); segarPos(); } catch (x) { /* abaikan */ } } throw e; }
  if (r.stok) r.stok.forEach((s) => { const p = produkPos(s.id); if (p) p.stok = s.stok; });
  else { try { await muatProdukPos(); } catch (e) { /* stok dimuat ulang saat membuka Kasir */ } }   // jawaban "sudah tercatat" tidak memuat stok: ambil ulang
  const ulang = r.duplikat;
  kosongkanKrj(); P.metode = 'tunai'; P.modal = ''; P.terakhir = r;
  segarPos(); tampilStruk(r, { baru: true });
  if (ulang) toast('Transaksi ini sudah tercatat sebelumnya, tidak dicatat dua kali.');
});

/* ---------- Struk ---------- */
const tglStruk = (w) => { const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(String(w || '')); return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : (w || ''); };
const baris2 = (a, b, tebal = false) => `<div class="flex justify-between gap-2 ${tebal ? 'font-extrabold' : ''}"><span>${a}</span><span class="shrink-0">${b}</span></div>`;
function htmlStruk(r) {
  const t = r.trx, toko = P.toko || {};
  const garis = '<div class="my-1.5 border-t border-dashed border-stone-400"></div>';
  return `<div id="struk-cetak" class="mx-auto w-full max-w-[340px] rounded-2xl bg-white p-4 font-mono text-[12px] leading-snug text-black ring-1 ring-stone-200">
    <div class="text-center"><p class="text-sm font-extrabold">${esc(toko.nama_toko || CONFIG.nama)}</p><p>${esc(toko.alamat || '')}</p><p>${esc(toko.wa_tampil ? 'WA ' + toko.wa_tampil : '')}</p></div>
    ${garis}
    ${baris2('No', esc(t.no))}${baris2('Tanggal', tglStruk(t.waktu))}${baris2('Kasir', esc(t.kasir_nama || t.kasir))}
    ${garis}
    ${r.items.map((i) => `<div class="mb-1"><div>${esc(i.produk)}</div>${baris2(`&nbsp;&nbsp;${i.qty} x ${i.harga.toLocaleString('id-ID')}`, (i.harga * i.qty).toLocaleString('id-ID'))}
      ${i.diskon > 0 ? baris2('&nbsp;&nbsp;Diskon', '-' + i.diskon.toLocaleString('id-ID')) : ''}</div>`).join('')}
    ${garis}
    ${baris2('Subtotal', rp(t.kotor))}
    ${t.diskon_item + t.diskon_trx > 0 ? baris2('Diskon', '-' + rp(t.diskon_item + t.diskon_trx)) : ''}
    ${t.pembulatan > 0 ? baris2('Pembulatan', rp(t.pembulatan)) : ''}
    ${baris2('TOTAL', rp(t.tagihan), true)}
    ${baris2(esc((METODE[t.metode] || [t.metode])[0]), rp(t.bayar))}
    ${t.metode === 'tunai' ? baris2('Kembali', rp(t.kembali)) : ''}
    ${t.catatan ? `${garis}<p>Catatan: ${esc(t.catatan)}</p>` : ''}
    ${garis}
    <p class="text-center">${esc(toko.pesan_struk || 'Terima kasih sudah belanja!')}</p>
    ${t.status === 'batal' ? `<p class="mt-2 text-center text-base font-extrabold text-tomat">*** DIBATALKAN ***</p><p class="text-center text-[11px]">${esc(t.batal_alasan)}</p>` : ''}
  </div>`;
}
function teksStruk(r) {
  const t = r.trx, toko = P.toko || {}, n = (x) => x.toLocaleString('id-ID');
  return [toko.nama_toko || CONFIG.nama, toko.alamat || '', '', `No: ${t.no}`, `Tanggal: ${tglStruk(t.waktu)}`, `Kasir: ${t.kasir_nama || t.kasir}`, '',
    ...r.items.map((i) => `${i.produk}\n  ${i.qty} x ${n(i.harga)} = ${n(i.harga * i.qty)}${i.diskon > 0 ? ` (diskon ${n(i.diskon)})` : ''}`), '',
    `Subtotal: ${rp(t.kotor)}`, ...(t.diskon_item + t.diskon_trx > 0 ? [`Diskon: -${rp(t.diskon_item + t.diskon_trx)}`] : []), ...(t.pembulatan > 0 ? [`Pembulatan: ${rp(t.pembulatan)}`] : []),
    `TOTAL: ${rp(t.tagihan)}`, `${(METODE[t.metode] || [t.metode])[0]}: ${rp(t.bayar)}`, ...(t.metode === 'tunai' ? [`Kembali: ${rp(t.kembali)}`] : []), '', toko.pesan_struk || 'Terima kasih sudah belanja!'].join('\n');
}
function tampilStruk(r, o = {}) {
  P.struk = r; const t = r.trx; const bisaBatal = S.izin.includes('laporan') && t.status !== 'batal';
  bukaModal(`<div class="tanpa-cetak">${kepala(o.baru ? 'Pembayaran berhasil' : 'Rincian transaksi', o.baru ? 'circle-check' : 'receipt')}</div>
    <div class="min-h-0 flex-1 overflow-y-auto bg-latar px-4 py-4">${htmlStruk(r)}</div>
    <div class="tanpa-cetak space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      ${o.baru ? `<button type="button" data-aksi="tutup" class="w-full rounded-full bg-biru py-3 text-lg font-extrabold text-white">Transaksi baru</button>` : ''}
      <div class="grid grid-cols-3 gap-2">
        <button type="button" data-aksi="struk-cetak" class="flex items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('printer', 'w-4 h-4')} Cetak</button>
        <button type="button" data-aksi="struk-wa" class="flex items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('message-circle', 'w-4 h-4')} WhatsApp</button>
        <button type="button" data-aksi="struk-salin" class="flex items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('copy', 'w-4 h-4')} Salin</button>
      </div>
      ${o.baru ? '' : `<div class="flex gap-2">${bisaBatal ? `<button type="button" data-aksi="trx-batal" data-no="${esc(t.no)}" class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-tomat/40 py-2.5 text-sm font-bold text-tomat">${ic('undo-2', 'w-4 h-4')} Batalkan transaksi</button>` : ''}
        <button type="button" data-aksi="pos-riwayat" class="flex-1 rounded-full py-2.5 text-sm font-bold text-stone-500">Kembali ke riwayat</button></div>`}
    </div>`);
}
AKSI['struk-cetak'] = () => window.print();
AKSI['struk-wa'] = () => window.open('https://wa.me/?text=' + encodeURIComponent(teksStruk(P.struk)), '_blank', 'noopener');
AKSI['struk-salin'] = async () => { try { await navigator.clipboard.writeText(teksStruk(P.struk)); toast('Struk disalin.'); } catch (e) { toast('Tidak bisa menyalin. Gunakan tombol WhatsApp.', true); } };

/* ---------- Riwayat transaksi ---------- */
const hariIni = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
async function bukaRiwayat(tgl) {
  P.tgl = tgl || P.tgl || hariIni();
  bukaModal(kepala('Riwayat transaksi', 'history') + `<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">${memuatHtml.replace('py-20', 'py-10')}</div>`);
  let r;
  try { r = await api('transaksi_daftar', { tanggal: P.tgl }); } catch (e) { bukaModal(kepala('Riwayat transaksi', 'history') + `<div class="px-4 py-6">${kartuKosong('cloud-off', 'Riwayat belum bisa dimuat', pesanGalat(e))}</div>`); return; }
  P.tgl = r.tanggal;
  bukaModal(kepala('Riwayat transaksi', 'history') + `
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      ${kasirSaja() ? `<p class="text-sm font-semibold text-stone-500">Transaksi Anda hari ini</p>` : `<label class="block text-sm font-semibold text-stone-600">Tanggal
        <input type="date" data-aksi-ubah="riwayat-tanggal" value="${esc(r.tanggal)}" max="${hariIni()}" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base font-semibold"></label>`}
      <div class="mt-3 grid grid-cols-2 gap-2"><div class="rounded-xl bg-latar p-3"><p class="text-xs font-bold text-stone-500">Transaksi</p><p class="font-display text-xl font-extrabold">${r.ringkas.jumlah}${r.ringkas.batal ? ` <span class="text-xs font-bold text-tomat">(+${r.ringkas.batal} batal)</span>` : ''}</p></div>
        <div class="rounded-xl bg-latar p-3"><p class="text-xs font-bold text-stone-500">Penjualan</p><p class="font-display text-xl font-extrabold">${rp(r.ringkas.total)}</p></div></div>
      ${r.transaksi.length ? `<ul class="mt-3 divide-y divide-stone-100 rounded-2xl bg-white px-4 ring-1 ring-stone-200">${r.transaksi.map((t) => `
        <li><button type="button" data-aksi="trx-detail" data-no="${esc(t.no)}" class="flex w-full items-center gap-3 py-3 text-left ${t.status === 'batal' ? 'opacity-60' : ''}">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-langit/15 text-biru">${ic((METODE[t.metode] || ['', 'receipt'])[1], 'w-5 h-5')}</span>
          <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold">${esc(t.no)}</span>
            <span class="block text-xs text-stone-500">${esc(waktuPendek(t.waktu))} &middot; ${esc(t.kasir_nama || t.kasir)} &middot; ${t.jumlah_item} barang</span></span>
          <span class="shrink-0 text-right"><span class="block text-sm font-extrabold ${t.status === 'batal' ? 'line-through' : ''}">${rp(t.tagihan)}</span>
            ${t.status === 'batal' ? '<span class="rounded-full bg-tomat/10 px-2 py-0.5 text-[10px] font-bold text-tomat">Dibatalkan</span>' : t.status === 'proses' ? '<span class="rounded-full bg-jingga/30 px-2 py-0.5 text-[10px] font-bold text-amber-800">Tidak tuntas</span>' : `<span class="text-[11px] text-stone-400">${(METODE[t.metode] || [t.metode])[0]}</span>`}</span></button></li>`).join('')}</ul>`
        : kartuKosong('receipt', 'Belum ada transaksi', 'Transaksi yang selesai akan muncul di sini.')}
    </div>
    <div class="px-4 pt-2" style="${kakiStyle}"><button type="button" data-aksi="tutup" class="w-full rounded-full py-2.5 text-sm font-bold text-stone-500">Tutup</button></div>`);
}
AKSI['pos-riwayat'] = () => bukaRiwayat();
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.aksiUbah === 'riwayat-tanggal' && e.target.value) bukaRiwayat(e.target.value); });
AKSI['trx-detail'] = async (el) => {
  try { tampilStruk(await api('transaksi_detail', { no: el.dataset.no })); } catch (e) { toast(pesanGalat(e), true); }
};
AKSI['trx-batal'] = (el) => {
  bukaModal(kepala('Batalkan transaksi', 'undo-2') + `
  <form data-form="batal" class="flex min-h-0 flex-1 flex-col"><div class="space-y-3 px-4 py-3">
    <input type="hidden" name="no" value="${esc(el.dataset.no)}">
    <p class="text-sm text-stone-700">Transaksi <b>${esc(el.dataset.no)}</b> akan ditandai batal dan <b>stok barangnya dikembalikan</b>. Tindakan ini tercatat di Audit dan tidak bisa dibatalkan lagi.</p>
    ${kolom('alasan', 'Alasan pembatalan', { maks: 120, contoh: 'Contoh: pelanggan membatalkan pesanan', min: 3 })}
    <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p></div>
    <div class="flex gap-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}"><button type="button" data-aksi="pos-riwayat" class="rounded-full px-5 py-3 font-bold text-stone-500">Kembali</button>
      <button type="submit" class="flex-1 rounded-full bg-tomat py-3 font-extrabold text-white disabled:opacity-40">Batalkan transaksi</button></div></form>`);
};
FORM.batal = (form, d) => jalankan(form, 'Membatalkan...', async () => {
  const r = await api('transaksi_batal', { no: d.no, alasan: d.alasan.trim() });
  try { await muatProdukPos(); } catch (e) { /* stok akan dimuat ulang saat membuka Kasir */ }
  toast(`Transaksi dibatalkan. ${r.dikembalikan} barang dikembalikan ke stok.`); segarPos(); bukaRiwayat();
});
