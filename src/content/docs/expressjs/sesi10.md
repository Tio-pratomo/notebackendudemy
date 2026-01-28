---
title: Form Handling & Data Validation
---

Setelah menguasai EJS dan layouts, sekarang kita akan belajar cara menangani
form secara profesional dengan validasi data.

Ini adalah skill penting karena hampir semua aplikasi web membutuhkan input dari
user.

## Materi: Pengetahuan & Konsep

### 1. Alur Kerja Form di Express

Ketika user mengisi form dan menekan tombol submit, browser mengirim data ke
server menggunakan method POST atau GET.

Express menerima data tersebut dan menempatkannya di `req.body` (untuk POST)
atau `req.query` (untuk GET). Tanpa middleware `express.urlencoded()` yang sudah
kita pelajari di Sesi 5, `req.body` akan kosong.

### 2. GET vs POST untuk Form

- **GET**: Data terlihat di URL bar (`?name=budi&email=...`). Cocok untuk form
  pencarian karena bisa di-bookmark. Tidak aman untuk password.
- **POST**: Data dikirim di body HTTP request, tidak terlihat di URL. Lebih aman
  dan bisa mengirim data besar seperti file.

### 3. Validasi Data - Mengapa Penting?

Tidak semua user mengisi form dengan benar. Ada yang sengaja memasukkan data
berbahaya (SQL injection, XSS attacks), atau hanya asal mengisi.

Validasi di server-side adalah WAJIB meskipun sudah ada validasi di HTML5
(atribut `required`, `type="email"`, dll), karena validasi HTML bisa di-bypass.

### 4. Best Practices Form Handling

- Selalu validasi di server (jangan hanya di client)
- Berikan feedback yang jelas jika ada error
- Simpan input user jika validasi gagal (agar mereka tidak perlu ketik ulang)
- Gunakan CSRF protection untuk keamanan (akan dipelajari di sesi
  authentication)

---

## Praktik

Kita akan membuat aplikasi pendaftaran user dengan validasi lengkap.

### Langkah 1: Update Server dengan Form Handler

```javascript wrap
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

// EJS
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Global variables
app.use((req, res, next) => {
  res.locals.siteName = "Form Master";
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// Simulasi database in-memory
const users = [];

// Routes
app.get("/", (req, res) => {
  res.render("pages/home", {
    pageTitle: "Beranda",
  });
});

// GET - Tampilkan form registrasi
app.get("/register", (req, res) => {
  res.render("pages/register", {
    pageTitle: "Pendaftaran User",
    errors: null,
    formData: null,
  });
});

// POST - Proses form registrasi
app.post("/register", (req, res) => {
  const { username, email, password, confirmPassword, age } = req.body;

  // Object untuk menyimpan error messages
  const errors = {};

  // Validasi Username
  if (!username || username.trim() === "") {
    errors.username = "Username wajib diisi";
  } else if (username.length < 3) {
    errors.username = "Username minimal 3 karakter";
  } else if (users.some((u) => u.username === username)) {
    errors.username = "Username sudah digunakan";
  }

  // Validasi Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.trim() === "") {
    errors.email = "Email wajib diisi";
  } else if (!emailRegex.test(email)) {
    errors.email = "Format email tidak valid";
  } else if (users.some((u) => u.email === email)) {
    errors.email = "Email sudah terdaftar";
  }

  // Validasi Password
  if (!password || password.trim() === "") {
    errors.password = "Password wajib diisi";
  } else if (password.length < 6) {
    errors.password = "Password minimal 6 karakter";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Konfirmasi password tidak cocok";
  }

  // Validasi Age
  const ageNum = parseInt(age);
  if (!age || isNaN(ageNum)) {
    errors.age = "Umur harus berupa angka";
  } else if (ageNum < 13) {
    errors.age = "Umur minimal 13 tahun";
  } else if (ageNum > 120) {
    errors.age = "Umur tidak valid";
  }

  // Jika ada error, render ulang form dengan error messages
  if (Object.keys(errors).length > 0) {
    return res.render("pages/register", {
      pageTitle: "Pendaftaran User",
      errors: errors,
      formData: req.body, // Simpan data yang sudah diisi user
    });
  }

  // Jika validasi sukses, simpan user
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password, // Di production, HARUS di-hash (akan dipelajari di sesi auth)
    age: ageNum,
    registeredAt: new Date().toISOString(),
  };

  users.push(newUser);

  // Redirect ke halaman success
  res.redirect(`/success?username=${username}`);
});

// GET - Halaman success
app.get("/success", (req, res) => {
  const username = req.query.username;
  res.render("pages/success", {
    pageTitle: "Pendaftaran Berhasil",
    username: username,
  });
});

// GET - Daftar users (untuk melihat hasil)
app.get("/users", (req, res) => {
  res.render("pages/users-list", {
    pageTitle: "Daftar User",
    users: users,
  });
});

app.listen(port, () => {
  console.log(`Server Sesi 10 berjalan di http://localhost:${port}`);
});
```

### Langkah 2: Buat Form Template

```html title="views/pages/register.ejs"
<section class="register-section">
  <h2><%= pageTitle %></h2>

  <% if (errors && Object.keys(errors).length > 0) { %>
  <div class="alert alert-error">
    <p><strong>⚠️ Terdapat kesalahan pada form:</strong></p>
    <ul>
      <% Object.values(errors).forEach(error => { %>
      <li><%= error %></li>
      <% }) %>
    </ul>
  </div>
  <% } %>

  <form action="/register" method="POST" class="register-form">
    <div class="form-group">
      <label for="username">Username *</label>
      <input
        type="text"
        id="username"
        name="username"
        value="<%= formData ? formData.username : '' %>"
        class="<%= errors && errors.username ? 'input-error' : '' %>"
      />
      <% if (errors && errors.username) { %>
      <span class="error-message"><%= errors.username %></span>
      <% } %>
    </div>

    <div class="form-group">
      <label for="email">Email *</label>
      <input
        type="email"
        id="email"
        name="email"
        value="<%= formData ? formData.email : '' %>"
        class="<%= errors && errors.email ? 'input-error' : '' %>"
      />
      <% if (errors && errors.email) { %>
      <span class="error-message"><%= errors.email %></span>
      <% } %>
    </div>

    <div class="form-group">
      <label for="password">Password *</label>
      <input
        type="password"
        id="password"
        name="password"
        class="<%= errors && errors.password ? 'input-error' : '' %>"
      />
      <% if (errors && errors.password) { %>
      <span class="error-message"><%= errors.password %></span>
      <% } %>
      <small>Minimal 6 karakter</small>
    </div>

    <div class="form-group">
      <label for="confirmPassword">Konfirmasi Password *</label>
      <input
        type="password"
        id="confirmPassword"
        name="confirmPassword"
        class="<%= errors && errors.confirmPassword ? 'input-error' : '' %>"
      />
      <% if (errors && errors.confirmPassword) { %>
      <span class="error-message"><%= errors.confirmPassword %></span>
      <% } %>
    </div>

    <div class="form-group">
      <label for="age">Umur *</label>
      <input
        type="number"
        id="age"
        name="age"
        value="<%= formData ? formData.age : '' %>"
        min="13"
        class="<%= errors && errors.age ? 'input-error' : '' %>"
      />
      <% if (errors && errors.age) { %>
      <span class="error-message"><%= errors.age %></span>
      <% } %>
    </div>

    <button type="submit" class="btn-primary">Daftar Sekarang</button>
  </form>

  <p class="form-note">
    Sudah punya akun? <a href="/users">Lihat daftar user</a>
  </p>
</section>
```

### Langkah 3: Buat Success Page

```html title="views/pages/success.ejs" wrap
<section class="success-section">
  <div class="success-icon">✅</div>
  <h2>Pendaftaran Berhasil!</h2>
  <p>Selamat datang, <strong><%= username %></strong>!</p>
  <p>
    Akun Anda telah berhasil dibuat pada <%= new
    Date().toLocaleDateString('id-ID') %>.
  </p>

  <div class="action-buttons">
    <a href="/users" class="btn-primary">Lihat Semua User</a>
    <a href="/register" class="btn-secondary">Daftar User Lain</a>
  </div>
</section>
```

### Langkah 4: Buat User List

```html title="views/pages/users-list.ejs" wrap
<section>
  <h2><%= pageTitle %></h2>
  <p>Total user terdaftar: <strong><%= users.length %></strong></p>

  <% if (users.length === 0) { %>
  <p class="empty-state">
    Belum ada user yang terdaftar. <a href="/register">Daftar sekarang</a>
  </p>
  <% } else { %>
  <table class="users-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Username</th>
        <th>Email</th>
        <th>Umur</th>
        <th>Tanggal Daftar</th>
      </tr>
    </thead>
    <tbody>
      <% users.forEach(user => { %>
      <tr>
        <td><%= user.id %></td>
        <td><%= user.username %></td>
        <td><%= user.email %></td>
        <td><%= user.age %> tahun</td>
        <td><%= new Date(user.registeredAt).toLocaleDateString('id-ID') %></td>
      </tr>
      <% }) %>
    </tbody>
  </table>
  <% } %>

  <a href="/register" class="btn-primary">+ Tambah User Baru</a>
</section>
```

### Langkah 5: Update CSS - Tambahkan

```css title="public/css/style.css" wrap
.alert {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.alert-error {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
}

.alert ul {
  margin: 10px 0 0 20px;
}

.register-form {
  max-width: 500px;
  margin: 20px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.input-error {
  border-color: #e74c3c !important;
}

.error-message {
  display: block;
  color: #e74c3c;
  font-size: 14px;
  margin-top: 5px;
}

.form-group small {
  display: block;
  color: #666;
  font-size: 13px;
  margin-top: 5px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  margin-left: 10px;
}

.success-section {
  text-align: center;
  padding: 40px 0;
}

.success-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.users-table th {
  background: #667eea;
  color: white;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #666;
}
```

### Langkah 6: Test Aplikasi

1. Jalankan: `node index.js`
2. Akses `/register`
3. Coba submit form kosong - lihat error messages
4. Coba submit dengan password tidak match
5. Coba submit dengan email invalid
6. Submit dengan data valid - Anda akan redirect ke success page
7. Lihat `/users` untuk melihat data yang tersimpan

### Poin Penting

- Validasi dilakukan di server, bukan hanya HTML5
- Error messages spesifik dan membantu user
- Data yang sudah diisi tidak hilang saat ada error
- Password belum di-hash (akan dipelajari di sesi authentication nanti)

Selamat! Anda sekarang bisa membuat form dengan validasi profesional!
