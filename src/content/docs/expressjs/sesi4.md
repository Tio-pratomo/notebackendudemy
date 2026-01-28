---
title: Middleware Fundamentals
---

Sesi ini akan membahas middleware, yaitu fungsi-fungsi yang berjalan di antara
penerimaan permintaan (request) dan pengiriman balasan (response) di server
Anda.

Memahami middleware adalah kunci untuk membangun aplikasi Express yang
terstruktur dan aman.

## Materi: Pengetahuan & Konsep

### Konsep Dasar Middleware

**Middleware** adalah fungsi yang memiliki akses ke objek permintaan (`req`),
objek balasan (`res`), dan fungsi berikutnya (`next`) dalam siklus hidup
aplikasi.

Bayangkan middleware seperti penjaga gerbang; setiap tamu (request) yang datang
harus melewati pemeriksaan penjaga sebelum diperbolehkan masuk ke dalam rumah
(route handler).

Jika penjaga tidak memanggil fungsi `next()`, tamu tersebut akan terjebak di
gerbang dan server tidak akan pernah mengirimkan balasan.

### Fungsi dan Jenis Middleware

Middleware digunakan untuk berbagai tugas penting seperti mencatat aktivitas
(logging), memeriksa izin akses (authentication), dan mengubah format data
(parsing).

Express menyediakan middleware bawaan seperti `express.json()` untuk membaca
data format JSON dan `express.static()` untuk menyajikan file seperti gambar
atau CSS.

Selain itu, Anda dapat membuat middleware kustom sendiri untuk menangani logika
bisnis yang spesifik sebelum permintaan mencapai tujuan akhirnya.

### Urutan Eksekusi Middleware

Express menjalankan middleware secara berurutan dari atas ke bawah sesuai dengan
penulisannya di kode.

Hal ini sangat krusial karena jika Anda menempatkan middleware parsing data
setelah rute yang membutuhkannya, rute tersebut akan menerima data kosong atau
**_undefined_**.

Oleh karena itu, middleware umum biasanya ditempatkan di bagian paling atas
aplikasi sebelum definisi rute-rute spesifik.

---

## Praktik

Kita akan membuat middleware kustom sederhana yang berfungsi sebagai pencatat
aktivitas (logger) untuk server kita.

### Langkah 1: Membuat Middleware Logger Kustom

Buka file `index.js` Anda dan tambahkan fungsi middleware sebelum rute-rute yang
sudah ada.

```javascript wrap
import express from "express";
const app = express();
const port = 3000;

// Middleware Kustom: Logger
app.use((req, res, next) => {
  const time = new Date().toLocaleString("id-ID");
  console.log(`[${time}] ${req.method} ke ${req.url}`);

  // WAJIB panggil next() agar request bisa lanjut ke rute berikutnya
  next();
});

// Contoh Middleware Bawaan untuk file statis (misal: gambar/css di folder 'public')
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Cek terminal Anda untuk melihat log aktivitas middleware!");
});

app.listen(port, () => {
  console.log(`Server Sesi 4 berjalan di port ${port}`);
});
```

### Langkah 2: Uji Coba

1. Jalankan server dengan `node index.js`.
2. Akses halaman utama di browser.
3. Lihat terminal Anda; Anda akan melihat catatan waktu, metode HTTP (GET), dan
   URL yang diakses setiap kali halaman dimuat.

### Langkah 3: Eksperimen (Opsional)

Cobalah hapus baris `next();` di dalam middleware logger Anda, lalu refresh
browser.

Anda akan melihat browser terus-menerus "loading" karena permintaan tertahan di
middleware tersebut dan tidak pernah sampai ke rute utama.
