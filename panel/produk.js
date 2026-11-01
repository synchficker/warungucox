/* Warung Ucox | panel/produk.js | Master produk: daftar, cari, tambah/ubah/hapus, foto, barcode, label */

const chipStok = (p) => {
  if (p.stok <= 0) return '<span class="rounded-full bg-tomat/10 px-2 py-0.5 text-[11px] font-bold text-tomat">Habis</span>';
  if (statusStok(p) === 'menipis') return `<span class="rounded-full bg-jingga/30 px-2 py-0.5 text-[11px] font-bold text-amber-800">${p.stok} ${esc(p.satuan)}</span>`;
  return `<span class="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600">${p.stok} ${esc(p.satuan)}</span>`;
};
const gambarKotak = (p, ukuran = 'h-12 w-12') => `
  <span class="relative grid ${ukuran} shrink-0 place-items-center overflow-hidden rounded-xl bg-latar text-stone-400">${ic(ikonAman(katDari(p.kategori).ikon), 'w-5 h-5')}
    ${fotoSah(p.gambar) ? `<img src="${esc(p.gambar)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" class="absolute inset-0 h-full w-full object-cover">` : ''}</span>`;

function barisProduk(p) {
  const rugi = p.harga_jual < p.harga_beli;
  return `<li><button type="button" data-aksi="produk-edit" data-id="${esc(p.id)}" class="flex w-full items-center gap-3 py-3 text-left">
    ${gambarKotak(p)}
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-bold">${esc(p.nama)}</span>
      <span class="block truncate text-xs text-stone-500">${esc(katDari(p.kategori).nama)} &middot; ${esc(p.satuan)}${p.barcode ? ' &middot; ' + esc(p.barcode) : ' &middot; tanpa barcode'}</span>
    </span>
    <span class="shrink-0 text-right"><span class="block text-sm font-extrabold">${rp(p.harga_jual)}</span>
      <span class="mt-0.5 flex items-center justify-end gap-1">${rugi ? '<span class="rounded-full bg-tomat/10 px-1.5 py-0.5 text-[10px] font-bold text-tomat">Di bawah modal</span>' : ''}${chipStok(p)}</span></span>
  </button></li>`;
}

function produkTersaring() {
  const q = M.q.trim().toLowerCase();
  return M.produk.filter((p) => (M.kat === 'semua' || p.kategori === M.kat) && (!q || `${p.nama} ${p.barcode} ${p.id}`.toLowerCase().includes(q)));
}
function isiProduk() {
  const daftar = produkTersaring();
  const chip = (id, nama) => `<button type="button" data-aksi="filter-kat" data-id="${esc(id)}" class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${M.kat === id ? 'bg-biru text-white ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${esc(nama)}</button>`;
  return `
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">${chip('semua', 'Semua')}${M.kategori.map((k) => chip(k.id, k.nama)).join('')}</div>
    <p class="mt-1 px-1 text-xs font-semibold text-stone-500">${daftar.length} dari ${M.produk.length} produk</p>
    ${daftar.length ? `<ul class="mt-1 divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${daftar.map(barisProduk).join('')}</ul>`
      : kartuKosong('search-x', 'Produk tidak ditemukan', 'Coba kata kunci atau kategori lain.')}`;
}
function tabProduk() {
  return `
    <div class="flex items-center justify-between gap-3">
      <h2 class="font-display text-xl font-extrabold">Produk</h2>
      <button type="button" data-aksi="produk-tambah" class="inline-flex items-center gap-1.5 rounded-full bg-biru px-4 py-2.5 text-sm font-bold text-white">${ic('plus', 'w-4 h-4')}Tambah</button>
    </div>
    <div class="relative mt-3">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">${ic('search', 'w-5 h-5')}</span>
      <input id="cari-produk" type="search" autocomplete="off" value="${esc(M.q)}" placeholder="Cari nama atau barcode" class="h-12 w-full rounded-full border border-stone-200 bg-white pl-12 pr-4 text-base">
    </div>
    <div id="wrap-produk" class="mt-3">${isiProduk()}</div>`;
}
document.addEventListener('input', (e) => {
  if (e.target.id !== 'cari-produk') return;
  M.q = e.target.value; $('wrap-produk').innerHTML = isiProduk(); icons();
});
AKSI['filter-kat'] = (el) => { M.kat = el.dataset.id; $('wrap-produk').innerHTML = isiProduk(); icons(); };

/* ---------- Formulir produk ---------- */
const KOSONG = () => ({ id: '', nama: '', kategori: (M.kategori[0] || {}).id || '', satuan: '', harga_beli: '', harga_jual: '', stok: '0', stok_min: '', gambar: '', barcode: '' });
const SATUAN = ['pak', 'kg', 'liter', 'botol', 'bungkus', 'butir', 'sachet', 'tabung', 'karton', 'pcs'];

function infoLaba(beli, jual) {
  const b = Number(angkaBersih(beli)), j = Number(angkaBersih(jual));
  if (!beli || !jual) return '';
  if (j < b) return `<span class="font-bold text-tomat">Harga jual di bawah modal (rugi ${rp(b - j)} per satuan).</span>`;
  return `Laba ${rp(j - b)} per satuan${b ? ` (${Math.round(((j - b) / b) * 100)}% dari modal)` : ''}.`;
}
function infoBarcode(kode, idSendiri) {
  if (!kode) return 'Kosong: produk tidak bisa dipindai di POS.';
  if (!/^\d{6,14}$/.test(kode)) return '<span class="font-bold text-tomat">Barcode harus 6 sampai 14 angka.</span>';
  const kembar = M.produk.find((p) => p.barcode === kode && p.id !== idSendiri);
  if (kembar) return `<span class="font-bold text-tomat">Sudah dipakai: ${esc(kembar.nama)}.</span>`;
  return ean13Valid(kode) ? '<span class="font-bold text-biru">EAN-13 valid. Label bisa dicetak.</span>' : 'Bukan EAN-13 valid: bisa dipindai, tapi label tidak bisa dicetak dari sini.';
}

function formProduk(v) {
  const baru = !v.id;
  if (baru && !M.kategori.length) return kepala('Tambah produk', 'package-plus') + `<div class="px-4 py-6">${kartuKosong('layout-grid', 'Belum ada kategori', 'Buat kategori dulu di tab Kategori, lalu tambahkan produk.')}</div>`;
  return kepala(baru ? 'Tambah produk' : 'Ubah produk', baru ? 'package-plus' : 'package') + `
  <form id="form-produk" data-form="produk" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <input type="hidden" name="id" value="${esc(v.id)}">
      ${kolom('nama', 'Nama produk', { nilai: v.nama, contoh: 'Contoh: Beras Pandan Wangi 5 kg', maks: 60 })}
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm font-semibold text-stone-600">Kategori
          <select name="kategori" required class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800">
            ${M.kategori.map((k) => `<option value="${esc(k.id)}" ${k.id === v.kategori ? 'selected' : ''}>${esc(k.nama)}</option>`).join('')}</select></label>
        <label class="block text-sm font-semibold text-stone-600">Satuan
          <input name="satuan" required maxlength="15" list="daftar-satuan" value="${esc(v.satuan)}" placeholder="pak" autocomplete="off" autocapitalize="none"
            class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base font-semibold text-stone-800"><datalist id="daftar-satuan">${SATUAN.map((s) => `<option value="${s}">`).join('')}</datalist></label>
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${kolom('harga_beli', 'Harga beli (modal)', { nilai: v.harga_beli, mode: 'numeric', contoh: '66000', maks: 10 })}
        ${kolom('harga_jual', 'Harga jual', { nilai: v.harga_jual, mode: 'numeric', contoh: '72000', maks: 10 })}
      </div>
      <p id="info-laba" class="-mt-1 min-h-4 text-xs text-stone-500">${infoLaba(v.harga_beli, v.harga_jual)}</p>
      ${baru ? kolom('stok', 'Stok awal', { nilai: v.stok, mode: 'numeric', maks: 7, bantu: 'Hanya untuk produk baru. Perubahan stok selanjutnya lewat menu Stok.' })
             : `<div class="rounded-xl bg-latar px-3 py-2.5 text-sm"><span class="font-semibold text-stone-600">Stok saat ini:</span> <b>${esc(v.stok)} ${esc(v.satuan)}</b>
                <span class="block text-xs text-stone-500">Diubah lewat menu Stok (barang masuk atau penyesuaian) agar tercatat sebagai mutasi.</span></div>`}
      ${kolom('stok_min', 'Stok minimum (opsional)', { nilai: v.stok_min === null || v.stok_min === undefined ? '' : v.stok_min, mode: 'numeric', maks: 6, wajib: false, bantu: `Di bawah angka ini produk ditandai menipis. Kosong = memakai batas toko (${batasToko()}).` })}

      <div class="rounded-2xl border border-stone-200 p-3">
        <p class="text-sm font-semibold text-stone-600">Foto produk</p>
        <div class="mt-2 flex items-center gap-3">
          <span id="pratinjau-foto" class="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-latar text-stone-400">${ic(ikonAman(katDari(v.kategori).ikon), 'w-8 h-8')}${fotoSah(v.gambar) ? `<img src="${esc(v.gambar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" class="absolute inset-0 h-full w-full object-cover">` : ''}</span>
          <span class="space-y-2">
            <button type="button" data-aksi="pilih-foto" class="flex items-center gap-1.5 rounded-full bg-biru px-4 py-2 text-sm font-bold text-white">${ic('image-plus', 'w-4 h-4')} Pilih foto</button>
            <button type="button" data-aksi="hapus-foto" class="flex items-center gap-1.5 text-sm font-bold text-stone-500">${ic('trash-2', 'w-4 h-4')} Hapus foto</button>
            <input id="berkas-foto" type="file" accept="image/*" class="hidden">
          </span>
        </div>
        <p id="status-foto" class="mt-2 min-h-4 text-xs text-stone-500" role="status"></p>
        <label class="mt-1 block text-xs font-semibold text-stone-500">Atau tempel tautan gambar
          <input name="gambar" type="url" value="${esc(v.gambar)}" placeholder="https://..." autocomplete="off" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-800"></label>
      </div>

      <div>
        <label class="block text-sm font-semibold text-stone-600">Barcode
          <input name="barcode" inputmode="numeric" maxlength="14" value="${esc(v.barcode)}" placeholder="Pindai atau ketik" autocomplete="off"
            class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-base font-semibold tracking-wider text-stone-800"></label>
        <div class="mt-1.5 flex flex-wrap gap-2">
          ${bisaScan() ? `<button type="button" data-aksi="produk-scan" class="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm font-bold text-biru">${ic('scan-barcode', 'w-4 h-4')} Pindai kamera</button>` : ''}
          <button type="button" data-aksi="barcode-internal" class="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm font-bold text-biru">${ic('dices', 'w-4 h-4')} Buat barcode internal</button>
        </div>
        <p id="info-barcode" class="mt-1 min-h-4 text-xs text-stone-500">${infoBarcode(v.barcode, v.id)}</p>
      </div>
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">${baru ? 'Simpan produk' : 'Simpan perubahan'}</button>
      <div class="flex gap-2">
        ${baru ? '' : `<button type="button" data-aksi="produk-label" class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('printer', 'w-4 h-4')} Label</button>
        <button type="button" data-aksi="produk-hapus" class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-tomat/40 py-2.5 text-sm font-bold text-tomat">${ic('trash-2', 'w-4 h-4')} Hapus</button>`}
        <button type="button" data-aksi="tutup" class="flex-1 rounded-full py-2.5 text-sm font-bold text-stone-500">Batal</button>
      </div>
    </div>
  </form>`;
}

const ambilDraft = () => { const f = $('form-produk'); const d = Object.fromEntries(new FormData(f)); const asli = M.produk.find((p) => p.id === d.id); return Object.assign(KOSONG(), asli || {}, d); };
const formDari = () => $('form-produk');
AKSI['produk-tambah'] = () => bukaModal(formProduk(KOSONG()));
AKSI['produk-edit'] = (el) => { const p = M.produk.find((x) => x.id === el.dataset.id); if (p) bukaModal(formProduk(p)); };

document.addEventListener('input', (e) => {
  const f = e.target.closest && e.target.closest('#form-produk'); if (!f) return;
  if (e.target.name === 'harga_beli' || e.target.name === 'harga_jual') $('info-laba').innerHTML = infoLaba(f.harga_beli.value, f.harga_jual.value);
  if (e.target.name === 'barcode') $('info-barcode').innerHTML = infoBarcode(f.barcode.value.trim(), f.elements.id.value);
  if (e.target.name === 'gambar') pratinjauFoto(f.gambar.value.trim());
});
function pratinjauFoto(url) {
  const kotak = $('pratinjau-foto'); if (!kotak) return;
  const lama = kotak.querySelector('img'); if (lama) lama.remove();
  if (fotoSah(url)) { const im = document.createElement('img'); im.src = url; im.alt = ''; im.referrerPolicy = 'no-referrer'; im.className = 'absolute inset-0 h-full w-full object-cover'; im.onerror = () => im.remove(); kotak.appendChild(im); }
}

/* Foto: dikecilkan di browser (maks 600 px, JPEG) lalu diunggah ke Google Drive lewat Apps Script */
function kecilkanFoto(berkas, maks = 600) {
  return new Promise((ok, gagal) => {
    const u = URL.createObjectURL(berkas); const im = new Image();
    im.onload = () => {
      const r = Math.min(1, maks / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * r)); c.height = Math.max(1, Math.round(im.height * r));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); c.toBlob((b) => (b ? ok(b) : gagal(new Error('gagal'))), 'image/jpeg', 0.82);
    };
    im.onerror = () => { URL.revokeObjectURL(u); gagal(new Error('format')); };
    im.src = u;
  });
}
const keBase64 = (blob) => new Promise((ok, gagal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = gagal; r.readAsDataURL(blob); });

AKSI['pilih-foto'] = () => $('berkas-foto').click();
AKSI['hapus-foto'] = () => { const f = formDari(); f.gambar.value = ''; pratinjauFoto(''); $('status-foto').textContent = 'Foto dihapus. Simpan untuk menerapkan.'; };
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'berkas-foto' || !e.target.files[0]) return;
  const st = $('status-foto'); const f = formDari();
  st.textContent = 'Mengecilkan dan mengunggah foto...';
  try {
    const blob = await kecilkanFoto(e.target.files[0]);
    const r = await api('gambar_unggah', { data: await keBase64(blob) });
    f.gambar.value = r.url; pratinjauFoto(r.url);
    st.textContent = `Foto terunggah (${Math.round(blob.size / 1024)} KB). Simpan produk untuk menerapkan.`;
  } catch (err) {
    st.textContent = err.kode === 'format' || err.message === 'format' ? 'File itu bukan gambar yang bisa dibaca.' : pesanGalat(err);
  }
  e.target.value = '';
});

AKSI['barcode-internal'] = () => {
  const f = formDari(); const kode = barcodeInternal(M.produk.map((p) => p.barcode));
  f.barcode.value = kode; $('info-barcode').innerHTML = infoBarcode(kode, f.elements.id.value);
};
AKSI['produk-scan'] = () => {
  const d = ambilDraft();
  mulaiScan((kode) => { d.barcode = kode; bukaModal(formProduk(d)); }, () => bukaModal(formProduk(d)));
};

FORM.produk = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const baru = !d.id;
  const r = await api('produk_simpan', { produk: {
    id: d.id || undefined, nama: d.nama.trim(), kategori: d.kategori, satuan: d.satuan.trim(),
    harga_beli: angkaBersih(d.harga_beli), harga_jual: angkaBersih(d.harga_jual), stok: baru ? angkaBersih(d.stok) || '0' : undefined,
    gambar: (d.gambar || '').trim(), barcode: (d.barcode || '').trim(), stok_min: angkaBersih(d.stok_min)
  } });
  terapMaster(r); tutupModal(); segarMaster();
  toast(baru ? 'Produk ditambahkan.' : 'Perubahan produk disimpan.');
});

AKSI['produk-hapus'] = () => {
  const d = ambilDraft();
  konfirmasi('Hapus produk?', `<b>${esc(d.nama)}</b> akan dihapus dari daftar dan dari halaman toko. Stok saat ini: ${esc(d.stok)} ${esc(d.satuan)}. Tindakan ini tidak bisa dibatalkan.`, 'Ya, hapus', async () => {
    terapMaster(await api('produk_hapus', { id: d.id })); segarMaster(); toast('Produk dihapus.');
  });
};

/* ---------- Label barcode (cetak) ---------- */
function isiLabel(d, n) {
  const svg = svgEan13(d.barcode);
  const satu = `<div class="break-inside-avoid rounded-lg border border-stone-300 bg-white p-2 text-center">
    <p class="truncate text-[11px] font-extrabold leading-tight text-black">${esc(d.nama)}</p>${svg}<p class="text-xs font-extrabold text-black">${rp(Number(angkaBersih(d.harga_jual)))}</p></div>`;
  return `<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">${Array.from({ length: n }, () => satu).join('')}</div>`;
}
AKSI['produk-label'] = () => {
  const d = ambilDraft();
  if (!ean13Valid(d.barcode)) { toast('Label hanya untuk barcode EAN-13 yang valid. Gunakan "Buat barcode internal".', true); return; }
  window.__draftLabel = d;
  bukaModal(`<div class="tanpa-cetak">${kepala('Label barcode', 'printer')}</div>
    <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <label class="tanpa-cetak flex items-center gap-3 text-sm font-semibold text-stone-600">Jumlah label
        <input id="jumlah-label" type="number" min="1" max="60" value="6" class="w-20 rounded-xl border border-stone-200 px-3 py-2 text-base font-semibold text-stone-800"></label>
      <div id="label-cetak">${isiLabel(d, 6)}</div>
    </div>
    <div class="tanpa-cetak flex gap-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="button" data-aksi="label-kembali" class="rounded-full px-5 py-3 font-bold text-stone-500">Kembali</button>
      <button type="button" data-aksi="label-cetak" class="flex flex-1 items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white">${ic('printer', 'w-5 h-5')} Cetak</button>
    </div>`);
};
document.addEventListener('input', (e) => {
  if (e.target.id !== 'jumlah-label') return;
  const n = Math.min(60, Math.max(1, parseInt(e.target.value, 10) || 1)); $('label-cetak').innerHTML = isiLabel(window.__draftLabel, n);
});
AKSI['label-kembali'] = () => bukaModal(formProduk(window.__draftLabel));
AKSI['label-cetak'] = () => window.print();
