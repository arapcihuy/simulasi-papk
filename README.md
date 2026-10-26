# Simulasi Belajar — Psikotes PAPK TNI

Tanpa pendataan dan tanpa batas waktu; selesai satu sesi langsung tampil pembahasan.

Latihan mandiri: 9 sesi (GMST verbal/numerik/figural, WPT, Kraepelin, Kepemimpinan, DASS, RES, OS), 280 soal, timer, skor otomatis. Tanpa kode akses, tanpa pendataan.

Buka: https://arapcihuy.github.io/simulasi-papk/

Soal berasal dari bank latihan lokal; bukan soal ujian resmi dan tidak berafiliasi dengan instansi mana pun.

## Uji regresi (tanpa browser)

```bash
node _test_regresi.cjs
```

Mengekstrak `<script>` dari `index.html`, menjalankannya dengan DOM tiruan, lalu memeriksa:
tidak ada jawaban yang bocor antar sesi, skor tiap sesi hanya menghitung jawabannya sendiri,
semua item (bank + generator) punya 4 opsi unik dengan kunci valid, serta timer/pelanggaran
hanya aktif selama sesi berjalan. Harus keluar `37 PASS / 0 FAIL`.
