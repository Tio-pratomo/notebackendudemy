---
title: Query Parameters, Filtering & Pagination
---

Setelah memahami dasar REST API, sekarang kita akan belajar pola-pola lanjutan
yang digunakan oleh API profesional seperti GitHub, Stripe, atau Twitter API.

## Materi: Pengetahuan & Konsep

### 1. Query Parameters untuk Filtering

Dalam aplikasi nyata, client sering butuh data spesifik, bukan seluruh database.
Query parameters memungkinkan client untuk memfilter data:

```
GET /api/posts?published=true
GET /api/posts?author=Budi
GET /api/posts?category=Technology&published=true
```

### 2. Sorting (Pengurutan)

Client bisa menentukan urutan data yang dikembalikan:

```
GET /api/posts?sort=createdAt&order=desc   # Terbaru dulu
GET /api/posts?sort=title&order=asc        # A-Z
```

### 3. Pagination (Halaman)

Ketika data sangat banyak (ribuan atau jutaan), kita tidak bisa mengirim semua
data sekaligus karena:

- Response terlalu besar dan lambat
- Bandwidth terbuang
- Client kewalahan memproses data

Solusinya adalah pagination:

```
GET /api/posts?page=1&limit=10    # 10 data pertama
GET /api/posts?page=2&limit=10    # 10 data berikutnya
```

### 4. Searching (Pencarian)

Memungkinkan client mencari data berdasarkan keyword:

```
GET /api/posts?search=express
```

### 5. Field Selection (Sparse Fieldsets)

Client bisa meminta hanya field tertentu untuk menghemat bandwidth:

```
GET /api/posts?fields=id,title,author
```

### 6. Standard Response Format

API profesional menggunakan format response yang konsisten:

```json wrap
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-02-02T18:10:00Z",
    "version": "v1"
  }
}
```

### 7. API Versioning

Ketika API Anda berkembang, Anda perlu membuat versi baru tanpa merusak client
lama:

```
/api/v1/posts    # Version 1
/api/v2/posts    # Version 2 (dengan breaking changes)
```

---

## Praktik

Kita akan upgrade Blog API dari Sesi sebelumya dengan semua fitur advanced ini.

### Langkah 1: Update Server dengan Advanced Features

```javascript wrap
import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const apiVersion = process.env.API_VERSION || "v1";

// Middleware
app.use(morgan("dev"));
app.use(express.json());

// Extended sample data
let posts = [
  {
    id: 1,
    title: "Pengenalan REST API",
    content:
      "REST adalah arsitektur untuk membangun API yang scalable dan mudah dipahami.",
    author: "Budi Santoso",
    category: "Technology",
    published: true,
    views: 1250,
    createdAt: new Date("2026-01-15").toISOString(),
  },
  {
    id: 2,
    title: "HTTP Methods Deep Dive",
    content:
      "GET, POST, PUT, PATCH, dan DELETE adalah lima method utama dalam REST API.",
    author: "Ani Wijaya",
    category: "Technology",
    published: true,
    views: 980,
    createdAt: new Date("2026-01-20").toISOString(),
  },
  {
    id: 3,
    title: "PostgreSQL untuk Pemula",
    content: "Database relasional yang powerful dengan fitur advanced.",
    author: "Charlie Dev",
    category: "Database",
    published: false,
    views: 500,
    createdAt: new Date("2026-01-25").toISOString(),
  },
  {
    id: 4,
    title: "Authentication Best Practices",
    content: "Bcrypt dan OAuth 2.0 adalah standar industri di 2026.",
    author: "Diana Security",
    category: "Security",
    published: true,
    views: 2100,
    createdAt: new Date("2026-01-28").toISOString(),
  },
  {
    id: 5,
    title: "Node.js Performance Tips",
    content: "Optimasi aplikasi Node.js untuk production.",
    author: "Budi Santoso",
    category: "Technology",
    published: true,
    views: 1800,
    createdAt: new Date("2026-02-01").toISOString(),
  },
];

let postIdCounter = 6;

// ========== HELPER FUNCTIONS ==========

// Pagination helper
function paginate(array, page = 1, limit = 10) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {
    data: array.slice(startIndex, endIndex),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
      hasNext: endIndex < array.length,
      hasPrev: startIndex > 0,
    },
  };

  return results;
}

// Filter helper
function filterPosts(posts, filters) {
  let filtered = [...posts];

  // Filter by published status
  if (filters.published !== undefined) {
    const isPublished = filters.published === "true";
    filtered = filtered.filter((p) => p.published === isPublished);
  }

  // Filter by author
  if (filters.author) {
    filtered = filtered.filter((p) =>
      p.author.toLowerCase().includes(filters.author.toLowerCase())
    );
  }

  // Filter by category
  if (filters.category) {
    filtered = filtered.filter(
      (p) => p.category.toLowerCase() === filters.category.toLowerCase()
    );
  }

  // Search in title and content
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(searchTerm) ||
        p.content.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by minimum views
  if (filters.minViews) {
    filtered = filtered.filter((p) => p.views >= parseInt(filters.minViews));
  }

  return filtered;
}

// Sorting helper
function sortPosts(posts, sortBy = "createdAt", order = "desc") {
  const sorted = [...posts];

  sorted.sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];

    // Handle date strings
    if (sortBy === "createdAt") {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    }

    // Handle strings (case insensitive)
    if (typeof valueA === "string") {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }

    if (order === "asc") {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });

  return sorted;
}

// Field selection helper
function selectFields(posts, fields) {
  if (!fields) return posts;

  const fieldArray = fields.split(",").map((f) => f.trim());

  return posts.map((post) => {
    const selected = {};
    fieldArray.forEach((field) => {
      if (post.hasOwnProperty(field)) {
        selected[field] = post[field];
      }
    });
    return selected;
  });
}

// ========== ROUTES ==========

// API Root
app.get("/", (req, res) => {
  res.json({
    message: "Blog REST API",
    version: apiVersion,
    timestamp: new Date().toISOString(),
    documentation: `http://localhost:${port}/api/${apiVersion}/docs`,
  });
});

// GET all posts with advanced features
app.get(`/api/${apiVersion}/posts`, (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      published,
      author,
      category,
      search,
      minViews,
      fields,
    } = req.query;

    // Apply filters
    let filtered = filterPosts(posts, {
      published,
      author,
      category,
      search,
      minViews,
    });

    // Apply sorting
    filtered = sortPosts(filtered, sort, order);

    // Apply field selection
    filtered = selectFields(filtered, fields);

    // Apply pagination
    const paginated = paginate(filtered, page, limit);

    res.status(200).json({
      success: true,
      ...paginated,
      meta: {
        timestamp: new Date().toISOString(),
        version: apiVersion,
        filters: {
          published,
          author,
          category,
          search,
          minViews,
        },
        sort: { field: sort, order },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

// GET single post by ID
app.get(`/api/${apiVersion}/posts/:id`, (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: "Post tidak ditemukan",
    });
  }

  // Increment views
  post.views = (post.views || 0) + 1;

  res.status(200).json({
    success: true,
    data: post,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// POST - Create new post
app.post(`/api/${apiVersion}/posts`, (req, res) => {
  const { title, content, author, category, published } = req.body;

  // Validasi
  const errors = [];
  if (!title || title.trim() === "") errors.push("Title wajib diisi");
  if (!content || content.trim().length < 50)
    errors.push("Content minimal 50 karakter");
  if (!author || author.trim() === "") errors.push("Author wajib diisi");
  if (!category || category.trim() === "") errors.push("Category wajib diisi");

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors,
    });
  }

  const newPost = {
    id: postIdCounter++,
    title: title.trim(),
    content: content.trim(),
    author: author.trim(),
    category: category.trim(),
    published: published || false,
    views: 0,
    createdAt: new Date().toISOString(),
  };

  posts.push(newPost);

  res.status(201).json({
    success: true,
    message: "Post berhasil dibuat",
    data: newPost,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// PATCH - Update partial post
app.patch(`/api/${apiVersion}/posts/:id`, (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Post tidak ditemukan",
    });
  }

  const { title, content, author, category, published } = req.body;

  // Update only provided fields
  if (title !== undefined) posts[postIndex].title = title;
  if (content !== undefined) posts[postIndex].content = content;
  if (author !== undefined) posts[postIndex].author = author;
  if (category !== undefined) posts[postIndex].category = category;
  if (published !== undefined) posts[postIndex].published = published;

  posts[postIndex].updatedAt = new Date().toISOString();

  res.status(200).json({
    success: true,
    message: "Post berhasil di-update",
    data: posts[postIndex],
  });
});

// DELETE post
app.delete(`/api/${apiVersion}/posts/:id`, (req, res) => {
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

// GET Statistics
app.get(`/api/${apiVersion}/stats`, (req, res) => {
  const stats = {
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => p.published).length,
    draftPosts: posts.filter((p) => !p.published).length,
    categories: [...new Set(posts.map((p) => p.category))],
    authors: [...new Set(posts.map((p) => p.author))],
    totalViews: posts.reduce((sum, p) => sum + (p.views || 0), 0),
    averageViews: Math.round(
      posts.reduce((sum, p) => sum + (p.views || 0), 0) / posts.length
    ),
    mostViewedPost: posts.reduce(
      (max, p) => (p.views > max.views ? p : max),
      posts[0]
    ),
  };

  res.status(200).json({
    success: true,
    data: stats,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// API Documentation endpoint
app.get(`/api/${apiVersion}/docs`, (req, res) => {
  res.json({
    title: "Blog API Documentation",
    version: apiVersion,
    baseUrl: `http://localhost:${port}/api/${apiVersion}`,
    endpoints: [
      {
        method: "GET",
        path: "/posts",
        description: "Get all posts with filtering, sorting, and pagination",
        queryParams: {
          page: "Page number (default: 1)",
          limit: "Items per page (default: 10)",
          sort: "Sort field (createdAt, title, views, author)",
          order: "Sort order (asc, desc)",
          published: "Filter by published status (true, false)",
          author: "Filter by author name",
          category: "Filter by category",
          search: "Search in title and content",
          minViews: "Filter by minimum views",
          fields: "Select specific fields (comma-separated)",
        },
        example: "/posts?page=1&limit=5&sort=views&order=desc&published=true",
      },
      {
        method: "GET",
        path: "/posts/:id",
        description: "Get single post by ID",
      },
      {
        method: "POST",
        path: "/posts",
        description: "Create new post",
        body: {
          title: "string (required)",
          content: "string (required, min 50 chars)",
          author: "string (required)",
          category: "string (required)",
          published: "boolean (optional, default false)",
        },
      },
      {
        method: "PATCH",
        path: "/posts/:id",
        description: "Update post partially",
      },
      {
        method: "DELETE",
        path: "/posts/:id",
        description: "Delete post",
      },
      {
        method: "GET",
        path: "/stats",
        description: "Get API statistics",
      },
    ],
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint tidak ditemukan",
    path: req.path,
    suggestion: `Visit http://localhost:${port}/api/${apiVersion}/docs for documentation`,
  });
});

// Start server
app.listen(port, () => {
  console.log("=".repeat(70));
  console.log(`🚀 Blog REST API - Advanced Features`);
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`📚 Docs: http://localhost:${port}/api/${apiVersion}/docs`);
  console.log(`📊 Stats: http://localhost:${port}/api/${apiVersion}/stats`);
  console.log(`⏰ Started: ${new Date().toLocaleString("id-ID")}`);
  console.log("=".repeat(70));
});
```

### Langkah 2: Testing Advanced Features

Jalankan server dengan `npm run dev`, lalu test dengan Postman/Thunder Client:

**Test 1: Pagination**

```
GET http://localhost:4000/api/v1/posts?page=1&limit=2
```

**Test 2: Filtering by Published Status**

```
GET http://localhost:4000/api/v1/posts?published=true
```

**Test 3: Filtering by Category**

```
GET http://localhost:4000/api/v1/posts?category=Technology
```

**Test 4: Sorting**

```
GET http://localhost:4000/api/v1/posts?sort=views&order=desc
```

**Test 5: Search**

```
GET http://localhost:4000/api/v1/posts?search=PostgreSQL
```

**Test 6: Combined Filters**

```
GET http://localhost:4000/api/v1/posts?published=true&category=Technology&sort=views&order=desc&page=1&limit=3
```

**Test 7: Field Selection**

```
GET http://localhost:4000/api/v1/posts?fields=id,title,author
```

**Test 8: Minimum Views Filter**

```
GET http://localhost:4000/api/v1/posts?minViews=1000
```

**Test 9: Statistics**

```
GET http://localhost:4000/api/v1/stats
```

**Test 10: Documentation**

```
GET http://localhost:4000/api/v1/docs
```

---

**Best Practices yang Diterapkan:**

1. ✅ **Consistent Response Format**: Semua response punya struktur `success`,
   `data`, `meta`
2. ✅ **Proper HTTP Status Codes**: 200, 201, 400, 404, 500
3. ✅ **API Versioning**: `/api/v1/` untuk backward compatibility
4. ✅ **Pagination Metadata**: Client tahu ada berapa halaman
5. ✅ **Flexible Filtering**: Client bisa kombinasikan multiple filters
6. ✅ **Error Handling**: Error messages yang jelas dan helpful
7. ✅ **Self-Documenting**: Endpoint `/docs` untuk dokumentasi API

**Selamat!** API Anda sekarang setara dengan API profesional yang digunakan oleh
perusahaan tech besar.

Kita akan belajar cara mengkonsumsi API ini dari aplikasi frontend menggunakan
Axios.
