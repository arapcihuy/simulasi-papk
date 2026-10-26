/* Uji regresi logika simulasi-papk (tanpa browser).
   Mengekstrak <script> dari index.html, menjalankan dengan DOM tiruan, lalu memeriksa:
   1) tidak ada jawaban yang bocor antar sesi (bug "soal sudah kejawab otomatis"),
   2) skor tiap sesi hanya menghitung jawaban sesi itu,
   3) semua item (bank & generator) punya 4 opsi unik dengan kunci valid,
   4) timer/pelanggaran tidak aktif di luar sesi berjalan. */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error("script tidak ditemukan");
const code = m[1].replace(/\nstart\(\);\s*$/, "\n");

function el() {
  return {
    innerHTML: "", textContent: "", onclick: null, dataset: {}, style: {},
    classList: { add() {}, toggle() {}, remove() {} },
    setAttribute() {}, querySelectorAll: () => [], querySelector: () => null,
  };
}

function boot() {
  const nodes = new Map();
  const document = {
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, el()); return nodes.get(id); },
    querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, hidden: false,
  };
  // code = skrip milik repo ini sendiri (dibaca dari index.html lokal), bukan input eksternal
  const api = new Function(
    "document", "window", "setTimeout", "setInterval", "clearInterval", "Date",
    code + "\nreturn {S, DATA, buildSession, brief, begin, q, finish, hasil, GEN};"
  )(document, {}, () => 0, () => 0, () => {}, Date);
  return api;
}

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS  ${name}${detail ? "  " + detail : ""}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? "  " + detail : ""}`); }
};

// ---- 1 & 2: kebocoran jawaban + skor per sesi -----------------------------
{
  const api = boot();
  const { S, DATA } = api;
  S.mode = "santai"; S.idx = 0; S.jawab = {}; S.hasil = []; S.pelanggaran = 0;
  const log = [];
  for (let n = 0; n < DATA.sesi.length; n++) {
    api.brief();
    const kunciAwal = Object.keys(S.jawab).length;
    check(`sesi ${DATA.sesi[S.idx].kode} mulai kosong`, kunciAwal === 0, `jawab=${kunciAwal}`);
    api.begin();
    check(`sesi ${DATA.sesi[S.idx].kode} berjalan`, S.running === true);
    S.jawab = {};                       // pengguna tidak menjawab apa pun
    api.finish(false);
    const hasilTerakhir = S.hasil[S.hasil.length - 1];
    check(`skor ${DATA.sesi[S.idx].kode} = 0 saat kosong`, hasilTerakhir.benar === 0,
      `benar=${hasilTerakhir.benar}/${hasilTerakhir.total}`);
    log.push(`${DATA.sesi[S.idx].kode}:${hasilTerakhir.benar}`);
    S.idx++;
  }
  check("semua sesi terlewati", log.length === DATA.sesi.length, log.join(" "));
}

// ---- 2b: jawaban sesi 1 tidak boleh dihitung di sesi 2 -------------------
{
  const api = boot();
  const { S } = api;
  S.mode = "santai"; S.idx = 0; S.jawab = {}; S.hasil = [];
  api.brief(); api.begin();
  for (let i = 0; i < S.sesi.length; i++) S.jawab[i] = 3;   // isi semua dengan opsi D
  api.finish(false);
  S.idx++;
  api.brief();
  const bocor = S.sesi.filter((_, i) => S.jawab[i] !== undefined).length;
  check("VER -> NUM tidak membawa jawaban", bocor === 0, `tampak terjawab=${bocor}`);
  api.begin();
  let benar = 0;
  S.sesi.forEach((it, i) => { if (S.jawab[i] === it.kunci) benar++; });
  check("NUM skor awal 0 sebelum dijawab", benar === 0, `benar=${benar}`);
  api.finish(false);
  const h = S.hasil[S.hasil.length - 1];
  check("NUM skor 0 karena kosong", h.benar === 0, `${h.benar}/${h.total}`);
}

// ---- 3: validitas item bank + generator ---------------------------------
{
  const api = boot();
  const { DATA } = api;
  const bad = [];
  let total = 0;
  for (const sesi of DATA.sesi) {
    const items = api.buildSession(sesi);
    for (const it of items) {
      total++;
      const okOpsi = Array.isArray(it.opsi) && it.opsi.length === 4 &&
        new Set(it.opsi.map(String)).size === 4;
      const okKunci = Number.isInteger(it.kunci) && it.kunci >= 0 && it.kunci < it.opsi.length;
      if (!okOpsi || !okKunci) bad.push(`${sesi.kode}:${it.teks.slice(0, 30)}`);
    }
  }
  check("semua item punya 4 opsi unik + kunci valid", bad.length === 0,
    `total=${total} rusak=${bad.length}${bad.length ? " contoh=" + bad[0] : ""}`);
}

// ---- 3b: generator numerik stabil di banyak undian ----------------------
{
  const api = boot();
  let bad = 0;
  const runs = 600;
  const stub = { kode: "GMST_NUM", soal: Array.from({ length: 5 }) };
  for (let i = 0; i < runs; i++) {
    const it = api.buildSession(stub)[0];
    if (!it || it.opsi.length !== 4 || !(it.kunci >= 0 && it.kunci < 4)) bad++;
  }
  check("generator NUM stabil 600 undian", bad === 0, `rusak=${bad}/${runs}`);
}

// ---- 4: pelanggaran hanya saat sesi berjalan ----------------------------
{
  const api = boot();
  const { S } = api;
  S.mode = "ujian"; S.idx = 0; S.jawab = {}; S.hasil = []; S.pelanggaran = 0;
  api.brief();
  check("running=false di layar brief", S.running === false);
  api.begin();
  check("running=true setelah mulai", S.running === true);
  api.finish(false);
  check("running=false setelah selesai", S.running === false);
  check("timer dibersihkan setelah selesai", S.timer === null && S.deadline === 0);
}

console.log(`\nHASIL: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
