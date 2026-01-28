---
title: Personal Blog Application Part 2
---

Baik kita lanjutkan project blog milik kita!

---

### Langkah 7: Template Layouts

```html title="views/layouts/main.ejs" wrap
<!DOCTYPE html>
<html lang="id">
  <%- include('../partials/head') %>
  <body>
    <%- include('../partials/navbar') %>

    <main><%- body %></main>

    <%- include('../partials/footer') %>
  </body>
</html>
```

### Langkah 8: Partials

```html title="views/partials/head.ejs" wrap
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= pageTitle %> - <%= siteName %></title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
```

```html title="views/partials/navbar.ejs" wrap
<nav class="navbar">
  <div class="container">
    <div class="nav-content">
      <div class="site-title"><%= siteName %></div>
      <ul class="nav-links">
        <li><a href="/">Beranda</a></li>
        <li><a href="/create">✍️ Tulis Post</a></li>
        <li><a href="/about">Tentang</a></li>
      </ul>
    </div>
  </div>
</nav>
```

```html title="views/partials/footer.ejs" wrap
<footer>
  <div class="container">
    <p>
      &copy; <%= currentYear %> <%= siteName %>. Built with Express.js & EJS
    </p>
    <p>Mini Project - Sesi 13 Belajar Backend</p>
  </div>
</footer>
```

### Langkah 9: Pages

```html title="views/pages/home.ejs" wrap
<section class="search-section">
  <div class="container">
    <h2 style="text-align: center; margin-bottom: 20px;">
      Temukan Artikel Menarik
    </h2>

    <form action="/" method="GET" class="search-form">
      <input
        type="text"
        name="search"
        placeholder="Cari artikel..."
        class="search-input"
        value="<%= searchQuery %>"
      >

      <select name="category" class="search-select">
        <option value="">Semua Kategori</option>
        <% categories.forEach(cat => { %>
          <option value="<%= cat %>" <%= categoryFilter === cat ? 'selected' : '' %>>
            <%= cat %>
          </option>
        <% }) %>
      </select>

      <button type="submit" class="btn btn-primary">Cari</button>
    </form>

    <% if (searchQuery || categoryFilter) { %>
      <p style="text-align: center; margin-top: 15px; color: #666;">
        Ditemukan <%= posts.length %> artikel
        <a href="/" style="color: #667eea; margin-left: 10px;">Clear Filter</a>
      </p>
    <% } %>
  </div>
</section>

<section class="container">
  <% if (posts.length === 0) { %>
    <div style="text-align: center; padding: 60px 0;">
      <h3>Tidak ada artikel ditemukan</h3>
      <p style="color: #666; margin: 20px 0;">
        Coba kata kunci atau kategori lain, atau <a href="/create">buat artikel baru</a>
      </p>
    </div>
  <% } else { %>
    <div class="posts-grid">
      <% posts.forEach(post => { %>
        <article class="post-card">
          <span class="post-category"><%= post.category %></span>

          <h3 class="post-title">
            <a href="/post/<%= post.id %>"><%= post.title %></a>
          </h3>

          <p class="post-excerpt">
            <%= post.content.substring(0, 150) %>...
          </p>

          <div class="post-meta">
            <span>👤 <%= post.author %></span>
            <span>📅 <%= formatDate(post.createdAt) %></span>
          </div>
        </article>
      <% }) %>
    </div>
  <% } %>
</section>
```

```html title="views/pages/post-detail.ejs" wrap
<section class="container">
  <article class="post-detail">
    <span class="post-category"><%= post.category %></span>

    <h1 class="post-title"><%= post.title %></h1>

    <div
      class="post-meta"
      style="border: none; padding: 0; margin-bottom: 20px;"
    >
      <span>👤 <%= post.author %></span>
      <span>📅 <%= formatDate(post.createdAt) %></span>
    </div>

    <% if (post.createdAt !== post.updatedAt) { %>
    <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
      <em>Terakhir diupdate: <%= formatDate(post.updatedAt) %></em>
    </p>
    <% } %>

    <div class="post-content"><%= post.content %></div>

    <div class="post-actions">
      <a href="/edit/<%= post.id %>" class="btn btn-primary">✏️ Edit</a>

      <form
        action="/delete/<%= post.id %>"
        method="POST"
        style="display: inline;"
        onsubmit="return confirm('Yakin ingin menghapus post ini?')"
      >
        <button type="submit" class="btn btn-danger">🗑️ Hapus</button>
      </form>

      <a href="/" class="btn" style="background: #95a5a6; color: white;"
        >← Kembali</a
      >
    </div>
  </article>
</section>
```

```html title="views/pages/create-post.ejs" wrap
<section class="container">
  <div class="form-card">
    <h2 style="margin-bottom: 30px;">✍️ Buat Post Baru</h2>

    <% if (errors && Object.keys(errors).length > 0) { %>
      <div class="alert alert-error">
        <strong>⚠️ Terdapat kesalahan:</strong>
        <ul style="margin: 10px 0 0 20px;">
          <% Object.values(errors).forEach(error => { %>
            <li><%= error %></li>
          <% }) %>
        </ul>
      </div>
    <% } %>

    <form action="/create" method="POST">
      <div class="form-group">
        <label for="title">Judul Post *</label>
        <input
          type="text"
          id="title"
          name="title"
          class="form-control"
          value="<%= formData ? formData.title : '' %>"
          placeholder="Masukkan judul yang menarik..."
        >
        <% if (errors && errors.title) { %>
          <span class="error-message"><%= errors.title %></span>
        <% } %>
      </div>

      <div class="form-group">
        <label for="author">Nama Penulis *</label>
        <input
          type="text"
          id="author"
          name="author"
          class="form-control"
          value="<%= formData ? formData.author : '' %>"
          placeholder="Nama Anda..."
        >
        <% if (errors && errors.author) { %>
          <span class="error-message"><%= errors.author %></span>
        <% } %>
      </div>

      <div class="form-group">
        <label for="category">Kategori *</label>
        <select id="category" name="category" class="form-control">
          <option value="">Pilih kategori...</option>
          <option value="Technology" <%= formData && formData.category === 'Technology' ? 'selected' : '' %>>
            Technology
          </option>
          <option value="Database" <%= formData && formData.category === 'Database' ? 'selected' : '' %>>
            Database
          </option>
          <option value="Security" <%= formData && formData.category === 'Security' ? 'selected' : '' %>>
            Security
          </option>
          <option value="Tutorial" <%= formData && formData.category === 'Tutorial' ? 'selected' : '' %>>
            Tutorial
          </option>
          <option value="News" <%= formData && formData.category === 'News' ? 'selected' : '' %>>
            News
          </option>
        </select>
        <% if (errors && errors.category) { %>
          <span class="error-message"><%= errors.category %></span>
        <% } %>
      </div>

      <div class="form-group">
        <label for="content">Konten Post *</label>
        <textarea
          id="content"
          name="content"
          class="form-control"
          placeholder="Tulis konten artikel Anda di sini... (minimal 50 karakter)"
        ><%= formData ? formData.content : '' %></textarea>
        <% if (errors && errors.content) { %>
          <span class="error-message"><%= errors.content %></span>
        <% } %>
      </div>

      <div style="display: flex; gap: 10px;">
        <button type="submit" class="btn btn-success">✅ Publikasikan</button>
        <a href="/" class="btn" style="background: #95a5a6; color: white;">Batal</a>
      </div>
    </form>
  </div>
</section>
```

```html title="views/pages/edit-post.ejs" wrap
<section class="container">
  <div class="form-card">
    <h2 style="margin-bottom: 30px;">✏️ Edit Post</h2>

    <% if (errors && Object.keys(errors).length > 0) { %>
      <div class="alert alert-error">
        <strong>⚠️ Terdapat kesalahan:</strong>
        <ul style="margin: 10px 0 0 20px;">
          <% Object.values(errors).forEach(error => { %>
            <li><%= error %></li>
          <% }) %>
        </ul>
      </div>
    <% } %>

    <form action="/edit/<%= post.id %>" method="POST">
      <div class="form-group">
        <label for="title">Judul Post *</label>
        <input
          type="text"
          id="title"
          name="title"
          class="form-control"
          value="<%= post.title %>"
        >
        <% if (errors && errors.title) { %>
          <span class="error-message"><%= errors.title %></span>
        <% } %>
      </div>

      <div class="form-group">
        <label for="author">Nama Penulis *</label>
        <input
          type="text"
          id="author"
          name="author"
          class="form-control"
          value="<%= post.author %>"
        >
        <% if (errors && errors.author) { %>
          <span class="error-message"><%= errors.author %></span>
        <% } %>
      </div>

      <div class="form-group">
        <label for="category">Kategori *</label>
        <select id="category" name="category" class="form-control">
          <option value="">Pilih kategori...</option>
          <option value="Technology" <%= post.category === 'Technology' ? 'selected' : '' %>>Technology</option>
          <option value="Database" <%= post.category === 'Database' ? 'selected' : '' %>>Database</option>
          <option value="Security" <%= post.category === 'Security' ? 'selected' : '' %>>Security</option>
          <option value="Tutorial" <%= post.category === 'Tutorial' ? 'selected' : '' %>>Tutorial</option>
          <option value="News" <%= post.category === 'News' ? 'selected' : '' %>>News</option>
        </select>
        <% if (errors && errors.category) { %>
          <span class="error-message"><%= errors.category %></span>
        <% } %>
      </div>

      <div class="form-group">
        <label for="content">Konten Post *</label>
        <textarea
          id="content"
          name="content"
          class="form-control"
        ><%= post.content %></textarea>
        <% if (errors && errors.content) { %>
          <span class="error-message"><%= errors.content %></span>
        <% } %>
      </div>

      <div style="display: flex; gap: 10px;">
        <button type="submit" class="btn btn-success">💾 Simpan Perubahan</button>
        <a href="/post/<%= post.id %>" class="btn" style="background: #95a5a6; color: white;">Batal</a>
      </div>
    </form>
  </div>
</section>
```

```html title="views/pages/about.ejs" wrap
<section class="container">
  <div class="post-detail">
    <h1>📖 Tentang Blog Ini</h1>

    <div class="post-content">
      <p>
        Selamat datang di <strong><%= siteName %></strong>, sebuah platform blog
        sederhana yang dibangun sebagai bagian dari pembelajaran backend
        development dengan Express.js.
      </p>

      <h3>📊 Statistik</h3>
      <ul>
        <li>Total Post: <strong><%= totalPosts %></strong></li>
        <li>Kategori: <strong><%= categories.join(', ') %></strong></li>
        <li>Teknologi: <strong>Express.js, EJS, Node.js</strong></li>
      </ul>

      <h3>✨ Fitur</h3>
      <ul>
        <li>✅ Membuat, membaca, mengupdate, dan menghapus post (CRUD)</li>
        <li>✅ Pencarian artikel berdasarkan judul, konten, atau penulis</li>
        <li>✅ Filter berdasarkan kategori</li>
        <li>✅ Validasi form server-side</li>
        <li>✅ Responsive design</li>
        <li>✅ In-memory data storage</li>
      </ul>

      <h3>🎓 Apa yang Dipelajari?</h3>
      <p>Project ini mengintegrasikan konsep dari Sesi 1-12:</p>
      <ul>
        <li>Express.js server setup & routing</li>
        <li>Middleware (Morgan, body-parser, static files)</li>
        <li>EJS templating dengan layouts & partials</li>
        <li>Form handling & validation</li>
        <li>Environment variables dengan dotenv</li>
        <li>Nodemon untuk auto-reload development</li>
      </ul>

      <h3>🚀 Langkah Selanjutnya</h3>
      <p>Di sesi-sesi berikutnya, kita akan:</p>
      <ul>
        <li>
          Mengganti in-memory storage dengan
          <strong>PostgreSQL database</strong>
        </li>
        <li>
          Menambahkan sistem <strong>authentication & authorization</strong>
        </li>
        <li>Membuat <strong>RESTful API</strong> untuk frontend terpisah</li>
        <li>Deploy aplikasi ke production</li>
      </ul>

      <div style="margin-top: 30px;">
        <a href="/" class="btn btn-primary">← Kembali ke Beranda</a>
        <a href="/create" class="btn btn-success">✍️ Tulis Artikel</a>
      </div>
    </div>
  </div>
</section>
```

### Langkah 10: Testing Lengkap

Sekarang jalankan aplikasi dan test semua fitur:

```bash wrap
npm run dev
```

### Test Checklist

1. ✅ Akses `/` - Lihat daftar 3 post default
2. ✅ Gunakan search bar untuk mencari "Express"
3. ✅ Filter berdasarkan kategori "Technology"
4. ✅ Klik salah satu post untuk melihat detail
5. ✅ Klik tombol Edit, ubah judul, dan save
6. ✅ Akses `/create` dan buat post baru
7. ✅ Test validasi: submit form kosong, isi konten < 50 karakter
8. ✅ Delete post dengan confirmation
9. ✅ Akses `/about` untuk melihat halaman tentang

### Penutup Express & Fundamental Backend

**Selamat! 🎉**

Anda telah menyelesaikan Sesi 13 dan membuat aplikasi blog lengkap dengan CRUD
operations.

Ini adalah milestone besar karena Anda sudah mengintegrasikan 12 sesi
pembelajaran sebelumnya dalam satu project nyata.

**Catatan Penting:**

- Data saat ini disimpan di memory (array), jadi akan hilang saat server restart
- Di Sesi 21-35, kita akan migrate ke PostgreSQL untuk persistent storage
- Authentication akan ditambahkan di Sesi 36-45
