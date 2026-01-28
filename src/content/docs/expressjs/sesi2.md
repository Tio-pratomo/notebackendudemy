---
title: Membangun Server Web Pertama
---

## Materi: Pengetahuan & Konsep

### Mengenal Framework Express.js

**Express.js** adalah kerangka kerja (framework) web yang minimalis dan
fleksibel untuk Node.js.

Meskipun kita bisa membuat server menggunakan modul bawaan Node.js (modul
`http`), Express jauh lebih populer karena menyederhanakan banyak hal, seperti
pengaturan rute (routing), penanganan permintaan (request), dan pengiriman
balasan (response) kepada pengguna.

### Konsep Port dalam Server

Saat Anda menjalankan server di komputer lokal, Anda perlu menentukan sebuah
"Port".

Bayangkan alamat IP komputer Anda adalah sebuah apartemen besar, maka nomor Port
adalah nomor unit spesifik tempat server Anda "mendengarkan" (listening) tamu
yang datang.

Umumnya, dalam tahap pengembangan (development), kita menggunakan nomor port
seperti 3000 atau 4000.

### Objek Request dan Response

Dalam Express, setiap kali seseorang mengakses server Anda, Express menyediakan
dua objek utama dalam fungsi callback:

- **Request (req)**: Berisi semua informasi tentang tamu yang datang, seperti
  alamat yang diakses atau data yang dikirim.
- **Response (res)**: Berisi alat-alat yang Anda gunakan untuk membalas tamu
  tersebut, misalnya mengirim teks atau file HTML.

---

## Praktik

Kita akan mengubah folder proyek yang telah dibuat pada Sesi 1 menjadi sebuah
server web yang bisa diakses melalui browser.

### Langkah 1: Instalasi Express

Buka terminal di folder proyek Anda dan instal package Express menggunakan NPM.

```bash wrap
npm install express
```

### Langkah 2: Menulis Kode Server

Buka kembali file `index.js` Anda dan ubah isinya untuk membuat server web
sederhana. Kita akan menggunakan port 3000.

```javascript wrap
import express from "express";

const app = express();
const port = 3000;

// Menentukan apa yang terjadi saat user mengakses halaman utama ('/')
app.get("/", (req, res) => {
  res.send(
    "<h1>Halo Dunia!</h1><p>Ini adalah server Express pertama saya.</p>"
  );
});

// Menjalankan server pada port yang ditentukan
app.listen(port, () => {
  console.log(`Server sudah berjalan di http://localhost:${port}`);
  console.log("Saat ini adalah Januari 2026, era baru pengembangan web!");
});
```

### Langkah 3: Menjalankan dan Menguji Server

Jalankan server Anda dengan perintah Node di terminal:

```bash wrap
node index.js
```

Setelah muncul pesan di terminal, buka browser Anda (seperti Firefox atau
Chrome) dan ketikkan alamat `http://localhost:3000` di bar pencarian. Anda akan
melihat teks "Halo Dunia!" muncul di sana.

### Tips Pengembang

Jika Anda melakukan perubahan pada kode, Anda harus mematikan server di terminal
dengan menekan `Ctrl + C` dan menjalankannya kembali agar perubahan tersebut
terlihat.

Di sesi mendatang, kita akan belajar cara otomatis melakukan hal ini menggunakan
alat bernama `nodemon`.
