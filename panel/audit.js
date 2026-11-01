/* Warung Ucox | panel/audit.js | Audit aktivitas (Owner dan Admin). Log transaksi & stok menyusul di Modul 7. */

const LABEL_AUDIT = {
  login: ['Masuk', 'log-in', 'text-biru'], logout: ['Keluar', 'log-out', 'text-stone-500'],
  login_gagal: ['Gagal masuk', 'shield-alert', 'text-tomat'], login_ditolak: ['Masuk ditolak', 'shield-alert', 'text-tomat'],
  akses_ditolak: ['Akses ditolak', 'ban', 'text-tomat'], setup_owner: ['Akun Owner dibuat', 'crown', 'text-amber-600'],
  pengguna_tambah: ['Pengguna ditambah', 'user-plus', 'text-biru'], pengguna_ubah: ['Pengguna diubah', 'user-cog', 'text-biru'],
  pengguna_reset_sandi: ['Reset kata sandi', 'key-round', 'text-amber-600'], reset_sandi_darurat: ['Reset darurat (Sheets)', 'key-round', 'text-amber-600'],
  ganti_sandi: ['Ganti kata sandi', 'key-round', 'text-biru'], pengaturan_ubah: ['Pengaturan toko', 'settings-2', 'text-biru'],
  produk_tambah: ['Produk ditambah', 'package-plus', 'text-biru'], produk_ubah: ['Produk diubah', 'package', 'text-biru'], produk_hapus: ['Produk dihapus', 'package-x', 'text-tomat'],
  kategori_tambah: ['Kategori ditambah', 'layout-grid', 'text-biru'], kategori_ubah: ['Kategori diubah', 'layout-grid', 'text-biru'], kategori_hapus: ['Kategori dihapus', 'layout-grid', 'text-tomat'],
  supplier_tambah: ['Supplier ditambah', 'truck', 'text-biru'], supplier_ubah: ['Supplier diubah', 'truck', 'text-biru'], supplier_hapus: ['Supplier dihapus', 'truck', 'text-tomat'],
  gambar_unggah: ['Foto produk diunggah', 'image-plus', 'text-biru'],
  barang_masuk: ['Barang masuk', 'package-plus', 'text-biru'], stok_sesuaikan: ['Penyesuaian stok', 'clipboard-check', 'text-amber-600'], stok_min_ubah: ['Stok minimum diubah', 'triangle-alert', 'text-biru']
};
let dataAudit = []; let cariAudit = '';

const barisAudit = (a) => {
  const l = LABEL_AUDIT[a.aksi] || [a.aksi, 'activity', 'text-stone-500'];
  return `<li class="flex items-start gap-3 py-3">
    <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-100 ${l[2]}">${ic(l[1], 'w-4 h-4')}</span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-bold">${esc(l[0])}${a.target ? ` <span class="font-semibold text-stone-500">${esc(a.target)}</span>` : ''}</span>
      ${a.detail ? `<span class="block text-xs text-stone-500">${esc(a.detail)}</span>` : ''}
      <span class="block text-[11px] text-stone-400">${esc(waktuPendek(a.waktu))} &middot; ${esc(a.username)}${a.peran && a.peran !== '-' ? ' (' + esc(a.peran) + ')' : ''}</span>
    </span></li>`;
};
const isiAudit = () => {
  const q = cariAudit.trim().toLowerCase();
  const list = dataAudit.filter((a) => !q || `${a.aksi} ${(LABEL_AUDIT[a.aksi] || [''])[0]} ${a.username} ${a.target} ${a.detail}`.toLowerCase().includes(q));
  return list.length ? `<ul class="divide-y divide-stone-100">${list.map(barisAudit).join('')}</ul>` : kartuKosong('search-x', 'Tidak ada aktivitas', 'Coba kata kunci lain.');
};

VIEW.audit = {
  judul: 'Audit', ikon: 'shield-check', izin: 'audit', grup: 'lainnya', judulPanjang: 'Audit aktivitas', info: 'Siapa melakukan apa dan kapan',
  async html() {
    const r = await api('audit_daftar', { limit: 200 }); dataAudit = r.audit; cariAudit = '';
    return `
    <div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl">
      <h2 class="font-display text-xl font-extrabold">Audit aktivitas</h2>
      <p class="text-sm text-stone-500">200 aktivitas terakhir: siapa melakukan apa dan kapan.</p>
      <div class="relative mt-3">
        <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">${ic('search', 'w-5 h-5')}</span>
        <input id="cari-audit" type="search" autocomplete="off" placeholder="Cari pengguna atau aktivitas" class="h-12 w-full rounded-full border border-stone-200 bg-white pl-12 pr-4 text-base">
      </div>
      <div id="isi-audit" class="mt-2 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${isiAudit()}</div>
    </div>`;
  }
};
document.addEventListener('input', (e) => {
  if (e.target.id !== 'cari-audit') return;
  cariAudit = e.target.value; $('isi-audit').innerHTML = isiAudit(); icons();
});
