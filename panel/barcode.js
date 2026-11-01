/* Warung Ucox | panel/barcode.js | EAN-13: validasi, pembuat barcode internal, gambar label (SVG), pemindai kamera */

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_R = EAN_L.map((k) => k.replace(/[01]/g, (b) => (b === '0' ? '1' : '0')));
const EAN_G = EAN_R.map((k) => k.split('').reverse().join(''));
const EAN_PARITAS = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

const digitCek = (d12) => { let j = 0; for (let i = 0; i < 12; i++) j += Number(d12[i]) * (i % 2 ? 3 : 1); return (10 - (j % 10)) % 10; };
const ean13Valid = (kode) => /^\d{13}$/.test(kode) && digitCek(kode) === Number(kode[12]);

function barcodeInternal(sudahAda) {   // awalan 2 = dicadangkan GS1 untuk pemakaian dalam toko; tidak bentrok dengan barcode kemasan
  for (let i = 0; i < 200; i++) {
    const b = new Uint32Array(11); crypto.getRandomValues(b);
    const d12 = '2' + Array.from(b, (x) => x % 10).join('');
    const kode = d12 + digitCek(d12);
    if (!sudahAda.includes(kode)) return kode;
  }
  return '';
}

function svgEan13(kode, tinggi = 56) {
  if (!ean13Valid(kode)) return '';
  const par = EAN_PARITAS[Number(kode[0])];
  let bit = '101';
  for (let i = 0; i < 6; i++) bit += (par[i] === 'L' ? EAN_L : EAN_G)[Number(kode[i + 1])];
  bit += '01010';
  for (let i = 0; i < 6; i++) bit += EAN_R[Number(kode[i + 7])];
  bit += '101';   // total 95 modul
  const tepi = 9; let batang = '';
  for (let i = 0; i < bit.length;) {
    if (bit[i] === '0') { i++; continue; }
    let j = i; while (j < bit.length && bit[j] === '1') j++;
    batang += `<rect x="${tepi + i}" y="0" width="${j - i}" height="${tinggi}"/>`; i = j;
  }
  const t = tinggi + 11;
  return `<svg viewBox="0 0 ${95 + tepi * 2} ${t + 2}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Barcode ${kode}" class="w-full" style="shape-rendering:crispEdges">
    <rect width="100%" height="100%" fill="#fff"/><g fill="#000">${batang}</g>
    <g font-family="monospace" font-size="9" fill="#000" text-anchor="middle">
      <text x="${tepi - 5}" y="${t}">${kode[0]}</text><text x="${tepi + 25}" y="${t}">${kode.slice(1, 7)}</text><text x="${tepi + 70}" y="${t}">${kode.slice(7)}</text>
    </g></svg>`;
}

/* ---------- Pemindai kamera (BarcodeDetector: Chrome/Edge di Android & desktop). Pemindai USB cukup mengetik ke kolom barcode. ---------- */
const bisaScan = () => 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
let streamScan = null; let timerScan = 0;
function hentikanScan() {
  clearInterval(timerScan); timerScan = 0;
  if (streamScan) { streamScan.getTracks().forEach((t) => t.stop()); streamScan = null; }
}
$('modal').addEventListener('close', hentikanScan);

async function mulaiScan(sesudah, batal) {
  bukaModal(kepala('Pindai barcode', 'scan-barcode') + `
    <div class="space-y-3 px-4 py-3">
      <div class="relative overflow-hidden rounded-2xl bg-black"><video id="video-scan" playsinline muted class="aspect-[4/3] w-full object-cover"></video>
        <div class="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 bg-tomat/80"></div></div>
      <p id="status-scan" class="text-center text-sm text-stone-500">Arahkan kamera ke barcode pada kemasan.</p>
      <button type="button" data-aksi="scan-batal" class="w-full rounded-full border border-stone-200 py-2.5 font-bold text-stone-600">Batal</button>
    </div>`);
  AKSI['scan-batal'] = () => { hentikanScan(); batal(); };
  try {
    streamScan = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const v = $('video-scan'); v.srcObject = streamScan; await v.play();
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    timerScan = setInterval(async () => {
      try {
        const hasil = await det.detect(v);
        const kode = hasil.length && hasil[0].rawValue;
        if (kode) { hentikanScan(); sesudah(kode); }
      } catch (e) { /* frame belum siap */ }
    }, 250);
  } catch (e) {
    const st = $('status-scan');
    if (st) st.textContent = 'Kamera tidak bisa dipakai. Izinkan akses kamera di browser, atau ketik kodenya langsung.';
  }
}
