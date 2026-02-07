---
title: Express Router & Modular Structure
---

Setelah belajar Axios, sekarang kita akan belajar cara mengorganisir kode API
agar lebih scalable dan maintainable.

Kode kita di Sesi 1-2 sudah mulai panjang dan berantakan - saatnya refactor!

## Materi: Pengetahuan & Konsep

### 1. Masalah dengan Single File Approach

Di Sesi 1-2, semua routes ada di satu file `index.js`. Bayangkan jika aplikasi
punya 50+ endpoints:

- ❌ File jadi ratusan baris, sulit di-scroll
- ❌ Sulit menemukan route tertentu
- ❌ Merge conflict saat kolaborasi dengan tim
- ❌ Testing jadi rumit
- ❌ Tidak bisa reuse logic dengan mudah

### 2. Express Router - Solusi Modularitas

Express Router memungkinkan kita memecah routes ke file-file terpisah
berdasarkan resource atau fitur.

Setiap router bertindak seperti "mini aplikasi" dengan routes, middleware, dan
logic sendiri.

**Struktur Ideal:**

```
blog-api/
├── routes/
│   ├── posts.routes.js      # Semua routes terkait posts
│   ├── users.routes.js      # Semua routes terkait users
│   └── jokes.routes.js      # Semua routes terkait jokes
├── controllers/
│   ├── posts.controller.js  # Logic untuk posts
│   ├── users.controller.js  # Logic untuk users
│   └── jokes.controller.js  # Logic untuk jokes
├── middleware/
│   ├── validator.js         # Middleware validasi
│   └── errorHandler.js      # Error handling
├── utils/
│   └── helpers.js           # Helper functions
└── index.js                 # Entry point yang bersih
```

### 3. MVC Pattern Simplified

Kita akan mengadopsi pola MVC (Model-View-Controller) tanpa V (karena kita API,
bukan SSR):

- **Model**: Data structure (nanti akan jadi database schema)
- **Controller**: Business logic, memproses request
- **Router**: Mapping URL ke controller functions

### 4. Middleware Stack

Router bisa punya middleware khusus yang hanya berlaku untuk routes tertentu:

```javascript wrap
router.use(authMiddleware); // Semua routes di router ini butuh auth
router.get("/protected", controller.getProtected); // Route terproteksi
```

---

## Praktik

Kita akan refactor Blog API dari Sesi pertama dan menambahkan Jokes API sebagai
contoh kedua.

### Langkah 1: Restructure Project

Buat struktur folder baru di `blog-api`:

```bash wrap
cd blog-api
mkdir routes controllers middleware utils data
```

Struktur lengkap:

```
blog-api/
├── routes/
│   ├── posts.routes.js
│   ├── jokes.routes.js
│   └── index.js
├── controllers/
│   ├── posts.controller.js
│   └── jokes.controller.js
├── middleware/
│   ├── validator.js
│   └── errorHandler.js
├── utils/
│   └── helpers.js
├── data/
│   ├── posts.data.js
│   └── jokes.data.js
├── .env
├── index.js
└── package.json
```

### Langkah 2: Data Layer

```javascript wrap title="data/posts.data.js"
// In-memory database untuk posts
export let posts = [
  {
    id: 1,
    title: "Pengenalan REST API",
    content: "REST adalah arsitektur untuk membangun API yang scalable.",
    author: "Budi Santoso",
    category: "Technology",
    published: true,
    views: 1250,
    createdAt: new Date("2026-01-15").toISOString(),
  },
  {
    id: 2,
    title: "Express Router Deep Dive",
    content: "Modularitas adalah kunci untuk aplikasi yang scalable.",
    author: "Ani Wijaya",
    category: "Technology",
    published: true,
    views: 980,
    createdAt: new Date("2026-02-01").toISOString(),
  },
];

export let postIdCounter = 3;

// CRUD operations
export const getAllPosts = () => posts;

export const getPostById = (id) => {
  return posts.find((p) => p.id === parseInt(id));
};

export const createPost = (postData) => {
  const newPost = {
    id: postIdCounter++,
    ...postData,
    views: 0,
    createdAt: new Date().toISOString(),
  };
  posts.push(newPost);
  return newPost;
};

export const updatePost = (id, postData) => {
  const index = posts.findIndex((p) => p.id === parseInt(id));
  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    ...postData,
    updatedAt: new Date().toISOString(),
  };
  return posts[index];
};

export const deletePost = (id) => {
  const index = posts.findIndex((p) => p.id === parseInt(id));
  if (index === -1) return null;

  const deleted = posts[index];
  posts.splice(index, 1);
  return deleted;
};

export const incrementViews = (id) => {
  const post = getPostById(id);
  if (post) {
    post.views = (post.views || 0) + 1;
  }
  return post;
};
```

### Langkah 3: Data Layer untuk Jokes

```javascript wrap title="data/jokes.data.js"
// In-memory database untuk jokes
export let jokes = [
  {
    id: 1,
    type: "programming",
    setup: "Why do programmers prefer dark mode?",
    punchline: "Because light attracts bugs!",
    rating: 4.5,
    createdAt: new Date("2026-01-10").toISOString(),
  },
  {
    id: 2,
    type: "programming",
    setup: "How many programmers does it take to change a light bulb?",
    punchline: "None. It's a hardware problem!",
    rating: 4.2,
    createdAt: new Date("2026-01-15").toISOString(),
  },
  {
    id: 3,
    type: "general",
    setup: "Why did the developer go broke?",
    punchline: "Because he used up all his cache!",
    rating: 3.8,
    createdAt: new Date("2026-01-20").toISOString(),
  },
  {
    id: 4,
    type: "database",
    setup: "A SQL query walks into a bar, walks up to two tables and asks...",
    punchline: "Can I join you?",
    rating: 4.7,
    createdAt: new Date("2026-01-25").toISOString(),
  },
];

export let jokeIdCounter = 5;

// CRUD operations
export const getAllJokes = () => jokes;

export const getJokeById = (id) => {
  return jokes.find((j) => j.id === parseInt(id));
};

export const getRandomJoke = () => {
  return jokes[Math.floor(Math.random() * jokes.length)];
};

export const createJoke = (jokeData) => {
  const newJoke = {
    id: jokeIdCounter++,
    ...jokeData,
    rating: 0,
    createdAt: new Date().toISOString(),
  };
  jokes.push(newJoke);
  return newJoke;
};

export const updateJoke = (id, jokeData) => {
  const index = jokes.findIndex((j) => j.id === parseInt(id));
  if (index === -1) return null;

  jokes[index] = {
    ...jokes[index],
    ...jokeData,
    updatedAt: new Date().toISOString(),
  };
  return jokes[index];
};

export const deleteJoke = (id) => {
  const index = jokes.findIndex((j) => j.id === parseInt(id));
  if (index === -1) return null;

  const deleted = jokes[index];
  jokes.splice(index, 1);
  return deleted;
};

export const rateJoke = (id, newRating) => {
  const joke = getJokeById(id);
  if (!joke) return null;

  // Simple average (in production, you'd store individual ratings)
  joke.rating = ((joke.rating || 0) + newRating) / 2;
  return joke;
};
```

### Langkah 4: Helper Functions

```javascript title="utils/helpers.js" wrap
// Pagination helper
export function paginate(array, page = 1, limit = 10) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  return {
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
}

// Filter helper
export function filterArray(array, filters, filterFn) {
  let filtered = [...array];

  Object.keys(filters).forEach((key) => {
    if (filters[key] !== undefined) {
      filtered = filterFn(filtered, key, filters[key]);
    }
  });

  return filtered;
}

// Sort helper
export function sortArray(array, sortBy = "createdAt", order = "desc") {
  const sorted = [...array];

  sorted.sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];

    if (sortBy.includes("At")) {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    }

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

// Response wrapper
export function successResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function errorResponse(message, statusCode = 400) {
  return {
    success: false,
    error: message,
    statusCode,
  };
}
```

### Langkah 5: Middleware

```javascript title="middleware/validator.js" wrap
// Validation middleware untuk posts
export function validatePost(req, res, next) {
  const { title, content, author, category } = req.body;
  const errors = [];

  if (!title || title.trim() === "") {
    errors.push("Title wajib diisi");
  }

  if (!content || content.trim().length < 50) {
    errors.push("Content minimal 50 karakter");
  }

  if (!author || author.trim() === "") {
    errors.push("Author wajib diisi");
  }

  if (!category || category.trim() === "") {
    errors.push("Category wajib diisi");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors,
    });
  }

  next();
}

// Validation middleware untuk jokes
export function validateJoke(req, res, next) {
  const { type, setup, punchline } = req.body;
  const errors = [];

  if (!type || !["programming", "general", "database"].includes(type)) {
    errors.push("Type harus salah satu dari: programming, general, database");
  }

  if (!setup || setup.trim() === "") {
    errors.push("Setup wajib diisi");
  }

  if (!punchline || punchline.trim() === "") {
    errors.push("Punchline wajib diisi");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors,
    });
  }

  next();
}

// Validation middleware untuk rating
export function validateRating(req, res, next) {
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: "Rating harus antara 1-5",
    });
  }

  next();
}
```

### Langkah 6: Error Handler Middleware

```javascript title="middleware/errorHandler.js" wrap
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: "Endpoint tidak ditemukan",
    path: req.path,
    method: req.method,
  });
}

export function globalErrorHandler(err, req, res, next) {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
```

### Langkah 7: Posts Controller

```javascript title="controllers/posts.controller.js" wrap
import * as PostData from "../data/posts.data.js";
import { paginate, sortArray, successResponse } from "../utils/helpers.js";

// GET all posts
export async function getAllPosts(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      published,
      category,
      search,
    } = req.query;

    let posts = PostData.getAllPosts();

    // Apply filters
    if (published !== undefined) {
      posts = posts.filter((p) => p.published === (published === "true"));
    }

    if (category) {
      posts = posts.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm) ||
          p.content.toLowerCase().includes(searchTerm)
      );
    }

    // Sort
    posts = sortArray(posts, sort, order);

    // Paginate
    const result = paginate(posts, page, limit);

    res.json({
      success: true,
      ...result,
      meta: {
        timestamp: new Date().toISOString(),
        filters: { published, category, search },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// GET single post
export async function getPostById(req, res) {
  try {
    const post = PostData.incrementViews(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post tidak ditemukan",
      });
    }

    res.json(successResponse(post));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// CREATE post
export async function createPost(req, res) {
  try {
    const newPost = PostData.createPost(req.body);
    res
      .status(201)
      .json(successResponse(newPost, { message: "Post berhasil dibuat" }));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// UPDATE post
export async function updatePost(req, res) {
  try {
    const updated = PostData.updatePost(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Post tidak ditemukan",
      });
    }

    res.json(successResponse(updated, { message: "Post berhasil diupdate" }));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// DELETE post
export async function deletePost(req, res) {
  try {
    const deleted = PostData.deletePost(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Post tidak ditemukan",
      });
    }

    res.json(successResponse(deleted, { message: "Post berhasil dihapus" }));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

### Langkah 8: Jokes Controller

```javascript title="controllers/jokes.controller.js" wrap
import * as JokeData from "../data/jokes.data.js";
import { paginate, sortArray, successResponse } from "../utils/helpers.js";

// GET all jokes
export async function getAllJokes(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    let jokes = JokeData.getAllJokes();

    // Filter by type
    if (type) {
      jokes = jokes.filter((j) => j.type === type);
    }

    // Sort
    jokes = sortArray(jokes, sort, order);

    // Paginate
    const result = paginate(jokes, page, limit);

    res.json({
      success: true,
      ...result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// GET random joke
export async function getRandomJoke(req, res) {
  try {
    const joke = JokeData.getRandomJoke();
    res.json(successResponse(joke));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// GET single joke
export async function getJokeById(req, res) {
  try {
    const joke = JokeData.getJokeById(req.params.id);

    if (!joke) {
      return res.status(404).json({
        success: false,
        error: "Joke tidak ditemukan",
      });
    }

    res.json(successResponse(joke));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// CREATE joke
export async function createJoke(req, res) {
  try {
    const newJoke = JokeData.createJoke(req.body);
    res
      .status(201)
      .json(successResponse(newJoke, { message: "Joke berhasil dibuat" }));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// RATE joke
export async function rateJoke(req, res) {
  try {
    const { rating } = req.body;
    const joke = JokeData.rateJoke(req.params.id, parseFloat(rating));

    if (!joke) {
      return res.status(404).json({
        success: false,
        error: "Joke tidak ditemukan",
      });
    }

    res.json(successResponse(joke, { message: "Rating berhasil ditambahkan" }));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// DELETE joke
export async function deleteJoke(req, res) {
  try {
    const deleted = JokeData.deleteJoke(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Joke tidak ditemukan",
      });
    }

    res.json(successResponse(deleted, { message: "Joke berhasil dihapus" }));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

### Langkah 9: Posts Routes

```javascript title="routes/posts.routes.js" wrap
import express from "express";
import * as PostsController from "../controllers/posts.controller.js";
import { validatePost } from "../middleware/validator.js";

const router = express.Router();

// GET /api/v1/posts
router.get("/", PostsController.getAllPosts);

// GET /api/v1/posts/:id
router.get("/:id", PostsController.getPostById);

// POST /api/v1/posts
router.post("/", validatePost, PostsController.createPost);

// PATCH /api/v1/posts/:id
router.patch("/:id", PostsController.updatePost);

// DELETE /api/v1/posts/:id
router.delete("/:id", PostsController.deletePost);

export default router;
```

### Langkah 10: Jokes Routes

```javascript title="routes/jokes.routes.js" wrap
import express from "express";
import * as JokesController from "../controllers/jokes.controller.js";
import { validateJoke, validateRating } from "../middleware/validator.js";

const router = express.Router();

// GET /api/v1/jokes
router.get("/", JokesController.getAllJokes);

// GET /api/v1/jokes/random
router.get("/random", JokesController.getRandomJoke);

// GET /api/v1/jokes/:id
router.get("/:id", JokesController.getJokeById);

// POST /api/v1/jokes
router.post("/", validateJoke, JokesController.createJoke);

// POST /api/v1/jokes/:id/rate
router.post("/:id/rate", validateRating, JokesController.rateJoke);

// DELETE /api/v1/jokes/:id
router.delete("/:id", JokesController.deleteJoke);

export default router;
```

### Langkah 11: Routes Index

```javascript title="routes/index.js" wrap
import express from "express";
import postsRoutes from "./posts.routes.js";
import jokesRoutes from "./jokes.routes.js";

const router = express.Router();

// Mount routes
router.use("/posts", postsRoutes);
router.use("/jokes", jokesRoutes);

// API root
router.get("/", (req, res) => {
  res.json({
    message: "Blog API - Modular Structure",
    version: "v1",
    endpoints: {
      posts: "/api/v1/posts",
      jokes: "/api/v1/jokes",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

### Langkah 12: Main Server File

```javascript title="index.js" wrap
import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";
import {
  notFoundHandler,
  globalErrorHandler,
} from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const apiVersion = process.env.API_VERSION || "v1";

// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Blog API - Modular Architecture",
    version: apiVersion,
    status: "running",
    timestamp: new Date().toISOString(),
    docs: `http://localhost:${port}/api/${apiVersion}`,
  });
});

// Mount API routes
app.use(`/api/${apiVersion}`, apiRoutes);

// Error handlers (harus di akhir)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
app.listen(port, () => {
  console.log("=".repeat(70));
  console.log(`🚀 Blog API - Modular Structure`);
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`📚 API: http://localhost:${port}/api/${apiVersion}`);
  console.log(`⏰ Started: ${new Date().toLocaleString("id-ID")}`);
  console.log("=".repeat(70));
  console.log("\n📋 Available Endpoints:");
  console.log(`  Posts:  /api/${apiVersion}/posts`);
  console.log(`  Jokes:  /api/${apiVersion}/jokes`);
  console.log(`  Random: /api/${apiVersion}/jokes/random`);
  console.log("=".repeat(70));
});
```

### Langkah 13: Testing

Jalankan server:

```bash
npm run dev
```

**Test Endpoints:**

**Posts (masih sama seperti Sesi pertama):**

```
GET  http://localhost:4000/api/v1/posts
GET  http://localhost:4000/api/v1/posts/1
POST http://localhost:4000/api/v1/posts
```

**Jokes (NEW!):**

```
GET http://localhost:4000/api/v1/jokes
GET http://localhost:4000/api/v1/jokes/random
GET http://localhost:4000/api/v1/jokes/1
POST http://localhost:4000/api/v1/jokes
Body:
{
  "type": "programming",
  "setup": "Why do Java developers wear glasses?",
  "punchline": "Because they don't C#!"
}

POST http://localhost:4000/api/v1/jokes/1/rate
Body:
{
  "rating": 4.5
}

DELETE http://localhost:4000/api/v1/jokes/1
```

---

**Keuntungan Modular Structure:**

1. ✅ **Separation of Concerns**: Setiap file punya tanggung jawab jelas
2. ✅ **Reusability**: Helper functions bisa dipakai di mana saja
3. ✅ **Testability**: Mudah test controller secara terpisah
4. ✅ **Scalability**: Tinggal tambah routes/controllers baru
5. ✅ **Collaboration**: Tim bisa kerja parallel tanpa conflict
6. ✅ **Maintainability**: Mudah cari dan fix bugs

**File Structure Summary:**

- `data/` → In-memory database (nanti diganti PostgreSQL)
- `controllers/` → Business logic
- `routes/` → URL mapping
- `middleware/` → Reusable middleware
- `utils/` → Helper functions
- `index.js` → Clean entry point

**Selamat!** Kode Anda sekarang production-ready dan siap untuk scaling. Di
**Sesi 5-7**, tentang RESTful API, kita akan explore lebih dalam tentang
middleware, CORS, dan rate limiting sebelum masuk ke PostgreSQL.
