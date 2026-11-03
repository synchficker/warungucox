/* Warung Ucox | panel/dashboard.js | Dashboard (versi Tahap 1: ringkasan stok. Omzet & grafik menyusul di Modul 6) */

const MODUL = [
  { no: 1, nama: 'Autentikasi & Peran', info: 'Login, sesi, hak akses, akun staf', status: 'aktif' },
  { no: 2, nama: 'Master Data', info: 'Kategori, produk, supplier, gambar, barcode', status: 'aktif' },
  { no: 3, nama: 'Inventaris', info: 'Stok masuk/keluar, stok minimum, mutasi', status: 'aktif' },
  { no: 4, nama: 'Point of Sale', info: 'Keranjang, scanner, diskon, pembayaran, struk', status: 'aktif' },
  { no: 5, nama: 'Keuangan', info: 'Pengeluaran, pemasukan, laba, tutup kas', status: 'aktif' },
  { no: 6, nama: 'Analitik', info: 'Omzet, terlaris, nilai persediaan', status: 'next' },
  { no: 7, nama: 'Audit & Keamanan', info: 'Log lengkap, penguncian, backup', status: 'rencana' }
];
const STATUS_MODUL = {
  aktif: ['Aktif', 'bg-langit/15 text-biru'],
  next: ['Berikutnya', 'bg-jingga/30 text-amber-900'],
  rencana: ['Direncanakan', 'bg-stone-100 text-stone-500']
};

const kotakStat = (label, nilai, ikon, kelas = 'bg-white', kecil = false) => `
  <div class="min-w-0 rounded-2xl p-3 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5 ${kelas}">
    <p class="flex items-center gap-1.5 text-xs font-bold text-stone-500">${ic(ikon, 'w-4 h-4 shrink-0')}<span class="truncate">${label}</span></p>
    <p class="mt-1 truncate font-display font-extrabold text-stone-800 ${kecil ? 'text-xl' : 'text-2xl'}">${nilai}</p>
  </div>`;

VIEW.dashboard = {
  judul: 'Beranda', ikon: 'layout-dashboard', izin: 'dashboard',
  async html() {
    const d = await api('dashboard');
    const p = S.pengguna;
    const hari = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const menipis = d.menipis.length
      ? `<ul class="divide-y divide-stone-100">${d.menipis.map((i) => `
          <li class="flex items-center justify-between gap-3 py-2.5">
            <span class="min-w-0 truncate text-sm font-bold">${esc(i.nama)}</span>
            <span class="shrink-0 rounded-full bg-jingga/30 px-2 py-0.5 text-xs font-bold text-amber-800">${i.stok} ${esc(i.satuan)}</span>
          </li>`).join('')}</ul>`
      : `<p class="py-4 text-center text-sm text-stone-500">Tidak ada produk yang stoknya menipis.</p>`;
    const akses = Object.keys(FITUR).map((k) => {
      const boleh = S.izin.includes(k);
      return `<li class="flex items-center gap-2 py-1.5 text-sm ${boleh ? 'font-semibold text-stone-800' : 'text-stone-400'}">
        ${ic(boleh ? 'circle-check' : 'minus', 'w-4 h-4 shrink-0 ' + (boleh ? 'text-biru' : 'text-stone-300'))}${FITUR[k]}</li>`;
    }).join('');
    return `
    <section class="hero text-white">
      <div class="mx-auto max-w-[480px] px-4 pb-14 pt-6 md:max-w-3xl">
        <p class="text-sm font-semibold text-white/85">${esc(hari)}</p>
        <h2 class="mt-1 font-display text-2xl font-black leading-tight">Halo, ${esc(p.nama)}</h2>
        <p class="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white/90">Masuk sebagai <span class="rounded-full bg-white p-0.5">${lencana(p.peran)}</span></p>
      </div>
    </section>
    <div class="mx-auto -mt-8 max-w-[480px] space-y-4 px-4 md:max-w-3xl">
      <div class="grid grid-cols-2 gap-3">
        ${kotakStat(p.peran === 'kasir' ? 'Transaksi saya hari ini' : 'Transaksi hari ini', d.penjualan_hari_ini.jumlah, 'receipt')}
        ${kotakStat(p.peran === 'kasir' ? 'Penjualan saya' : 'Penjualan hari ini', rp(d.penjualan_hari_ini.total), 'banknote', 'bg-white', true)}
      </div>
      ${S.izin.includes('pos') ? `<button type="button" data-aksi="pindah" data-ke="pos" class="flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white">${ic('shopping-cart', 'w-5 h-5')} Buka kasir</button>` : ''}
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        ${kotakStat('Produk', d.jumlah_produk, 'package')}
        ${kotakStat('Stok menipis', d.jumlah_menipis, 'triangle-alert', d.jumlah_menipis ? 'bg-[#FDF1DC]' : 'bg-white')}
        ${kotakStat('Stok habis', d.stok_habis, 'package-x', d.stok_habis ? 'bg-[#FCE9E9]' : 'bg-white')}
        ${d.nilai_persediaan !== null ? kotakStat('Nilai persediaan', rp(d.nilai_persediaan), 'wallet', 'bg-white', true) : kotakStat('Kategori', d.jumlah_kategori, 'layout-grid')}
      </div>

      <section class="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
        <h3 class="flex items-center gap-2 font-display text-base font-extrabold">${ic('triangle-alert', 'w-5 h-5 text-jingga')}Perlu restok${S.izin.includes('barang_masuk') ? `<button type="button" data-aksi="pindah" data-ke="stok" class="ml-auto text-sm font-bold text-biru">Buka Stok</button>` : ''}</h3>
        ${menipis}
      </section>

      <section class="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
        <h3 class="flex items-center gap-2 font-display text-base font-extrabold">${ic('shield-check', 'w-5 h-5 text-biru')}Hak akses saya</h3>
        <p class="mt-1 text-xs text-stone-500">${esc((PERAN[p.peran] || {}).info || '')}</p>
        <ul class="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">${akses}</ul>
      </section>

      <section class="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
        <h3 class="flex items-center gap-2 font-display text-base font-extrabold">${ic('route', 'w-5 h-5 text-biru')}Peta pengembangan</h3>
        <ol class="mt-2 divide-y divide-stone-100">${MODUL.map((m) => `
          <li class="flex items-center gap-3 py-2.5">
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${m.status === 'aktif' ? 'bg-biru text-white' : 'bg-stone-100 text-stone-500'}">${m.no}</span>
            <span class="min-w-0 flex-1"><span class="block text-sm font-bold">${m.nama}</span><span class="block truncate text-xs text-stone-500">${m.info}</span></span>
            <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_MODUL[m.status][1]}">${STATUS_MODUL[m.status][0]}</span>
          </li>`).join('')}</ol>
      </section>
      ${p.peran === 'owner' && d.pengguna_aktif !== null ? `<p class="px-1 text-center text-xs text-stone-500">${d.pengguna_aktif} akun staf aktif</p>` : ''}
    </div>`;
  }
};
