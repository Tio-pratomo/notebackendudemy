---
title: File Upload dengan Multer & multipart/form-data
---

Di sesi ini kita belajar cara menangani upload file (gambar/dokumen) di Express
menggunakan encoding `multipart/form-data` dan middleware Multer.

## Materi: Pengetahuan & Konsep

### 1. `multipart/form-data` dan kenapa berbeda

Saat mengirim data biasa (form login, dll) kita sering pakai `application/json`
atau `application/x-www-form-urlencoded` di body request.

Untuk upload file, form HTML harus menggunakan `enctype="multipart/form-data"`
dan method `POST`, kalau tidak, file tidak akan terkirim dengan benar.

`multipart/form-data` memecah request body menjadi beberapa “bagian” (part):
part teks (field biasa) dan part file (binary), sehingga library seperti
`express.json()` tidak bisa mem-parsenya.

### 2. Apa itu Multer

Multer adalah middleware Node.js khusus untuk menangani request
`multipart/form-data`, terutama upload file melalui form HTML.

Multer terintegrasi langsung dengan Express sebagai middleware, dan menyediakan
fitur: pilih lokasi penyimpanan (disk/memory), membatasi ukuran file, filter
tipe file, dan menangani error upload.

Multer hanya memproses form yang benar-benar `multipart/form-data`; form biasa
(JSON/urlencoded) tetap ditangani oleh middleware lain seperti `express.json()`.

### 3. Konfigurasi dasar Multer

Multer bisa dikonfigurasi dengan dua cara utama: `dest: 'uploads/'` (simple,
langsung simpan ke folder) atau `storage: multer.diskStorage(...)` untuk kontrol
penuh nama file dan folder.

Pada `diskStorage`, kita bisa menentukan fungsi `destination(req, file, cb)` dan
`filename(req, file, cb)` supaya nama file unik dan tidak saling timpa (misalnya
pakai timestamp + random number).

**Opsi lain:** `fileFilter` untuk menolak file dengan tipe tertentu, dan
`limits` (misalnya `fileSize`) untuk membatasi ukuran upload.

### 4. Alur upload file di web app

Browser mengirim form dengan `method="POST"` dan `enctype="multipart/form-data"`
yang berisi input `<input type="file" name="avatar">` ke endpoint Express.

Di server, route Express menggunakan middleware Multer, misalnya
`upload.single('avatar')`; Multer akan memproses file, menyimpannya, lalu
menambahkan informasi file di `req.file` dan field teks lain di `req.body`.

Setelah itu, handler route (controller) bisa menyimpan path file ke database,
menampilkan preview, atau memproses file (resize, scan, dll).

---

## Praktik: Single & Multiple File Upload dengan Multer

Kita akan membuat mini project khusus upload gambar dengan struktur sederhana.

### 1. Setup project dan instalasi

Buat folder baru:

```bash wrap
mkdir upload-demo
cd upload-demo
npm init -y
npm install express morgan multer ejs express-ejs-layouts dotenv
npm install --save-dev nodemon
```

**Update `package.json`:**

```json
{
  "name": "upload-demo",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

**Buat struktur folder:**

```text
upload-demo/
├── uploads/          # folder untuk file yang di-upload (akan diisi Multer)
├── public/
│   └── css/
│       └── style.css
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── partials/
│   │   ├── head.ejs
│   │   └── navbar.ejs
│   └── pages/
│       └── upload.ejs
├── .env
├── index.js
└── package.json
```

**Isi `.env`:**

```text
PORT=3000
NODE_ENV=development
MAX_FILE_SIZE_MB=2
```

### 2. Konfigurasi Multer dan server

```javascript title="index.js" wrap
import express from "express";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware umum
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
// Serve file yang sudah di-upload untuk preview
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// EJS
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Global vars
app.use((req, res, next) => {
  res.locals.siteName = "Upload Demo";
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// ===== Konfigurasi Multer =====

// Storage: simpan ke folder "uploads" dengan nama unik
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "uploads")); // folder tujuan
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
}); // pola ini sesuai rekomendasi diskStorage Multer.

// Filter: hanya izinkan gambar (jpg, jpeg, png)
const fileFilter = (req, file, cb) => {
  const allowedExt = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) {
    return cb(new Error("Hanya file gambar (JPG/PNG) yang diizinkan"), false);
  }
  cb(null, true);
};

// Limit ukuran file
const maxSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 2;
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeMb * 1024 * 1024,
  },
}); // Multer mendukung limits dan fileFilter untuk validasi upload.

// ===== Routes =====

// Halaman form upload
app.get("/upload", (req, res) => {
  res.render("pages/upload", {
    pageTitle: "Upload Gambar",
    error: null,
    result: null,
  });
});

// Single file upload
app.post(
  "/upload/single",
  upload.single("avatar"), // "avatar" harus cocok dengan name di input file
  (req, res) => {
    // Multer menaruh data file di req.file dan field teks di req.body.
    if (!req.file) {
      return res.render("pages/upload", {
        pageTitle: "Upload Gambar",
        error: "Tidak ada file yang dikirim",
        result: null,
      });
    }

    res.render("pages/upload", {
      pageTitle: "Upload Gambar",
      error: null,
      result: {
        type: "single",
        file: {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          size: req.file.size,
          mimeType: req.file.mimetype,
          url: `/uploads/${req.file.filename}`,
        },
        body: req.body,
      },
    });
  }
);

// Multiple files upload (maks 5 file)
app.post(
  "/upload/multiple",
  upload.array("photos", 5), // "photos" = name input, 5 = max files
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.render("pages/upload", {
        pageTitle: "Upload Gambar",
        error: "Tidak ada file yang dikirim",
        result: null,
      });
    }

    const files = req.files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      url: `/uploads/${file.filename}`,
    }));

    res.render("pages/upload", {
      pageTitle: "Upload Gambar",
      error: null,
      result: {
        type: "multiple",
        files,
        body: req.body,
      },
    });
  }
);

// Error handler khusus Multer (ukuran, tipe file, dll)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Error dari Multer (misalnya file terlalu besar)
    return res.status(400).render("pages/upload", {
      pageTitle: "Upload Gambar",
      error: `Upload error: ${err.message}`,
      result: null,
    });
  }

  if (err) {
    // Error lain (filter file, dll)
    return res.status(400).render("pages/upload", {
      pageTitle: "Upload Gambar",
      error: err.message,
      result: null,
    });
  }

  next();
});

// Redirect root ke /upload
app.get("/", (req, res) => {
  res.redirect("/upload");
});

app.listen(port, () => {
  console.log(`Server Upload Demo berjalan di http://localhost:${port}`);
});
```

### 3. Template layout & partials

```html title="views/layouts/main.ejs" wrap
<!DOCTYPE html>
<html lang="id">
  <%- include('../partials/head') %>
  <body>
    <%- include('../partials/navbar') %>

    <main><%- body %></main>
  </body>
</html>
```

```html title="views/partials/head.ejs" wrap
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= pageTitle %> - <%= siteName %></title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
```

```html wrap title="views/partials/navbar.ejs"
<nav class="navbar">
  <div class="container nav-content">
    <h1 class="site-title"><%= siteName %></h1>
    <span>Max file size: <%= process.env.MAX_FILE_SIZE_MB || 2 %> MB</span>
  </div>
</nav>
```

### 4. Halaman upload

Perhatikan penggunaan `enctype="multipart/form-data"` dan `name` yang cocok
dengan middleware Multer.

```html wrap title="views/pages/upload.ejs"
<section class="container">
  <h2><%= pageTitle %></h2>

  <% if (error) { %>
  <div class="alert alert-error"><%= error %></div>
  <% } %>

  <div class="grid-2">
    <!-- Single file upload -->
    <div class="card">
      <h3>Single File Upload</h3>
      <form
        action="/upload/single"
        method="POST"
        enctype="multipart/form-data"
        class="upload-form"
      >
        <div class="form-group">
          <label for="name">Nama</label>
          <input type="text" id="name" name="name" />
        </div>

        <div class="form-group">
          <label for="avatar">Foto Profil (JPG/PNG)</label>
          <input
            type="file"
            id="avatar"
            name="avatar"
            accept="image/png, image/jpeg"
          />
        </div>

        <button type="submit" class="btn-primary">Upload Single</button>
      </form>
    </div>

    <!-- Multiple files upload -->
    <div class="card">
      <h3>Multiple Files Upload</h3>
      <form
        action="/upload/multiple"
        method="POST"
        enctype="multipart/form-data"
        class="upload-form"
      >
        <div class="form-group">
          <label for="albumName">Nama Album</label>
          <input type="text" id="albumName" name="albumName" />
        </div>

        <div class="form-group">
          <label for="photos">Foto (maks 5 file)</label>
          <input
            type="file"
            id="photos"
            name="photos"
            accept="image/png, image/jpeg"
            multiple
          />
        </div>

        <button type="submit" class="btn-primary">Upload Multiple</button>
      </form>
    </div>
  </div>

  <% if (result) { %>
  <div class="card result-card">
    <h3>Hasil Upload (<%= result.type %>)</h3>

    <% if (result.type === 'single') { %>
    <p>Nama asli: <strong><%= result.file.originalName %></strong></p>
    <p>Nama file di server: <code><%= result.file.fileName %></code></p>
    <p>Ukuran: <%= (result.file.size / 1024).toFixed(1) %> KB</p>
    <p>MIME type: <%= result.file.mimeType %></p>

    <h4>Preview:</h4>
    <img src="<%= result.file.url %>" alt="Preview" class="preview-image" />

    <h4>Data Form:</h4>
    <pre><%= JSON.stringify(result.body, null, 2) %></pre>
    <% } else { %>
    <p>Total file: <strong><%= result.files.length %></strong></p>

    <div class="preview-grid">
      <% result.files.forEach(f => { %>
      <div class="preview-item">
        <img src="<%= f.url %>" alt="<%= f.originalName %>" />
        <p><%= f.originalName %></p>
      </div>
      <% }) %>
    </div>

    <h4>Data Form:</h4>
    <pre><%= JSON.stringify(result.body, null, 2) %></pre>
    <% } %>
  </div>
  <% } %>
</section>
```

### 5. CSS sederhana

```css title="public/css/style.css" wrap
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f5f7fb;
  color: #333;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}

.navbar {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  padding: 15px 0;
  margin-bottom: 20px;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.site-title {
  font-size: 1.4rem;
  font-weight: 600;
}

h2 {
  margin-bottom: 20px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 6px;
}

.form-group input[type="text"],
.form-group input[type="file"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
}

.btn-primary {
  background: #667eea;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-primary:hover {
  background: #5563d6;
}

.alert-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 10px 15px;
  border-radius: 6px;
  margin: 15px 0;
}

.result-card {
  margin-top: 30px;
}

.preview-image {
  max-width: 250px;
  margin-top: 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.preview-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

pre {
  background: #111827;
  color: #e5e7eb;
  padding: 10px;
  border-radius: 6px;
  margin-top: 10px;
  font-size: 0.85rem;
  overflow-x: auto;
}
```

### 6. Cara menjalankan dan menguji

1. Jalankan server:

```bash
npm run dev
```

2. Buka `http://localhost:3000/upload` di browser.
3. Coba:
   - Upload satu gambar di form “Single File Upload”, isi nama, lalu submit.
   - Upload beberapa gambar sekaligus di form “Multiple Files Upload”.
   - Coba upload file non-gambar (misalnya `.pdf`) dan lihat error dari
     `fileFilter`.
   - Coba upload gambar besar (> 2 MB) dan perhatikan error limit ukuran file.

Dengan ini Anda sudah menguasai dasar upload file di Express dengan
`multipart/form-data` dan Multer, termasuk validasi ukuran/tipe file dan cara
menampilkan hasil upload.
