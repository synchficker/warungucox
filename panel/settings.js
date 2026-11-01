/* Warung Ucox | panel/settings.js | Pengaturan toko (khusus Owner). Tampil juga di halaman toko publik. */

VIEW.pengaturan = {
  judul: 'Toko', ikon: 'store', izin: 'pengaturan', grup: 'lainnya', judulPanjang: 'Pengaturan toko', info: 'Nama, alamat, WhatsApp, batas stok',
  async html() {
    const { pengaturan: p } = await api('pengaturan_ambil');
    return `
    <div class="mx-auto max-w-[480px] px-4 pt-5 md:max-w-3xl">
      <h2 class="font-display text-xl font-extrabold">Pengaturan toko</h2>
      <p class="text-sm text-stone-500">Perubahan ikut tampil di halaman toko dalam sekitar satu menit.</p>
      <form data-form="pengaturan" class="mt-3 space-y-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,.08)] ring-1 ring-stone-900/5">
        ${kolom('nama_toko', 'Nama toko', { nilai: p.nama_toko, maks: 60 })}
        ${kolom('alamat', 'Alamat', { nilai: p.alamat, maks: 200, wajib: false })}
        ${kolom('wa_nomor', 'Nomor WhatsApp (format 62...)', { nilai: p.wa_nomor, mode: 'numeric', maks: 15, bantu: 'Dipakai tombol pesan di halaman toko. Contoh: 628989921788.' })}
        ${kolom('wa_tampil', 'Nomor WhatsApp (tampilan)', { nilai: p.wa_tampil, maks: 30, wajib: false, bantu: 'Contoh: 0898-9921-788.' })}
        ${kolom('stok_menipis', 'Batas stok menipis', { nilai: p.stok_menipis, mode: 'numeric', maks: 4, bantu: 'Produk dengan stok sama atau di bawah angka ini diberi label menipis.' })}
        ${kolom('pesan_struk', 'Pesan penutup struk', { nilai: p.pesan_struk, maks: 80, wajib: false, bantu: 'Dipakai saat modul POS dan struk aktif.' })}
        <p data-galat role="alert" class="min-h-5 text-sm font-bold text-tomat"></p>
        <button type="submit" class="w-full rounded-full bg-biru py-3 font-extrabold text-white disabled:opacity-40">Simpan pengaturan</button>
      </form>
    </div>`;
  }
};

FORM.pengaturan = (form, d) => jalankan(form, 'Menyimpan...', async () => {
  const r = await api('pengaturan_simpan', { pengaturan: d });
  S.toko = r.pengaturan; M.batas = null; renderHeader();
  toast('Pengaturan toko disimpan.');
});
