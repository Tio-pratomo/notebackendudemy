---
title: Full CRUD Untuk Posts
---

Di **Sesi 6** kita akan melengkapi **full CRUD untuk posts** di Express dengan
PostgreSQL (pakai `pg`), termasuk update, delete, dan beberapa filter dasar.

## Materi: Pengetahuan & Konsep

### 1. UPDATE & DELETE dengan `RETURNING`

PostgreSQL mendukung klausa `RETURNING` pada `INSERT`, `UPDATE`, dan `DELETE`
untuk langsung mengembalikan row yang dimodifikasi.

Contoh pola umum:

```sql
UPDATE posts
SET title = $1, updated_at = NOW()
WHERE id = $2
RETURNING *;
```

sehingga di Node Anda langsung dapat data post yang sudah di-update tanpa query
kedua.

### 2. Parameterised queries di node-postgres

Selalu gunakan placeholder `$1, $2, ...` dan array parameter untuk mencegah SQL
injection, bukan string concatenation manual.

**`pg`** mengirim query text dan parameter terpisah ke server; PostgreSQL yang
akan mengganti param di sisi server dengan cara yang aman.

### 3. Konvensi REST API untuk update & delete

- **Update partial** biasanya pakai `PATCH /posts/:id`.
- **Delete** pakai `DELETE /posts/:id`.
- Jika resource tidak ditemukan untuk update/delete, kembalikan `404 Not Found`
  daripada `200 OK`.

---

## Praktik: Lengkapi CRUD `posts` (Repository + Controller + Routes)

Asumsi:

- Project `blog-api` sudah punya:
  - `db/pool.js` (dengan `query()`),
  - `posts` table di PostgreSQL (Sesi 3–4),
  - `repositories/posts.repository.js` dengan `getAllPosts`, `getPostById`,
    `createPost`.

### 1. Tambah fungsi UPDATE & DELETE di `posts.repository.js`

Buka `repositories/posts.repository.js` dan tambahkan:

```javascript title="repositories/posts.repository.js" wrap
import { query } from "../db/pool.js";

// ... getAllPosts, getPostById, createPost (dari sesi sebelumnya)

// Update partial post
export async function updatePost(id, data) {
  const fields = [];
  const values = [];
  let index = 1;

  // Bangun SET clause dinamis berdasarkan field yang dikirim client
  if (data.title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(data.title);
  }
  if (data.content !== undefined) {
    fields.push(`content = $${index++}`);
    values.push(data.content);
  }
  if (data.category !== undefined) {
    fields.push(`category = $${index++}`);
    values.push(data.category);
  }
  if (data.published !== undefined) {
    fields.push(`published = $${index++}`);
    values.push(data.published);
  }

  if (fields.length === 0) {
    return null; // tidak ada yang diupdate
  }

  // updated_at selalu di-set
  fields.push(`updated_at = NOW()`);

  const sql = `
    UPDATE posts
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING
      id,
      user_id,
      title,
      content,
      category,
      published,
      created_at,
      updated_at
  `;

  values.push(id);

  const result = await query(sql, values);
  return result.rows[0] || null;
}

// Delete post
export async function deletePost(id) {
  const sql = `
    DELETE FROM posts
    WHERE id = $1
    RETURNING id
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}
```

- `UPDATE ... RETURNING` mengembalikan row yang baru di-update, sehingga kita
  tahu apakah id tersebut ada atau tidak.
- `DELETE ... RETURNING` mengembalikan row yang dihapus (minimal kolom `id`)
  sebagai indikasi keberhasilan.

Tambahkan juga fungsi filter sederhana (opsional tapi berguna):

```javascript
// Filter posts dengan query: author_id, category, published
export async function getFilteredPosts({ authorId, category, published }) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (authorId !== undefined) {
    conditions.push(`p.user_id = $${index++}`);
    values.push(authorId);
  }
  if (category !== undefined) {
    conditions.push(`p.category = $${index++}`);
    values.push(category);
  }
  if (published !== undefined) {
    conditions.push(`p.published = $${index++}`);
    values.push(published === "true" || published === true);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      p.id,
      p.title,
      p.category,
      p.published,
      p.created_at,
      u.id AS author_id,
      u.name AS author_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC
  `;

  const result = await query(sql, values);
  return result.rows;
}
```

### 2. Buat controller untuk full CRUD posts

Buat file baru `controllers/posts.sql.controller.js` (kalau belum ada):

```javascript title="controllers/posts.sql.controller.js" wrap
import * as PostsRepo from "../repositories/posts.repository.js";

// GET /api/v1/sql/posts
export async function getPosts(req, res) {
  try {
    const { authorId, category, published } = req.query;

    let posts;
    if (authorId || category || published !== undefined) {
      posts = await PostsRepo.getFilteredPosts({
        authorId,
        category,
        published,
      });
    } else {
      posts = await PostsRepo.getAllPosts();
    }

    res.json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error("getPosts error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch posts",
    });
  }
}

// GET /api/v1/sql/posts/:id
export async function getPost(req, res) {
  try {
    const post = await PostsRepo.getPostById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("getPost error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch post",
    });
  }
}

// POST /api/v1/sql/posts
export async function createPost(req, res) {
  try {
    const { user_id, title, content, category, published } = req.body;

    const errors = [];
    if (!user_id) errors.push("user_id is required");
    if (!title || title.trim().length < 5) {
      errors.push("title is required and must be at least 5 characters");
    }
    if (!content || content.trim().length < 20) {
      errors.push("content is required and must be at least 20 characters");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const newPost = await PostsRepo.createPost({
      user_id,
      title: title.trim(),
      content: content.trim(),
      category,
      published,
    });

    res.status(201).json({
      success: true,
      data: newPost,
    });
  } catch (error) {
    console.error("createPost error:", error);

    if (error.code === "23503") {
      // foreign_key_violation: user_id tidak ada di users.[web:178]
      return res.status(400).json({
        success: false,
        error: "Invalid user_id (user does not exist)",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create post",
    });
  }
}

// PATCH /api/v1/sql/posts/:id
export async function updatePost(req, res) {
  try {
    const updated = await PostsRepo.updatePost(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Post not found or no fields to update",
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("updatePost error:", error);

    if (error.code === "23514") {
      // check_violation: misalnya melanggar CHECK title min length atau category valid.[web:178][web:172][web:175]
      return res.status(400).json({
        success: false,
        error: "Post data violates database constraints",
        details: error.detail,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update post",
    });
  }
}

// DELETE /api/v1/sql/posts/:id
export async function deletePost(req, res) {
  try {
    const deleted = await PostsRepo.deletePost(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    res.json({
      success: true,
      message: "Post deleted",
      deletedId: deleted.id,
    });
  } catch (error) {
    console.error("deletePost error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete post",
    });
  }
}
```

### 3. Tambah routes untuk SQL posts

Buat file `routes/posts.sql.routes.js`:

```javascript
// routes/posts.sql.routes.js
import express from "express";
import * as PostsSqlController from "../controllers/posts.sql.controller.js";

const router = express.Router();

router.get("/", PostsSqlController.getPosts);
router.get("/:id", PostsSqlController.getPost);
router.post("/", PostsSqlController.createPost);
router.patch("/:id", PostsSqlController.updatePost);
router.delete("/:id", PostsSqlController.deletePost);

export default router;
```

Kemudian di `routes/index.js` daftarkan:

```javascript
import postsSqlRoutes from "./posts.sql.routes.js";

// ...

router.use("/sql/posts", postsSqlRoutes);
```

Sehingga base URL-nya:

- `GET    /api/v1/sql/posts`
- `GET    /api/v1/sql/posts/:id`
- `POST   /api/v1/sql/posts`
- `PATCH  /api/v1/sql/posts/:id`
- `DELETE /api/v1/sql/posts/:id`

### 4. Contoh request untuk testing

Gunakan Postman/Thunder Client:

1. **List posts (all / filtered)**

```text
GET http://localhost:4000/api/v1/sql/posts
GET http://localhost:4000/api/v1/sql/posts?authorId=1
GET http://localhost:4000/api/v1/sql/posts?category=Database
GET http://localhost:4000/api/v1/sql/posts?published=true
```

2. **Detail post**

```text
GET http://localhost:4000/api/v1/sql/posts/1
```

3. **Create post**

Body JSON:

```json
{
  "user_id": 1,
  "title": "Belajar Integrasi Express dengan PostgreSQL",
  "content": "Di artikel ini kita membahas bagaimana menghubungkan aplikasi Express ke database PostgreSQL menggunakan node-postgres.",
  "category": "Database",
  "published": true
}
```

4. **Update sebagian (PATCH)**

```text
PATCH http://localhost:4000/api/v1/sql/posts/1
```

Body:

```json
{
  "title": "Judul Baru untuk Post 1",
  "published": false
}
```

5. **Delete**

```text
DELETE http://localhost:4000/api/v1/sql/posts/1
```

Kalau `id` tidak ada, Anda akan dapat `404`.

---

Dengan Sesi 6, sekarang Anda:

- Punya **full CRUD API** untuk `posts` yang benar-benar terhubung ke
  PostgreSQL.
- Menggunakan `UPDATE ... RETURNING` dan `DELETE ... RETURNING` dengan
  parameterized queries sesuai best practice node-postgres.
- Sudah mulai memanfaatkan error code PostgreSQL (`23503`, `23505`, `23514`)
  untuk mengembalikan HTTP status yang lebih bermakna.

Di sesi berikutnya, kita bisa mulai:

- Menambahkan endpoints terkait **tags** (many-to-many).
- Membuat **endpoint “Get post detail lengkap”** yang sekaligus memuat author,
  tags, dll dengan JOIN.
