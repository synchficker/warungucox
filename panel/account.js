/* Warung Ucox | panel/account.js | Akun saya: profil, ganti kata sandi, keluar (semua peran) */

VIEW.akun = {
  judul: 'Akun', ikon: 'circle-user-round', grup: 'lainnya', judulPanjang: 'Akun saya', info: 'Profil, kata sandi, keluar',
  async html() {
    const p = S.pengguna;
    return `
    <div class="mx-auto max-w-[480px] space-y-4 px-4 pt-5 md:max-w-3xl">
      <section class="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
        <span class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-langit/15 font-display text-2xl font-extrabold text-biru">${esc(p.nama.trim().charAt(0).toUpperCase())}</span>
        <div class="min-w-0"><p class="truncate font-display text-lg font-extrabold">${esc(p.nama)}</p>
          <p class="text-sm text-stone-500">@${esc(p.username)}</p><p class="mt-1">${lencana(p.peran)}</p></div>
      </section>

      <form data-form="akun-sandi" class="space-y-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
        <h3 class="flex items-center gap-2 font-display text-base font-extrabold">${ic('key-round', 'w-5 h-5 text-biru')}Ganti kata sandi</h3>
        ${kolomSandi('lama', 'Kata sandi lama', 'current-password')}
        ${kolomSandi('baru', 'Kata sandi baru', 'new-password', 'Minimal 6 karakter. Perangkat lain akan diminta masuk ulang.')}
        ${kolomSandi('baru2', 'Ulangi kata sandi baru')}
        <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
        <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Simpan kata sandi</button>
      </form>

      <button type="button" data-aksi="keluar" class="flex w-full items-center justify-center gap-2 rounded-full border border-tomat py-3 font-extrabold text-tomat">${ic('log-out', 'w-5 h-5')} Keluar</button>
      <p class="px-1 text-center text-xs text-stone-500">Sesi otomatis berakhir setelah 12 jam tanpa aktivitas.</p>
    </div>`;
  }
};

FORM['akun-sandi'] = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  if (d.baru !== d.baru2) return galatForm(form, 'Pengulangan kata sandi tidak sama.');
  const r = await api('ganti_sandi', { lama: d.lama, baru: d.baru });
  terapkanSesi(r); form.reset(); toast('Kata sandi diperbarui.');
});
