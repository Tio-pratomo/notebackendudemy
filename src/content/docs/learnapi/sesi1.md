---
title: Pengenalan RESTful API
---

Selamat datang di bagian baru dari kurikulum kita! Sesi sebelumnya, kita fokus
pada Server-Side Rendering (SSR) dengan EJS.

Sekarang kita akan belajar cara membangun API yang bisa digunakan oleh berbagai
client (mobile app, frontend framework, dll).

## Materi: Pengetahuan & Konsep

### 1. Apa itu API (Application Programming Interface)?

API adalah antarmuka yang memungkinkan dua aplikasi berbeda untuk berkomunikasi
satu sama lain. Bayangkan API seperti pelayan di restoran:

- **Client** (pelanggan): Aplikasi yang meminta data
- **API** (pelayan): Perantara yang mengambil pesanan
- **Server/Database** (dapur): Tempat data diolah dan disimpan

**Contoh nyata:**

Ketika Anda buka Instagram, aplikasi mobile-nya mengirim request ke Instagram
API untuk mengambil foto teman-teman Anda.

API mengembalikan data dalam format JSON, lalu aplikasi menampilkannya dengan
tampilan yang cantik.

### 2. Perbedaan Server-Side Rendering vs API

| Server-Side Rendering                    | RESTful API                                  |
| :--------------------------------------- | :------------------------------------------- |
| Server mengirim HTML lengkap siap tampil | Server mengirim data mentah (JSON)           |
| Client (browser) hanya render HTML       | Client bebas memproses data sesuai kebutuhan |
| Cocok untuk website tradisional          | Cocok untuk mobile app, SPA (React/Vue), IoT |
| Tidak bisa digunakan di luar browser     | Universal - bisa dipakai berbagai platform   |

### 3. Apa itu REST?

REST (Representational State Transfer) adalah arsitektur yang mendefinisikan
aturan untuk membuat API yang standar dan mudah dipahami.

REST bukan teknologi, tapi **prinsip desain** yang harus diikuti.

### 4. Lima Aturan Utama REST

#### a. Standard HTTP Methods (Verbs)

REST menggunakan HTTP methods untuk menunjukkan aksi yang diinginkan:

- **GET**: Mengambil data (Read)
- **POST**: Membuat data baru (Create)
- **PUT**: Mengganti seluruh data (Update - full replacement)
- **PATCH**: Memperbarui sebagian data (Update - partial)
- **DELETE**: Menghapus data (Delete)

#### b. Standard Data Format - JSON

REST API modern menggunakan JSON (JavaScript Object Notation) sebagai format
pertukaran data:

```json wrap
{
  "id": 1,
  "title": "Belajar REST API",
  "author": "Budi",
  "published": true
}
```

#### c. Client-Server Separation

Client (frontend) dan Server (backend) harus terpisah dan independen.
Keuntungannya:

- Frontend developer bisa kerja parallel dengan backend developer
- Bisa ganti teknologi frontend tanpa ubah backend
- Satu API bisa melayani web, mobile, desktop sekaligus

#### d. Stateless (Tanpa Status)

Setiap request dari client harus mengandung SEMUA informasi yang dibutuhkan
server untuk memproses request tersebut.

Server tidak menyimpan "ingatan" tentang client sebelumnya.

Contoh:

- ❌ **Buruk (Stateful)**: Client kirim username di request pertama, lalu di
  request kedua hanya kirim "ambil data saya" dengan asumsi server ingat
  username tadi.
- ✅ **Baik (Stateless)**: Setiap request selalu kirim token authentication yang
  berisi info user.

#### e. Resource-Based URLs

Setiap sumber data (resource) diidentifikasi dengan URL yang jelas:

```
GET    /api/users          # Ambil semua user
GET    /api/users/123      # Ambil user dengan ID 123
POST   /api/users          # Buat user baru
PUT    /api/users/123      # Update seluruh data user 123
PATCH  /api/users/123      # Update sebagian data user 123
DELETE /api/users/123      # Hapus user 123
```

### 5. HTTP Status Codes yang Harus Diketahui

**2xx - Success:**

- `200 OK`: Request berhasil (GET, PUT, PATCH)
- `201 Created`: Resource baru berhasil dibuat (POST)
- `204 No Content`: Berhasil tapi tidak ada data untuk dikirim (DELETE)

**4xx - Client Error:**

- `400 Bad Request`: Data yang dikirim tidak valid
- `401 Unauthorized`: Perlu login/authentication
- `403 Forbidden`: Tidak punya izin akses resource ini
- `404 Not Found`: Resource tidak ditemukan

**5xx - Server Error:**

- `500 Internal Server Error`: Error di sisi server
- `503 Service Unavailable`: Server sedang maintenance

---

## Praktik

### Langkah 1: Setup Project API Pertama

Buat folder baru untuk project API:

```bash wrap
mkdir blog-api
cd blog-api
npm init -y
npm install express morgan dotenv
npm install --save-dev nodemon
```

### Langkah 2: Update package.json

```json wrap
{
  "name": "blog-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "dotenv": "^16.4.0",
    "express": "^4.18.2",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Langkah 3: Buat File .env

```txt wrap
PORT=4000
NODE_ENV=development
API_VERSION=v1
```

### Langkah 4: Buat Simple REST API (index.js)

```javascript wrap
import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(morgan("dev"));
app.use(express.json()); // PENTING untuk parsing JSON body

// In-memory database
let posts = [
  {
    id: 1,
    title: "Pengenalan REST API",
    content: "REST adalah arsitektur untuk membangun API yang scalable",
    author: "Budi Santoso",
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "HTTP Methods Deep Dive",
    content: "GET, POST, PUT, PATCH, dan DELETE adalah lima method utama",
    author: "Ani Wijaya",
    published: true,
    createdAt: new Date().toISOString(),
  },
];

let postIdCounter = 3;

// ========== ROUTES ==========

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Blog API is running",
    version: process.env.API_VERSION,
    timestamp: new Date().toISOString(),
    endpoints: {
      posts: "/api/posts",
      singlePost: "/api/posts/:id",
    },
  });
});

// GET all posts
app.get("/api/posts", (req, res) => {
  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});

// GET single post by ID
app.get("/api/posts/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: "Post tidak ditemukan",
    });
  }

  res.status(200).json({
    success: true,
    data: post,
  });
});

// POST - Create new post
app.post("/api/posts", (req, res) => {
  const { title, content, author, published } = req.body;

  // Validasi
  if (!title || !content || !author) {
    return res.status(400).json({
      success: false,
      error: "Title, content, dan author wajib diisi",
    });
  }

  const newPost = {
    id: postIdCounter++,
    title,
    content,
    author,
    published: published || false,
    createdAt: new Date().toISOString(),
  };

  posts.push(newPost);

  // Status 201 Created
  res.status(201).json({
    success: true,
    message: "Post berhasil dibuat",
    data: newPost,
  });
});

// PUT - Replace entire post
app.put("/api/posts/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Post tidak ditemukan",
    });
  }

  const { title, content, author, published } = req.body;

  // Validasi
  if (!title || !content || !author) {
    return res.status(400).json({
      success: false,
      error: "Title, content, dan author wajib diisi untuk PUT",
    });
  }

  // Replace entire post
  posts[postIndex] = {
    id: postId,
    title,
    content,
    author,
    published: published || false,
    createdAt: posts[postIndex].createdAt, // Keep original
    updatedAt: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    message: "Post berhasil di-update (PUT)",
    data: posts[postIndex],
  });
});

// PATCH - Update partial post
app.patch("/api/posts/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Post tidak ditemukan",
    });
  }

  const { title, content, author, published } = req.body;

  // Update only provided fields
  if (title !== undefined) posts[postIndex].title = title;
  if (content !== undefined) posts[postIndex].content = content;
  if (author !== undefined) posts[postIndex].author = author;
  if (published !== undefined) posts[postIndex].published = published;

  posts[postIndex].updatedAt = new Date().toISOString();

  res.status(200).json({
    success: true,
    message: "Post berhasil di-update (PATCH)",
    data: posts[postIndex],
  });
});

// DELETE post
app.delete("/api/posts/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Post tidak ditemukan",
    });
  }

  const deletedPost = posts[postIndex];
  posts.splice(postIndex, 1);

  res.status(200).json({
    success: true,
    message: "Post berhasil dihapus",
    data: deletedPost,
  });
});

// 404 handler untuk route yang tidak ada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint tidak ditemukan",
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(port, () => {
  console.log("=".repeat(60));
  console.log(`🚀 Blog REST API`);
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`📚 API Version: ${process.env.API_VERSION}`);
  console.log(`⏰ Started: ${new Date().toLocaleString("id-ID")}`);
  console.log("=".repeat(60));
  console.log("\n📋 Available Endpoints:");
  console.log("  GET    /api/posts");
  console.log("  GET    /api/posts/:id");
  console.log("  POST   /api/posts");
  console.log("  PUT    /api/posts/:id");
  console.log("  PATCH  /api/posts/:id");
  console.log("  DELETE /api/posts/:id");
  console.log("=".repeat(60));
});
```

### Langkah 5: Jalankan Server

```bash wrap
npm run dev
```

### Langkah 6: Testing dengan Postman/Thunder Client

Install salah satu:

- **Postman**: Download dari https://postman.com
- **Thunder Client**: Extension di VS Code (lebih ringan)

**Test 1: GET All Posts**

```
Method: GET
URL: http://localhost:4000/api/posts
```

Expected response:

```json wrap
{
  "success": true,
  "count": 2,
  "data": [...]
}
```

**Test 2: GET Single Post**

```
Method: GET
URL: http://localhost:4000/api/posts/1
```

**Test 3: POST Create New Post**

```
Method: POST
URL: http://localhost:4000/api/posts
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "title": "Belajar PostgreSQL",
  "content": "PostgreSQL adalah database relasional yang powerful",
  "author": "Charlie Dev",
  "published": true
}
```

**Test 4: PUT Replace Post**

```
Method: PUT
URL: http://localhost:4000/api/posts/3
Body (raw JSON):
{
  "title": "PostgreSQL untuk Pemula",
  "content": "Panduan lengkap belajar PostgreSQL dari nol",
  "author": "Charlie Dev Updated",
  "published": true
}
```

**Test 5: PATCH Update Partial**

```
Method: PATCH
URL: http://localhost:4000/api/posts/3
Body (raw JSON):
{
  "published": false
}
```

Perhatikan: hanya field `published` yang berubah, field lain tetap.

**Test 6: DELETE Post**

```
Method: DELETE
URL: http://localhost:4000/api/posts/3
```

**Test 7: Error Handling - 404**

```
Method: GET
URL: http://localhost:4000/api/posts/999
```

Expected response:

```json wrap
{
  "success": false,
  "error": "Post tidak ditemukan"
}
```

**Test 8: Validation - 400**

```
Method: POST
URL: http://localhost:4000/api/posts
Body (raw JSON):
{
  "title": "Tanpa Content"
}
```

Expected response:

```json wrap
{
  "success": false,
  "error": "Title, content, dan author wajib diisi"
}
```

---

**Perbedaan PUT vs PATCH (Penting!):**

**PUT** - Mengganti SELURUH resource:

```json wrap
// Data awal
{"id": 1, "title": "A", "content": "B", "author": "C"}

// PUT request (harus kirim semua field)
{"title": "A Updated", "content": "B", "author": "C"}

// Jika tidak kirim field, akan hilang/null
```

**PATCH** - Update SEBAGIAN field:

```json wrap
// Data awal
{"id": 1, "title": "A", "content": "B", "author": "C"}

// PATCH request (kirim hanya yang ingin diubah)
{"title": "A Updated"}

// Result: Field lain tetap
{"id": 1, "title": "A Updated", "content": "B", "author": "C"}
```

---

**Selamat!** Anda telah membuat REST API pertama yang mengikuti standar
industri. Di Sesi 2-4, kita akan memperdalam konsep REST dan best practices
untuk API design yang lebih kompleks.

**Key Takeaways:**

- REST menggunakan HTTP methods untuk CRUD operations
- JSON adalah format standar untuk pertukaran data
- Status codes memberitahu client hasil dari request
- Validasi di server-side wajib hukumnya
- API tidak mengirim HTML, hanya data mentah
