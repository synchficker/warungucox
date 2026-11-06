/* Warung Ucox | panel/keuangan.js | Keuangan: laporan laba rugi, catatan kas (pengeluaran & pemasukan lain), tutup kas harian */

const KU = { tab: 'laporan', periode: 'bulan', dari: '', sampai: '', lap: null, entri: null, kat: null, jenisF: 'semua', kas: null, riwayat: null, tglKas: '' };
const pad2 = (n) => String(n).padStart(2, '0');
const fmtTgl = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const hariIniKu = () => fmtTgl(new Date());
const geserHari = (tgl, n) => { const d = new Date(tgl + 'T12:00:00'); d.setDate(d.getDate() + n); return fmtTgl(d); };
const tglPanjang = (t) => { const d = new Date(t + 'T12:00:00'); return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
function hitungRentang(p) {
  const hari = hariIniKu(), d = new Date();
  if (p === 'hari') return [hari, hari];
  if (p === '7') return [geserHari(hari, -6), hari];
  if (p === 'bulan') return [`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`, hari];
  if (p === 'lalu') { const a = new Date(d.getFullYear(), d.getMonth() - 1, 1), z = new Date(d.getFullYear(), d.getMonth(), 0); return [fmtTgl(a), fmtTgl(z)]; }
  return [KU.dari || hari, KU.sampai || hari];
}
const PERIODE = [['hari', 'Hari ini'], ['7', '7 hari'], ['bulan', 'Bulan ini'], ['lalu', 'Bulan lalu'], ['kustom', 'Pilih tanggal']];
const warnaLaba = (n) => (n < 0 ? 'text-tomat' : 'text-emerald-700');

VIEW.keuangan = {
  judul: 'Keuangan', ikon: 'wallet', izin: 'laporan',
  async html() { KU.tab = 'laporan'; KU.lap = null; KU.entri = null; KU.kas = null; [KU.dari, KU.sampai] = hitungRentang(KU.periode); await muatTabKu(); return kerangkaKu(); }
};

async function muatTabKu() {
  if (KU.tab === 'laporan') KU.lap = await api('laporan_keuangan', { dari: KU.dari, sampai: KU.sampai });
  else if (KU.tab === 'catatan') { const r = await api('keuangan_daftar', { dari: KU.dari, sampai: KU.sampai }); KU.entri = r; KU.kat = r.kategori; }
  else { KU.tglKas = KU.tglKas || hariIniKu(); KU.kas = await api('kas_hitung', { tanggal: KU.tglKas }); KU.riwayat = (await api('kas_riwayat', { limit: 14 })).riwayat; }
}
const chipPeriode = () => `<div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">${PERIODE.map((p) => `<button type="button" data-aksi="ku-periode" data-p="${p[0]}" class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${KU.periode === p[0] ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${p[1]}</button>`).join('')}</div>
  ${KU.periode === 'kustom' ? `<div class="mt-2 grid grid-cols-2 gap-2">
    <label class="block text-xs font-semibold text-stone-500">Dari<input type="date" data-ku="dari" value="${esc(KU.dari)}" max="${hariIniKu()}" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base font-semibold text-stone-800"></label>
    <label class="block text-xs font-semibold text-stone-500">Sampai<input type="date" data-ku="sampai" value="${esc(KU.sampai)}" max="${hariIniKu()}" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base font-semibold text-stone-800"></label></div>` : ''}
  <p class="mt-2 px-1 text-xs font-semibold text-stone-500">${KU.dari === KU.sampai ? tglPanjang(KU.dari) : `${tglPanjang(KU.dari)} s.d. ${tglPanjang(KU.sampai)}`}</p>`;

function kerangkaKu() {
  const tabs = [['laporan', 'Laporan', 'chart-no-axes-combined'], ['catatan', 'Catatan kas', 'notebook-pen'], ['kas', 'Tutup kas', 'vault']];
  return `<div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl">
    <div class="flex gap-1 rounded-full bg-stone-200/70 p-1" role="tablist">${tabs.map((t) => `<button type="button" role="tab" aria-selected="${t[0] === KU.tab}" data-aksi="tab-ku" data-tab="${t[0]}"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition ${t[0] === KU.tab ? 'bg-white text-biru shadow-sm' : 'text-stone-500'}">${ic(ikonAman(t[2]), 'w-4 h-4')}${t[1]}</button>`).join('')}</div>
    <div id="area-ku" class="mt-4">${isiKu()}</div></div>`;
}
const isiKu = () => (KU.tab === 'catatan' ? isiCatatan() : KU.tab === 'kas' ? isiKas() : isiLaporan());
function segarKu() { if (S.rute === 'keuangan' && $('area-ku')) { $('area-ku').innerHTML = isiKu(); icons(); if (KU.tab === 'kas') perbaruiKas(); } }
async function ambilUlangKu() {
  const a = $('area-ku'); if (a) { a.innerHTML = memuatHtml; icons(); }
  try { await muatTabKu(); segarKu(); } catch (e) { if (a) a.innerHTML = kartuKosong('cloud-off', 'Data belum bisa dimuat', pesanGalat(e)); }
}
AKSI['tab-ku'] = (el) => { KU.tab = el.dataset.tab; $('p-main').innerHTML = kerangkaKu(); icons(); ambilUlangKu(); };
AKSI['ku-periode'] = (el) => { KU.periode = el.dataset.p; if (KU.periode !== 'kustom') { [KU.dari, KU.sampai] = hitungRentang(KU.periode); ambilUlangKu(); } else segarKu(); };
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.ku; if (k !== 'dari' && k !== 'sampai') return;
  KU[k] = e.target.value; if (KU.dari && KU.sampai && KU.dari <= KU.sampai) ambilUlangKu(); else toast('Tanggal "Dari" harus sebelum "Sampai".', true);
});

/* ---------- Tab Laporan ---------- */
const barisLap = (a, b, o = {}) => `<div class="flex items-baseline justify-between gap-3 py-2 ${o.garis ? 'border-t border-stone-200 font-extrabold' : ''} ${o.kecil ? 'text-xs text-stone-500' : 'text-sm'}"><span class="${o.indent ? 'pl-4 text-stone-600' : ''}">${a}</span><span class="shrink-0 ${o.warna || ''}">${b}</span></div>`;
function isiLaporan() {
  const r = KU.lap; if (!r) return memuatHtml; const g = r.ringkas;
  const kartu = (label, nilai, sub, kelas = '') => `<div class="min-w-0 rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5"><p class="truncate text-xs font-bold text-stone-500">${label}</p>
    <p class="mt-1 truncate font-display text-xl font-extrabold ${kelas}">${nilai}</p><p class="truncate text-[11px] text-stone-400">${sub}</p></div>`;
  const harian = r.harian.length > 1 ? `<section class="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
    <h3 class="font-display text-base font-extrabold">Per hari</h3>
    <div class="-mx-1 mt-2 overflow-x-auto"><table class="w-full min-w-[420px] text-sm"><thead><tr class="text-left text-xs font-bold text-stone-500"><th class="px-1 py-1.5">Tanggal</th><th class="px-1 text-right">Transaksi</th><th class="px-1 text-right">Penjualan</th><th class="px-1 text-right">Laba bersih</th></tr></thead>
      <tbody class="divide-y divide-stone-100">${r.harian.map((d) => `<tr><td class="px-1 py-2">${esc(waktuPendek(d.tanggal + ' 00:00').slice(0, 5))}</td><td class="px-1 text-right">${d.transaksi}</td><td class="px-1 text-right">${rp(d.omzet)}</td><td class="px-1 text-right font-bold ${warnaLaba(d.laba_bersih)}">${rp(d.laba_bersih)}</td></tr>`).join('')}</tbody></table></div></section>`
    : '';
  return `${chipPeriode()}
  <div class="mt-3 space-y-3">
    ${r.harian.length ? `<div class="flex justify-end"><button type="button" data-aksi="ku-csv" class="inline-flex items-center gap-1.5 text-sm font-bold text-biru">${ic('download', 'w-4 h-4')} Unduh CSV</button></div>` : ''}
    <div class="grid grid-cols-2 gap-3">
      ${kartu('Penjualan', rp(g.omzet), g.transaksi + ' transaksi')}
      ${kartu('Laba kotor', rp(g.laba_kotor), g.margin === null ? 'margin -' : 'margin ' + String(g.margin).replace('.', ',') + '%', warnaLaba(g.laba_kotor))}
      ${kartu('Pengeluaran', rp(g.pengeluaran_operasional), 'operasional')}
      ${kartu('Laba bersih', rp(g.laba_bersih), 'setelah pengeluaran & susut', warnaLaba(g.laba_bersih) + ' !text-2xl')}
    </div>
    ${r.tidak_tuntas ? `<p class="flex items-start gap-2 rounded-xl bg-jingga/30 px-3 py-2 text-sm font-semibold text-amber-900">${ic('triangle-alert', 'mt-0.5 h-4 w-4 shrink-0')}<span>${r.tidak_tuntas} transaksi berstatus tidak tuntas dan belum dihitung. Periksa di Kasir &rsaquo; Riwayat.</span></p>` : ''}
    <section class="rounded-2xl bg-white px-4 py-2 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5 divide-y divide-stone-100"><h3 class="py-2 font-display text-base font-extrabold">Laba rugi</h3>
      ${barisLap('Penjualan', rp(g.omzet))}${barisLap('Harga pokok barang terjual', '-' + rp(g.hpp), { indent: true })}
      ${barisLap('Laba kotor', rp(g.laba_kotor), { garis: true, warna: warnaLaba(g.laba_kotor) })}
      ${r.pemasukan_kategori.map((k) => barisLap(esc(k.label), '+' + rp(k.jumlah), { indent: true })).join('')}
      ${r.pengeluaran_kategori.filter((k) => k.operasional).map((k) => barisLap(esc(k.label), '-' + rp(k.jumlah), { indent: true })).join('')}
      ${g.susut_stok !== 0 ? barisLap('Susut stok (bersih)', (g.susut_stok > 0 ? '-' : '+') + rp(Math.abs(g.susut_stok)), { indent: true }) : ''}
      ${barisLap('Laba bersih', rp(g.laba_bersih), { garis: true, warna: warnaLaba(g.laba_bersih) })}
    </section>
    <section class="rounded-2xl bg-white px-4 py-2 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5 divide-y divide-stone-100"><h3 class="py-2 font-display text-base font-extrabold">Pembayaran diterima</h3>
      ${barisLap('Tunai', rp(r.metode.tunai))}${barisLap('QRIS', rp(r.metode.qris))}${barisLap('Transfer', rp(r.metode.transfer))}</section>
    <section class="rounded-2xl bg-white px-4 py-2 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5 divide-y divide-stone-100"><h3 class="py-2 font-display text-base font-extrabold">Informasi lain</h3>
      ${barisLap('Diskon diberikan', rp(g.diskon))}
      ${barisLap(`Transaksi dibatalkan (${r.batal.jumlah})`, rp(r.batal.total))}
      ${barisLap(`Pembelian stok (${r.pembelian_stok.penerimaan} penerimaan, ${r.pembelian_stok.unit} unit)`, rp(r.pembelian_stok.nilai))}
      ${barisLap('Pembayaran ke supplier', rp(g.bayar_supplier))}
      ${r.susut.kerugian || r.susut.pemulihan ? barisLap(`Susut stok: kerugian ${rp(r.susut.kerugian)}, pemulihan ${rp(r.susut.pemulihan)}`, '', { kecil: true }) : ''}
      ${r.susut.pribadi ? barisLap('Dipakai sendiri (tidak mengurangi laba)', rp(r.susut.pribadi), { kecil: true }) : ''}${r.susut.retur ? barisLap('Retur ke supplier (tidak mengurangi laba)', rp(r.susut.retur), { kecil: true }) : ''}
      ${barisLap(`Pesanan WhatsApp: ${r.wa.pesanan} masuk, ${r.wa_dicatat.transaksi} dicatat sebagai penjualan (${rp(r.wa_dicatat.omzet)})`, r.wa_menunggu ? r.wa_menunggu + ' menunggu' : '', { kecil: true, warna: 'font-bold text-amber-700' })}
      ${r.susut.estimasi ? `<p class="py-1 text-[11px] text-amber-700">${r.susut.estimasi} penyesuaian lama tidak punya catatan modal, dinilai dengan modal produk sekarang (estimasi).</p>` : ''}
      <p class="py-2 text-[11px] leading-snug text-stone-400">Laba bersih = penjualan − harga pokok + pemasukan lain − pengeluaran operasional − susut stok bersih. Pembelian stok dan pembayaran supplier tidak dikurangkan lagi karena modalnya sudah termasuk harga pokok. Pesanan WhatsApp baru masuk penjualan setelah dicatat oleh Admin/Owner di Kasir.</p>
    </section>
    ${harian}
  </div>`;
}
AKSI['ku-csv'] = () => {
  const r = KU.lap; if (!r) return;
  const baris = [['Tanggal', 'Transaksi', 'Penjualan', 'HPP', 'Laba kotor', 'Diskon', 'Pemasukan lain', 'Pengeluaran operasional', 'Bayar supplier', 'Susut stok', 'Laba bersih'],
    ...r.harian.map((d) => [d.tanggal, d.transaksi, d.omzet, d.hpp, d.laba_kotor, d.diskon, d.pemasukan_lain, d.pengeluaran_operasional, d.bayar_supplier, d.susut, d.laba_bersih]),
    ['TOTAL', r.ringkas.transaksi, r.ringkas.omzet, r.ringkas.hpp, r.ringkas.laba_kotor, r.ringkas.diskon, r.ringkas.pemasukan_lain, r.ringkas.pengeluaran_operasional, r.ringkas.bayar_supplier, r.ringkas.susut_stok, r.ringkas.laba_bersih]];
  const csv = '\uFEFF' + baris.map((b) => b.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');   // titik koma + BOM: terbaca benar di Excel Indonesia
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `laporan-keuangan-${r.dari}_${r.sampai}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Laporan diunduh.');
};

/* ---------- Tab Catatan kas ---------- */
const METODE_KU = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };
function isiCatatan() {
  const r = KU.entri; if (!r) return memuatHtml;
  const daftar = r.entri.filter((x) => KU.jenisF === 'semua' || x.jenis === KU.jenisF);
  const chip = (id, nama) => `<button type="button" data-aksi="ku-jenis" data-id="${id}" class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${KU.jenisF === id ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${nama}</button>`;
  return `${chipPeriode()}
  <div class="mt-3 grid grid-cols-2 gap-3">
    <div class="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5"><p class="text-xs font-bold text-stone-500">Pemasukan lain</p><p class="font-display text-xl font-extrabold text-emerald-700">${rp(r.total.pemasukan)}</p></div>
    <div class="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5"><p class="text-xs font-bold text-stone-500">Pengeluaran</p><p class="font-display text-xl font-extrabold text-tomat">${rp(r.total.pengeluaran)}</p></div></div>
  <button type="button" data-aksi="ku-catat" class="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white">${ic('plus', 'w-5 h-5')} Catat pengeluaran / pemasukan</button>
  <div class="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2">${chip('semua', 'Semua')}${chip('pengeluaran', 'Pengeluaran')}${chip('pemasukan', 'Pemasukan')}</div>
  ${daftar.length ? `<ul class="divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${daftar.map((x) => {
    const keluar = x.jenis === 'pengeluaran', batal = x.status === 'batal';
    return `<li><button type="button" data-aksi="ku-edit" data-id="${esc(x.id)}" class="flex w-full items-center gap-3 py-3 text-left ${batal ? 'opacity-50' : ''}">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full ${keluar ? 'bg-tomat/10 text-tomat' : 'bg-emerald-100 text-emerald-700'}">${ic(keluar ? 'arrow-up-right' : 'arrow-down-left', 'w-5 h-5')}</span>
      <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold">${esc((r.kategori[x.jenis][x.kategori] || [x.kategori])[0])}${x.keterangan ? ` <span class="font-normal text-stone-500">&middot; ${esc(x.keterangan)}</span>` : ''}</span>
        <span class="block text-xs text-stone-500">${esc(tglPanjang(x.tanggal))} &middot; ${esc(METODE_KU[x.metode] || x.metode)} &middot; ${esc(x.oleh)}</span></span>
      <span class="shrink-0 text-right"><span class="block text-sm font-extrabold ${batal ? 'line-through' : keluar ? 'text-tomat' : 'text-emerald-700'}">${keluar ? '-' : '+'}${rp(x.jumlah)}</span>${batal ? '<span class="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">Dibatalkan</span>' : ''}</span></button></li>`;
  }).join('')}</ul>` : kartuKosong('notebook-pen', 'Belum ada catatan', 'Catat pengeluaran toko atau pemasukan di luar penjualan.')}`;
}
AKSI['ku-jenis'] = (el) => { KU.jenisF = el.dataset.id; segarKu(); };

function formEntri(e) {
  const baru = !e; const jenis = e ? e.jenis : 'pengeluaran'; const k = KU.kat;
  return kepala(baru ? 'Catat kas' : 'Ubah catatan', 'notebook-pen') + `
  <form id="form-entri" data-form="entri" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <input type="hidden" name="id" value="${esc(e ? e.id : '')}">
      <fieldset ${baru ? '' : 'disabled'} class="grid grid-cols-2 gap-2"><legend class="sr-only">Jenis</legend>
        ${[['pengeluaran', 'Pengeluaran'], ['pemasukan', 'Pemasukan lain']].map((j) => `<label class="cursor-pointer"><input type="radio" name="jenis" value="${j[0]}" ${j[0] === jenis ? 'checked' : ''} class="peer sr-only">
          <span class="flex items-center justify-center rounded-xl py-2.5 text-sm font-bold ring-1 ring-stone-200 peer-checked:bg-biru peer-checked:text-white peer-checked:ring-biru peer-disabled:opacity-60">${j[1]}</span></label>`).join('')}</fieldset>
      <label class="block text-sm font-semibold text-stone-600">Kategori
        <select name="kategori" id="kat-entri" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800">${opsiKategori(jenis, e ? e.kategori : '')}</select></label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-semibold text-stone-600">Tanggal<input type="date" name="tanggal" required value="${esc(e ? e.tanggal : hariIniKu())}" max="${hariIniKu()}" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800"></label>
        ${kolom('jumlah', 'Jumlah (Rp)', { nilai: e ? e.jumlah : '', mode: 'numeric', maks: 10 })}</div>
      <label class="block text-sm font-semibold text-stone-600">Dibayar lewat
        <select name="metode" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800">${Object.entries(METODE_KU).map(([v, n]) => `<option value="${v}" ${e && e.metode === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <span class="mt-1 block text-xs font-normal text-stone-500">Hanya yang tunai memengaruhi hitungan kas di laci.</span></label>
      ${kolom('keterangan', 'Keterangan', { nilai: e ? e.keterangan : '', maks: 120, wajib: false, contoh: 'Contoh: token listrik bulan ini' })}
      ${e && e.status === 'batal' ? `<p class="rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-600">Catatan ini dibatalkan: ${esc(e.batal_alasan)}</p>` : ''}
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      ${e && e.status === 'batal' ? '' : `<button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">${baru ? 'Simpan catatan' : 'Simpan perubahan'}</button>`}
      <div class="flex gap-2">${!baru && e.status === 'aktif' ? `<button type="button" data-aksi="ku-batal" data-id="${esc(e.id)}" class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-tomat/40 py-2.5 text-sm font-bold text-tomat">${ic('undo-2', 'w-4 h-4')} Batalkan catatan</button>` : ''}
        <button type="button" data-aksi="tutup" class="flex-1 rounded-full py-2.5 text-sm font-bold text-stone-500">Tutup</button></div>
    </div></form>`;
}
function opsiKategori(jenis, pilih) {
  const k = (KU.kat || {})[jenis] || {};
  return Object.entries(k).map(([id, v]) => `<option value="${id}" ${id === pilih ? 'selected' : ''}>${esc(v[0])}${v[1] ? '' : ' (bukan beban operasional)'}</option>`).join('');
}
AKSI['ku-catat'] = () => bukaModal(formEntri(null));
AKSI['ku-edit'] = (el) => { const x = KU.entri.entri.find((y) => y.id === el.dataset.id); if (x) bukaModal(formEntri(x)); };
document.addEventListener('change', (e) => {
  if (e.target.name !== 'jenis' || !e.target.closest('#form-entri')) return;
  $('kat-entri').innerHTML = opsiKategori(e.target.value, '');
});
FORM.entri = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const baru = !d.id;
  const lama = baru ? null : KU.entri.entri.find((x) => x.id === d.id);
  const jenis = lama ? lama.jenis : d.jenis;   // saat mengedit, kolom jenis terkunci (disabled) dan tidak ikut terkirim oleh form
  const r = await api('keuangan_catat', { entri: { id: d.id || undefined, jenis: jenis, kategori: d.kategori, tanggal: d.tanggal, jumlah: angkaBersih(d.jumlah), metode: d.metode, keterangan: (d.keterangan || '').trim() } });
  tutupModal(); KU.kas = null; await ambilUlangKu(); toast(baru ? 'Catatan disimpan.' : 'Perubahan disimpan.'); return r;
});
AKSI['ku-batal'] = (el) => {
  bukaModal(kepala('Batalkan catatan', 'undo-2') + `
  <form data-form="entri-batal" class="flex min-h-0 flex-1 flex-col"><div class="space-y-3 px-4 py-3">
    <input type="hidden" name="id" value="${esc(el.dataset.id)}">
    <p class="text-sm text-stone-700">Catatan ini ditandai batal dan tidak dihitung di laporan maupun kas. Riwayatnya tetap tersimpan dan tercatat di Audit.</p>
    ${kolom('alasan', 'Alasan', { maks: 120, min: 3, contoh: 'Contoh: salah catat' })}<p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p></div>
    <div class="flex gap-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}"><button type="button" data-aksi="tutup" class="rounded-full px-5 py-3 font-bold text-stone-500">Kembali</button>
      <button type="submit" class="flex-1 rounded-full bg-tomat py-3 font-extrabold text-white disabled:opacity-40">Batalkan catatan</button></div></form>`);
};
FORM['entri-batal'] = (form, d) => jalankan(form, 'Membatalkan...', async () => {
  await api('keuangan_batal', { id: d.id, alasan: d.alasan.trim() }); tutupModal(); KU.kas = null; await ambilUlangKu(); toast('Catatan dibatalkan.');
});

/* ---------- Tab Tutup kas ---------- */
function isiKas() {
  const k = KU.kas; if (!k) return memuatHtml;
  const c = k.komponen, t = k.tutup, modal = t ? t.modal_awal : k.modal_awal_usulan, hitung = t ? t.kas_hitung : '';
  const baris = (a, b, kelas = '') => `<div class="flex items-baseline justify-between gap-3 py-1.5 text-sm"><span>${a}</span><span class="${kelas}">${b}</span></div>`;
  return `
  <label class="block text-sm font-semibold text-stone-600">Tanggal
    <input type="date" data-ku-kas="tanggal" value="${esc(KU.tglKas)}" max="${hariIniKu()}" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800"></label>
  ${t ? `<p class="mt-3 flex items-start gap-2 rounded-xl ${k.berubah ? 'bg-jingga/30 text-amber-900' : 'bg-langit/10 text-stone-700'} px-3 py-2 text-sm font-semibold">${ic(k.berubah ? 'triangle-alert' : 'circle-check', 'mt-0.5 h-4 w-4 shrink-0')}
    <span>${k.berubah ? 'Angka tanggal ini berubah sejak ditutup (ada transaksi dibatalkan atau catatan diubah). Periksa lalu tutup ulang.' : `Sudah ditutup ${esc(waktuPendek(t.waktu))} oleh ${esc(t.oleh)}. Anda bisa menutup ulang.`}</span></p>` : ''}
  <form id="form-kas" data-form="kas" class="mt-3 space-y-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
    ${kolom('modal_awal', 'Modal awal laci (Rp)', { nilai: modal, mode: 'numeric', maks: 10, bantu: t ? '' : 'Diisi otomatis dari kas yang dihitung pada penutupan sebelumnya.' })}
    <div class="divide-y divide-stone-100 rounded-xl bg-latar px-3 py-1">
      ${baris('Penjualan tunai', '+' + rp(c.penjualan_tunai))}${baris('Pemasukan lain tunai', '+' + rp(c.pemasukan_tunai))}${baris('Pengeluaran tunai', '-' + rp(c.pengeluaran_tunai))}
      <div class="flex items-baseline justify-between gap-3 py-2 font-extrabold"><span>Kas seharusnya</span><span id="kas-seharusnya" class="font-display text-xl">${rp(modal + c.penjualan_tunai + c.pemasukan_tunai - c.pengeluaran_tunai)}</span></div></div>
    ${kolom('kas_hitung', 'Uang tunai di laci (hasil hitung)', { nilai: hitung, mode: 'numeric', maks: 10, contoh: '0' })}
    <p id="kas-selisih" class="min-h-5 text-center text-base font-extrabold"></p>
    ${kolom('catatan', 'Catatan selisih', { nilai: t ? t.catatan : '', maks: 150, wajib: false, contoh: 'Wajib bila ada selisih' })}
    <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">${t ? 'Tutup ulang kas' : 'Tutup kas'}</button>
  </form>
  <h3 class="mt-5 flex items-center gap-2 font-display text-base font-extrabold">${ic('history', 'w-5 h-5 text-biru')}Riwayat penutupan</h3>
  ${(KU.riwayat || []).length ? `<ul class="mt-2 divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${KU.riwayat.map((x) => `
    <li><button type="button" data-aksi="ku-kas-tgl" data-t="${esc(x.tanggal)}" class="flex w-full items-center justify-between gap-3 py-3 text-left"><span><span class="block text-sm font-bold">${esc(tglPanjang(x.tanggal))}</span><span class="block text-xs text-stone-500">Hitung ${rp(x.kas_hitung)} &middot; ${esc(x.oleh)}</span></span>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${x.selisih === 0 ? 'bg-langit/15 text-biru' : x.selisih < 0 ? 'bg-tomat/10 text-tomat' : 'bg-jingga/30 text-amber-800'}">${x.selisih === 0 ? 'Pas' : (x.selisih > 0 ? 'Lebih ' : 'Kurang ') + rp(Math.abs(x.selisih))}</span></button></li>`).join('')}</ul>`
    : '<p class="mt-2 text-sm text-stone-500">Belum ada penutupan kas.</p>'}`;
}
function perbaruiKas() {
  const f = $('form-kas'); if (!f || !KU.kas) return; const c = KU.kas.komponen;
  const modal = angkaBersih(f.elements.modal_awal.value), hit = angkaBersih(f.elements.kas_hitung.value);
  const seharusnya = Number(modal || 0) + c.penjualan_tunai + c.pemasukan_tunai - c.pengeluaran_tunai;
  $('kas-seharusnya').textContent = rp(seharusnya);
  const el = $('kas-selisih'); if (hit === '') { el.textContent = ''; return; }
  const sel = Number(hit) - seharusnya;
  el.className = 'min-h-5 text-center text-base font-extrabold ' + (sel === 0 ? 'text-biru' : sel < 0 ? 'text-tomat' : 'text-amber-700');
  el.textContent = sel === 0 ? 'Kas pas' : (sel < 0 ? 'Kurang ' : 'Lebih ') + rp(Math.abs(sel));
}
document.addEventListener('input', (e) => { if (e.target.closest && e.target.closest('#form-kas')) perbaruiKas(); });
document.addEventListener('change', (e) => {
  if (!e.target.dataset || e.target.dataset.kuKas !== 'tanggal' || !e.target.value) return;
  KU.tglKas = e.target.value; ambilUlangKu();
});
AKSI['ku-kas-tgl'] = (el) => { KU.tglKas = el.dataset.t; ambilUlangKu(); window.scrollTo(0, 0); };
FORM.kas = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const r = await api('kas_tutup', { tanggal: KU.tglKas, modal_awal: angkaBersih(d.modal_awal) || '0', kas_hitung: angkaBersih(d.kas_hitung), catatan: (d.catatan || '').trim() });
  KU.kas = r; KU.riwayat = (await api('kas_riwayat', { limit: 14 })).riwayat; segarKu(); toast('Kas ditutup.');
});
