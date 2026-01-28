---
title: Response Object Deep Dive
---

Setelah menguasai cara membaca informasi dari `req`, sekarang kita akan
mempelajari objek `res` (response) yang digunakan untuk mengirim berbagai jenis
balasan ke client.

Memahami method-method dari `res` akan membuat API Anda lebih fleksibel dan
profesional.

## Materi: Pengetahuan & Konsep

### 1. Apa itu Response Object?

Response object adalah objek yang merepresentasikan HTTP response yang akan
dikirim Express ke client sebagai jawaban atas request mereka.

Objek ini memiliki berbagai method untuk mengirim berbagai jenis data seperti
teks, JSON, file, atau bahkan redirect ke halaman lain.

### 2. Method Response yang Paling Sering Digunakan

**res.send()** - Method universal untuk mengirim berbagai tipe response:

- Bisa mengirim string, object, array, atau buffer
- Otomatis mendeteksi content-type
- Cocok untuk response sederhana

**res.json()** - Khusus untuk mengirim data JSON:

- Otomatis mengkonversi JavaScript object ke JSON string
- Set header `Content-Type: application/json`
- Standar untuk REST API modern

**res.status()** - Mengatur HTTP status code:

- Method ini bisa di-chain dengan method lain
- Contoh: `res.status(404).send("Not Found")`
- Status code memberitahu client apakah request berhasil atau gagal

**res.redirect()** - Mengarahkan user ke URL lain:

- Default menggunakan status code 302 (temporary redirect)
- Bisa custom status: `res.redirect(301, '/new-url')`

**res.render()** - Render template engine seperti EJS:

- Akan kita bahas lebih detail di sesi EJS nanti
- Digunakan untuk server-side rendering

### 3. HTTP Status Codes yang Harus Diketahui

Status code adalah angka 3 digit yang memberitahu client hasil dari request
mereka:

**2xx (Success)**

- 200 OK - Request berhasil
- 201 Created - Resource baru berhasil dibuat
- 204 No Content - Berhasil tapi tidak ada data untuk dikirim

**4xx (Client Error)**

- 400 Bad Request - Request tidak valid
- 401 Unauthorized - Butuh autentikasi
- 403 Forbidden - Tidak punya izin akses
- 404 Not Found - Resource tidak ditemukan

**5xx (Server Error)**

- 500 Internal Server Error - Error di server
- 503 Service Unavailable - Service sedang down

---

## Praktik

Kita akan membuat berbagai endpoint yang mendemonstrasikan berbagai method
response.

### Langkah 1: Implementasi Response Methods

```javascript wrap
import express from "express";
import morgan from "morgan";

const app = express();
const port = 3000;

app.use(morgan("dev"));
app.use(express.json());

// Simulasi database sederhana (in-memory)
const users = [
  { id: 1, name: "Budi", email: "budi@mail.com" },
  { id: 2, name: "Ani", email: "ani@mail.com" },
];

// 1. res.send() - Mengirim teks atau HTML
app.get("/", (req, res) => {
  res.send("<h1>Selamat Datang di Sesi 7</h1><p>Belajar Response Methods</p>");
});

// 2. res.json() - Mengirim JSON (standar API)
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    count: users.length,
    data: users,
  });
});

// 3. res.status().json() - Set status code dengan JSON
app.get("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find((u) => u.id === userId);

  if (user) {
    res.status(200).json({
      success: true,
      data: user,
    });
  } else {
    res.status(404).json({
      success: false,
      error: "User tidak ditemukan",
    });
  }
});

// 4. POST dengan status 201 (Created)
app.post("/api/users", (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: "Nama dan email wajib diisi",
    });
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
  };

  users.push(newUser);

  res.status(201).json({
    success: true,
    message: "User berhasil dibuat",
    data: newUser,
  });
});

// 5. DELETE dengan status 204 (No Content)
app.delete("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const index = users.findIndex((u) => u.id === userId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "User tidak ditemukan",
    });
  }

  users.splice(index, 1);
  res.status(204).send(); // Tidak ada content
});

// 6. res.redirect() - Redirect ke halaman lain
app.get("/old-page", (req, res) => {
  res.redirect("/");
});

// 7. res.download() - Download file (contoh)
app.get("/download", (req, res) => {
  // Untuk sekarang kita simulasikan
  res.send("Fitur download akan dipelajari saat kita bahas static files");
});

// 8. Error handling - status 500
app.get("/error", (req, res) => {
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "Terjadi kesalahan di server",
  });
});

// 9. Method chaining - kombinasi status dan JSON
app.get("/api/info", (req, res) => {
  res.status(200).json({
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    server: "Express.js",
  });
});

app.listen(port, () => {
  console.log(`Server Sesi 7 berjalan di http://localhost:${port}`);
  console.log("\nEndpoint yang tersedia:");
  console.log("- GET    /");
  console.log("- GET    /api/users");
  console.log("- GET    /api/users/:id");
  console.log("- POST   /api/users");
  console.log("- DELETE /api/users/:id");
  console.log("- GET    /old-page (redirect demo)");
  console.log("- GET    /error (error demo)");
});
```

### Langkah 2: Testing dengan Postman/Thunder Client

**Test GET All Users:**

```
GET http://localhost:3000/api/users
```

**Test GET Single User (Found):**

```
GET http://localhost:3000/api/users/1
```

**Test GET Single User (Not Found):**

```
GET http://localhost:3000/api/users/999
```

**Test POST Create User:**

```
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "name": "Charlie",
  "email": "charlie@mail.com"
}
```

**Test DELETE User:**

```
DELETE http://localhost:3000/api/users/1
```

**Perhatikan:**

- Status code yang berbeda untuk setiap situasi
- Format response JSON yang konsisten dengan field `success`
- Bagaimana error handling dilakukan dengan status 400 dan 404
- Method chaining untuk code yang lebih ringkas

Dengan menguasai response methods ini, Anda sudah siap membuat REST API yang
mengikuti standar industri!
