/* Warung Ucox | panel/stok.js | Inventaris: ringkasan stok, barang masuk, penyesuaian, stok minimum, riwayat mutasi */

const ST = { tab: 'stok', f: 'semua', q: '', riwayat: null, rf: 'semua', rq: '' };
const JENIS = {
  stok_awal: ['Stok awal', 'package-plus'], masuk: ['Barang masuk', 'package-plus'], temuan: ['Ditemukan', 'search-check'], opname: ['Hitung ulang', 'clipboard-check'],
  rusak: ['Rusak', 'package-x'], kadaluarsa: ['Kadaluarsa', 'calendar-x'], hilang: ['Hilang', 'circle-help'], pakai_sendiri: ['Dipakai sendiri', 'hand'],
  retur_supplier: ['Retur ke supplier', 'undo-2'], penjualan: ['Penjualan', 'shopping-cart'], batal_jual: ['Pembatalan penjualan', 'undo-2'], koreksi_kelola: ['Koreksi (menu Kelola)', 'pencil']
};
const KELOMPOK = { masuk: ['stok_awal', 'masuk'], sesuai: ['temuan', 'opname', 'rusak', 'kadaluarsa', 'hilang', 'pakai_sendiri', 'retur_supplier', 'koreksi_kelola'], jual: ['penjualan', 'batal_jual'] };
const nilaiStok = () => M.produk.reduce((a, p) => a + p.stok * p.harga_beli, 0);
const kotakRingkas = (label, nilai, ikon, kelas = 'bg-white', kecil = false) => `
  <div class="min-w-0 rounded-2xl p-3 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5 ${kelas}">
    <p class="flex items-center gap-1.5 text-xs font-bold text-stone-500">${ic(ikon, 'w-4 h-4 shrink-0')}<span class="truncate">${label}</span></p>
    <p class="mt-1 truncate font-display font-extrabold text-stone-800 ${kecil ? 'text-xl' : 'text-2xl'}">${nilai}</p></div>`;

VIEW.stok = {
  judul: 'Stok', ikon: 'warehouse', izin: 'barang_masuk',
  async html() { terapMaster(await api('inventaris_ambil')); ST.riwayat = null; ST.tab = 'stok'; return kerangkaStok(); }
};

function kerangkaStok() {
  return `
  <div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl">
    <div class="flex gap-1 rounded-full bg-stone-200/70 p-1" role="tablist">
      ${[['stok', 'Stok', 'warehouse'], ['riwayat', 'Riwayat', 'history']].map((t) => `<button type="button" role="tab" aria-selected="${t[0] === ST.tab}" data-aksi="tab-stok" data-tab="${t[0]}"
        class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition ${t[0] === ST.tab ? 'bg-white text-biru shadow-sm' : 'text-stone-500'}">${ic(t[2], 'w-4 h-4')}${t[1]}</button>`).join('')}
    </div>
    <div id="area-stok" class="mt-4">${ST.tab === 'riwayat' ? isiRiwayatTab() : isiStokTab()}</div>
  </div>`;
}
function segarStok() { if (S.rute === 'stok' && $('area-stok')) { $('area-stok').innerHTML = ST.tab === 'riwayat' ? isiRiwayatTab() : isiStokTab(); icons(); } }
AKSI['tab-stok'] = async (el) => {
  ST.tab = el.dataset.tab; $('p-main').innerHTML = kerangkaStok(); icons();
  if (ST.tab === 'riwayat' && !ST.riwayat) await muatRiwayat();
};

/* ---------- Tab Stok ---------- */
function produkStokTersaring() {
  const q = ST.q.trim().toLowerCase();
  return M.produk.filter((p) => (ST.f === 'semua' || statusStok(p) === ST.f) && (!q || `${p.nama} ${p.barcode} ${p.id}`.toLowerCase().includes(q)))
    .sort((a, b) => ({ habis: 0, menipis: 1, aman: 2 }[statusStok(a)] - { habis: 0, menipis: 1, aman: 2 }[statusStok(b)]) || a.nama.localeCompare(b.nama, 'id'));
}
const chipStatus = (p) => {
  const st = statusStok(p);
  const kelas = st === 'habis' ? 'bg-tomat/10 text-tomat' : st === 'menipis' ? 'bg-jingga/30 text-amber-800' : 'bg-stone-100 text-stone-600';
  return `<span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${kelas}">${st === 'habis' ? 'Habis' : p.stok + ' ' + esc(p.satuan)}</span>`;
};
function isiDaftarStok() {
  const n = { semua: M.produk.length, menipis: M.produk.filter((p) => statusStok(p) === 'menipis').length, habis: M.produk.filter((p) => statusStok(p) === 'habis').length };
  const chip = (id, nama) => `<button type="button" data-aksi="filter-stok" data-id="${id}" class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${ST.f === id ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${nama} (${n[id]})</button>`;
  const daftar = produkStokTersaring();
  return `<div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">${chip('semua', 'Semua')}${chip('menipis', 'Menipis')}${chip('habis', 'Habis')}</div>
    ${daftar.length ? `<ul class="mt-1 divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
      ${daftar.map((p) => `<li><button type="button" data-aksi="stok-detail" data-id="${esc(p.id)}" class="flex w-full items-center gap-3 py-3 text-left">
        ${gambarKotak(p)}
        <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold">${esc(p.nama)}</span>
          <span class="block truncate text-xs text-stone-500">Minimum ${minDari(p)} ${esc(p.satuan)}${p.stok_min === null || p.stok_min === undefined ? ' (batas toko)' : ''}</span></span>
        ${chipStatus(p)}</button></li>`).join('')}</ul>`
      : kartuKosong('search-x', 'Tidak ada produk', ST.f === 'semua' ? 'Coba kata kunci lain.' : 'Tidak ada produk dengan status ini.')}`;
}
function isiStokTab() {
  const menipis = M.produk.filter((p) => statusStok(p) === 'menipis').length, habis = M.produk.filter((p) => statusStok(p) === 'habis').length;
  return `
    <div class="grid grid-cols-2 gap-3">
      ${kotakRingkas('Nilai persediaan', rp(nilaiStok()), 'wallet', 'bg-white', true)}
      ${kotakRingkas('Jenis produk', M.produk.length, 'boxes')}
      ${kotakRingkas('Stok menipis', menipis, 'triangle-alert', menipis ? 'bg-[#FDF1DC]' : 'bg-white')}
      ${kotakRingkas('Stok habis', habis, 'package-x', habis ? 'bg-[#FCE9E9]' : 'bg-white')}
    </div>
    <button type="button" data-aksi="bm-buka" class="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white">${ic('package-plus', 'w-5 h-5')} Catat barang masuk</button>
    <div class="relative mt-3">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">${ic('search', 'w-5 h-5')}</span>
      <input id="cari-stok" type="search" autocomplete="off" value="${esc(ST.q)}" placeholder="Cari nama atau barcode" class="h-12 w-full rounded-full border border-stone-200 bg-white pl-12 pr-4 text-base">
    </div>
    <div id="wrap-stok" class="mt-3">${isiDaftarStok()}</div>`;
}
document.addEventListener('input', (e) => { if (e.target.id === 'cari-stok') { ST.q = e.target.value; $('wrap-stok').innerHTML = isiDaftarStok(); icons(); } });
AKSI['filter-stok'] = (el) => { ST.f = el.dataset.id; $('wrap-stok').innerHTML = isiDaftarStok(); icons(); };

/* ---------- Rincian satu produk ---------- */
AKSI['stok-detail'] = async (el) => {
  const p = M.produk.find((x) => x.id === el.dataset.id); if (!p) return;
  const st = statusStok(p);
  bukaModal(kepala(p.nama, 'package') + `
    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
      <div class="flex items-end justify-between gap-3 rounded-2xl bg-latar p-4">
        <div><p class="text-xs font-bold text-stone-500">Stok saat ini</p><p class="font-display text-4xl font-black leading-none">${p.stok} <span class="text-lg font-bold text-stone-500">${esc(p.satuan)}</span></p></div>
        ${chipStatus(p)}
      </div>
      <dl class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl bg-white p-2 ring-1 ring-stone-200"><dt class="text-[11px] font-bold text-stone-500">Minimum</dt><dd class="text-sm font-extrabold">${minDari(p)}</dd></div>
        <div class="rounded-xl bg-white p-2 ring-1 ring-stone-200"><dt class="text-[11px] font-bold text-stone-500">Harga beli</dt><dd class="text-sm font-extrabold">${rp(p.harga_beli)}</dd></div>
        <div class="rounded-xl bg-white p-2 ring-1 ring-stone-200"><dt class="text-[11px] font-bold text-stone-500">Nilai stok</dt><dd class="text-sm font-extrabold">${rp(p.stok * p.harga_beli)}</dd></div>
      </dl>
      <div class="grid grid-cols-1 gap-2">
        <button type="button" data-aksi="bm-buka" data-id="${esc(p.id)}" class="flex items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white">${ic('package-plus', 'w-5 h-5')} Barang masuk</button>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" data-aksi="ss-buka" data-id="${esc(p.id)}" class="flex items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('clipboard-check', 'w-4 h-4')} Sesuaikan stok</button>
          <button type="button" data-aksi="sm-buka" data-id="${esc(p.id)}" class="flex items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('triangle-alert', 'w-4 h-4')} Atur minimum</button>
        </div>
      </div>
      <div><h3 class="mb-1 flex items-center gap-2 font-display text-base font-extrabold">${ic('history', 'w-5 h-5 text-biru')}Riwayat terakhir</h3>
        <div id="riwayat-produk" class="rounded-2xl bg-white px-4 ring-1 ring-stone-200">${memuatHtml.replace('py-20', 'py-6')}</div></div>
    </div>
    <div class="px-4 pt-2" style="${kakiStyle}"><button type="button" data-aksi="tutup" class="w-full rounded-full py-2.5 text-sm font-bold text-stone-500">Tutup</button></div>`);
  try {
    const r = await api('mutasi_daftar', { produk_id: p.id, limit: 8 });
    const box = $('riwayat-produk'); if (!box) return;
    box.innerHTML = r.mutasi.length ? `<ul class="divide-y divide-stone-100">${r.mutasi.map(barisMutasi).join('')}</ul>` : '<p class="py-5 text-center text-sm text-stone-500">Belum ada riwayat.</p>';
    icons();
  } catch (e) { const box = $('riwayat-produk'); if (box) box.innerHTML = `<p class="py-5 text-center text-sm text-tomat">${esc(pesanGalat(e))}</p>`; }
};

/* ---------- Riwayat mutasi ---------- */
const barisMutasi = (m) => {
  const j = JENIS[m.jenis] || [m.jenis, 'activity'];
  const plus = m.jumlah > 0;
  return `<li class="flex items-start gap-3 py-3">
    <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${m.jumlah === 0 ? 'bg-stone-100 text-stone-500' : plus ? 'bg-langit/15 text-biru' : 'bg-tomat/10 text-tomat'}">${ic(ikonAman(j[1]), 'w-4 h-4')}</span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-bold">${esc(m.produk)}</span>
      <span class="block text-xs text-stone-500">${esc(j[0])}${m.catatan ? ' &middot; ' + esc(m.catatan) : ''}</span>
      <span class="block text-[11px] text-stone-400">${esc(waktuPendek(m.waktu))} &middot; ${esc(m.user)}${m.ref ? ' &middot; ' + esc(m.ref) : ''}</span>
    </span>
    <span class="shrink-0 text-right"><span class="block text-sm font-extrabold ${m.jumlah === 0 ? 'text-stone-500' : plus ? 'text-biru' : 'text-tomat'}">${plus ? '+' : ''}${m.jumlah}</span>
      <span class="block text-[11px] text-stone-400">${m.sebelum} → ${m.sesudah}</span></span></li>`;
};
async function muatRiwayat() {
  const a = $('area-stok'); if (a) { a.innerHTML = memuatHtml; icons(); }
  try { ST.riwayat = (await api('mutasi_daftar', { limit: 300 })).mutasi; } catch (e) { ST.riwayat = null; if (a) a.innerHTML = kartuKosong('cloud-off', 'Riwayat belum bisa dimuat', pesanGalat(e)); return; }
  segarStok();
}
function isiRiwayatTab() {
  if (!ST.riwayat) return memuatHtml;
  const q = ST.rq.trim().toLowerCase();
  const daftar = ST.riwayat.filter((m) => (ST.rf === 'semua' || KELOMPOK[ST.rf].includes(m.jenis)) && (!q || `${m.produk} ${m.ref} ${m.user} ${m.catatan} ${(JENIS[m.jenis] || [''])[0]}`.toLowerCase().includes(q)));
  const chip = (id, nama) => `<button type="button" data-aksi="filter-riwayat" data-id="${id}" class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${ST.rf === id ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${nama}</button>`;
  return `<div class="relative">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">${ic('search', 'w-5 h-5')}</span>
      <input id="cari-riwayat" type="search" autocomplete="off" value="${esc(ST.rq)}" placeholder="Cari produk, nomor, atau petugas" class="h-12 w-full rounded-full border border-stone-200 bg-white pl-12 pr-4 text-base"></div>
    <div class="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2">${chip('semua', 'Semua')}${chip('masuk', 'Masuk')}${chip('sesuai', 'Penyesuaian')}${chip('jual', 'Penjualan')}</div>
    <div id="isi-riwayat" class="rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${daftarRiwayat(daftar)}</div>
    <p class="mt-2 px-1 text-center text-xs text-stone-400">${ST.riwayat.length} mutasi terakhir</p>`;
}
const daftarRiwayat = (d) => (d.length ? `<ul class="divide-y divide-stone-100">${d.map(barisMutasi).join('')}</ul>` : kartuKosong('history', 'Belum ada mutasi', 'Setiap perubahan stok akan tercatat di sini.'));
function saringRiwayat() {
  const q = ST.rq.trim().toLowerCase();
  return ST.riwayat.filter((m) => (ST.rf === 'semua' || KELOMPOK[ST.rf].includes(m.jenis)) && (!q || `${m.produk} ${m.ref} ${m.user} ${m.catatan} ${(JENIS[m.jenis] || [''])[0]}`.toLowerCase().includes(q)));
}
document.addEventListener('input', (e) => { if (e.target.id === 'cari-riwayat') { ST.rq = e.target.value; $('isi-riwayat').innerHTML = daftarRiwayat(saringRiwayat()); icons(); } });
AKSI['filter-riwayat'] = (el) => { ST.rf = el.dataset.id; segarStok(); };

/* ---------- Barang masuk ---------- */
const BM = { supplier: '', faktur: '', catatan: '', perbarui: true, items: [], mode: 'form', q: '' };
const sub = (i) => (Number(angkaBersih(i.qty)) || 0) * (Number(angkaBersih(i.beli)) || 0);
function tambahItemBM(id) {
  const ada = BM.items.find((i) => i.id === id);
  if (ada) { ada.qty = String((Number(angkaBersih(ada.qty)) || 0) + 1); return; }
  const p = M.produk.find((x) => x.id === id); if (p) BM.items.push({ id, qty: '1', beli: String(p.harga_beli) });
}
AKSI['bm-buka'] = (el) => {
  Object.assign(BM, { supplier: '', faktur: '', catatan: '', perbarui: true, items: [], mode: 'form', q: '' });
  if (el.dataset.id) tambahItemBM(el.dataset.id);
  renderBM();
};
function renderBM() {
  if (BM.mode === 'pilih') return renderPilihBM();
  const total = BM.items.reduce((a, i) => a + sub(i), 0);
  bukaModal(kepala('Barang masuk', 'package-plus') + `
  <form data-form="bm" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label class="block text-sm font-semibold text-stone-600">Supplier
          <select name="supplier" data-bm="supplier" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800">
            <option value="">(tanpa supplier)</option>${M.supplier.map((s) => `<option value="${esc(s.id)}" ${s.id === BM.supplier ? 'selected' : ''}>${esc(s.nama)}</option>`).join('')}</select></label>
        <label class="block text-sm font-semibold text-stone-600">No. faktur
          <input name="faktur" data-bm="faktur" maxlength="30" value="${esc(BM.faktur)}" placeholder="opsional" autocomplete="off" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base font-semibold text-stone-800"></label>
      </div>
      <div>
        <p class="text-sm font-semibold text-stone-600">Barang diterima</p>
        ${BM.items.length ? `<ul class="mt-1 space-y-2">${BM.items.map((i, n) => {
          const p = M.produk.find((x) => x.id === i.id);
          return `<li class="rounded-2xl border border-stone-200 p-3">
            <div class="flex items-start justify-between gap-2"><div class="min-w-0"><p class="truncate text-sm font-bold">${esc(p.nama)}</p><p class="text-xs text-stone-500">Stok sekarang ${p.stok} ${esc(p.satuan)}</p></div>
              <button type="button" data-aksi="bm-hapus" data-n="${n}" aria-label="Hapus ${esc(p.nama)}" class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500">${ic('x', 'w-4 h-4')}</button></div>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label class="block text-xs font-semibold text-stone-500">Jumlah (${esc(p.satuan)})<input data-bm="qty" data-n="${n}" inputmode="numeric" maxlength="6" value="${esc(i.qty)}" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-base font-bold text-stone-800"></label>
              <label class="block text-xs font-semibold text-stone-500">Harga beli satuan<input data-bm="beli" data-n="${n}" inputmode="numeric" maxlength="9" value="${esc(i.beli)}" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-base font-bold text-stone-800"></label>
            </div>
            <p class="mt-1.5 text-right text-xs font-bold text-stone-500">Subtotal <span id="sub-${n}" class="text-stone-800">${rp(sub(i))}</span></p></li>`;
        }).join('')}</ul>` : '<p class="mt-1 rounded-2xl bg-latar px-4 py-5 text-center text-sm text-stone-500">Belum ada barang. Tambahkan dengan tombol di bawah atau pindai barcode.</p>'}
        <button type="button" data-aksi="bm-pilih" class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-biru py-2.5 text-sm font-bold text-biru">${ic('plus', 'w-4 h-4')} Tambah barang</button>
      </div>
      <label class="flex items-start gap-3 rounded-xl border border-stone-200 p-3"><input type="checkbox" data-bm="perbarui" ${BM.perbarui ? 'checked' : ''} class="mt-0.5 h-5 w-5 accent-[#0F78B0]">
        <span><span class="block text-sm font-extrabold">Perbarui harga modal produk</span><span class="block text-xs text-stone-500">Bila harga beli di atas berbeda dari yang tercatat, harga modal produk ikut diganti.</span></span></label>
      <label class="block text-sm font-semibold text-stone-600">Catatan
        <input name="catatan" data-bm="catatan" maxlength="100" value="${esc(BM.catatan)}" placeholder="opsional" autocomplete="off" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base font-semibold text-stone-800"></label>
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <p class="flex items-center justify-between text-sm font-bold text-stone-600"><span>Total pembelian</span><span id="bm-total" class="font-display text-xl font-extrabold text-stone-800">${rp(total)}</span></p>
      <button type="submit" ${BM.items.length ? '' : 'disabled'} class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Simpan barang masuk</button>
      <button type="button" data-aksi="tutup" class="w-full rounded-full py-2 text-sm font-bold text-stone-500">Batal</button>
    </div>
  </form>`);
}
document.addEventListener('input', (e) => {   // simpan isian ke state; hitung ulang total tanpa menggambar ulang (fokus tetap)
  const k = e.target.dataset && e.target.dataset.bm; if (!k) return;
  if (k === 'qty' || k === 'beli') {
    const n = Number(e.target.dataset.n); const v = angkaBersih(e.target.value); if (e.target.value !== v) e.target.value = v; BM.items[n][k] = v;
    const s = $('sub-' + n); if (s) s.textContent = rp(sub(BM.items[n]));
    $('bm-total').textContent = rp(BM.items.reduce((a, i) => a + sub(i), 0));
  } else if (k === 'perbarui') BM.perbarui = e.target.checked; else BM[k] = e.target.value;
});
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.bm === 'supplier') BM.supplier = e.target.value; });
AKSI['bm-hapus'] = (el) => { BM.items.splice(Number(el.dataset.n), 1); renderBM(); };
AKSI['bm-pilih'] = () => { BM.mode = 'pilih'; BM.q = ''; renderBM(); const i = $('bm-cari'); if (i) i.focus(); };

function daftarPilihBM() {
  const q = BM.q.trim().toLowerCase();
  const d = M.produk.filter((p) => !q || `${p.nama} ${p.barcode}`.toLowerCase().includes(q)).slice(0, 40);
  return d.length ? `<ul class="divide-y divide-stone-100">${d.map((p) => `<li><button type="button" data-aksi="bm-tambah" data-id="${esc(p.id)}" class="flex w-full items-center gap-3 py-2.5 text-left">
      ${gambarKotak(p, 'h-10 w-10')}<span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold">${esc(p.nama)}</span><span class="block truncate text-xs text-stone-500">Stok ${p.stok} ${esc(p.satuan)}${p.barcode ? ' &middot; ' + esc(p.barcode) : ''}</span></span>
      ${BM.items.some((i) => i.id === p.id) ? `<span class="text-xs font-bold text-biru">${ic('check', 'w-4 h-4')}</span>` : ''}</button></li>`).join('')}</ul>`
    : kartuKosong('search-x', 'Barang tidak ditemukan', 'Coba nama atau barcode lain.');
}
function renderPilihBM() {
  bukaModal(kepala('Pilih barang', 'search') + `
    <div class="px-4 pt-3"><div class="flex gap-2"><div class="relative flex-1">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">${ic('search', 'w-5 h-5')}</span>
      <input id="bm-cari" type="search" autocomplete="off" value="${esc(BM.q)}" placeholder="Nama atau pindai barcode lalu Enter" class="h-12 w-full rounded-full border border-stone-200 pl-12 pr-4 text-base"></div>
      ${bisaScan() ? `<button type="button" data-aksi="bm-scan" aria-label="Pindai dengan kamera" class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-biru text-white">${ic('scan-barcode', 'w-5 h-5')}</button>` : ''}</div></div>
    <div id="bm-daftar" class="min-h-0 flex-1 overflow-y-auto px-4">${daftarPilihBM()}</div>
    <div class="px-4 pt-2" style="${kakiStyle}"><button type="button" data-aksi="bm-kembali" class="w-full rounded-full border border-stone-200 py-2.5 text-sm font-bold text-stone-600">Kembali ke daftar barang masuk (${BM.items.length})</button></div>`);
}
document.addEventListener('input', (e) => { if (e.target.id === 'bm-cari') { BM.q = e.target.value; $('bm-daftar').innerHTML = daftarPilihBM(); icons(); } });
document.addEventListener('keydown', (e) => {   // pemindai USB mengetik barcode lalu menekan Enter: langsung menambahkan barang yang cocok
  if (e.target.id !== 'bm-cari' || e.key !== 'Enter') return;
  e.preventDefault(); const kode = e.target.value.trim(); const p = kode && M.produk.find((x) => x.barcode === kode);
  if (p) { tambahItemBM(p.id); BM.mode = 'form'; renderBM(); toast(`${p.nama} ditambahkan.`); } else toast('Barcode tidak dikenal. Pilih dari daftar.', true);
});
AKSI['bm-tambah'] = (el) => { tambahItemBM(el.dataset.id); BM.mode = 'form'; renderBM(); };
AKSI['bm-kembali'] = () => { BM.mode = 'form'; renderBM(); };
AKSI['bm-scan'] = () => mulaiScan((kode) => {
  const p = M.produk.find((x) => x.barcode === kode);
  BM.mode = 'form'; if (p) { tambahItemBM(p.id); renderBM(); toast(`${p.nama} ditambahkan.`); } else { renderBM(); toast(`Barcode ${kode} tidak dikenal.`, true); }
}, () => { BM.mode = 'pilih'; renderBM(); });

FORM.bm = (form) => jalankan(form, 'Menyimpan...', async () => {
  const r = await api('masuk_simpan', { masuk: { supplier: BM.supplier, faktur: BM.faktur.trim(), catatan: BM.catatan.trim(), perbarui_modal: BM.perbarui,
    items: BM.items.map((i) => ({ produk_id: i.id, qty: angkaBersih(i.qty), harga_beli: angkaBersih(i.beli) })) } });
  terapMaster(r); ST.riwayat = null; tutupModal(); if (S.rute === 'master') segarMaster(); segarStok();
  toast(`Barang masuk ${r.ref} tersimpan: ${r.jumlah_item} barang, ${rp(r.total)}.`);
});

/* ---------- Penyesuaian stok ---------- */
const JENIS_SESUAI = [['rusak', 'Rusak', -1], ['kadaluarsa', 'Kadaluarsa', -1], ['hilang', 'Hilang', -1], ['pakai_sendiri', 'Dipakai sendiri', -1],
  ['retur_supplier', 'Retur ke supplier', -1], ['temuan', 'Ditemukan (menambah)', 1], ['opname', 'Hitung ulang / opname', 0]];
AKSI['ss-buka'] = (el) => {
  const p = M.produk.find((x) => x.id === el.dataset.id); if (!p) return;
  bukaModal(kepala('Sesuaikan stok', 'clipboard-check') + `
  <form id="form-sesuai" data-form="sesuai" data-stok="${p.stok}" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <input type="hidden" name="produk_id" value="${esc(p.id)}">
      <div class="rounded-xl bg-latar px-3 py-2.5"><p class="text-sm font-extrabold">${esc(p.nama)}</p><p class="text-xs text-stone-500">Stok tercatat: <b>${p.stok} ${esc(p.satuan)}</b></p></div>
      <fieldset class="space-y-1.5"><legend class="text-sm font-semibold text-stone-600">Jenis penyesuaian</legend>
        ${JENIS_SESUAI.map((j, n) => `<label class="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-2.5 has-[:checked]:border-biru has-[:checked]:bg-langit/10">
          <input type="radio" name="jenis" value="${j[0]}" ${n === 0 ? 'checked' : ''} class="h-4 w-4 accent-[#0F78B0]">
          <span class="flex-1 text-sm font-bold">${j[1]}</span><span class="text-xs font-extrabold ${j[2] < 0 ? 'text-tomat' : j[2] > 0 ? 'text-biru' : 'text-stone-500'}">${j[2] < 0 ? 'Kurangi' : j[2] > 0 ? 'Tambah' : 'Set ke hasil hitung'}</span></label>`).join('')}
      </fieldset>
      <label class="block text-sm font-semibold text-stone-600"><span id="label-jumlah">Jumlah (${esc(p.satuan)})</span>
        <input name="jumlah" required inputmode="numeric" maxlength="7" autocomplete="off" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-lg font-bold text-stone-800"></label>
      <p id="pratinjau-stok" class="min-h-5 text-sm font-bold text-stone-600"></p>
      <label id="baris-supplier" class="hidden text-sm font-semibold text-stone-600">Supplier tujuan retur
        <select name="supplier" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800"><option value="">(tidak dipilih)</option>${M.supplier.map((s) => `<option value="${esc(s.id)}">${esc(s.nama)}</option>`).join('')}</select></label>
      <label class="block text-sm font-semibold text-stone-600">Catatan <span id="wajib-catatan" class="text-xs font-normal text-stone-500">(opsional)</span>
        <input name="catatan" maxlength="120" autocomplete="off" placeholder="Contoh: karung sobek saat dipindah" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base font-semibold text-stone-800"></label>
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Simpan penyesuaian</button>
      <button type="button" data-aksi="tutup" class="w-full rounded-full py-2 text-sm font-bold text-stone-500">Batal</button>
    </div>
  </form>`);
  perbaruiSesuai();
};
function perbaruiSesuai() {
  const f = $('form-sesuai'); if (!f) return;
  const jenis = f.elements.jenis.value; const stok = Number(f.dataset.stok); const j = JENIS_SESUAI.find((x) => x[0] === jenis);
  const n = angkaBersih(f.elements.jumlah.value); if (f.elements.jumlah.value !== n) f.elements.jumlah.value = n;
  $('label-jumlah').textContent = jenis === 'opname' ? 'Hasil hitung fisik' : 'Jumlah';
  $('baris-supplier').classList.toggle('hidden', jenis !== 'retur_supplier');
  $('wajib-catatan').textContent = ['hilang', 'temuan', 'opname'].includes(jenis) ? '(wajib)' : '(opsional)';
  const el = $('pratinjau-stok');
  if (n === '') { el.textContent = ''; return; }
  const baru = jenis === 'opname' ? Number(n) : stok + j[2] * Number(n);
  el.className = 'min-h-5 text-sm font-bold ' + (baru < 0 ? 'text-tomat' : 'text-stone-600');
  el.textContent = baru < 0 ? `Stok tidak cukup (tersedia ${stok}).` : `Stok menjadi ${baru} (${baru - stok >= 0 ? '+' : ''}${baru - stok}).`;
}
document.addEventListener('input', (e) => { if (e.target.closest && e.target.closest('#form-sesuai')) perbaruiSesuai(); });
document.addEventListener('change', (e) => { if (e.target.closest && e.target.closest('#form-sesuai')) perbaruiSesuai(); });
FORM.sesuai = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const r = await api('stok_sesuaikan', { produk_id: d.produk_id, jenis: d.jenis, jumlah: angkaBersih(d.jumlah), catatan: (d.catatan || '').trim(), supplier: d.supplier || '' });
  const p = r.produk.find((x) => x.id === d.produk_id);
  terapMaster(r); ST.riwayat = null; tutupModal(); segarStok(); if (S.rute === 'master') segarMaster();
  toast(`Stok ${p.nama}: ${r.sebelum} → ${r.sesudah} ${p.satuan}.`);
});

/* ---------- Stok minimum ---------- */
AKSI['sm-buka'] = (el) => {
  const p = M.produk.find((x) => x.id === el.dataset.id); if (!p) return;
  bukaModal(kepala('Stok minimum', 'triangle-alert') + `
  <form data-form="stokmin" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 px-4 py-3">
      <input type="hidden" name="produk_id" value="${esc(p.id)}">
      <p class="text-sm text-stone-600"><b>${esc(p.nama)}</b> ditandai <b>menipis</b> bila stoknya sama dengan atau di bawah angka ini.</p>
      ${kolom('stok_min', 'Stok minimum (' + esc(p.satuan) + ')', { nilai: p.stok_min === null || p.stok_min === undefined ? '' : p.stok_min, mode: 'numeric', maks: 6, wajib: false, bantu: `Kosongkan untuk memakai batas toko (${batasToko()}).` })}
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="flex gap-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="button" data-aksi="tutup" class="rounded-full px-5 py-3 font-bold text-stone-500">Batal</button>
      <button type="submit" class="flex-1 rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Simpan</button>
    </div></form>`);
};
FORM.stokmin = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  terapMaster(await api('stok_min_simpan', { produk_id: d.produk_id, stok_min: angkaBersih(d.stok_min) }));
  tutupModal(); segarStok(); toast('Stok minimum disimpan.');
});
