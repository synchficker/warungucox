/* Warung Ucox | panel/main.js | Titik mulai panel: pulihkan sesi bila ada, jika tidak tampilkan layar masuk */

(async function mulai() {
  S.token = bacaToken();
  if (!S.token) return tampilLogin();
  renderHeader();
  $('p-main').innerHTML = memuatHtml; icons();
  try {
    terapkanSesi(await api('sesi'));
    masukApp();
  } catch (e) {
    if (e.kode === 'jaringan') {   // jangan buang sesi hanya karena internet putus
      $('p-main').innerHTML = `<div class="px-4 pt-10">${kartuKosong('cloud-off', 'Belum tersambung', pesanGalat(e))}
        <div class="text-center"><button type="button" data-aksi="muat-ulang-halaman" class="rounded-full bg-biru px-6 py-2.5 text-sm font-bold text-white">Coba lagi</button></div></div>`;
      icons();
    } else { S.token = ''; simpanToken(''); tampilLogin(e.kode === 'sesi_habis' ? PESAN.sesi_habis : ''); }
  }
})();
AKSI['muat-ulang-halaman'] = () => location.reload();
