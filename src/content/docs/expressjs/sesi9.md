---
title: EJS Partials & Layouts
---

Setelah memahami dasar EJS di Sesi 8, sekarang kita akan mempelajari cara
membuat kode yang lebih efisien dengan partials dan layouts.

Ini adalah teknik yang digunakan oleh developer profesional untuk menghindari
pengulangan kode (DRY principle: Don't Repeat Yourself).

## Materi: Pengetahuan & Konsep

### 1. Masalah dengan Template Biasa

Pada Sesi 8, kita menulis `<!DOCTYPE html>`, `<head>`, dan navigasi berulang
kali di setiap file EJS.

Bayangkan jika Anda memiliki 50 halaman dan ingin mengubah logo atau menu
navigasi.

Anda harus mengubahnya di 50 file berbeda! Ini sangat tidak efisien dan rawan
error.

### 2. Apa itu Partials?

Partials adalah potongan kecil template EJS yang bisa digunakan berulang kali di
berbagai halaman. Contohnya:

- `header.ejs` - Bagian atas website (logo, navigasi)
- `footer.ejs` - Bagian bawah website (copyright, social media)
- `head.ejs` - Tag `<head>` dengan meta tags dan CSS links

Dengan partials, Anda cukup mengubah satu file dan semua halaman yang
menggunakannya akan otomatis terupdate.

### 3. Apa itu Layouts?

Layouts adalah template "induk" yang mendefinisikan struktur umum halaman web
Anda.

Layout berisi skeleton HTML dengan placeholder untuk konten yang berbeda-beda.
Kita akan menggunakan package `express-ejs-layouts` untuk fitur ini.

### 4. Sintaks Include Partials

```ejs
<%- include('partials/header') %>
```

Tanda `<%-` (dengan minus) digunakan karena kita ingin HTML dari partial
di-render, bukan di-escape sebagai teks biasa.

---

## Praktik

### Langkah 1: Instalasi Express EJS Layouts

```bash
npm install express-ejs-layouts
```

### Langkah 2: Setup Struktur Folder Baru

```
belajar-backend/
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── partials/
│   │   ├── head.ejs
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   └── navigation.ejs
│   ├── pages/
│   │   ├── home.ejs
│   │   ├── about.ejs
│   │   └── contact.ejs
├── public/
│   └── css/
│       └── style.css
├── index.js
└── package.json
```

### Langkah 3: Update Server Configuration

```javascript wrap title="index.js"
import express from "express";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";

const app = express();
const port = 3000;

// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// EJS Configuration
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main"); // Layout default

// Global variables untuk semua views
app.use((req, res, next) => {
  res.locals.siteName = "Belajar EJS";
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.get("/", (req, res) => {
  res.render("pages/home", {
    pageTitle: "Beranda",
    welcomeMessage: "Selamat datang di website kami!",
  });
});

app.get("/about", (req, res) => {
  res.render("pages/about", {
    pageTitle: "Tentang Kami",
    description: "Kami adalah tim yang berpengalaman lebih dari 10 tahun",
  });
});

app.get("/contact", (req, res) => {
  res.render("pages/contact", {
    pageTitle: "Kontak",
    email: "info@belajarejs.com",
  });
});

app.listen(port, () => {
  console.log(`Server Sesi 9 berjalan di http://localhost:${port}`);
});
```

### Langkah 4: Buat File Layouts dan Partials

**views/layouts/main.ejs:**

```html
<!DOCTYPE html>
<html lang="id">
  <%- include('../partials/head') %>
  <body>
    <%- include('../partials/header') %> <%- include('../partials/navigation')
    %>

    <main class="container"><%- body %></main>

    <%- include('../partials/footer') %>
  </body>
</html>
```

**views/partials/head.ejs:**

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= pageTitle %> - <%= siteName %></title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
```

**views/partials/header.ejs:**

```html
<header class="site-header">
  <div class="container">
    <h1><%= siteName %></h1>
    <p class="tagline">Platform Belajar Backend Modern</p>
  </div>
</header>
```

**views/partials/navigation.ejs:**

```html
<nav class="navbar">
  <div class="container">
    <ul class="nav-links">
      <li class="<%= currentPath === '/' ? 'active' : '' %>">
        <a href="/">Beranda</a>
      </li>
      <li class="<%= currentPath === '/about' ? 'active' : '' %>">
        <a href="/about">Tentang</a>
      </li>
      <li class="<%= currentPath === '/contact' ? 'active' : '' %>">
        <a href="/contact">Kontak</a>
      </li>
    </ul>
  </div>
</nav>
```

**views/partials/footer.ejs:**

```html
<footer class="site-footer">
  <div class="container">
    <p>&copy; <%= currentYear %> <%= siteName %>. All rights reserved.</p>
    <p>Dibuat dengan Express.js & EJS</p>
  </div>
</footer>
```

### Langkah 5: Buat File Pages

**views/pages/home.ejs:**

```html
<section class="hero">
  <h2><%= pageTitle %></h2>
  <p><%= welcomeMessage %></p>
  <p>Sekarang adalah tahun <%= currentYear %>, era baru web development!</p>
</section>

<section class="features">
  <h3>Apa yang Akan Anda Pelajari?</h3>
  <ul>
    <li>Express.js & RESTful API</li>
    <li>PostgreSQL Database</li>
    <li>Authentication & Authorization</li>
    <li>Deployment ke Production</li>
  </ul>
</section>
```

**views/pages/about.ejs:**

```html
<section>
  <h2><%= pageTitle %></h2>
  <p><%= description %></p>

  <div class="team-info">
    <h3>Teknologi yang Kami Gunakan</h3>
    <ul>
      <li>Node.js & Express.js</li>
      <li>PostgreSQL (via mise)</li>
      <li>DBeaver untuk database management</li>
      <li>Modern ES6+ JavaScript</li>
    </ul>
  </div>
</section>
```

**views/pages/contact.ejs:**

```html
<section>
  <h2><%= pageTitle %></h2>
  <p>Hubungi kami di: <strong><%= email %></strong></p>

  <form action="/contact" method="POST" class="contact-form">
    <div class="form-group">
      <label for="name">Nama:</label>
      <input type="text" id="name" name="name" required />
    </div>

    <div class="form-group">
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required />
    </div>

    <div class="form-group">
      <label for="message">Pesan:</label>
      <textarea id="message" name="message" rows="5" required></textarea>
    </div>

    <button type="submit">Kirim Pesan</button>
  </form>
</section>
```

### Langkah 6: Buat CSS (public/css/style.css)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.site-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 0;
  text-align: center;
}

.site-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.tagline {
  font-size: 1.1rem;
  opacity: 0.9;
}

.navbar {
  background: #2c3e50;
  padding: 0;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 0;
}

.nav-links li a {
  display: block;
  color: white;
  text-decoration: none;
  padding: 15px 25px;
  transition: background 0.3s;
}

.nav-links li a:hover,
.nav-links li.active a {
  background: #34495e;
}

main {
  min-height: 60vh;
  padding: 40px 0;
}

.hero {
  text-align: center;
  padding: 40px 0;
}

.hero h2 {
  color: #667eea;
  margin-bottom: 20px;
}

.features {
  margin-top: 40px;
}

.features ul {
  margin-top: 20px;
  padding-left: 40px;
}

.features li {
  margin: 10px 0;
}

.contact-form {
  max-width: 600px;
  margin: 30px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

button[type="submit"] {
  background: #667eea;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button[type="submit"]:hover {
  background: #764ba2;
}

.site-footer {
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 30px 0;
  margin-top: 40px;
}

.site-footer p {
  margin: 5px 0;
}
```

### Langkah 7: Test Aplikasi

1. Jalankan: `node index.js`
2. Akses ketiga halaman dan perhatikan:
   - Header dan footer muncul di semua halaman tanpa pengulangan kode
   - Menu navigasi menandai halaman aktif secara otomatis
   - CSS dari folder `public` ter-load dengan baik

### Keuntungan yang Didapat

- Perubahan header/footer cukup di satu file saja
- Kode lebih bersih dan mudah di-maintain
- Konsistensi desain terjaga di seluruh aplikasi
- Variable global (`siteName`, `currentYear`) bisa diakses di semua view

Selamat! Anda sekarang sudah menguasai teknik EJS Partials & Layouts yang
merupakan standar industri!
