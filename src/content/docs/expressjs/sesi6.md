---
title: Request Object Deep Dive
---

Setelah memahami routing dan middleware, sekarang kita akan mendalami objek
`req` (request) yang berisi semua informasi tentang permintaan HTTP dari client.

Memahami property dan method dari `req` akan membuat aplikasi kita jauh lebih
powerful dan responsif.

## Materi: Pengetahuan & Konsep

### 1. Anatomi Request Object

Setiap kali client mengirim request ke server, Express secara otomatis membuat
objek `req` yang berisi detail lengkap tentang permintaan tersebut.

Objek ini memiliki berbagai property seperti `req.method` (jenis HTTP method),
`req.url` (alamat yang diakses), dan `req.headers` (metadata tambahan yang
dikirim browser).

### 2. Property Penting yang Sering Digunakan

- **req.params**:

  Berisi route parameters yang didefinisikan dengan `:` di path. Semua nilai di
  sini bertipe string, jadi jika Anda butuh angka, harus dikonversi dengan
  `parseInt()` atau `Number()`.

- **req.query**:

  Berisi query string parameters setelah tanda `?` di URL. Bersifat opsional dan
  cocok untuk filtering atau pagination.

- **req.body**:

  Berisi data dari form atau JSON yang dikirim via POST/PUT. Wajib menggunakan
  middleware parser yang sudah kita pelajari di Sesi 5.

- **req.headers**:

  Berisi semua HTTP headers seperti `user-agent`, `content-type`, atau
  `authorization`. Header names selalu dalam lowercase.

- **req.ip**:

  Alamat IP dari client yang membuat request.

- **req.method**:

  Jenis HTTP method yang digunakan (GET, POST, dll).

### 3. Perbedaan Params vs Query

Ini adalah salah satu konsep yang sering membingungkan pemula:

| Route Params                         | Query Params                                   |
| :----------------------------------- | :--------------------------------------------- |
| Bagian dari path URL                 | Ditambahkan setelah `?`                        |
| Bersifat wajib (required)            | Bersifat opsional (optional)                   |
| Untuk identifikasi resource spesifik | Untuk filtering/sorting/pagination             |
| Contoh: `/users/123`                 | Contoh: `/products?category=laptop&sort=price` |

---

## Praktik

Kita akan membuat aplikasi sederhana yang mendemonstrasikan berbagai cara
menangkap data dari request.

### Langkah 1: Setup File dengan Demonstrasi Lengkap

```javascript
import express from "express";
import morgan from "morgan";

const app = express();
const port = 3000;

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Demonstrasi req.params (Route Parameters)
app.get("/user/:userId/post/:postId", (req, res) => {
  const { userId, postId } = req.params;

  // Konversi string ke number jika diperlukan
  const userIdNum = parseInt(userId);
  const postIdNum = parseInt(postId);

  res.json({
    message: "Route Parameters Demo",
    userId: userIdNum,
    postId: postIdNum,
    dataType: typeof userIdNum, // akan menunjukkan 'number'
  });
});

// 2. Demonstrasi req.query (Query Parameters)
app.get("/search", (req, res) => {
  const { keyword, page, limit, sort } = req.query;

  // Set default values untuk query yang tidak dikirim
  res.json({
    message: "Query Parameters Demo",
    keyword: keyword || "all",
    page: page || 1,
    limit: limit || 10,
    sort: sort || "asc",
  });
});

// 3. Demonstrasi req.headers
app.get("/headers-info", (req, res) => {
  res.json({
    message: "Headers Information",
    userAgent: req.headers["user-agent"],
    contentType: req.headers["content-type"],
    host: req.headers["host"],
    allHeaders: req.headers,
  });
});

// 4. Demonstrasi req.ip dan req.method
app.get("/request-info", (req, res) => {
  res.json({
    message: "Complete Request Info",
    clientIP: req.ip,
    method: req.method,
    protocol: req.protocol,
    hostname: req.hostname,
    path: req.path,
    originalUrl: req.originalUrl,
  });
});

// 5. Demonstrasi req.body (POST request)
app.post("/api/register", (req, res) => {
  const { username, email, age } = req.body;

  // Validasi sederhana
  if (!username || !email) {
    return res.status(400).json({
      error: "Username dan email wajib diisi",
    });
  }

  res.status(201).json({
    message: "User berhasil terdaftar",
    data: { username, email, age: age || 0 },
  });
});

app.listen(port, () => {
  console.log(`Server Sesi 6 berjalan di http://localhost:${port}`);
  console.log("\nCoba akses endpoint berikut:");
  console.log("- GET  /user/123/post/456");
  console.log("- GET  /search?keyword=nodejs&page=2&sort=desc");
  console.log("- GET  /headers-info");
  console.log("- GET  /request-info");
  console.log("- POST /api/register (gunakan Postman/Thunder Client)");
});
```

### Langkah 2: Testing

1. Jalankan server: `node index.js`
2. Test via browser untuk endpoint GET
3. Untuk POST request, gunakan Postman atau Thunder Client di VS Code dengan
   body JSON:

```json
{
  "username": "budi_2026",
  "email": "budi@example.com",
  "age": 25
}
```

### Tugas Eksplorasi

Cobalah akses `/search` dengan berbagai kombinasi query (dengan dan tanpa
parameter) untuk melihat bagaimana default values bekerja. Misalnya:

- `/search?keyword=express`
- `/search?keyword=nodejs&page=3`
- `/search` (tanpa query sama sekali)
