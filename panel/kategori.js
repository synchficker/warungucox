/* Warung Ucox | panel/kategori.js | Master kategori */

const IKON_PILIHAN = ['wheat', 'droplet', 'candy', 'egg', 'soup', 'flame', 'cigarette', 'chef-hat', 'milk', 'coffee', 'cookie', 'beef', 'fish', 'apple', 'carrot', 'croissant',
  'shopping-basket', 'spray-can', 'shirt', 'pill', 'baby', 'bean', 'citrus', 'ice-cream-cone', 'salad', 'wine', 'beer', 'utensils', 'sandwich', 'cup-soda', 'drumstick', 'popcorn', 'package', 'tag'];

function tabKategori() {
  const jumlah = (id) => M.produk.filter((p) => p.kategori === id).length;
  return `
    <div class="flex items-center justify-between gap-3">
      <div><h2 class="font-display text-xl font-extrabold">Kategori</h2><p class="text-sm font-semibold text-stone-500">${M.kategori.length} kategori</p></div>
      <button type="button" data-aksi="kategori-tambah" class="inline-flex items-center gap-1.5 rounded-full bg-biru px-4 py-2.5 text-sm font-bold text-white">${ic('plus', 'w-4 h-4')}Tambah</button>
    </div>
    ${M.kategori.length ? `<ul class="mt-3 divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
      ${M.kategori.map((k) => `<li><button type="button" data-aksi="kategori-edit" data-id="${esc(k.id)}" class="flex w-full items-center gap-3 py-3 text-left">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-langit/15 text-biru">${ic(ikonAman(k.ikon), 'w-5 h-5')}</span>
        <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold">${esc(k.nama)}</span><span class="block text-xs text-stone-500">${jumlah(k.id)} produk</span></span>
        ${ic('chevron-right', 'h-4 w-4 text-stone-400')}</button></li>`).join('')}</ul>`
      : kartuKosong('layout-grid', 'Belum ada kategori', 'Tambahkan kategori pertama, misalnya Beras atau Minyak.')}`;
}

function formKategori(k) {
  const baru = !k; const dipakai = k ? M.produk.filter((p) => p.kategori === k.id).length : 0;
  const ikon = ikonAman(k ? k.ikon : 'package');
  return kepala(baru ? 'Tambah kategori' : 'Ubah kategori', 'layout-grid') + `
  <form data-form="kategori" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <input type="hidden" name="id" value="${esc(k ? k.id : '')}">
      ${kolom('nama', 'Nama kategori', { nilai: k ? k.nama : '', contoh: 'Contoh: Minyak & Gula', maks: 30 })}
      <div>
        <div class="flex items-center gap-3"><span id="pratinjau-ikon" class="grid h-12 w-12 place-items-center rounded-full bg-langit/15 text-biru">${ic(ikon, 'w-6 h-6')}</span>
          <label class="block flex-1 text-sm font-semibold text-stone-600">Ikon
            <input name="ikon" value="${esc(ikon)}" required maxlength="40" autocomplete="off" autocapitalize="none" class="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-base font-semibold text-stone-800"></label></div>
        <div class="mt-2 grid grid-cols-6 gap-1.5">${IKON_PILIHAN.filter(ikonAda).map((n) => `<button type="button" data-aksi="pilih-ikon" data-ikon="${n}" aria-label="${n}" class="grid h-10 place-items-center rounded-xl ring-1 ${n === ikon ? 'bg-langit/15 text-biru ring-biru' : 'bg-white text-stone-600 ring-stone-200'}">${ic(n, 'w-5 h-5')}</button>`).join('')}</div>
      </div>
      ${!baru && dipakai ? `<p class="rounded-xl bg-latar px-3 py-2 text-xs text-stone-600">${dipakai} produk memakai kategori ini. Pindahkan atau hapus produk tersebut dulu jika ingin menghapus kategori.</p>` : ''}
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">${baru ? 'Simpan kategori' : 'Simpan perubahan'}</button>
      <div class="flex gap-2">
        ${baru ? '' : `<button type="button" data-aksi="kategori-hapus" data-id="${esc(k.id)}" ${dipakai ? 'disabled' : ''} class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-tomat/40 py-2.5 text-sm font-bold text-tomat disabled:opacity-40">${ic('trash-2', 'w-4 h-4')} Hapus</button>`}
        <button type="button" data-aksi="tutup" class="flex-1 rounded-full py-2.5 text-sm font-bold text-stone-500">Batal</button>
      </div>
    </div>
  </form>`;
}
AKSI['kategori-tambah'] = () => bukaModal(formKategori(null));
AKSI['kategori-edit'] = (el) => { const k = M.kategori.find((x) => x.id === el.dataset.id); if (k) bukaModal(formKategori(k)); };
AKSI['pilih-ikon'] = (el) => {
  const form = el.closest('form'); form.elements.ikon.value = el.dataset.ikon;
  form.querySelectorAll('[data-aksi="pilih-ikon"]').forEach((b) => { const aktif = b === el; b.classList.toggle('bg-langit/15', aktif); b.classList.toggle('text-biru', aktif); b.classList.toggle('ring-biru', aktif); b.classList.toggle('bg-white', !aktif); b.classList.toggle('ring-stone-200', !aktif); });
  $('pratinjau-ikon').innerHTML = ic(el.dataset.ikon, 'w-6 h-6'); icons();
};
FORM.kategori = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const baru = !d.id;
  terapMaster(await api('kategori_simpan', { kategori: { id: d.id || undefined, nama: d.nama.trim(), ikon: d.ikon.trim().toLowerCase() } }));
  tutupModal(); segarMaster(); toast(baru ? 'Kategori ditambahkan.' : 'Kategori diperbarui.');
});
AKSI['kategori-hapus'] = (el) => {
  const k = M.kategori.find((x) => x.id === el.dataset.id); if (!k) return;
  konfirmasi('Hapus kategori?', `Kategori <b>${esc(k.nama)}</b> akan dihapus, dan dilepas dari daftar kategori supplier.`, 'Ya, hapus', async () => {
    terapMaster(await api('kategori_hapus', { id: k.id })); segarMaster(); toast('Kategori dihapus.');
  });
};
