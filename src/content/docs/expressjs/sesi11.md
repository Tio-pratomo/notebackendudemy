---
title: Static Files & Public Assets
---

Setelah memahami form handling, sekarang kita akan belajar cara mengelola file
statis seperti CSS, JavaScript client-side, gambar, dan font secara profesional.

## Materi: Pengetahuan & Konsep

### 1. Apa itu Static Files?

Static files adalah file yang tidak berubah dan dikirim langsung ke browser
tanpa pemrosesan di server. Contohnya:

- **CSS**: File styling untuk tampilan website
- **JavaScript Client-side**: File JS yang berjalan di browser (berbeda dengan
  Node.js yang berjalan di server)
- **Images**: PNG, JPG, SVG, GIF, dll
- **Fonts**: WOFF, TTF untuk custom typography
- **Documents**: PDF, file download lainnya

### 2. Middleware express.static()

Express menyediakan middleware built-in `express.static()` untuk serving static
files.

Ketika Anda menulis `app.use(express.static("public"))`, Express akan otomatis
mencari file di folder `public` dan mengirimkannya ke browser jika ada request
yang cocok.

### 3. Cara Kerja Static Middleware

Ketika browser meminta file seperti `/css/style.css`, Express akan:

1. Memeriksa apakah file `public/css/style.css` ada
2. Jika ada, kirim file tersebut dengan MIME type yang tepat
3. Jika tidak ada, lanjut ke route handler berikutnya

### 4. Best Practices untuk Static Files

- Buat struktur folder yang jelas (`css/`, `js/`, `images/`)
- Gunakan nama file yang deskriptif dan konsisten
- Compress images untuk performa lebih baik
- Versioning untuk cache busting (akan dipelajari di sesi deployment)
- Pisahkan antara file development dan production

---

### Praktik

Kita akan membuat aplikasi portfolio sederhana dengan static files yang
terorganisir dengan baik.

### Langkah 1: Setup Struktur Folder Lengkap

```
belajar-backend/
├── public/
│   ├── css/
│   │   ├── style.css
│   │   └── utilities.css
│   ├── js/
│   │   └── main.js
│   ├── images/
│   │   ├── logo.png
│   │   ├── hero-bg.jpg
│   │   └── profile.jpg
│   └── downloads/
│       └── resume.pdf
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── partials/
│   │   ├── head.ejs
│   │   ├── header.ejs
│   │   └── footer.ejs
│   └── pages/
│       ├── home.ejs
│       ├── gallery.ejs
│       └── download.ejs
├── index.js
└── package.json
```

### Langkah 2: Konfigurasi Server dengan Multiple Static Folders

```javascript wrap
import express from "express";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - folder 'public' dengan berbagai sub-folder
app.use(express.static("public"));

// Optional: Serve static files dengan virtual path prefix
// Akses: /assets/css/style.css instead of /css/style.css
// app.use('/assets', express.static('public'));

// Multiple static directories (dicek berurutan)
app.use(express.static("uploads")); // Folder untuk user uploads

// EJS Configuration
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Global variables
app.use((req, res, next) => {
  res.locals.siteName = "Portfolio Demo";
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.get("/", (req, res) => {
  res.render("pages/home", {
    pageTitle: "Beranda",
  });
});

app.get("/gallery", (req, res) => {
  // Daftar images dari folder public/images
  const images = [
    { name: "Project 1", file: "hero-bg.jpg" },
    { name: "Profile Photo", file: "profile.jpg" },
    { name: "Logo", file: "logo.png" },
  ];

  res.render("pages/gallery", {
    pageTitle: "Galeri",
    images: images,
  });
});

app.get("/download", (req, res) => {
  res.render("pages/download", {
    pageTitle: "Download Resources",
  });
});

// API route untuk download file secara paksa
app.get("/api/download/resume", (req, res) => {
  const file = path.join(__dirname, "public", "downloads", "resume.pdf");
  res.download(file, "My-Resume-2026.pdf", (err) => {
    if (err) {
      console.error("Download error:", err);
      res.status(404).send("File tidak ditemukan");
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Halaman Tidak Ditemukan</h1>
    <p>Path: ${req.url}</p>
    <a href="/">Kembali ke Home</a>
  `);
});

app.listen(port, () => {
  console.log(`Server Sesi 11 berjalan di http://localhost:${port}`);
  console.log(
    `Static files di-serve dari folder: ${path.join(__dirname, "public")}`
  );
});
```

### Langkah 3: Buat CSS Utilities

```css title="public/css/utilities.css" wrap
/* Utility Classes untuk Reusable Styling */

/* Spacing */
.mt-1 {
  margin-top: 10px;
}
.mt-2 {
  margin-top: 20px;
}
.mt-3 {
  margin-top: 30px;
}
.mb-1 {
  margin-bottom: 10px;
}
.mb-2 {
  margin-bottom: 20px;
}
.mb-3 {
  margin-bottom: 30px;
}

/* Text Alignment */
.text-center {
  text-align: center;
}
.text-left {
  text-align: left;
}
.text-right {
  text-align: right;
}

/* Flex Utilities */
.flex {
  display: flex;
}
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Grid System */
.grid {
  display: grid;
}
.grid-2 {
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.grid-3 {
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.grid-4 {
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* Shadows */
.shadow-sm {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.shadow-md {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
.shadow-lg {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

/* Borders */
.rounded {
  border-radius: 8px;
}
.rounded-lg {
  border-radius: 16px;
}
.border {
  border: 1px solid #ddd;
}

/* Colors */
.text-primary {
  color: #667eea;
}
.text-secondary {
  color: #95a5a6;
}
.text-danger {
  color: #e74c3c;
}
.text-success {
  color: #2ecc71;
}

.bg-primary {
  background-color: #667eea;
}
.bg-light {
  background-color: #f8f9fa;
}
```

**Langkah 4: Update Main CSS**

```css title="public/css/style.css" wrap
/* Import utilities */
@import url("utilities.css");

/* Variables (Modern CSS Custom Properties) */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --text-color: #333;
  --bg-color: #f8f9fa;
  --border-color: #ddd;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background: var(--bg-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Hero Section with Background Image */
.hero-section {
  background:
    linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
    url("/images/hero-bg.jpg") center/cover;
  color: white;
  padding: 100px 0;
  text-align: center;
}

.hero-section h1 {
  font-size: 3rem;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* Logo Styling */
.site-logo {
  width: 150px;
  height: auto;
  margin-bottom: 20px;
}

/* Gallery Grid */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin: 40px 0;
}

.gallery-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.gallery-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.gallery-item img {
  width: 100%;
  height: 250px;
  object-fit: cover;
}

.gallery-item-info {
  padding: 20px;
}

.gallery-item-info h3 {
  color: var(--primary-color);
  margin-bottom: 10px;
}

/* Download Section */
.download-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin: 30px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.download-btn {
  display: inline-block;
  background: var(--primary-color);
  color: white;
  padding: 12px 30px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.3s;
}

.download-btn:hover {
  background: var(--secondary-color);
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-section h1 {
    font-size: 2rem;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
```

### Langkah 5: Buat Client-side JavaScript

```javascript title="public/js/main.js" wrap
// Client-side JavaScript - Berjalan di browser, bukan di server!

console.log("📦 Main.js loaded successfully!");
console.log("🗓️ Tahun saat ini:", new Date().getFullYear());

// Dark mode toggle
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ DOM fully loaded");

  // Animasi fade-in untuk gallery items
  const galleryItems = document.querySelectorAll(".gallery-item");

  galleryItems.forEach((item, index) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";
    item.style.transition = "all 0.5s ease";

    setTimeout(() => {
      item.style.opacity = "1";
      item.style.transform = "translateY(0)";
    }, index * 100);
  });

  // Track download clicks
  const downloadButtons = document.querySelectorAll(".download-btn");

  downloadButtons.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      console.log("📥 User downloading file:", this.getAttribute("href"));
      // Di production, ini bisa dikirim ke analytics
    });
  });
});

// Function untuk menampilkan waktu real-time
function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("id-ID");
  const clockElement = document.getElementById("live-clock");

  if (clockElement) {
    clockElement.textContent = timeString;
  }
}

// Update setiap detik
setInterval(updateClock, 1000);
```

### Langkah 6: Update EJS Templates

```html title="views/partials/head.ejs" wrap
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= pageTitle %> - <%= siteName %></title>

  <!-- CSS Files -->
  <link rel="stylesheet" href="/css/style.css" />

  <!-- Favicon (optional) -->
  <link rel="icon" type="image/png" href="/images/logo.png" />
</head>
```

```html title="views/partials/footer.ejs" wrap
<footer class="site-footer">
  <div class="container">
    <p>&copy; <%= currentYear %> <%= siteName %>. Built with Express.js</p>
    <p>Waktu Server: <span id="live-clock">Loading...</span></p>
  </div>
</footer>

<!-- Client-side JavaScript -->
<script src="/js/main.js"></script>
```

```html title="views/pages/home.ejs" wrap
<section class="hero-section">
  <img src="/images/logo.png" alt="Logo" class="site-logo" />
  <h1>Selamat Datang di Portfolio Saya</h1>
  <p>Belajar Static Files dengan Express.js - Januari 2026</p>
</section>

<section class="container mt-3">
  <h2>Apa itu Static Files?</h2>
  <p>
    Static files adalah file yang tidak berubah dan dikirim langsung ke browser.
  </p>

  <div class="grid-3 mt-2">
    <div class="download-card">
      <h3>🎨 CSS</h3>
      <p>Styling untuk tampilan website</p>
    </div>
    <div class="download-card">
      <h3>Images</h3>
      <p>Gambar, logo, dan icon</p>
    </div>
    <div class="download-card">
      <h3>⚡ JavaScript</h3>
      <p>Interaktivitas di browser</p>
    </div>
  </div>
</section>
```

```html title="views/pages/gallery.ejs" wrap
<section class="container mt-3">
  <h2><%= pageTitle %></h2>

  <div class="gallery-grid">
    <% images.forEach(image => { %>
    <div class="gallery-item">
      <img src="/images/<%= image.file %>" alt="<%= image.name %>" />
      <div class="gallery-item-info">
        <h3><%= image.name %></h3>
        <p>File: <%= image.file %></p>
      </div>
    </div>
    <% }) %>
  </div>
</section>
```

```html title="views/pages/download.ejs" wrap
<section class="container mt-3">
  <h2><%= pageTitle %></h2>

  <div class="download-card">
    <h3>📄 Resume / CV</h3>
    <p>Download resume saya dalam format PDF</p>
    <a href="/api/download/resume" class="download-btn">Download Resume</a>
  </div>

  <div class="download-card mt-2">
    <h3>📦 Direct Access Files</h3>
    <p>Anda juga bisa akses file langsung:</p>
    <ul>
      <li>
        <a href="/downloads/resume.pdf" target="_blank">Open PDF in Browser</a>
      </li>
      <li><a href="/css/style.css" target="_blank">View CSS Source</a></li>
      <li><a href="/js/main.js" target="_blank">View JS Source</a></li>
    </ul>
  </div>
</section>
```

### Langkah 7: Buat Dummy Files

Karena kita tidak punya file image sebenarnya, buat placeholder:

1. Buat file `public/downloads/resume.pdf` (bisa file PDF apa saja atau buat
   dummy)
2. Download gambar placeholder dari https://via.placeholder.com/800x600 dan
   simpan sebagai `hero-bg.jpg`
3. Atau gunakan gambar apa saja yang Anda punya

### Langkah 8: Test Aplikasi

1. Jalankan: `node index.js`
2. Akses `/` - Lihat hero section dengan background image
3. Akses `/gallery` - Lihat animasi fade-in dari JavaScript
4. Akses `/download` - Coba download file
5. Buka DevTools (F12) → Console untuk melihat log dari `main.js`
6. Coba akses langsung `/css/style.css` atau `/images/logo.png` di browser

### Poin Penting

- File di folder `public` bisa diakses langsung via URL
- `res.download()` memaksa browser untuk download, bukan membuka di tab baru
- JavaScript client-side berbeda dengan Node.js server-side
- CSS bisa di-split ke multiple files dan di-import

Anda sekarang sudah menguasai pengelolaan static assets secara profesional!
