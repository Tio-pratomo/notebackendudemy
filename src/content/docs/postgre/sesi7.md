---
title: Tags API & Relasi Many-to-Many
---

## Materi: Pengetahuan & Konsep

### 1. Many-to-Many di level API

Di database, relasi **many-to-many** antara `posts` dan `tags` kita wujudkan
dengan tabel penghubung `post_tags` (sudah dibuat di Sesi 4).

Di level API, biasanya kita ingin respons yang sudah “dirapikan”, misalnya 1
post berisi array `tags: ["API","PostgreSQL"]`, bukan baris duplikat per tag.

### 2. JOIN dan agregasi tags per post

Untuk mendapatkan post beserta tags-nya dalam satu query SQL, kita:

- `JOIN posts` → `post_tags` → `tags` berdasarkan foreign key.
- Gunakan fungsi agregasi seperti `array_agg(t.name)` atau `json_agg(...)` dan
  `GROUP BY` per post, sehingga setiap post muncul sekali dengan array tags.

**Contoh pola (mirip yang akan kita pakai):**

```sql wrap
SELECT
  p.id,
  p.title,
  array_agg(t.name ORDER BY t.name) AS tags
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
GROUP BY p.id;
```

### 3. Operasi umum pada tags di API

Untuk blog sederhana, operasi yang dibutuhkan biasanya:

- List semua tags (`GET /tags`).
- Tambah tag baru (`POST /tags`).
- Tambah/ubah tags untuk sebuah post (misalnya `POST /posts/:id/tags`).
- Ambil detail post + tags (`GET /posts/:id` dengan join).

Di sesi ini kita akan fokus:

- Membuat repository & endpoint dasar untuk `tags`.
- Membuat endpoint untuk meng-assign tags ke sebuah post.
- Memperbarui `getPostById` agar mengembalikan post + tags.

---

## Praktik: Tags Repository, Controller, dan Endpoint Many-to-Many

**Asumsi:**

- Tabel `tags` dan `post_tags` sudah dibuat di Sesi 4.
- `blog-api` sudah punya struktur `db/`, `repositories/`, `controllers/`,
  `routes/`.

### 1. Repository untuk `tags` dan `post_tags`

Buat file `repositories/tags.repository.js`:

```javascript title="repositories/tags.repository.js" wrap
import { query } from "../db/pool.js";

// Ambil semua tags
export async function getAllTags() {
  const sql = `
    SELECT id, name, created_at
    FROM tags
    ORDER BY name ASC
  `;
  const result = await query(sql);
  return result.rows;
}

// Cari tag by name (untuk reuse)
export async function findTagByName(name) {
  const sql = `
    SELECT id, name, created_at
    FROM tags
    WHERE name = $1
  `;
  const result = await query(sql, [name]);
  return result.rows[0] || null;
}

// Buat tag baru
export async function createTag(name) {
  const sql = `
    INSERT INTO tags (name)
    VALUES ($1)
    RETURNING id, name, created_at
  `;
  const result = await query(sql, [name]);
  return result.rows[0];
}

// Assign satu tag ke post (tanpa duplikasi)
export async function addTagToPost(postId, tagId) {
  const sql = `
    INSERT INTO post_tags (post_id, tag_id)
    VALUES ($1, $2)
    ON CONFLICT (post_id, tag_id) DO NOTHING
    RETURNING post_id, tag_id
  `;
  const result = await query(sql, [postId, tagId]);
  return result.rows[0] || null;
}

// Hapus semua tags untuk 1 post (untuk replace penuh)
export async function removeAllTagsFromPost(postId) {
  const sql = `
    DELETE FROM post_tags
    WHERE post_id = $1
  `;
  await query(sql, [postId]);
}

// Ambil semua tags untuk 1 post
export async function getTagsByPostId(postId) {
  const sql = `
    SELECT t.id, t.name
    FROM tags t
    JOIN post_tags pt ON pt.tag_id = t.id
    WHERE pt.post_id = $1
    ORDER BY t.name ASC
  `;
  const result = await query(sql, [postId]);
  return result.rows;
}
```

`ON CONFLICT (post_id, tag_id) DO NOTHING` memanfaatkan primary key gabungan di
`post_tags` untuk mencegah duplikasi relasi.

### 2. Update `posts.repository` untuk ambil post + tags

Tambahkan satu fungsi di `repositories/posts.repository.js`:

```javascript title="repositories/posts.repository.js" wrap
import { query } from "../db/pool.js";

// ... fungsi lain

// Ambil satu post lengkap dengan tags (pakai array_agg)
export async function getPostWithTags(id) {
  const sql = `
    SELECT
      p.id,
      p.user_id,
      p.title,
      p.content,
      p.category,
      p.published,
      p.created_at,
      p.updated_at,
      u.name AS author_name,
      u.email AS author_email,
      COALESCE(
        array_agg(t.name ORDER BY t.name)
          FILTER (WHERE t.name IS NOT NULL),
        '{}'
      ) AS tags
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN post_tags pt ON pt.post_id = p.id
    LEFT JOIN tags t ON t.id = pt.tag_id
    WHERE p.id = $1
    GROUP BY
      p.id,
      u.name,
      u.email
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}
```

Pola di atas identik dengan contoh many-to-many + `array_agg` yang umum
digunakan untuk tagging.

`FILTER (WHERE t.name IS NOT NULL)` memastikan post tanpa tag akan dapat array
kosong (`{}`), bukan `[null]`.

### 3. Controller untuk Tags dan assign tags ke post

```javascript title="controllers/tags.sql.controller.js" wrap
import * as TagsRepo from "../repositories/tags.repository.js";
import * as PostsRepo from "../repositories/posts.repository.js";

// GET /api/v1/sql/tags
export async function getTags(req, res) {
  try {
    const tags = await TagsRepo.getAllTags();
    res.json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error) {
    console.error("getTags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tags",
    });
  }
}

// POST /api/v1/sql/tags
export async function createTag(req, res) {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Tag name is required",
      });
    }

    const existing = await TagsRepo.findTagByName(name.trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Tag already exists",
        data: existing,
      });
    }

    const newTag = await TagsRepo.createTag(name.trim());
    res.status(201).json({
      success: true,
      data: newTag,
    });
  } catch (error) {
    console.error("createTag error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create tag",
    });
  }
}

// POST /api/v1/sql/posts/:id/tags
// Body: { "tags": ["API","PostgreSQL"] }
// Replace semua tags untuk post tsb dengan daftar baru
export async function setPostTags(req, res) {
  try {
    const postId = req.params.id;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: "tags must be an array of strings",
      });
    }

    const post = await PostsRepo.getPostById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Normalisasi tags: trim, lower/upper-case sesuai kebutuhan
    const normalizedNames = tags
      .filter((t) => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (normalizedNames.length === 0) {
      await TagsRepo.removeAllTagsFromPost(postId);
      return res.json({
        success: true,
        message: "All tags removed from post",
        data: [],
      });
    }

    // Hapus semua relasi lama
    await TagsRepo.removeAllTagsFromPost(postId);

    // Pastikan setiap tag ada di tabel tags, lalu buat relasi
    const appliedTags = [];

    for (const name of normalizedNames) {
      let tag = await TagsRepo.findTagByName(name);
      if (!tag) {
        tag = await TagsRepo.createTag(name);
      }
      await TagsRepo.addTagToPost(postId, tag.id);
      appliedTags.push(tag);
    }

    res.json({
      success: true,
      message: "Tags updated for post",
      data: appliedTags,
    });
  } catch (error) {
    console.error("setPostTags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update post tags",
    });
  }
}
```

#### Update `posts.sql.controller.js` untuk pakai `getPostWithTags`

Ubah fungsi `getPost` di `controllers/posts.sql.controller.js`:

```javascript title="controllers/posts.sql.controller.js" wrap
import * as PostsRepo from "../repositories/posts.repository.js";
// ...

export async function getPost(req, res) {
  try {
    const post = await PostsRepo.getPostWithTags(req.params.id);

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
```

Sekarang `GET /api/v1/sql/posts/:id` akan mengembalikan:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "title": "Judul...",
    "content": "Isi...",
    "category": "Database",
    "published": true,
    "created_at": "...",
    "updated_at": null,
    "author_name": "Budi Santoso",
    "author_email": "budi@example.com",
    "tags": ["API", "PostgreSQL"]
  }
}
```

dengan array `tags` dihasilkan lewat `array_agg` + `GROUP BY`, sesuai pola
many-to-many yang baik.

### 4. Tambah routes untuk Tags & Post Tags

Buat `routes/tags.sql.routes.js`:

```javascript title="routes/tags.sql.routes.js" wrap
import express from "express";
import * as TagsSqlController from "../controllers/tags.sql.controller.js";

const router = express.Router();

router.get("/", TagsSqlController.getTags);
router.post("/", TagsSqlController.createTag);

export default router;
```

Di `routes/index.js`:

```javascript title="routes/index.js" wrap
import tagsSqlRoutes from "./tags.sql.routes.js";
import * as TagsSqlController from "../controllers/tags.sql.controller.js";

// ...

router.use("/sql/tags", tagsSqlRoutes);

// Endpoint khusus set tags untuk sebuah post
router.post("/sql/posts/:id/tags", TagsSqlController.setPostTags);
```

Sekarang Anda punya:

- `GET  /api/v1/sql/tags`
- `POST /api/v1/sql/tags`
- `POST /api/v1/sql/posts/:id/tags` (replace semua tags untuk post tsb)

### 5. Testing

1. Tambah beberapa post (kalau belum) lewat `POST /api/v1/sql/posts`.
2. Set tags untuk suatu post:

```text
POST http://localhost:4000/api/v1/sql/posts/1/tags
```

Body:

```json
{
  "tags": ["API", "Express", "PostgreSQL"]
}
```

3. Ambil detail post:

```text
GET http://localhost:4000/api/v1/sql/posts/1
```

Pastikan field `tags` berisi array string yang benar.

4. Cek semua tags:

```text
GET http://localhost:4000/api/v1/sql/tags
```

Anda akan melihat daftar tags yang pernah dipakai.

---

Dengan Sesi 7, Anda sudah:

- Mengimplementasikan **many-to-many** di level API untuk `posts` dan `tags`
  memakai tabel `post_tags`.
- Menggunakan `JOIN + array_agg` untuk mendapatkan 1 post dengan array `tags`,
  tanpa duplikasi baris.
- Membuat endpoint untuk mengatur tags sebuah post dengan logika yang tetap
  konsisten dengan desain database.

Di sesi berikutnya kita bisa mulai fokus ke:

- Optimasi query (pagination, filter by tag).
- Sedikit membahas indexing dasar untuk kolom yang sering di-query.
