/* Tiruan layanan Google (Sheets, Cache, Lock, Utilities) agar Code.gs bisa dijalankan di Node untuk pengujian. */
const fs = require('fs'); const vm = require('vm'); const crypto = require('crypto'); const path = require('path');

function Sheet(nama) {
  this.nama = nama; this.data = [[]]; this.maxRows = 1000;
  this.getLastRow = () => { let n = 0; this.data.forEach((r, i) => { if (r && r.some((c) => c !== '' && c !== undefined)) n = i + 1; }); return n; };
  this.getLastColumn = () => Math.max(1, ...this.data.map((r) => (r || []).length));
  this.getMaxRows = () => this.maxRows;
  this.setFrozenRows = () => {};
  this.insertRowsAfter = (n, k) => { this.maxRows += k; };
  this.appendRow = (r) => { this.data[this.getLastRow()] = r.slice(); };
  this.deleteRow = (n) => { this.data.splice(n - 1, 1); };
  this.insertRowsFake = () => {};
  const self = this;
  this.getRange = (r, c, nr = 1, nc = 1) => {
    const rg = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (self.data[r - 1 + i] || [])[c - 1 + j]; return v === undefined ? '' : v; })),
      setValues: (v) => { v.forEach((row, i) => row.forEach((x, j) => { (self.data[r - 1 + i] = self.data[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
      setValue: (x) => { (self.data[r - 1] = self.data[r - 1] || [])[c - 1] = x; return rg; },
      setFontWeight: () => rg, setBackground: () => rg,
      setNumberFormat: (f) => { self.fmt = self.fmt || {}; for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) self.fmt[(r + i) + ',' + (c + j)] = f; return rg; }
    };
    return rg;
  };
}
const sheets = {};
const tambah = (n, kepala, baris = []) => { const s = new Sheet(n); s.data = [kepala, ...baris]; sheets[n] = s; return s; };
tambah('Kategori', ['id', 'nama', 'ikon'], [['beras', 'Beras', 'wheat']]);
tambah('Produk', ['id', 'nama', 'kategori', 'satuan', 'harga_beli', 'harga_jual', 'stok', 'gambar', 'barcode'],
  [['P001', 'Beras 5kg', 'beras', 'pak', 66000, 72000, 24, '', '111'], ['P002', 'Beras Medium', 'beras', 'pak', 59000, 64000, 5, '', '222'], ['P003', 'Habis', 'beras', 'pak', 100, 200, 0, '', '333']]);
tambah('Supplier', ['id', 'nama', 'kontak', 'telepon', 'kota', 'kategori', 'termin_hari'], [['S01', 'UD A', 'x', '1', 'Depok', 'beras', 7]]);
tambah('_Log', ['waktu', 'op_id', 'aksi', 'produk', 'perubahan', 'catatan']);

let jamPalsu = null;   // untuk uji lintas hari: setJam('2026-10-01T09:00:00Z')
class DatePalsu extends Date {
  constructor(...a) { if (a.length === 0 && jamPalsu !== null) super(jamPalsu); else super(...a); }
  static now() { return jamPalsu !== null ? jamPalsu : Date.now(); }
}
const ctxDrive = { n: 0, files: [] };
const props = { KUNCI: 'KunciRahasia123' }; const cacheMem = {};
const ctx = {
  console, Date: DatePalsu, Math, JSON, Number, String, isFinite, Object, Array,
  SpreadsheetApp: { getActive: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = new Sheet(n)) }), getUi: () => ({}) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k], setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: (k) => (k in cacheMem ? cacheMem[k] : null), put: (k, v) => { cacheMem[k] = v; }, remove: (k) => { delete cacheMem[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    base64Decode: (s) => Array.from(Buffer.from(s, 'base64')).map((b) => (b > 127 ? b - 256 : b)),
    newBlob: (bytes, tipe, nama) => ({ bytes, tipe, nama }),
    formatDate: (d) => d.toISOString().replace('T', ' ').slice(0, 19)
  },
  DriveApp: {
    Access: { ANYONE_WITH_LINK: 'x' }, Permission: { VIEW: 'v' },
    createFolder: (n) => ({ getId: () => 'FOLDER1', getName: () => n, createFile: (blob) => { const id = 'FILE' + (++ctxDrive.n); ctxDrive.files.push({ id, blob }); return { getId: () => id, setSharing() {} }; } }),
    getFolderById: (id) => { if (id !== 'FOLDER1') throw new Error('x'); return ctx.DriveApp.createFolder('Warung Ucox - Gambar Produk'); }
  },
  ContentService: { createTextOutput: (s) => ({ isi: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8') + '\n;this.__api = { doGet, doPost, apiBaru_, tabBaru_ };', ctx);

const post = (o) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(o) } }).isi);
const get = (q) => JSON.parse(ctx.doGet({ parameter: q }).isi);
module.exports = { post, get, sheets, cacheMem, props, ctxDrive, setJam: (iso) => { jamPalsu = iso === null ? null : new Date(iso).getTime(); } };
