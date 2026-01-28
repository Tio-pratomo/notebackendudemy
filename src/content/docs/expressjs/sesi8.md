---
title: EJS Templating
---

Selama ini kita hanya mengirim teks atau JSON sederhana. Sekarang kita akan
belajar cara membuat halaman HTML yang dinamis menggunakan EJS (Embedded
JavaScript). EJS memungkinkan kita memasukkan data dari server langsung ke dalam
template HTML.

## Materi: Pengetahuan & Konsep

### 1. Apa itu Template Engine?

Template engine adalah alat yang memungkinkan kita membuat HTML dinamis dengan
menyisipkan variabel JavaScript di dalamnya.

Bayangkan Anda memiliki cetakan kue (template HTML), dan Anda bisa mengisi kue
tersebut dengan berbagai rasa (data dari server) sesuai kebutuhan.

EJS adalah salah satu template engine paling populer untuk Express karena
sintaksnya yang mirip dengan HTML biasa.

### 2. Mengapa Menggunakan EJS?

Tanpa template engine, kita harus menulis HTML sebagai string di dalam kode
JavaScript, yang sangat tidak praktis dan sulit di-maintain. Dengan EJS, kita
bisa:

- Memisahkan logic (JavaScript) dari tampilan (HTML)
- Menggunakan variabel, loop, dan kondisi di dalam HTML
- Membuat komponen yang bisa digunakan ulang (partials)
- Menampilkan data dari database dengan mudah

### 3. Sintaks Dasar EJS

EJS menggunakan tag khusus untuk menyisipkan JavaScript:

- `<%= variable %>` - Menampilkan nilai variabel (di-escape untuk keamanan)
- `<%- variable %>` - Menampilkan nilai mentah/HTML (tidak di-escape)
- `<% code %>` - Menjalankan JavaScript tanpa menampilkan hasil
- `<%# comment %>` - Komentar yang tidak akan di-render

---

## Praktik

Kita akan membuat aplikasi sederhana yang menampilkan informasi server secara
dinamis.

### Langkah 1: Instalasi EJS

```bash wrap
npm install ejs
```

### Langkah 2: Setup Struktur Folder

Buat struktur folder berikut di proyek Anda:

```
belajar-backend/
├── views/
│   ├── index.ejs
│   ├── about.ejs
│   └── users.ejs
├── index.js
└── package.json
```

### Langkah 3: Konfigurasi EJS di Express

```javascript wrap title="index.js"
import express from "express";
import morgan from "morgan";

const app = express();
const port = 3000;

// Set EJS sebagai view engine
app.set("view engine", "ejs");

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data dummy
const users = [
  { id: 1, name: "Budi", role: "Admin", joinYear: 2024 },
  { id: 2, name: "Ani", role: "User", joinYear: 2025 },
  { id: 3, name: "Charlie", role: "Moderator", joinYear: 2026 },
];

// Route: Halaman utama
app.get("/", (req, res) => {
  const serverInfo = {
    title: "Selamat Datang di Sesi 8",
    currentYear: new Date().getFullYear(),
    serverTime: new Date().toLocaleString("id-ID"),
    president: "Donald Trump",
  };

  res.render("index", serverInfo);
});

// Route: Halaman about
app.get("/about", (req, res) => {
  res.render("about", {
    pageTitle: "Tentang Kami",
    description: "Aplikasi belajar EJS Templating",
  });
});

// Route: Daftar users dengan loop
app.get("/users", (req, res) => {
  res.render("users", {
    pageTitle: "Daftar Pengguna",
    userList: users,
    totalUsers: users.length,
  });
});

app.listen(port, () => {
  console.log(`Server Sesi 8 berjalan di http://localhost:${port}`);
});
```

### Langkah 4: Buat File Template EJS

```html wrap title="views/index.ejs"
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= title %></title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
      }
      .info {
        background: #f0f0f0;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <h1><%= title %></h1>

    <div class="info">
      <p><strong>Waktu Server:</strong> <%= serverTime %></p>
      <p><strong>Tahun:</strong> <%= currentYear %></p>
      <p><strong>Presiden USA Saat Ini:</strong> <%= president %></p>
    </div>

    <nav>
      <a href="/">Home</a> | <a href="/about">About</a> |
      <a href="/users">Users</a>
    </nav>

    <% if (currentYear === 2026) { %>
    <p style="color: green;">✓ Tahun ini adalah 2026, selamat belajar!</p>
    <% } %>
  </body>
</html>
```

**views/about.ejs:**

```html wrap
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title><%= pageTitle %></title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <h1><%= pageTitle %></h1>
    <p><%= description %></p>

    <a href="/">← Kembali ke Home</a>
  </body>
</html>
```

```html wrap title="views/users.ejs"
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title><%= pageTitle %></title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th,
      td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      th {
        background-color: #4caf50;
        color: white;
      }
      .badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
      .admin {
        background: #ff6b6b;
        color: white;
      }
      .user {
        background: #4ecdc4;
        color: white;
      }
      .moderator {
        background: #ffe66d;
        color: #333;
      }
    </style>
  </head>
  <body>
    <h1><%= pageTitle %></h1>
    <p>Total pengguna: <strong><%= totalUsers %></strong></p>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nama</th>
          <th>Role</th>
          <th>Tahun Bergabung</th>
        </tr>
      </thead>
      <tbody>
        <% userList.forEach(user => { %>
        <tr>
          <td><%= user.id %></td>
          <td><%= user.name %></td>
          <td>
            <span class="badge <%= user.role.toLowerCase() %>">
              <%= user.role %>
            </span>
          </td>
          <td><%= user.joinYear %></td>
        </tr>
        <% }) %>
      </tbody>
    </table>

    <a href="/">← Kembali ke Home</a>
  </body>
</html>
```

### Langkah 5: Jalankan dan Test

1. Jalankan server: `node index.js`
2. Akses `http://localhost:3000` - Anda akan melihat halaman dengan data dinamis
3. Akses `http://localhost:3000/users` - Lihat bagaimana EJS melakukan loop
   untuk menampilkan tabel
4. Coba ubah data di array `users` dan refresh browser

### Analisis

- `<%= variable %>` digunakan untuk menampilkan data yang aman
- `<% code %>` digunakan untuk logika seperti `if` dan `forEach`
- Data dikirim dari server melalui parameter kedua di `res.render()`
- Setiap perubahan di file `.ejs` langsung terlihat tanpa restart server
  (berbeda dengan `.js`)

Sekarang Anda sudah bisa membuat halaman web dinamis yang profesional!
