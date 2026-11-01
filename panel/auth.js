/* Warung Ucox | panel/auth.js | Masuk, buat Owner pertama, paksa ganti sandi, keluar */

function terapkanSesi(r) {
  if (r.token) { S.token = r.token; simpanToken(r.token); }
  S.pengguna = r.pengguna; S.izin = r.izin || []; S.toko = r.toko || S.toko;
}

function keluarLokal(pesan) {
  S.token = ''; S.pengguna = null; S.izin = []; S.renderId++;
  simpanToken('');
  tutupModal(); $('toast').classList.add('hidden');
  if (location.hash) history.replaceState(null, '', location.pathname);
  tampilLogin(pesan);
}

const layarAuth = (judul, sub, isi) => `
  <section class="hero text-white">
    <div class="mx-auto max-w-[480px] px-4 pb-16 pt-10 text-center">
      <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-biru shadow-lg">${ic('store', 'w-8 h-8')}</span>
      <h2 class="mt-4 font-display text-2xl font-black leading-tight">${esc(judul)}</h2>
      <p class="mt-1 text-sm text-white/90">${esc(sub)}</p>
    </div>
  </section>
  <div class="mx-auto -mt-10 max-w-[480px] px-4 pb-10">${isi}</div>`;

async function tampilLogin(pesan = '') {
  $('p-nav').classList.add('hidden'); renderHeader();
  $('p-main').innerHTML = memuatHtml; icons();
  let st;
  try { st = await api('status'); }
  catch (e) {
    $('p-main').innerHTML = `<div class="px-4 pt-10">${kartuKosong('cloud-off', 'Belum tersambung', pesanGalat(e))}
      <div class="text-center"><button type="button" data-aksi="muat-login" class="rounded-full bg-biru px-6 py-2.5 text-sm font-bold text-white">Coba lagi</button></div></div>`;
    icons(); return;
  }
  S.toko = st.toko;
  const nama = (st.toko && st.toko.nama_toko) || CONFIG.nama;
  renderHeader();
  const tautanToko = `<a href="index.html" class="mt-5 flex items-center justify-center gap-1.5 text-sm font-bold text-biru">${ic('arrow-left', 'w-4 h-4')} Kembali ke toko</a>`;
  if (st.perlu_setup) {
    $('p-main').innerHTML = layarAuth('Siapkan akun Owner', 'Langkah pertama: buat akun pemilik toko.', `
      <form data-form="setup" class="space-y-3 rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(16,24,40,.10)]">
        <p class="rounded-xl bg-langit/10 px-3 py-2 text-sm text-stone-700">Belum ada akun. Akun ini otomatis menjadi <b>Owner</b>. Untuk keamanan, masukkan <b>kunci sinkron</b> yang dibuat lewat menu <i>Warung Ucox</i> di Google Sheets.</p>
        ${kolomSandi('kunci', 'Kunci sinkron', 'off')}
        ${kolom('nama', 'Nama lengkap', { contoh: 'Contoh: Pak Ucox', maks: 40, auto: 'name' })}
        ${kolom('username', 'Username', { contoh: 'ucox', maks: 20, auto: 'username', bantu: 'Huruf kecil, angka, titik, garis bawah, atau strip.' })}
        ${kolomSandi('sandi', 'Kata sandi', 'new-password', 'Minimal 6 karakter.')}
        ${kolomSandi('sandi2', 'Ulangi kata sandi')}
        <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
        <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Buat akun Owner</button>
      </form>${tautanToko}`);
  } else {
    $('p-main').innerHTML = layarAuth('Masuk panel staf', nama, `
      <form data-form="login" class="space-y-3 rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(16,24,40,.10)]">
        ${pesan ? `<p role="status" class="flex items-start gap-2 rounded-xl bg-jingga/30 px-3 py-2 text-sm font-semibold text-amber-900">${ic('info', 'mt-0.5 w-4 h-4 shrink-0')}<span>${esc(pesan)}</span></p>` : ''}
        ${kolom('username', 'Username', { auto: 'username', maks: 20 })}
        <label class="block text-sm font-semibold text-stone-600">Kata sandi
          <span class="relative mt-1 block">
            <input name="sandi" type="password" required maxlength="64" autocomplete="current-password" autocapitalize="none" spellcheck="false"
              class="w-full rounded-xl border border-stone-200 py-2.5 pl-3 pr-11 text-base font-semibold text-stone-800">
            <button type="button" data-aksi="lihat-sandi" aria-label="Tampilkan kata sandi" class="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500">${ic('eye', 'w-5 h-5')}</button>
          </span>
        </label>
        <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
        <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Masuk</button>
      </form>
      <p class="mt-4 px-2 text-center text-xs text-stone-500">Lupa kata sandi? Minta Owner mengatur ulang lewat menu Pengguna.</p>${tautanToko}`);
  }
  icons();
  const pertama = $('p-main').querySelector('input'); if (pertama) pertama.focus();
}
AKSI['muat-login'] = () => tampilLogin();

FORM.login = (form, d) => jalankan(form, 'Memeriksa...', async () => {
  const r = await api('login', { username: d.username.trim(), sandi: d.sandi });
  terapkanSesi(r); masukApp();
});

FORM.setup = (form, d) => jalankan(form, 'Membuat akun...', async () => {
  if (d.sandi !== d.sandi2) return galatForm(form, 'Pengulangan kata sandi tidak sama.');
  const r = await api('setup_owner', { kunci: d.kunci.trim(), nama: d.nama.trim(), username: d.username.trim(), sandi: d.sandi });
  terapkanSesi(r); masukApp();
  toast('Akun Owner dibuat. Selamat datang!');
});

/* Akun baru / hasil reset: wajib mengganti kata sandi sebelum memakai panel */
function tampilWajibGanti() {
  $('p-nav').classList.add('hidden'); renderHeader();
  $('p-main').innerHTML = layarAuth('Buat kata sandi baru', `Halo ${S.pengguna.nama}, kata sandi sementara harus diganti.`, `
    <form data-form="wajib" class="space-y-3 rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(16,24,40,.10)]">
      ${kolomSandi('lama', 'Kata sandi sementara', 'current-password')}
      ${kolomSandi('baru', 'Kata sandi baru', 'new-password', 'Minimal 6 karakter dan berbeda dari yang sementara.')}
      ${kolomSandi('baru2', 'Ulangi kata sandi baru')}
      <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
      <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Simpan dan lanjut</button>
      <button type="button" data-aksi="keluar" class="w-full py-2 text-sm font-bold text-stone-500">Keluar</button>
    </form>`);
  icons();
}
FORM.wajib = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  if (d.baru !== d.baru2) return galatForm(form, 'Pengulangan kata sandi tidak sama.');
  const r = await api('ganti_sandi', { lama: d.lama, baru: d.baru });
  terapkanSesi(r); masukApp();
  toast('Kata sandi diperbarui.');
});

AKSI.keluar = async () => {
  try { await api('logout'); } catch (e) { /* tetap keluar di perangkat ini */ }
  keluarLokal('Anda sudah keluar.');
};

function masukApp() {
  if (S.pengguna.wajib_ganti === 'ya') return tampilWajibGanti();
  renderHeader();
  if (!location.hash || !VIEW[location.hash.slice(1)]) history.replaceState(null, '', '#dashboard');
  tampilRute();
}
