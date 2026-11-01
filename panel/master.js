/* Warung Ucox | panel/master.js | Halaman Data: kerangka bertab (Produk | Kategori | Supplier) dan helper bersama */

const M = { kategori: [], produk: [], supplier: [], tab: 'produk', q: '', kat: 'semua', batas: null };
const batasToko = () => (M.batas !== null ? M.batas : Number((S.toko && S.toko.stok_menipis) || 10));
const minDari = (p) => (p.stok_min === null || p.stok_min === undefined ? batasToko() : p.stok_min);   // stok minimum produk, atau batas toko bila kosong
const statusStok = (p) => (p.stok <= 0 ? 'habis' : p.stok <= minDari(p) ? 'menipis' : 'aman');
const katDari = (id) => M.kategori.find((k) => k.id === id) || { id, nama: id || '-', ikon: 'package' };
const ikonAda = (n) => !!(window.lucide && lucide.icons && lucide.icons[String(n).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')]);
const ikonAman = (n) => (ikonAda(n) ? n : 'package');
const angkaBersih = (v) => String(v ?? '').replace(/\D/g, '');
const fotoSah = (g) => /^(https:\/\/|img\/)/.test(g || '');

function terapMaster(r) { M.kategori = r.kategori; M.produk = r.produk; M.supplier = r.supplier; if (r.batas_toko !== undefined) M.batas = r.batas_toko; }
const tabBoleh = () => [['produk', 'Produk', 'package', 'produk'], ['kategori', 'Kategori', 'layout-grid', 'kategori_supplier'], ['supplier', 'Supplier', 'truck', 'kategori_supplier']]
  .filter((t) => S.izin.includes(t[3]));

function kerangkaMaster() {
  const tabs = tabBoleh();
  if (!tabs.some((t) => t[0] === M.tab)) M.tab = tabs[0][0];
  return `
  <div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl">
    <div class="flex gap-1 rounded-full bg-stone-200/70 p-1" role="tablist">
      ${tabs.map((t) => `<button type="button" role="tab" aria-selected="${t[0] === M.tab}" data-aksi="tab-master" data-tab="${t[0]}"
        class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition ${t[0] === M.tab ? 'bg-white text-biru shadow-sm' : 'text-stone-500'}">${ic(t[2], 'w-4 h-4')}${t[1]}</button>`).join('')}
    </div>
    <div id="area-master" class="mt-4">${isiTab()}</div>
  </div>`;
}
const isiTab = () => (M.tab === 'kategori' ? tabKategori() : M.tab === 'supplier' ? tabSupplier() : tabProduk());
function segarMaster() { if (S.rute === 'master') { const a = $('area-master'); if (a) { a.innerHTML = isiTab(); icons(); } } }

AKSI['tab-master'] = (el) => { M.tab = el.dataset.tab; $('p-main').innerHTML = kerangkaMaster(); icons(); };

VIEW.master = {
  judul: 'Data', ikon: 'boxes', izin: 'produk',
  async html() { terapMaster(await api('master_ambil')); return kerangkaMaster(); }
};

/* ---------- Konfirmasi umum (untuk hapus) ---------- */
let kerjaKonfirmasi = null;
function konfirmasi(judul, teks, labelOk, kerja) {
  kerjaKonfirmasi = kerja;
  bukaModal(kepala(judul, 'triangle-alert') + `
    <div class="space-y-4 px-4 py-4"><p class="text-sm text-stone-700">${teks}</p>
      <div class="flex gap-2" style="${kakiStyle}">
        <button type="button" data-aksi="tutup" class="rounded-full px-5 py-3 font-bold text-stone-500">Batal</button>
        <button type="button" data-aksi="konfirmasi-ya" class="flex-1 rounded-full bg-tomat py-3 font-extrabold text-white disabled:opacity-40">${labelOk}</button>
      </div></div>`);
}
AKSI['konfirmasi-ya'] = async (el) => {
  el.disabled = true;
  try { await kerjaKonfirmasi(); tutupModal(); }
  catch (e) { tutupModal(); toast(pesanGalat(e), true); }
};
