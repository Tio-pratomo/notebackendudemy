---
title: HTTP Client untuk Konsumsi API
---

Setelah membuat REST API, sekarang kita akan belajar cara mengkonsumsi API
tersebut dari aplikasi lain menggunakan Axios.

Axios adalah HTTP client library yang sangat populer untuk melakukan request ke
API.

## Materi: Pengetahuan & Konsep

### 1. Mengapa Perlu Axios?

Node.js memiliki module bawaan `http` dan `https` untuk membuat HTTP request,
tapi syntaxnya sangat kompleks dan memerlukan banyak kode boilerplate.

Axios menyederhanakan proses ini dengan API yang lebih intuitif dan fitur-fitur
modern.

Jika anda butuh axios yang lebih lanjut silahkan pergi ke :

https://info-js.vercel.app/axios/sesi1/

**Perbandingan Native HTTPS vs Axios**:

```javascript wrap
// Native HTTPS (kompleks)
const https = require("https");
const options = {
  hostname: "api.example.com",
  port: 443,
  path: "/data",
  method: "GET",
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log(JSON.parse(data));
  });
});
req.on("error", (error) => {
  console.error(error);
});
req.end(); // WAJIB dipanggil!

// Axios (simple)
import axios from "axios";
try {
  const response = await axios.get("https://api.example.com/data");
  console.log(response.data);
} catch (error) {
  console.error(error.message);
}
```

### 2. Keuntungan Axios

- ✅ Syntax yang clean dan mudah dibaca
- ✅ Automatic JSON parsing (tidak perlu `JSON.parse()` manual)
- ✅ Promise-based, mendukung async/await
- ✅ Automatic error handling
- ✅ Request/response interceptors
- ✅ Request cancellation support
- ✅ Timeout configuration
- ✅ Compatible dengan browser dan Node.js

### 3. Struktur Response Axios

```javascript wrap
{
  data: {},         // Response body dari server
  status: 200,      // HTTP status code
  statusText: 'OK', // HTTP status message
  headers: {},      // Response headers
  config: {},       // Request configuration
  request: {}       // Original request object
}
```

### 4. Pola Arsitektur: API Gateway

Kita akan membuat server kedua yang berfungsi sebagai "perantara" antara user
dan Blog API. Pola ini disebut **API Gateway** atau **Backend for Frontend
(BFF)**:

```
User → Frontend Server (EJS) → Blog API → Database
         (Port 3000)           (Port 4000)
```

Keuntungannya:

- Frontend tidak perlu tahu detail Blog API
- Bisa menggabungkan data dari multiple APIs
- Bisa menambahkan caching layer
- Bisa menambahkan authentication/authorization

---

## Praktik

### Langkah 1: Setup Frontend Server Project

Buat folder baru (pisah dari blog-api):

```bash wrap
mkdir blog-frontend
cd blog-frontend
npm init -y
npm install express axios ejs express-ejs-layouts morgan dotenv
npm install --save-dev nodemon
```

### Langkah 2: Update package.json

```json wrap
{
  "name": "blog-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
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

### Langkah 3: Buat File .env

```text
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:4000/api/v1
API_TIMEOUT=10000
```

### Langkah 4: Setup Struktur Folder

```
blog-frontend/
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
│       └── error.ejs
├── public/
│   └── css/
│       └── style.css
├── .env
├── index.js
└── package.json
```

### Langkah 5: Main Server dengan Axios (index.js)

```javascript wrap
import express from "express";
import axios from "axios";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL;

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
  res.locals.siteName = "Blog Frontend";
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// Create Axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: parseInt(process.env.API_TIMEOUT) || 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Axios Response Interceptor untuk logging
api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`
    );
    return response;
  },
  (error) => {
    console.error(
      `❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || "Network Error"}`
    );
    return Promise.reject(error);
  }
);

// Helper function untuk format tanggal
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ========== ROUTES ==========

// Home - Display all posts
app.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      search,
      category,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    // Make request to Blog API
    const response = await api.get("/posts", {
      params: {
        page,
        limit: 6,
        search,
        category,
        sort,
        order,
        published: true, // Only show published posts
      },
    });

    // Extract data from Axios response
    const { data: posts, pagination, meta } = response.data;

    res.render("pages/home", {
      pageTitle: "Beranda",
      posts: posts,
      pagination: pagination,
      searchQuery: search || "",
      categoryFilter: category || "",
      formatDate: formatDate,
      meta: meta,
    });
  } catch (error) {
    console.error("Error fetching posts:", error.message);

    res.render("pages/error", {
      pageTitle: "Error",
      error: {
        message: "Gagal mengambil data posts dari API",
        details: error.response?.data?.error || error.message,
      },
      layout: false,
    });
  }
});

// View single post
app.get("/post/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // GET request dengan path parameter
    const response = await api.get(`/posts/${postId}`);
    const post = response.data.data;

    res.render("pages/post-detail", {
      pageTitle: post.title,
      post: post,
      formatDate: formatDate,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).render("pages/error", {
        pageTitle: "Post Tidak Ditemukan",
        error: {
          message: "Post yang Anda cari tidak ditemukan",
          details: "Mungkin post telah dihapus atau ID tidak valid",
        },
        layout: false,
      });
    }

    res.render("pages/error", {
      pageTitle: "Error",
      error: {
        message: "Gagal mengambil detail post",
        details: error.message,
      },
      layout: false,
    });
  }
});

// GET - Create post form
app.get("/create", (req, res) => {
  res.render("pages/create-post", {
    pageTitle: "Buat Post Baru",
    errors: null,
    formData: null,
  });
});

// POST - Submit new post to API
app.post("/create", async (req, res) => {
  try {
    const { title, content, author, category, published } = req.body;

    // POST request dengan body data
    const response = await api.post("/posts", {
      title,
      content,
      author,
      category,
      published: published === "on", // Checkbox value
    });

    const newPost = response.data.data;

    // Redirect to the new post
    res.redirect(`/post/${newPost.id}`);
  } catch (error) {
    // Handle validation errors from API
    if (error.response?.status === 400) {
      return res.render("pages/create-post", {
        pageTitle: "Buat Post Baru",
        errors: error.response.data.errors || [error.response.data.error],
        formData: req.body,
      });
    }

    res.render("pages/error", {
      pageTitle: "Error",
      error: {
        message: "Gagal membuat post baru",
        details: error.message,
      },
      layout: false,
    });
  }
});

// POST - Delete post (via API)
app.post("/delete/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // DELETE request
    await api.delete(`/posts/${postId}`);

    res.redirect("/?deleted=true");
  } catch (error) {
    if (error.response?.status === 404) {
      return res.redirect("/?error=notfound");
    }

    res.render("pages/error", {
      pageTitle: "Error",
      error: {
        message: "Gagal menghapus post",
        details: error.message,
      },
      layout: false,
    });
  }
});

// POST - Update post (via API)
app.post("/update/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, content, author, category, published } = req.body;

    // PATCH request untuk partial update
    await api.patch(`/posts/${postId}`, {
      title,
      content,
      author,
      category,
      published: published === "on",
    });

    res.redirect(`/post/${postId}`);
  } catch (error) {
    res.render("pages/error", {
      pageTitle: "Error",
      error: {
        message: "Gagal mengupdate post",
        details: error.message,
      },
      layout: false,
    });
  }
});

// Statistics page
app.get("/stats", async (req, res) => {
  try {
    const response = await api.get("/stats");
    const stats = response.data.data;

    res.render("pages/stats", {
      pageTitle: "Statistik",
      stats: stats,
    });
  } catch (error) {
    res.render("pages/error", {
      pageTitle: "Error",
      error: {
        message: "Gagal mengambil statistik",
        details: error.message,
      },
      layout: false,
    });
  }
});

// Health check - Test connection to API
app.get("/health", async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE_URL.replace("/api/v1", "")}/`);

    res.json({
      frontend: "OK",
      api: "OK",
      apiResponse: response.data,
    });
  } catch (error) {
    res.status(500).json({
      frontend: "OK",
      api: "ERROR",
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("pages/error", {
    pageTitle: "Halaman Tidak Ditemukan",
    error: {
      message: "404 - Halaman tidak ditemukan",
      details: `Path: ${req.path}`,
    },
    layout: false,
  });
});

// Start server
app.listen(port, () => {
  console.log("=".repeat(70));
  console.log(`🌐 Blog Frontend Server`);
  console.log(`📡 Frontend: http://localhost:${port}`);
  console.log(`🔗 API Backend: ${API_BASE_URL}`);
  console.log(`⏰ Started: ${new Date().toLocaleString("id-ID")}`);
  console.log("=".repeat(70));
  console.log("\n⚠️  Pastikan Blog API berjalan di port 4000!");
  console.log("   cd ../blog-api && npm run dev\n");
});
```

### Langkah 6: EJS Templates

```html wrap title="views/layouts/main.ejs"
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

```html wrap title="views/partials/navbar.ejs"
<nav
  style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px 0;"
>
  <div
    style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center;"
  >
    <h1 style="margin: 0; font-size: 1.5rem;"><%= siteName %></h1>
    <ul
      style="list-style: none; display: flex; gap: 30px; margin: 0; padding: 0;"
    >
      <li>
        <a href="/" style="color: white; text-decoration: none;">Beranda</a>
      </li>
      <li>
        <a href="/create" style="color: white; text-decoration: none;"
          >✍️ Tulis</a
        >
      </li>
      <li>
        <a href="/stats" style="color: white; text-decoration: none;"
          >📊 Stats</a
        >
      </li>
    </ul>
  </div>
</nav>
```

```html wrap title="views/pages/home.ejs"
<section style="max-width: 1200px; margin: 40px auto; padding: 0 20px;">
  <h2>Daftar Artikel</h2>

  <!-- Search & Filter Form -->
  <form
    action="/"
    method="GET"
    style="margin: 30px 0; display: flex; gap: 10px;"
  >
    <input
      type="text"
      name="search"
      placeholder="Cari artikel..."
      value="<%= searchQuery %>"
      style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px;"
    />
    <button
      type="submit"
      style="padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;"
    >
      Cari
    </button>
  </form>

  <% if (searchQuery) { %>
  <p>
    Hasil pencarian untuk "<strong><%= searchQuery %></strong>" - <%=
    pagination.total %> artikel ditemukan
    <a href="/" style="color: #667eea; margin-left: 10px;">Clear</a>
  </p>
  <% } %>

  <!-- Posts Grid -->
  <div
    style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 30px; margin: 40px 0;"
  >
    <% if (posts.length === 0) { %>
    <p>Tidak ada artikel ditemukan.</p>
    <% } else { %> <% posts.forEach(post => { %>
    <article
      style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
    >
      <span
        style="background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;"
      >
        <%= post.category %>
      </span>

      <h3 style="margin: 15px 0;">
        <a
          href="/post/<%= post.id %>"
          style="color: #333; text-decoration: none;"
        >
          <%= post.title %>
        </a>
      </h3>

      <p style="color: #666; line-height: 1.8;">
        <%= post.content.substring(0, 120) %>...
      </p>

      <div
        style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #ddd; margin-top: 15px; font-size: 14px; color: #666;"
      >
        <span>👤 <%= post.author %></span>
        <span>📅 <%= formatDate(post.createdAt) %></span>
      </div>
    </article>
    <% }) %> <% } %>
  </div>

  <!-- Pagination -->
  <% if (pagination.totalPages > 1) { %>
  <div
    style="display: flex; justify-content: center; gap: 10px; margin: 40px 0;"
  >
    <% if (pagination.hasPrev) { %>
    <a
      href="?page=<%= pagination.page - 1 %><%= searchQuery ? '&search=' + searchQuery : '' %>"
      style="padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;"
    >
      ← Previous
    </a>
    <% } %>

    <span style="padding: 10px 20px; background: #f0f0f0; border-radius: 6px;">
      Page <%= pagination.page %> of <%= pagination.totalPages %>
    </span>

    <% if (pagination.hasNext) { %>
    <a
      href="?page=<%= pagination.page + 1 %><%= searchQuery ? '&search=' + searchQuery : '' %>"
      style="padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;"
    >
      Next →
    </a>
    <% } %>
  </div>
  <% } %>
</section>
```

```html wrap title="views/pages/post-detail.ejs"
<section style="max-width: 900px; margin: 40px auto; padding: 0 20px;">
  <article
    style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
  >
    <span
      style="background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;"
    >
      <%= post.category %>
    </span>

    <h1 style="margin: 20px 0;"><%= post.title %></h1>

    <div
      style="display: flex; gap: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; margin-bottom: 30px; color: #666;"
    >
      <span>👤 <%= post.author %></span>
      <span>📅 <%= formatDate(post.createdAt) %></span>
      <span>👁️ <%= post.views %> views</span>
    </div>

    <div style="line-height: 1.8; font-size: 1.1rem;"><%= post.content %></div>

    <div
      style="display: flex; gap: 10px; margin-top: 30px; padding-top: 30px; border-top: 1px solid #ddd;"
    >
      <form
        action="/delete/<%= post.id %>"
        method="POST"
        onsubmit="return confirm('Yakin ingin menghapus post ini?')"
        style="display: inline;"
      >
        <button
          type="submit"
          style="padding: 12px 24px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer;"
        >
          🗑️ Hapus
        </button>
      </form>

      <a
        href="/"
        style="padding: 12px 24px; background: #95a5a6; color: white; text-decoration: none; border-radius: 8px; display: inline-block;"
      >
        ← Kembali
      </a>
    </div>
  </article>
</section>
```

```html title="views/pages/create-post.ejs" wrap
<section style="max-width: 800px; margin: 40px auto; padding: 0 20px;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <h2>✍️ Buat Post Baru</h2>

    <% if (errors && errors.length > 0) { %>
      <div style="background: #fee; border: 1px solid #fcc; color: #c33; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>⚠️ Error:</strong>
        <ul style="margin: 10px 0 0 20px;">
          <% errors.forEach(error => { %>
            <li><%= error %></li>
          <% }) %>
        </ul>
      </div>
    <% } %>

    <form action="/create" method="POST" style="margin-top: 30px;">
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Judul *</label>
        <input
          type="text"
          name="title"
          value="<%= formData ? formData.title : '' %>"
          style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
        >
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Penulis *</label>
        <input
          type="text"
          name="author"
          value="<%= formData ? formData.author : '' %>"
          style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
        >
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Kategori *</label>
        <select name="category" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
          <option value="">Pilih kategori...</option>
          <option value="Technology">Technology</option>
          <option value="Database">Database</option>
          <option value="Security">Security</option>
          <option value="Tutorial">Tutorial</option>
        </select>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">Konten * (minimal 50 karakter)</label>
        <textarea
          name="content"
          rows="10"
          style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; font-family: inherit;"
        ><%= formData ? formData.content : '' %></textarea>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" name="published" <%= formData && formData.published ? 'checked' : '' %>>
          <span>Publikasikan langsung</span>
        </label>
      </div>

      <div style="display: flex; gap: 10px;">
        <button type="submit" style="padding: 12px 24px; background: #2ecc71; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          ✅ Buat Post
        </button>
        <a href="/" style="padding: 12px 24px; background: #95a5a6; color: white; text-decoration: none; border-radius: 8px; display: inline-block;">
          Batal
        </a>
      </div>
    </form>
  </div>
</section>
```

```html title="views/pages/error.ejs" wrap
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= pageTitle %></title>
  </head>
  <body
    style="font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa; margin: 0;"
  >
    <div
      style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 600px; text-align: center;"
    >
      <h1 style="color: #e74c3c; margin-bottom: 20px;">
        ⚠️ <%= error.message %>
      </h1>
      <p style="color: #666; margin-bottom: 30px;"><%= error.details %></p>
      <a
        href="/"
        style="padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; display: inline-block;"
      >
        ← Kembali ke Beranda
      </a>
    </div>
  </body>
</html>
```

### Langkah 7: Testing End-to-End

1. **Jalankan Blog API (Terminal 1):**

```bash
cd blog-api
npm run dev
```

2. **Jalankan Frontend Server (Terminal 2):**

```bash
cd blog-frontend
npm run dev
```

3. **Test Flow:**
   - Akses http://localhost:3000 - Lihat posts dari API
   - Gunakan search bar
   - Klik salah satu post untuk detail
   - Buat post baru via form
   - Hapus post
   - Lihat console kedua server untuk melihat komunikasi

4. **Test Health Check:**

```
GET http://localhost:3000/health
```

---

### Key Concepts yang Dipelajari:

1. ✅ **Axios Instance dengan baseURL**: Tidak perlu tulis URL lengkap setiap
   request
2. ✅ **Interceptors**: Logging otomatis untuk setiap request/response
3. ✅ **Error Handling**: Membedakan 404, 400, 500
4. ✅ **Server-to-Server**: Frontend server berkomunikasi dengan API server
5. ✅ **async/await pattern**: Syntax modern untuk asynchronous code
6. ✅ **Query Parameters**: Passing filter, search, pagination ke API

**Selamat!** Anda sekarang bisa mengkonsumsi REST API dari aplikasi Node.js
lain. Pola ini sangat umum di arsitektur microservices modern.

Selanjutnya, kita akan belajar membuat Joke API seperti yang ada di file sumber
untuk mempersiapkan transisi ke PostgreSQL nanti.
