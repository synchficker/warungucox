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
        ${kolom('pesan_struk', 'Pesan penutup struk', { nilai: p.pesan_struk, maks: 80, wajib: false, bantu: 'Tercetak di bagian bawah struk.' })}
        <div class="border-t border-stone-100 pt-3"><h3 class="flex items-center gap-2 font-display text-base font-extrabold">${ic('shopping-cart', 'w-5 h-5 text-biru')}Pengaturan kasir</h3></div>
        ${kolom('diskon_maks_kasir', 'Batas diskon untuk Kasir (%)', { nilai: p.diskon_maks_kasir, mode: 'numeric', maks: 3, bantu: 'Diskon di atas batas ini hanya bisa diberikan Admin atau Owner. Diukur dari harga sebelum diskon.' })}
        <label class="block text-sm font-semibold text-stone-600">Pembulatan pembayaran tunai
          <select name="pembulatan" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800">
            ${[['0', 'Tanpa pembulatan'], ['100', 'Ke atas, kelipatan Rp100'], ['500', 'Ke atas, kelipatan Rp500'], ['1000', 'Ke atas, kelipatan Rp1.000']].map((o) => `<option value="${o[0]}" ${String(p.pembulatan) === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
          <span class="mt-1 block text-xs font-normal text-stone-500">Hanya untuk tunai. QRIS dan transfer selalu pas.</span></label>
        <label class="block text-sm font-semibold text-stone-600">Jika stok tercatat kurang
          <select name="jual_stok_kurang" class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base font-semibold text-stone-800">
            <option value="tidak" ${p.jual_stok_kurang !== 'ya' ? 'selected' : ''}>Tolak penjualan (disarankan)</option>
            <option value="ya" ${p.jual_stok_kurang === 'ya' ? 'selected' : ''}>Izinkan, stok dikunci 0</option></select>
          <span class="mt-1 block text-xs font-normal text-stone-500">Pilih "Izinkan" bila barang sering ada di rak tetapi stok di sistem belum diperbarui. Selisihnya tetap tercatat.</span></label>
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
