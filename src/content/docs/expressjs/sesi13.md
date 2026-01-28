---
title: Mini Project - Personal Blog Application
---

Selamat! Anda telah menyelesaikan 12 sesi dasar Express.js. Sekarang saatnya
mengintegrasikan semua yang telah dipelajari dalam satu project nyata. Ini baru
part 1, part dua diselesaikan di sesi selanjutnya!

## Materi: Pengetahuan & Konsep

### 1. Tujuan Project

Kita akan membuat aplikasi blog sederhana yang menggunakan:

- Express server dengan routing dinamis
- EJS templating dengan layouts dan partials
- Form handling untuk membuat/edit post
- Static files (CSS, images)
- Environment variables untuk konfigurasi
- Middleware untuk logging dan validasi
- In-memory data storage (array)

### 2. Fitur yang Akan Dibangun

- ✅ Halaman home dengan daftar blog posts
- ✅ Halaman detail post
- ✅ Form untuk membuat post baru
- ✅ Form untuk edit post
- ✅ Delete post dengan confirmation
- ✅ Search/filter posts
- ✅ Responsive design

### 3. Struktur Data Post

**Setiap blog post akan memiliki:**

```javascript wrap
{
  id: 1,
  title: "Judul Post",
  author: "Nama Penulis",
  content: "Isi konten...",
  category: "Technology",
  createdAt: "2026-01-28T10:00:00Z",
  updatedAt: "2026-01-28T10:00:00Z"
}
```

---

## Praktik

### Langkah 1: Setup Project Structure

```
blog-app/
├── public/
│   ├── css/
│   │   └── style.css
│   └── images/
│       └── blog-hero.jpg
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── partials/
│   │   ├── head.ejs
│   │   ├── navbar.ejs
│   │   └── footer.ejs
│   └── pages/
│       ├── home.ejs
│       ├── post-detail.ejs
│       ├── create-post.ejs
│       ├── edit-post.ejs
│       └── about.ejs
├── .env
├── .gitignore
├── index.js
└── package.json
```

### Langkah 2: Install Dependencies

```bash wrap
npm init -y
npm install express ejs express-ejs-layouts morgan dotenv
npm install --save-dev nodemon
```

### Langkah 3: Update package.json

```json wrap
{
  "name": "blog-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "dotenv": "^16.4.0",
    "ejs": "^3.1.9",
    "express": "^4.18.2",
    "express-ejs-layouts": "^2.5.1",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Langkah 4: Buat File .env

```env wrap
PORT=3000
NODE_ENV=development
APP_NAME=Personal Blog
APP_VERSION=1.0.0
```

### Langkah 5: Main Server

```javascript wrap title="index.js"
import express from "express";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || "development";

// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// EJS Configuration
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Global variables
app.use((req, res, next) => {
  res.locals.siteName = process.env.APP_NAME;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// ========== IN-MEMORY DATA STORAGE ==========
let posts = [
  {
    id: 1,
    title: "Memulai Belajar Express.js di 2026",
    author: "Budi Santoso",
    content:
      "Express.js adalah framework web minimalis untuk Node.js yang sangat powerful. Di tahun 2026, Express masih menjadi pilihan utama untuk backend development karena fleksibilitas dan ekosistem yang matang. Dalam artikel ini, kita akan membahas dasar-dasar Express.js dan mengapa Anda harus mempelajarinya.",
    category: "Technology",
    createdAt: new Date("2026-01-15").toISOString(),
    updatedAt: new Date("2026-01-15").toISOString(),
  },
  {
    id: 2,
    title: "PostgreSQL vs MySQL: Mana yang Lebih Baik?",
    author: "Ani Wijaya",
    content:
      "Database relasional masih menjadi tulang punggung banyak aplikasi modern. PostgreSQL dan MySQL adalah dua pilihan paling populer. PostgreSQL dikenal dengan fitur advanced-nya dan kepatuhan terhadap standar SQL, sementara MySQL terkenal dengan performanya yang cepat untuk read-heavy workloads.",
    category: "Database",
    createdAt: new Date("2026-01-20").toISOString(),
    updatedAt: new Date("2026-01-20").toISOString(),
  },
  {
    id: 3,
    title: "Best Practices Authentication di 2026",
    author: "Charlie Dev",
    content:
      "Keamanan aplikasi web dimulai dari authentication yang kuat. Di tahun 2026, kita tidak lagi menyimpan password dalam plaintext atau bahkan MD5. Bcrypt dan Argon2 adalah standar industri untuk hashing password. OAuth 2.0 dan OpenID Connect juga semakin populer untuk delegated authentication.",
    category: "Security",
    createdAt: new Date("2026-01-25").toISOString(),
    updatedAt: new Date("2026-01-25").toISOString(),
  },
];

let postIdCounter = 4;

// Helper function untuk format tanggal
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ========== ROUTES ==========

// Home - Daftar semua posts
app.get("/", (req, res) => {
  const searchQuery = req.query.search || "";
  const categoryFilter = req.query.category || "";

  let filteredPosts = posts;

  // Filter by search
  if (searchQuery) {
    filteredPosts = filteredPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Filter by category
  if (categoryFilter) {
    filteredPosts = filteredPosts.filter(
      (post) => post.category === categoryFilter
    );
  }

  // Sort by date (newest first)
  filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Get unique categories for filter dropdown
  const categories = [...new Set(posts.map((p) => p.category))];

  res.render("pages/home", {
    pageTitle: "Beranda",
    posts: filteredPosts,
    categories: categories,
    searchQuery: searchQuery,
    categoryFilter: categoryFilter,
    formatDate: formatDate,
  });
});

// About page
app.get("/about", (req, res) => {
  res.render("pages/about", {
    pageTitle: "Tentang Blog Ini",
    totalPosts: posts.length,
    categories: [...new Set(posts.map((p) => p.category))],
  });
});

// View single post
app.get("/post/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).render("pages/404", {
      pageTitle: "Post Tidak Ditemukan",
      layout: false,
    });
  }

  res.render("pages/post-detail", {
    pageTitle: post.title,
    post: post,
    formatDate: formatDate,
  });
});

// GET - Form create post
app.get("/create", (req, res) => {
  res.render("pages/create-post", {
    pageTitle: "Buat Post Baru",
    errors: null,
    formData: null,
  });
});

// POST - Create new post
app.post("/create", (req, res) => {
  const { title, author, content, category } = req.body;
  const errors = {};

  // Validasi
  if (!title || title.trim() === "") {
    errors.title = "Judul wajib diisi";
  }
  if (!author || author.trim() === "") {
    errors.author = "Nama penulis wajib diisi";
  }
  if (!content || content.trim().length < 50) {
    errors.content = "Konten minimal 50 karakter";
  }
  if (!category || category.trim() === "") {
    errors.category = "Kategori wajib dipilih";
  }

  if (Object.keys(errors).length > 0) {
    return res.render("pages/create-post", {
      pageTitle: "Buat Post Baru",
      errors: errors,
      formData: req.body,
    });
  }

  // Create new post
  const newPost = {
    id: postIdCounter++,
    title: title.trim(),
    author: author.trim(),
    content: content.trim(),
    category: category.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  posts.push(newPost);

  res.redirect(`/post/${newPost.id}`);
});

// GET - Form edit post
app.get("/edit/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).send("Post tidak ditemukan");
  }

  res.render("pages/edit-post", {
    pageTitle: `Edit: ${post.title}`,
    post: post,
    errors: null,
  });
});

// POST - Update post
app.post("/edit/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).send("Post tidak ditemukan");
  }

  const { title, author, content, category } = req.body;
  const errors = {};

  // Validasi (sama seperti create)
  if (!title || title.trim() === "") {
    errors.title = "Judul wajib diisi";
  }
  if (!author || author.trim() === "") {
    errors.author = "Nama penulis wajib diisi";
  }
  if (!content || content.trim().length < 50) {
    errors.content = "Konten minimal 50 karakter";
  }
  if (!category || category.trim() === "") {
    errors.category = "Kategori wajib dipilih";
  }

  if (Object.keys(errors).length > 0) {
    return res.render("pages/edit-post", {
      pageTitle: `Edit: ${posts[postIndex].title}`,
      post: posts[postIndex],
      errors: errors,
    });
  }

  // Update post
  posts[postIndex] = {
    ...posts[postIndex],
    title: title.trim(),
    author: author.trim(),
    content: content.trim(),
    category: category.trim(),
    updatedAt: new Date().toISOString(),
  };

  res.redirect(`/post/${postId}`);
});

// POST - Delete post
app.post("/delete/:id", (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).send("Post tidak ditemukan");
  }

  posts.splice(postIndex, 1);
  res.redirect("/?deleted=true");
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Halaman Tidak Ditemukan</h1>
    <p>Path: ${req.url}</p>
    <a href="/">← Kembali ke Home</a>
  `);
});

// Start server
app.listen(port, () => {
  console.log("=".repeat(60));
  console.log(`📝 ${process.env.APP_NAME} - v${process.env.APP_VERSION}`);
  console.log(`🚀 Server: http://localhost:${port}`);
  console.log(`📊 Total Posts: ${posts.length}`);
  console.log(`⏰ Started: ${new Date().toLocaleString("id-ID")}`);
  console.log("=".repeat(60));
});
```

### Langkah 6: CSS

```css wrap title="public/css/style.css"
:root {
  --primary: #667eea;
  --secondary: #764ba2;
  --text: #333;
  --light-bg: #f8f9fa;
  --border: #ddd;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--light-bg);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Navbar */
.navbar {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  padding: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.site-title {
  font-size: 1.8rem;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 30px;
  list-style: none;
}

.nav-links a {
  color: white;
  text-decoration: none;
  transition: opacity 0.3s;
}

.nav-links a:hover {
  opacity: 0.8;
}

/* Search bar */
.search-section {
  background: white;
  padding: 30px 0;
  border-bottom: 1px solid var(--border);
}

.search-form {
  display: flex;
  gap: 10px;
  max-width: 800px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
}

.search-select {
  padding: 12px 20px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--secondary);
}

.btn-success {
  background: #2ecc71;
  color: white;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

/* Posts grid */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
  margin: 40px 0;
}

.post-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.post-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.post-category {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  margin-bottom: 10px;
}

.post-title {
  color: var(--text);
  margin: 15px 0;
  font-size: 1.5rem;
}

.post-title a {
  color: inherit;
  text-decoration: none;
}

.post-title a:hover {
  color: var(--primary);
}

.post-excerpt {
  color: #666;
  line-height: 1.8;
  margin-bottom: 15px;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: #666;
}

/* Post detail */
.post-detail {
  background: white;
  border-radius: 12px;
  padding: 40px;
  margin: 40px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.post-detail .post-title {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.post-content {
  font-size: 1.1rem;
  line-height: 1.8;
  margin: 30px 0;
}

.post-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

/* Form styling */
.form-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 800px;
  margin: 40px auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: var(--text);
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
}

textarea.form-control {
  min-height: 200px;
  resize: vertical;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 5px;
}

.alert {
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.alert-error {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
}

/* Footer */
footer {
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 30px 0;
  margin-top: 60px;
}

/* Responsive */
@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }

  .search-form {
    flex-direction: column;
  }

  .post-detail {
    padding: 20px;
  }
}
```
