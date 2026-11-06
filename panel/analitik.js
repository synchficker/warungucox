/* Warung Ucox | panel/analitik.js | Analitik: tren, pola, produk terlaris, ABC, saran restok, persediaan, titik impas, temuan beserta bukti angka */

const AN = { periode: '30', dari: '', sampai: '', data: null, urut: 'qty' };
const PERIODE_AN = [['7', '7 hari'], ['30', '30 hari'], ['bulan', 'Bulan ini'], ['90', '90 hari'], ['kustom', 'Pilih tanggal']];
function rentangAn(p) {
  const hari = hariIniKu(), d = new Date();
  if (p === '7') return [geserHari(hari, -6), hari];
  if (p === '30') return [geserHari(hari, -29), hari];
  if (p === '90') return [geserHari(hari, -89), hari];
  if (p === 'bulan') return [`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`, hari];
  return [AN.dari || geserHari(hari, -29), AN.sampai || hari];
}
const pctTeks = (n) => String(n).replace('.', ',') + '%';
const desc = (n, d = 1) => String(Math.round(n * 10 ** d) / 10 ** d).replace('.', ',');
const lencanaUbah = (p) => (p === null ? '<span class="text-[11px] font-semibold text-stone-400">tanpa pembanding</span>'
  : `<span class="inline-flex items-center gap-0.5 text-[11px] font-extrabold ${p >= 0 ? 'text-emerald-700' : 'text-tomat'}">${ic(p >= 0 ? 'trending-up' : 'trending-down', 'w-3.5 h-3.5')}${p > 0 ? '+' : ''}${pctTeks(p)}</span>`);

/* ---------- Grafik batang SVG (tanpa pustaka) ---------- */
function svgBatang(nilai, label, o = {}) {
  const W = 320, H = o.tinggi || 120, atas = 8, bawah = 18, n = nilai.length, maks = Math.max(1, ...nilai);
  const lebar = (W - 4) / n, bw = Math.max(2, lebar * 0.68), langkah = o.langkah || Math.ceil(n / 7);
  const mi = nilai.indexOf(Math.max(...nilai));
  const batang = nilai.map((v, i) => {
    const h = Math.round((H - atas - bawah) * v / maks), x = 2 + i * lebar + (lebar - bw) / 2;
    return `<rect x="${x.toFixed(1)}" y="${H - bawah - h}" width="${bw.toFixed(1)}" height="${v > 0 ? Math.max(1, h) : 0}" rx="2" fill="${i === mi && v > 0 ? '#F59E0B' : '#0F78B0'}"><title>${esc(label[i])}: ${esc(o.fmt ? o.fmt(v) : v)}</title></rect>`;
  }).join('');
  const sumbu = nilai.map((v, i) => (i % langkah === 0 ? `<text x="${(2 + i * lebar + lebar / 2).toFixed(1)}" y="${H - 4}" font-size="9" fill="#78716c" text-anchor="middle">${esc(o.sumbu ? o.sumbu(i) : label[i])}</text>` : '')).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" role="img" aria-label="${esc(o.judul || 'Grafik')}"><line x1="0" y1="${H - bawah}" x2="${W}" y2="${H - bawah}" stroke="#e7e5e4"/>${batang}${sumbu}</svg>`;
}
const kartuAn = (judul, ikon, isi, ket = '') => `<section class="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
  <h3 class="flex items-center gap-2 font-display text-base font-extrabold">${ic(ikon, 'w-5 h-5 text-biru')}${judul}</h3>${isi}
  ${ket ? `<details class="mt-3 text-xs text-stone-500"><summary class="cursor-pointer font-bold text-biru">Cara menghitung</summary><div class="mt-1.5 space-y-1 leading-relaxed">${ket}</div></details>` : ''}</section>`;
const barisAn = (a, b, o = {}) => `<div class="flex items-baseline justify-between gap-3 py-1.5 text-sm ${o.tebal ? 'font-extrabold' : ''}"><span class="min-w-0 ${o.k ? 'text-stone-500' : ''}">${a}</span><span class="shrink-0 ${o.w || ''}">${b}</span></div>`;

VIEW.analitik = {
  judul: 'Analitik', ikon: 'chart-column', izin: 'laporan', grup: 'lainnya', judulPanjang: 'Analitik', info: 'Tren, terlaris, restok, titik impas, saran',
  async html() { [AN.dari, AN.sampai] = rentangAn(AN.periode); AN.data = await api('analitik', { dari: AN.dari, sampai: AN.sampai }); return kerangkaAn(); }
};
const chipAn = () => `<div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">${PERIODE_AN.map((p) => `<button type="button" data-aksi="an-periode" data-p="${p[0]}" class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${AN.periode === p[0] ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${p[1]}</button>`).join('')}</div>
  ${AN.periode === 'kustom' ? `<div class="mt-2 grid grid-cols-2 gap-2">
    <label class="block text-xs font-semibold text-stone-500">Dari<input type="date" data-an="dari" value="${esc(AN.dari)}" max="${hariIniKu()}" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base font-semibold"></label>
    <label class="block text-xs font-semibold text-stone-500">Sampai<input type="date" data-an="sampai" value="${esc(AN.sampai)}" max="${hariIniKu()}" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base font-semibold"></label></div>` : ''}`;
function kerangkaAn() { return `<div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl"><h2 class="font-display text-xl font-extrabold">Analitik</h2><p class="text-sm text-stone-500">Semua angka dihitung dari transaksi nyata. Ketuk "Cara menghitung" untuk melihat rumusnya.</p>
  <div class="mt-3">${chipAn()}</div><div id="area-an" class="mt-4 space-y-4">${isiAn()}</div></div>`; }
function segarAn() { if (S.rute === 'analitik' && $('area-an')) { $('area-an').innerHTML = isiAn(); icons(); } }
async function ambilUlangAn() {
  const a = $('area-an'); if (a) { a.innerHTML = memuatHtml; icons(); }
  try { AN.data = await api('analitik', { dari: AN.dari, sampai: AN.sampai }); segarAn(); } catch (e) { if (a) a.innerHTML = kartuKosong('cloud-off', 'Analitik belum bisa dimuat', pesanGalat(e)); }
}
AKSI['an-periode'] = (el) => { AN.periode = el.dataset.p; if (AN.periode !== 'kustom') { [AN.dari, AN.sampai] = rentangAn(AN.periode); $('p-main').innerHTML = kerangkaAn(); icons(); ambilUlangAn(); } else { $('p-main').innerHTML = kerangkaAn(); icons(); } };
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.an; if (k !== 'dari' && k !== 'sampai') return;
  AN[k] = e.target.value; if (AN.dari && AN.sampai && AN.dari <= AN.sampai) ambilUlangAn(); else toast('Tanggal "Dari" harus sebelum "Sampai".', true);
});
AKSI['an-urut'] = (el) => { AN.urut = el.dataset.u; segarAn(); };

const WARNA_SARAN = { penting: ['bg-tomat/10', 'text-tomat', 'siren'], info: ['bg-langit/10', 'text-biru', 'lightbulb'], baik: ['bg-emerald-50', 'text-emerald-700', 'badge-check'] };
function htmlSaran(daftar, batas) {
  const d = batas ? daftar.slice(0, batas) : daftar;
  if (!d.length) return '<p class="mt-2 text-sm text-stone-500">Belum ada temuan khusus untuk periode ini.</p>';
  return `<ul class="mt-2 space-y-2">${d.map((s) => { const w = WARNA_SARAN[s.tingkat] || WARNA_SARAN.info; return `<li class="rounded-xl ${w[0]} p-3">
    <p class="flex items-start gap-2 text-sm font-extrabold ${w[1]}">${ic(w[2], 'mt-0.5 h-4 w-4 shrink-0')}<span>${esc(s.judul)}</span></p><p class="mt-1 text-sm text-stone-700">${esc(s.teks)}</p>
    ${s.bukti.length ? `<details class="mt-1.5 text-xs text-stone-600"><summary class="cursor-pointer font-bold text-biru">Lihat bukti angka</summary><ul class="mt-1 list-disc space-y-0.5 pl-4">${s.bukti.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></details>` : ''}</li>`; }).join('')}</ul>`;
}

function isiAn() {
  const a = AN.data; if (!a) return memuatHtml;
  const r = a.ringkas, b = a.banding, pj = a.persediaan, im = a.impas;
  const kartuKecil = (label, nilai, sub) => `<div class="min-w-0 rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5"><p class="truncate text-xs font-bold text-stone-500">${label}</p><p class="mt-1 truncate font-display text-xl font-extrabold">${nilai}</p><div class="truncate">${sub}</div></div>`;
  const ringkasan = `<div class="grid grid-cols-2 gap-3">
    ${kartuKecil('Penjualan', rp(r.omzet), lencanaUbah(b.omzet_pct))}${kartuKecil('Transaksi', r.transaksi, lencanaUbah(b.transaksi_pct))}
    ${kartuKecil('Laba kotor', rp(r.laba_kotor), lencanaUbah(b.laba_kotor_pct))}${kartuKecil('Rata-rata per transaksi', rp(r.aov), `<span class="text-[11px] text-stone-400">${desc(r.item_per_transaksi, 1)} barang/transaksi</span>`)}</div>
    <p class="-mt-2 px-1 text-[11px] text-stone-400">Dibanding ${a.hari} hari sebelumnya (${esc(b.dari.slice(5).split('-').reverse().join('/'))} s.d. ${esc(b.sampai.slice(5).split('-').reverse().join('/'))}).</p>`;
  const tren = kartuAn('Tren penjualan harian', 'chart-column', `${svgBatang(a.harian.map((d) => d.omzet), a.harian.map((d) => tglPanjang(d.tanggal)), { judul: 'Penjualan per hari', fmt: rp, sumbu: (i) => a.harian[i].tanggal.slice(8) })}
    <p class="mt-1 text-xs text-stone-500">Rata-rata ${rp(r.rata_harian)} per hari (${r.hari_aktif} dari ${a.hari} hari ada penjualan). Batang kuning = hari terbaik.</p>
    ${a.proyeksi ? `<p class="mt-2 rounded-xl bg-latar px-3 py-2 text-sm">Proyeksi akhir bulan bila laju ini bertahan: <b>${rp(a.proyeksi.omzet)}</b> penjualan, <b>${rp(a.proyeksi.laba_kotor)}</b> laba kotor.</p>` : ''}`,
    `Penjualan = jumlah tagihan transaksi selesai (transaksi batal tidak dihitung). Rata-rata harian = penjualan ÷ jumlah hari kalender di periode.<br>Pembanding = periode sebelumnya yang sama panjang. Perubahan % = (sekarang − sebelumnya) ÷ sebelumnya × 100; tampil "tanpa pembanding" bila periode sebelumnya nol.<br>Proyeksi hanya untuk "Bulan ini": penjualan sampai hari ini ÷ hari berlalu × jumlah hari dalam bulan. Ini perkiraan kasar, bukan jaminan.`);
  const pola = kartuAn('Kapan toko ramai', 'clock', `<p class="mt-2 text-xs font-bold text-stone-500">Transaksi per jam</p>${svgBatang(a.jam.map((j) => j.transaksi), a.jam.map((j) => String(j.jam).padStart(2, '0') + '.00'), { judul: 'Transaksi per jam', fmt: (v) => v + ' transaksi', sumbu: (i) => i, langkah: 3 })}
    <p class="mt-3 text-xs font-bold text-stone-500">Rata-rata penjualan per hari dalam pekan</p>${svgBatang(a.hari_minggu.map((h) => h.rata_omzet), a.hari_minggu.map((h) => h.nama), { judul: 'Rata-rata penjualan per hari', fmt: rp, sumbu: (i) => a.hari_minggu[i].nama.slice(0, 3), langkah: 1, tinggi: 100 })}`,
    `Jam diambil dari waktu transaksi (WIB). Rata-rata per hari dalam pekan = total penjualan hari itu ÷ berapa kali hari itu muncul di periode (bukan total), supaya adil bila periode tidak kelipatan 7 hari.`);
  const urut = AN.urut === 'laba' ? a.terlaris_laba : a.terlaris_qty, maksV = Math.max(1, ...urut.map((p) => (AN.urut === 'laba' ? p.laba : p.qty)));
  const terlaris = kartuAn('Produk terlaris', 'package-search', `<div class="mt-2 flex gap-2">${[['qty', 'Jumlah terjual'], ['laba', 'Laba kotor']].map((u) => `<button type="button" data-aksi="an-urut" data-u="${u[0]}" class="rounded-full px-3 py-1 text-xs font-bold ring-1 ${AN.urut === u[0] ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${u[1]}</button>`).join('')}</div>
    ${urut.length ? `<ol class="mt-2 divide-y divide-stone-100">${urut.map((p, i) => { const v = AN.urut === 'laba' ? p.laba : p.qty; return `<li class="py-2"><div class="flex items-baseline justify-between gap-2 text-sm"><span class="min-w-0 truncate font-bold">${i + 1}. ${esc(p.nama)} <span class="rounded bg-stone-100 px-1 text-[10px] font-extrabold text-stone-500">${p.kelas}</span></span>
      <span class="shrink-0 font-extrabold ${AN.urut === 'laba' && p.laba < 0 ? 'text-tomat' : ''}">${AN.urut === 'laba' ? rp(p.laba) : p.qty + ' ' + esc(p.satuan)}</span></div>
      <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100"><div class="h-full rounded-full ${v < 0 ? 'bg-tomat' : 'bg-biru'}" style="width:${Math.max(2, Math.round(Math.max(0, v) * 100 / maksV))}%"></div></div>
      <p class="mt-0.5 text-[11px] text-stone-500">Penjualan ${rp(p.omzet)} &middot; margin ${p.margin === null ? '-' : pctTeks(p.margin)}</p></li>`; }).join('')}</ol>` : '<p class="mt-2 text-sm text-stone-500">Belum ada penjualan pada periode ini.</p>'}`,
    `Penjualan produk = harga × jumlah − diskon barang − bagian diskon transaksi (diskon transaksi dibagi ke tiap barang menurut porsi nilainya).<br>Laba kotor produk = penjualan produk − (jumlah × harga modal saat transaksi). Margin = laba ÷ penjualan produk × 100.<br>Huruf kecil A/B/C = kelas Pareto (lihat bagian berikutnya).`);
  const abcT = a.abc.A.persen + a.abc.B.persen + a.abc.C.persen;
  const abc = kartuAn('Penyumbang penjualan (ABC / Pareto)', 'target', `<div class="mt-2 flex h-5 overflow-hidden rounded-full bg-stone-100" role="img" aria-label="Porsi penjualan kelas A, B, C">
      ${[['A', 'bg-biru'], ['B', 'bg-amber-400'], ['C', 'bg-stone-300']].map(([k, w]) => `<div class="${w}" style="width:${abcT ? a.abc[k].persen * 100 / abcT : 0}%"></div>`).join('')}</div>
    <ul class="mt-2 space-y-1 text-sm">${[['A', 'Andalan: sampai 80% penjualan kumulatif'], ['B', 'Pendukung: 80% sampai 95%'], ['C', 'Ekor: sisa 5%']].map(([k, t]) => `<li class="flex items-baseline justify-between gap-2"><span><b>Kelas ${k}</b> <span class="text-xs text-stone-500">${t}</span></span><span class="shrink-0 font-bold">${a.abc[k].produk} produk &middot; ${pctTeks(a.abc[k].persen)}</span></li>`).join('')}</ul>
    <p class="mt-2 text-xs text-stone-500">Jaga stok kelas A agar tidak kosong. Kelas C bisa dikurangi variasinya bila memakan modal.</p>`,
    `Produk diurutkan dari penjualan terbesar. Sebuah produk masuk kelas A bila porsi kumulatif <i>sebelum</i> menambahkannya masih di bawah 80%, kelas B bila di bawah 95%, selebihnya C. Dengan aturan ini produk yang melewati garis 80% tetap termasuk A.`);
  const restok = kartuAn('Saran restok', 'package-search', a.restok.length ? `<p class="mt-1 text-xs text-stone-500">Lead time ${a.param.lead_time} hari, cakupan ${a.param.hari_cakupan} hari, tingkat layanan 95%. Ubah di Pengaturan toko.</p>
    <ul class="mt-2 divide-y divide-stone-100">${a.restok.map((p) => `<li class="py-2.5"><div class="flex items-baseline justify-between gap-2"><span class="min-w-0 truncate text-sm font-bold">${esc(p.nama)}</span><span class="shrink-0 rounded-full bg-jingga/30 px-2 py-0.5 text-xs font-extrabold text-amber-800">Beli ${p.saran_qty} ${esc(p.satuan)}</span></div>
      <p class="text-xs text-stone-500">Stok ${p.stok} &middot; terjual ${desc(p.rata_harian, 2)}/hari &middot; cukup ${p.hari_stok === null ? '-' : desc(p.hari_stok, 1)} hari &middot; titik pesan ulang ${desc(p.rop, 1)}</p>
      <p class="text-xs text-stone-500">Perkiraan biaya ${rp(p.biaya_saran)}${p.data_cukup ? '' : ' &middot; <b class="text-amber-700">data kurang dari 7 hari</b>'}</p></li>`).join('')}</ul>
    <p class="mt-2 rounded-xl bg-latar px-3 py-2 text-sm">Total perkiraan belanja: <b>${rp(a.restok.reduce((x, p) => x + p.biaya_saran, 0))}</b></p>` : '<p class="mt-2 text-sm text-stone-500">Tidak ada produk yang stoknya di bawah titik pesan ulang.</p>',
    `d = jumlah terjual ÷ hari efektif (hari kalender, termasuk hari tanpa penjualan). s = simpangan baku penjualan harian = √[ Σ(x − d)² ÷ (n − 1) ].<br>Stok pengaman = 1,65 × s × √L (1,65 = tingkat layanan 95%; L = lead time). <b>Titik pesan ulang = d × L + stok pengaman</b>: bila stok sudah sama atau di bawahnya, saatnya memesan.<br><b>Stok target = titik pesan ulang + d × R</b> (R = hari cakupan). <b>Saran beli = stok target − stok sekarang</b>, dibulatkan ke atas.<br>Produk baru dihitung sejak hari dibuat. Makin sedikit data (kurang dari 7 hari), makin kasar saran ini.`);
  const mati = kartuAn('Stok mati (tidak laku)', 'hourglass', a.stok_mati.jumlah ? `<p class="mt-1 text-sm">Modal tertahan <b>${rp(a.stok_mati.nilai)}</b> di ${a.stok_mati.jumlah} produk yang tidak terjual selama ${a.hari} hari.</p>
    <ul class="mt-1 divide-y divide-stone-100">${a.stok_mati.daftar.map((p) => `<li class="flex items-baseline justify-between gap-2 py-1.5 text-sm"><span class="min-w-0 truncate">${esc(p.nama)} <span class="text-xs text-stone-500">(${p.stok} ${esc(p.satuan)})</span></span><span class="shrink-0 font-bold">${rp(p.nilai)}</span></li>`).join('')}</ul>` : '<p class="mt-2 text-sm text-stone-500">Semua produk yang ada stoknya terjual pada periode ini.</p>',
    `Stok mati = produk dengan stok lebih dari nol yang tidak terjual sama sekali di periode ini. Produk yang baru dibuat di dalam periode tidak dihitung. Nilai = stok × harga modal.`);
  const sedia = kartuAn('Persediaan & perputaran', 'boxes', `<div class="mt-1 divide-y divide-stone-100">${barisAn('Nilai persediaan (modal)', rp(pj.nilai_modal), { tebal: true })}${barisAn('Nilai jika terjual semua', rp(pj.nilai_jual))}${barisAn('Potensi laba kotor', rp(pj.potensi_laba))}
    ${barisAn('Perputaran persediaan', pj.perputaran === null ? '-' : desc(pj.perputaran, 2) + '× periode ini')}${barisAn('Setara per tahun', pj.perputaran_tahunan === null ? '-' : desc(pj.perputaran_tahunan, 1) + '× setahun')}
    ${barisAn('Persediaan cukup untuk', pj.hari_persediaan === null ? '-' : desc(pj.hari_persediaan, 1) + ' hari penjualan')}${barisAn('Laba kotor per Rp1 persediaan (setahun)', pj.gmroi_tahunan === null ? '-' : 'Rp' + desc(pj.gmroi_tahunan, 2))}
    ${barisAn('Stok habis / menipis', `${pj.habis} / ${pj.menipis} dari ${pj.produk} produk`)}</div>
    ${a.hari < 14 ? '<p class="mt-2 text-xs font-semibold text-amber-700">Periode kurang dari 14 hari: angka "per tahun" masih kasar. Pilih 30 hari atau lebih.</p>' : ''}`,
    `Perputaran = harga pokok penjualan periode ÷ nilai persediaan sekarang (pendekatan; persediaan rata-rata tidak tersimpan). Per tahun = perputaran × 365 ÷ jumlah hari.<br>Persediaan cukup untuk = nilai persediaan ÷ (harga pokok ÷ jumlah hari).<br>Laba kotor per Rp1 persediaan (GMROI) = laba kotor setahun ÷ nilai persediaan. Makin tinggi makin efisien modal Anda berputar.`);
  const impas = kartuAn('Titik impas harian', 'scale', im.omzet_impas_harian === null ? '<p class="mt-2 text-sm text-stone-500">Belum bisa dihitung (belum ada laba kotor pada periode ini).</p>'
    : `<div class="mt-1 divide-y divide-stone-100">${barisAn('Pengeluaran operasional per hari', rp(im.biaya_tetap_harian))}${barisAn('Rasio laba kotor', pctTeks(desc(im.margin_rasio * 100, 1)))}${barisAn('Penjualan impas per hari', rp(im.omzet_impas_harian), { tebal: true })}
      ${barisAn('Penjualan rata-rata per hari', rp(im.omzet_rata_harian))}${barisAn(im.status === 'di_atas' ? 'Di atas titik impas' : 'Di bawah titik impas', rp(Math.abs(im.selisih)), { tebal: true, w: im.status === 'di_atas' ? 'text-emerald-700' : 'text-tomat' })}
      ${barisAn('Setara transaksi per hari', desc(im.transaksi_impas_harian, 1) + ' transaksi', { k: true })}</div>`,
    `Titik impas harian = (pengeluaran operasional ÷ jumlah hari) ÷ (laba kotor ÷ penjualan). Artinya penjualan harian minimal agar laba kotor menutup pengeluaran operasional. Semua pengeluaran operasional dianggap tetap (sewa, gaji, listrik); susut stok tidak ikut.`);
  const kasir = a.kasir.length ? kartuAn('Kinerja kasir', 'users', `<div class="-mx-1 mt-2 overflow-x-auto"><table class="w-full min-w-[400px] text-sm"><thead><tr class="text-left text-xs font-bold text-stone-500"><th class="px-1 py-1.5">Petugas</th><th class="px-1 text-right">Transaksi</th><th class="px-1 text-right">Penjualan</th><th class="px-1 text-right">Diskon</th><th class="px-1 text-right">Batal</th></tr></thead>
      <tbody class="divide-y divide-stone-100">${a.kasir.map((k) => `<tr><td class="px-1 py-2 font-bold">${esc(k.nama)}</td><td class="px-1 text-right">${k.transaksi}</td><td class="px-1 text-right">${rp(k.omzet)}</td><td class="px-1 text-right">${pctTeks(desc(k.diskon_persen, 1))}</td><td class="px-1 text-right ${k.batal ? 'font-bold text-tomat' : ''}">${k.batal}</td></tr>`).join('')}</tbody></table></div>`,
    `Diskon % = total diskon (barang + transaksi) ÷ penjualan kotor sebelum diskon. Batal = jumlah transaksi dibatalkan atas nama petugas itu. Angka ini fakta untuk bahan evaluasi, bukan tuduhan.`) : '';
  const susut = kartuAn('Susut stok', 'package-x', `<div class="mt-1 divide-y divide-stone-100">${barisAn('Kerugian (rusak, kadaluarsa, hilang, opname kurang)', '-' + rp(a.susut.kerugian))}${barisAn('Pemulihan (ditemukan, opname lebih)', '+' + rp(a.susut.pemulihan))}${barisAn('Susut bersih (mengurangi laba)', rp(a.susut.bersih), { tebal: true, w: a.susut.bersih > 0 ? 'text-tomat' : '' })}
    ${barisAn('Dipakai sendiri (tidak dihitung)', rp(a.susut.pribadi), { k: true })}${barisAn('Retur ke supplier (tidak dihitung)', rp(a.susut.retur), { k: true })}</div>
    ${r.hpp > 0 ? `<p class="mt-2 text-xs text-stone-500">Susut bersih = ${desc(a.susut.bersih * 100 / r.hpp, 1)}% dari harga pokok penjualan. Patokan wajar toko kelontong: di bawah 2%.</p>` : ''}`,
    `Nilai = jumlah × harga modal saat penyesuaian dicatat. Pengambilan pemilik dan retur ke supplier bukan kerugian usaha sehingga hanya ditampilkan sebagai informasi.`);
  return `${ringkasan}
    ${kartuAn('Temuan & saran', 'lightbulb', htmlSaran(a.saran), 'Setiap temuan dihasilkan oleh aturan tetap atas data periode ini dan menyertakan angka buktinya. Aplikasi memberi saran, keputusan tetap di tangan Anda.')}
    ${tren}${pola}${terlaris}${abc}${restok}${mati}${sedia}${impas}${kasir}${susut}`;
}
