/* Warung Ucox | panel/users.js | Manajemen pengguna (khusus Owner) */

let daftarPengguna = [];
const sandiAcak = () => {   // tanpa karakter mirip (0/O, 1/l/I) supaya mudah dibacakan ke kasir
  const abjad = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = new Uint32Array(8); crypto.getRandomValues(b);
  return Array.from(b, (x) => abjad[x % abjad.length]).join('');
};

const barisPengguna = (u) => {
  const saya = u.id === S.pengguna.id;
  return `<li><button type="button" data-aksi="pengguna-edit" data-id="${esc(u.id)}" class="flex w-full items-center gap-3 py-3 text-left ${u.aktif ? '' : 'opacity-60'}">
    <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-langit/15 font-display text-lg font-extrabold text-biru">${esc((u.nama || '?').trim().charAt(0).toUpperCase())}</span>
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-2"><span class="truncate text-sm font-bold">${esc(u.nama)}</span>${lencana(u.peran)}${saya ? '<span class="text-[11px] font-bold text-stone-400">(Anda)</span>' : ''}</span>
      <span class="block truncate text-xs text-stone-500">@${esc(u.username)} &middot; ${u.aktif ? (u.login_terakhir ? 'masuk ' + waktuPendek(u.login_terakhir) : 'belum pernah masuk') : 'nonaktif'}</span>
    </span>${ic('chevron-right', 'h-4 w-4 text-stone-400')}</button></li>`;
};

function isiDaftarPengguna() {
  const aktif = daftarPengguna.filter((u) => u.aktif).length;
  return `
    <div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl">
      <div class="flex items-center justify-between gap-3">
        <div><h2 class="font-display text-xl font-extrabold">Pengguna</h2>
          <p class="text-sm font-semibold text-stone-500">${daftarPengguna.length} akun, ${aktif} aktif</p></div>
        <button type="button" data-aksi="pengguna-tambah" class="inline-flex items-center gap-1.5 rounded-full bg-biru px-4 py-2.5 text-sm font-bold text-white">${ic('user-plus', 'w-4 h-4')}Tambah</button>
      </div>
      <ul id="daftar-pengguna" class="mt-3 divide-y divide-stone-100 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">${daftarPengguna.map(barisPengguna).join('')}</ul>
      <p class="mt-3 px-1 text-xs text-stone-500">Akun baru atau yang kata sandinya direset wajib membuat kata sandi sendiri saat masuk pertama. Menonaktifkan akun langsung memutus sesinya di semua perangkat.</p>
    </div>`;
}

VIEW.pengguna = {
  judul: 'Pengguna', ikon: 'users', izin: 'pengguna', grup: 'lainnya', info: 'Akun staf dan hak akses',
  async html() { const r = await api('pengguna_daftar'); daftarPengguna = r.pengguna; return isiDaftarPengguna(); }
};
const segarkanPengguna = (list) => {
  daftarPengguna = list;
  if (S.rute === 'pengguna') { $('p-main').innerHTML = isiDaftarPengguna(); icons(); }
};

const pilihanPeran = (nilai, nonaktif) => `
  <fieldset ${nonaktif ? 'disabled' : ''} class="space-y-2"><legend class="text-sm font-semibold text-stone-600">Peran</legend>
    ${Object.entries(PERAN).map(([k, v]) => `
    <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3 has-[:checked]:border-biru has-[:checked]:bg-langit/10 ${nonaktif ? 'opacity-60' : ''}">
      <input type="radio" name="peran" value="${k}" ${k === nilai ? 'checked' : ''} class="mt-1 h-4 w-4 accent-[#0F78B0]">
      <span><span class="block text-sm font-extrabold">${v.nama}</span><span class="block text-xs text-stone-500">${v.info}</span></span></label>`).join('')}
  </fieldset>`;

const formPengguna = (u) => {
  const baru = !u; const saya = u && u.id === S.pengguna.id;
  return kepala(baru ? 'Tambah pengguna' : 'Ubah pengguna', baru ? 'user-plus' : 'user-cog') + `
  <form data-form="pengguna" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 overflow-y-auto px-4 py-3">
      <input type="hidden" name="id" value="${esc(u ? u.id : '')}">
      ${kolom('nama', 'Nama lengkap', { nilai: u ? u.nama : '', contoh: 'Contoh: Siti', maks: 40 })}
      ${baru ? kolom('username', 'Username', { contoh: 'siti', maks: 20, bantu: 'Dipakai untuk masuk. Tidak bisa diubah nanti.' })
             : kolom('username_tampil', 'Username', { nilai: '@' + u.username, nonaktif: true, wajib: false })}
      ${pilihanPeran(u ? u.peran : 'kasir', saya)}
      ${saya ? '<p class="text-xs text-stone-500">Anda tidak bisa mengubah peran atau menonaktifkan akun sendiri.</p>' : ''}
      ${baru ? `<div>${kolom('sandi', 'Kata sandi sementara', { min: 6, maks: 64, bantu: 'Berikan ke staf. Mereka wajib menggantinya saat masuk pertama.' })}
          <button type="button" data-aksi="sandi-acak" class="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-biru">${ic('dices', 'w-4 h-4')} Buat acak</button></div>` : ''}
      ${baru ? '' : `<label class="flex items-center gap-3 rounded-xl border border-stone-200 p-3 ${saya ? 'opacity-60' : ''}">
          <input type="checkbox" name="aktif" ${u.aktif ? 'checked' : ''} ${saya ? 'disabled' : ''} class="h-5 w-5 accent-[#0F78B0]">
          <span><span class="block text-sm font-extrabold">Akun aktif</span><span class="block text-xs text-stone-500">Matikan untuk mencabut akses tanpa menghapus riwayat.</span></span></label>`}
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="space-y-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">${baru ? 'Buat akun' : 'Simpan perubahan'}</button>
      <div class="flex gap-2">
        ${!baru && !saya ? `<button type="button" data-aksi="pengguna-reset" data-id="${esc(u.id)}" class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 py-2.5 text-sm font-bold">${ic('key-round', 'w-4 h-4')} Reset kata sandi</button>` : ''}
        <button type="button" data-aksi="tutup" class="flex-1 rounded-full py-2.5 text-sm font-bold text-stone-500">Batal</button>
      </div>
    </div>
  </form>`;
};

AKSI['pengguna-tambah'] = () => bukaModal(formPengguna(null));
AKSI['pengguna-edit'] = (el) => { const u = daftarPengguna.find((x) => x.id === el.dataset.id); if (u) bukaModal(formPengguna(u)); };
AKSI['sandi-acak'] = (el) => { const inp = el.parentElement.querySelector('input[name="sandi"]'); if (inp) inp.value = sandiAcak(); };

FORM.pengguna = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const lama = daftarPengguna.find((x) => x.id === d.id);
  const saya = lama && lama.id === S.pengguna.id;
  const pengguna = {
    id: d.id || undefined, nama: d.nama.trim(), username: (d.username || '').trim(),
    peran: saya ? lama.peran : d.peran, aktif: saya ? true : (lama ? d.aktif === 'on' : true), sandi: d.sandi
  };
  const r = await api('pengguna_simpan', { pengguna });
  tutupModal(); segarkanPengguna(r.pengguna);
  toast(lama ? 'Perubahan disimpan.' : 'Akun dibuat. Berikan username dan kata sandi sementara ke staf.');
});

AKSI['pengguna-reset'] = (el) => {
  const u = daftarPengguna.find((x) => x.id === el.dataset.id); if (!u) return;
  bukaModal(kepala('Reset kata sandi', 'key-round') + `
  <form data-form="reset" class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 px-4 py-3">
      <input type="hidden" name="id" value="${esc(u.id)}">
      <p class="text-sm text-stone-600">Buat kata sandi sementara untuk <b>${esc(u.nama)}</b> (@${esc(u.username)}). Semua perangkatnya akan keluar dan ia wajib membuat kata sandi baru saat masuk.</p>
      <div>${kolom('sandi', 'Kata sandi sementara', { min: 6, maks: 64 })}
        <button type="button" data-aksi="sandi-acak" class="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-biru">${ic('dices', 'w-4 h-4')} Buat acak</button></div>
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
    </div>
    <div class="flex gap-2 border-t border-stone-100 px-4 pt-3" style="${kakiStyle}">
      <button type="button" data-aksi="tutup" class="rounded-full px-5 py-3 font-bold text-stone-500">Batal</button>
      <button type="submit" class="flex-1 rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Reset kata sandi</button>
    </div>
  </form>`);
};
FORM.reset = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  await api('pengguna_reset_sandi', { id: d.id, sandi: d.sandi });
  tutupModal(); toast('Kata sandi direset. Berikan kata sandi sementara ke staf.');
});
