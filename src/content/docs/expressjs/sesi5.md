---
title: Morgan & Body Parsing
---

Setelah memahami konsep dasar middleware di Sesi 4, sekarang kita akan
mempelajari middleware pihak ketiga yang sangat populer dan penting untuk
pengembangan backend profesional.

## Materi: Pengetahuan & Konsep

### 1. Mengenal Morgan - HTTP Request Logger

Morgan adalah middleware logger yang sangat populer untuk Express.js yang
digunakan oleh developer profesional di seluruh dunia.

Morgan secara otomatis mencatat setiap request yang masuk ke server Anda dengan
format yang rapi dan informatif, jauh lebih lengkap daripada logger sederhana
yang kita buat di Sesi 4.

Logger ini sangat berguna untuk debugging, monitoring, dan audit aplikasi
production.

Morgan menyediakan beberapa format predefined seperti `tiny` (sangat ringkas),
`dev` (dengan warna untuk development), `combined` (format standar Apache), dan
`common`.

Format `dev` adalah yang paling populer untuk tahap pengembangan karena
memberikan informasi yang cukup tanpa terlalu verbose, dan menggunakan warna
untuk membedakan status code secara visual.

### 2. Body Parsing - Membaca Data dari Form

Ketika user mengirim data melalui form HTML atau API client, data tersebut
dikirim dalam "body" dari HTTP request.

Namun, Express tidak bisa langsung membaca data tersebut dalam format yang mudah
digunakan. Kita memerlukan middleware `express.json()` untuk parsing data JSON
(dari API) dan `express.urlencoded()` untuk parsing data dari form HTML
tradisional.

Tanpa middleware ini, `req.body` akan selalu `undefined` ketika Anda mencoba
mengakses data yang dikirim user.

Parameter `extended: true` pada `urlencoded()` memungkinkan parsing objek nested
yang lebih kompleks menggunakan library `qs`, dan ini adalah best practice yang
direkomendasikan.

---

## Praktik

### Langkah 1: Instalasi Morgan

Buka terminal di folder proyek Anda dan install package Morgan:

```bash
npm install morgan
```

### Langkah 2: Implementasi Morgan dan Body Parser

Update file `index.js` Anda dengan kode berikut:

```javascript
import express from "express";
import morgan from "morgan";

const app = express();
const port = 3000;

// Middleware Morgan untuk logging (gunakan format 'dev' untuk development)
app.use(morgan("dev"));

// Middleware untuk parsing JSON dari API client
app.use(express.json());

// Middleware untuk parsing form data dari HTML
app.use(express.urlencoded({ extended: true }));

// Route GET biasa
app.get("/", (req, res) => {
  res.send(`
    <h1>Form Sederhana</h1>
    <form action="/submit" method="POST">
      <label>Nama: <input type="text" name="nama" /></label><br/>
      <label>Email: <input type="email" name="email" /></label><br/>
      <button type="submit">Kirim</button>
    </form>
  `);
});

// Route POST untuk menerima data form
app.post("/submit", (req, res) => {
  // Tanpa middleware parsing, req.body akan undefined
  const { nama, email } = req.body;

  console.log("Data diterima:", req.body);
  res.send(`Terima kasih ${nama}! Email Anda (${email}) telah tersimpan.`);
});

app.listen(port, () => {
  console.log(`Server Sesi 5 berjalan di http://localhost:${port}`);
});
```

### Langkah 3: Pengujian

1. Jalankan server dengan `node index.js`.
2. Buka browser dan akses `http://localhost:3000`.
3. Isi form dengan nama dan email, lalu klik "Kirim".
4. Perhatikan terminal Anda - Morgan akan menampilkan log request dengan warna
   (hijau untuk status 200, merah untuk error) beserta waktu response.
5. Browser akan menampilkan pesan ucapan terima kasih dengan data yang Anda
   kirim.

### Analisis Output Morgan

Format `dev` akan menampilkan informasi seperti:

```
POST /submit 200 15.234 ms - 52
```

- **POST**: Method HTTP yang digunakan
- **/submit**: Path yang diakses
- **200**: Status code (sukses)
- **15.234 ms**: Waktu yang dibutuhkan server untuk memproses
- **52**: Ukuran response dalam bytes

Dengan kombinasi Morgan dan body parser ini, Anda sudah memiliki fondasi yang
solid untuk aplikasi backend profesional!
