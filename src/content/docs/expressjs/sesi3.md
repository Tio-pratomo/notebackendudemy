---
title: Routing & HTTP Method
---

## Materi: Pengetahuan & Konsep

### 1. Apa itu Routing?

**Routing** adalah mekanisme yang menentukan bagaimana aplikasi merespons
permintaan (request) ke alamat (endpoint) tertentu dengan metode HTTP yang
spesifik.

Struktur dasarnya adalah `app.METHOD(PATH, HANDLER)` :

- **METHOD**: Jenis perintah (GET, POST, dll).
- **PATH**: Alamat di server (contoh: `/kontak`).
- **HANDLER**: Fungsi yang dijalankan jika alamat cocok.

### 2. Mengenal HTTP Methods (Verbs)

Dalam arsitektur REST, kita menggunakan kata kerja HTTP untuk menentukan aksi:

- **GET**: Mengambil data (paling umum, aman untuk di-bookmark).
- **POST**: Mengirim data baru (contoh: daftar akun atau kirim pesan).
- **PUT**: Mengganti seluruh data yang ada.
- **PATCH**: Hanya mengubah sebagian kecil data (seperti menambal ban).
- **DELETE**: Menghapus data dari server.

### 3. Menangkap Data dari URL

Ada dua cara utama untuk mengambil data dari alamat URL tanpa menggunakan form:

- **Route Parameters (`req.params`)**: Digunakan untuk data yang wajib ada guna
  mengidentifikasi sesuatu secara spesifik. Ditandai dengan titik dua (`:`).
  Contoh: `/user/:id`.
- **Query Parameters (`req.query`)**: Digunakan untuk filter atau pencarian
  opsional. Dimulai dengan tanda tanya (`?`). Contoh: `/search?nama=budi`.

---

## Praktik

Kita akan mencoba membuat beberapa rute berbeda untuk melihat bagaimana server
menangkap data dari URL.

### Langkah 1: Update File `index.js`

Gunakan kode berikut untuk mencoba rute dinamis (Params) dan pencarian (Query).

```javascript wrap
import express from "express";
const app = express();
const port = 3000;

// 1. Route Biasa (Static)
app.get("/tentang", (req, res) => {
  res.send("Halaman Tentang Kami.");
});

// 2. Route Parameters (Dynamic)
// Cobalah akses http://localhost:3000/pengguna/123
app.get("/pengguna/:id", (req, res) => {
  const userId = req.params.id; // Menangkap '123'
  res.send(`Anda sedang melihat profil pengguna dengan ID: ${userId}`);
});

// 3. Query Parameters (Optional)
// Cobalah akses http://localhost:3000/cari?produk=laptop&harga=5000000
app.get("/cari", (req, res) => {
  const { produk, harga } = req.query; // Menangkap data setelah '?'
  res.send(`Mencari produk: ${produk} dengan harga sekitar: Rp${harga}`);
});

app.listen(port, () => {
  console.log(`Server Sesi 3 berjalan di http://localhost:${port}`);
});
```

### Langkah 2: Uji Coba

1.  Jalankan server: `node index.js`.
2.  Buka browser dan coba ketiga alamat di atas.
3.  Perhatikan bagaimana perubahan teks di URL (seperti mengganti `123` menjadi
    nama Anda) akan mengubah pesan yang tampil di layar.

### Tugas Kecil

Cobalah buat satu rute lagi dengan nama `/artikel/:kategori/:judul`. Jika
diakses `/artikel/tekno/belajar-nodejs`, server harus menampilkan pesan:
"Kategori: tekno, Judul: belajar-nodejs".
