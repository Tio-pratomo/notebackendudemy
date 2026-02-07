---
title: Transaksi & Error Handling
---

## Materi: Pengetahuan & Konsep

### 1. Apa itu transaksi (transaction)?

Transaksi adalah sekumpulan operasi database yang dieksekusi sebagai satu
kesatuan: **semua sukses, atau semua dibatalkan**.

Tiga perintah utama di **PostgreSQL**:

- `BEGIN` – memulai transaksi.
- `COMMIT` – menyimpan semua perubahan dalam transaksi.
- `ROLLBACK` – membatalkan semua perubahan jika ada error.

**Contoh di SQL murni:**

```sql wrap
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT; -- atau ROLLBACK jika ada error
```

### 2. Kenapa transaksi penting di backend?

Menjamin **konsistensi data** saat beberapa query harus berjalan bersama, misal:

- Insert `post` + insert relasi di `post_tags`.
- Delete user + hapus semua post terkait (kalau tidak pakai
  `ON DELETE CASCADE`).

Jika salah satu query gagal (constraint, koneksi terputus, dll), `ROLLBACK` akan
mengembalikan database ke kondisi sebelum transaksi dimulai.

### 3. Transaksi dengan node-postgres (`pg`)

Untuk transaksi, kita **tidak menggunakan `pool.query` langsung**, tapi:

1. `const client = await pool.connect();`
2. `await client.query('BEGIN');`
3. Jalankan beberapa `client.query(...)`.
4. `await client.query('COMMIT');` jika semua sukses.
5. `await client.query('ROLLBACK');` jika ada error, lalu `client.release();`.

Pola ini adalah cara resmi yang direkomendasikan di dokumentasi node-postgres.

---

## Praktik: Transaksi untuk Membuat Post + Tags Sekaligus

Kita buat endpoint baru:

`POST /api/v1/sql/posts-with-tags` yang akan:

- Membuat `post` baru.
- Membuat dan menghubungkan tags (kalau ada).
- Semua dalam satu transaksi.

### 1. Tambah helper transaksi di `db/pool.js`

Update `db/pool.js` untuk expose `pool` atau helper transaksi:

```javascript wrap title="db/pool.js"
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// ... konfigurasi pool seperti sesi sebelumnya ...

export const pool = pool; // jika belum diexport, tambahkan ini

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.log("DB QUERY:", { text, duration, rows: res.rowCount });
  }

  return res;
}

// Helper generic untuk menjalankan transaksi
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client); // callback menerima client
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

Pola `withTransaction` ini mengikuti pola umum yang direkomendasikan
(BEGIN–COMMIT–ROLLBACK dengan satu client).

### 2. Repository khusus yang support transaksi

Kita buat versi fungsi yang bisa menerima `client` (bukan `query()` global),
supaya bisa dipakai di dalam transaksi.

Buat file `repositories/posts.tx.repository.js` (khusus untuk operasi dalam
transaksi):

```javascript title="repositories/posts.tx.repository.js" wrap
// Versi minimal khusus transaksi
export async function createPostTx(
  client,
  { user_id, title, content, category, published }
) {
  const sql = `
    INSERT INTO posts (user_id, title, content, category, published)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, title, content, category, published, created_at
  `;
  const params = [
    user_id,
    title,
    content,
    category || null,
    published ?? false,
  ];
  const result = await client.query(sql, params);
  return result.rows[0];
}
```

Dan untuk tags:

```javascript wrap title="repositories/tags.tx.repository.js"
// Versi transactional dari operasi tags
export async function findOrCreateTagTx(client, name) {
  const findSql = `
    SELECT id, name
    FROM tags
    WHERE name = $1
  `;
  let result = await client.query(findSql, [name]);
  if (result.rows[0]) return result.rows[0];

  const insertSql = `
    INSERT INTO tags (name)
    VALUES ($1)
    RETURNING id, name, created_at
  `;
  result = await client.query(insertSql, [name]);
  return result.rows[0];
}

export async function clearTagsForPostTx(client, postId) {
  const sql = `
    DELETE FROM post_tags
    WHERE post_id = $1
  `;
  await client.query(sql, [postId]);
}

export async function addTagToPostTx(client, postId, tagId) {
  const sql = `
    INSERT INTO post_tags (post_id, tag_id)
    VALUES ($1, $2)
    ON CONFLICT (post_id, tag_id) DO NOTHING
  `;
  await client.query(sql, [postId, tagId]);
}
```

Semua fungsi di atas menerima `client` sehingga bisa dipanggil dalam block
transaksi yang sama.

### 3. Controller: buat post + tags dalam satu transaksi

Buat file baru `controllers/posts.transaction.controller.js`:

```javascript title="controllers/posts.transaction.controller.js" wrap
import { withTransaction } from "../db/pool.js";
import * as PostsTxRepo from "../repositories/posts.tx.repository.js";
import * as TagsTxRepo from "../repositories/tags.tx.repository.js";
import * as PostsRepo from "../repositories/posts.repository.js";

// POST /api/v1/sql/posts-with-tags
export async function createPostWithTags(req, res) {
  const { user_id, title, content, category, published, tags } = req.body;

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

  try {
    const result = await withTransaction(async (client) => {
      // 1. Buat post
      const newPost = await PostsTxRepo.createPostTx(client, {
        user_id,
        title: title.trim(),
        content: content.trim(),
        category,
        published,
      });

      // 2. Jika ada tags, normalisasi dan buat relasi
      if (Array.isArray(tags) && tags.length > 0) {
        const normalizedTags = tags
          .filter((t) => typeof t === "string")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        // Clear tags lama (harusnya tidak ada karena post baru, tapi biar konsisten)
        await TagsTxRepo.clearTagsForPostTx(client, newPost.id);

        for (const name of normalizedTags) {
          const tag = await TagsTxRepo.findOrCreateTagTx(client, name);
          await TagsTxRepo.addTagToPostTx(client, newPost.id, tag.id);
        }
      }

      // Kembalikan post lengkap dengan tags (pakai repository biasa di luar client)
      // tapi masih di dalam transaksi, jadi jangan pakai pool.query lain.
      // Di sini, untuk simpel, kita hanya return newPost (tanpa tags).
      return newPost;
    });

    // Setelah COMMIT, kita bisa ambil post lengkap dengan tags
    const fullPost = await PostsRepo.getPostWithTags(result.id);

    res.status(201).json({
      success: true,
      data: fullPost,
    });
  } catch (error) {
    console.error("createPostWithTags error:", error);

    if (error.code === "23503") {
      // foreign key violation: user_id tidak valid
      return res.status(400).json({
        success: false,
        error: "Invalid user_id (user does not exist)",
      });
    }

    if (error.code === "23514") {
      // check constraint violation
      return res.status(400).json({
        success: false,
        error: "Post violates database constraints",
        details: error.detail,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create post with tags",
    });
  }
}
```

Catatan:

- Semua query yang dijalankan di dalam `withTransaction` memakai client yang
  sama dengan `BEGIN; ... COMMIT;`.
- Jika ada error di salah satu langkah, `withTransaction` otomatis akan
  memanggil `ROLLBACK` dan melempar error ke luar.

### 4. Tambah route untuk endpoint transaksi

Buat file `routes/posts.tx.routes.js`:

```javascript title="routes/posts.tx.routes.js"
import express from "express";
import * as PostsTxController from "../controllers/posts.transaction.controller.js";

const router = express.Router();

router.post("/with-tags", PostsTxController.createPostWithTags);

export default router;
```

Update `routes/index.js`:

```javascript title="routes/index.js" wrap
import postsTxRoutes from "./posts.tx.routes.js";

// ...

router.use("/sql/posts", postsSqlRoutes); // existing
router.use("/sql/posts", postsTxRoutes); // tambahkan ini di bawahnya
```

Sekarang ada endpoint:

**`POST /api/v1/sql/posts/with-tags`**

### 5. Testing

Contoh request:

```text
POST http://localhost:4000/api/v1/sql/posts/with-tags
```

Body:

```json wrap
{
  "user_id": 1,
  "title": "Transaksi di PostgreSQL dengan Node.js",
  "content": "Artikel ini menjelaskan bagaimana menggunakan transaksi BEGIN, COMMIT, dan ROLLBACK di PostgreSQL melalui node-postgres.",
  "category": "Database",
  "published": true,
  "tags": ["PostgreSQL", "Transactions", "Node.js"]
}
```

**Perhatikan :**

- Jika `user_id` tidak valid → foreign key error → transaksi di-ROLLBACK → tidak
  ada row yang dibuat di `posts` maupun `post_tags`.
- Jika `title` terlalu pendek atau `category` melanggar CHECK constraint → error
  `23514` → transaksi dibatalkan, tidak ada data setengah jadi.

Anda bisa verifikasi via `psql`:

```sql wrap
SELECT * FROM posts ORDER BY created_at DESC LIMIT 5;

SELECT p.id, p.title, t.name AS tag
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
ORDER BY p.id, t.name;
```

Semua row yang berkaitan dengan request sukses akan muncul **lengkap**,
sedangkan jika ada error, tidak ada jejak parsial.

---

Dengan Sesi 9 ini, Anda:

- Memahami konsep transaksi `BEGIN/COMMIT/ROLLBACK` di **PostgreSQL** dan kenapa
  ini penting untuk operasi multi-query.
- Menerapkan pola transaksi dengan **node-postgres** menggunakan
  `pool.connect()` dan `client.query()` dalam blok try/catch yang aman.
- Membangun endpoint `POST /posts/with-tags` yang atomic: post + tags selalu
  konsisten, atau dibatalkan semua jika ada error.

Jika sudah nyaman, sesi berikutnya bisa fokus ke Pengenalan database migration
(contoh: `node-pg-migrate`). Agar perubahan schema tidak lagi manual dengan
copy-paste SQL.
