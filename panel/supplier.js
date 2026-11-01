/* Warung Ucox | panel/supplier.js | Master supplier */

function tabSupplier() {
  return `
    <div class="flex items-center justify-between gap-3">
      <div><h2 class="font-display text-xl font-extrabold">Supplier</h2><p class="text-sm font-semibold text-stone-500">${M.supplier.length} pemasok</p></div>
      <button type="button" data-aksi="supplier-tambah" class="inline-flex items-center gap-1.5 rounded-full bg-biru px-4 py-2.5 text-sm font-bold text-white">${ic('plus', 'w-4 h-4')}Tambah</button>
    </div>
    ${M.supplier.length ? `<ul class="mt-3 divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
      ${M.supplier.map((s) => `<li><button type="button" data-aksi="supplier-edit" data-id="${esc(s.id)}" class="flex w-full items-center gap-3 py-3 text-left">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-jingga/30 text-amber-800">${ic('truck', 'w-5 h-5')}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-bold">${esc(s.nama)}</span>
          <span class="block truncate text-xs text-stone-500">${esc([s.kota, s.kontak, s.telepon].filter(Boolean).join(' · ') || 'Belum ada kontak')}</span>
          <span class="mt-1 flex flex-wrap gap-1">${s.kategori.map((id) => `<span class="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">${esc(katDari(id).nama)}</span>`).join('')}
            ${s.termin_hari ? `<span class="rounded-full bg-langit/15 px-2 py-0.5 text-[10px] font-bold text-biru">Termin ${s.termin_hari} hari</span>` : ''}</span>
        </span>${ic('chevron-right', 'h-4 w-4 shrink-0 text-stone-400')}</button></li>`).join('')}</ul>`
      : kartuKosong('truck', 'Belum ada supplier', 'Catat pemasok langganan Anda untuk memudahkan barang masuk nanti.')}`;
}

function formSupplier(s) {
  const baru = !s;
  return kepala(baru ? 'Tambah supplier' : 'Ubah supplier', 'truck') + `
  <form data-form="supplier" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <input type="hidden" name="id" value="${esc(s ? s.id : '')}">
      ${kolom('nama', 'Nama supplier', { nilai: s ? s.nama : '', contoh: 'Contoh: UD Sumber Pangan', maks: 60 })}
      <div class="grid grid-cols-2 gap-3">
        ${kolom('kontak', 'Nama kontak', { nilai: s ? s.kontak : '', maks: 60, wajib: false })}
        ${kolom('telepon', 'Telepon / WA', { nilai: s ? s.telepon : '', tipe: 'tel', mode: 'tel', maks: 20, wajib: false, contoh: '0812-3456-7890' })}
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${kolom('kota', 'Kota', { nilai: s ? s.kota : '', maks: 40, wajib: false })}
        ${kolom('termin_hari', 'Termin bayar (hari)', { nilai: s ? s.termin_hari : '0', mode: 'numeric', maks: 3, wajib: false, bantu: '0 = bayar tunai.' })}
      </div>
      <fieldset><legend class="text-sm font-semibold text-stone-600">Memasok kategori</legend>
        <div class="mt-1.5 flex flex-wrap gap-2">${M.kategori.length ? M.kategori.map((k) => `<label class="cursor-pointer">
          <input type="checkbox" name="kat" value="${esc(k.id)}" ${s && s.kategori.includes(k.id) ? 'checked' : ''} class="peer sr-only">
          <span class="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-stone-600 ring-1 ring-stone-200 peer-checked:bg-biru peer-checked:text-white peer-checked:ring-biru peer-focus-visible:ring-2">${esc(k.nama)}</span></label>`).join('')
          : '<span class="text-sm text-stone-500">Belum ada kategori.</span>'}</div></fieldset>
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">${baru ? 'Simpan supplier' : 'Simpan perubahan'}</button>
      <div class="flex gap-2">
        ${baru ? '' : `<button type="button" data-aksi="supplier-hapus" data-id="${esc(s.id)}" class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-tomat/40 py-2.5 text-sm font-bold text-tomat">${ic('trash-2', 'w-4 h-4')} Hapus</button>`}
        <button type="button" data-aksi="tutup" class="flex-1 rounded-full py-2.5 text-sm font-bold text-stone-500">Batal</button>
      </div>
    </div>
  </form>`;
}
AKSI['supplier-tambah'] = () => bukaModal(formSupplier(null));
AKSI['supplier-edit'] = (el) => { const s = M.supplier.find((x) => x.id === el.dataset.id); if (s) bukaModal(formSupplier(s)); };
FORM.supplier = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const baru = !d.id;
  terapMaster(await api('supplier_simpan', { supplier: {
    id: d.id || undefined, nama: d.nama.trim(), kontak: (d.kontak || '').trim(), telepon: (d.telepon || '').trim(), kota: (d.kota || '').trim(),
    termin_hari: angkaBersih(d.termin_hari) || '0', kategori: new FormData(form).getAll('kat')
  } }));
  tutupModal(); segarMaster(); toast(baru ? 'Supplier ditambahkan.' : 'Supplier diperbarui.');
});
AKSI['supplier-hapus'] = (el) => {
  const s = M.supplier.find((x) => x.id === el.dataset.id); if (!s) return;
  konfirmasi('Hapus supplier?', `<b>${esc(s.nama)}</b> akan dihapus dari daftar supplier.`, 'Ya, hapus', async () => {
    terapMaster(await api('supplier_hapus', { id: s.id })); segarMaster(); toast('Supplier dihapus.');
  });
};
