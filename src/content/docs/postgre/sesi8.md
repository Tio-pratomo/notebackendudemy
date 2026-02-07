---
title: Pagination & Indexing Dasar
---

Di **Sesi 8** kita fokus ke dua hal penting untuk API yang mulai serius:
**pagination** dan **indexing dasar** di PostgreSQL.

## Materi: Pengetahuan & Konsep

### 1. Pagination dengan LIMIT & OFFSET

PostgreSQL menyediakan klausa `LIMIT` dan `OFFSET` untuk mengambil sebagian data
(page) dari hasil query.

**Pola umum:**

```sql
SELECT ...
FROM posts
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;   -- page 1

SELECT ...
FROM posts
ORDER BY created_at DESC
LIMIT 10 OFFSET 10;  -- page 2 (lewati 10 baris pertama)
```

Di REST API, biasanya kita map:

- `page` (mulai dari 1)
- `limit` (jumlah items per page)  
  ke `LIMIT` dan `OFFSET`:
- `limit = limit`
- `offset = (page - 1) * limit`.

LIMIT/OFFSET bukan cara paling optimal di dataset sangat besar, tapi untuk tahap
belajar dan data menengah sudah sangat cukup dan merupakan pola yang luas
dipakai.

### 2. Index dasar di PostgreSQL

**Index** adalah struktur tambahan di database untuk mempercepat
pencarian/filter/sort di kolom tertentu, mirip indeks di belakang buku.

**Sintaks dasar :**

```sql
CREATE INDEX IF NOT EXISTS idx_posts_created_at
ON posts (created_at);
```

Index yang umum dan aman dipakai di blog sederhana:

- `posts(created_at)` untuk sort/pagination.
- `posts(category)` atau `posts(published, created_at)` jika sering difilter.
- `tags(name)` sudah implicitly “diindeks” kalau Anda pakai `UNIQUE`, tapi bisa
  juga explicit index kalau perlu.

**Perlu diingat :**

index mempercepat **SELECT**, tapi menambah sedikit overhead saat
**INSERT/UPDATE/DELETE**, jadi gunakan seperlunya.

---

## Praktik: Pagination & Index di Blog API

### 1. Tambah pagination ke `getFilteredPosts`

Edit `repositories/posts.repository.js`, modifikasi `getFilteredPosts` agar
support `page` dan `limit`:

```javascript title="repositories/posts.repository.js" wrap
import { query } from "../db/pool.js";

// ...

export async function getFilteredPosts({
  authorId,
  category,
  published,
  page = 1,
  limit = 10,
}) {
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

  const offset = (Number(page) - 1) * Number(limit);

  // Query utama dengan pagination
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
    LIMIT $${index} OFFSET $${index + 1}
  `;

  values.push(Number(limit), offset);

  const rowsResult = await query(sql, values);

  // Query count total untuk info pagination
  const countSql = `
    SELECT COUNT(*) AS total
    FROM posts p
    ${whereClause}
  `;
  const countResult = await query(countSql, values.slice(0, index - 1));
  const total = Number(countResult.rows[0].total);

  return {
    rows: rowsResult.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
}
```

Pola LIMIT/OFFSET + query kedua untuk `COUNT(*)` adalah pendekatan standar untuk
pagination sederhana di PostgreSQL.

### 2. Update controller `getPosts` untuk kirim info pagination

Edit `controllers/posts.sql.controller.js` → fungsi `getPosts`:

```javascript title="controllers/posts.sql.controller.js" wrap
import * as PostsRepo from "../repositories/posts.repository.js";

export async function getPosts(req, res) {
  try {
    const { authorId, category, published, page = 1, limit = 10 } = req.query;

    const result = await PostsRepo.getFilteredPosts({
      authorId,
      category,
      published,
      page,
      limit,
    });

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("getPosts error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch posts",
    });
  }
}
```

Sekarang `GET /api/v1/sql/posts?page=2&limit=5` akan mengembalikan:

```json
{
  "success": true,
  "count": 5,
  "data": [
    /* 5 posts */
  ],
  "pagination": {
    "page": 2,
    "limit": 5,
    "total": 37,
    "totalPages": 8
  }
}
```

### 3. Tambah index sederhana di PostgreSQL

Masuk ke `blog_db` via `psql`:

```bash
psql -h localhost -d blog_db -U blog_user
```

#### A. Index untuk sort/pagination: `created_at`

```sql
CREATE INDEX IF NOT EXISTS idx_posts_created_at
ON posts (created_at);
```

Index ini akan membantu query `ORDER BY created_at DESC LIMIT ... OFFSET ...`
berjalan lebih cepat pada tabel `posts` yang ukurannya mulai besar.

#### B. Index untuk filter kategori + published

Jika Anda sering query berdasarkan category dan published:

```sql
CREATE INDEX IF NOT EXISTS idx_posts_published_category_created
ON posts (published, category, created_at);
```

Multi-column index seperti ini berguna untuk query dengan kondisi
`WHERE published = true AND category = 'Database' ORDER BY created_at DESC`.

#### C. Cek index di `psql`

Gunakan:

```sql
\d posts
```

Anda akan melihat daftar index di bagian `Indexes:` untuk tabel `posts`.

### 4. Uji pagination & index dari API

1. Generate beberapa post (bisa via script seed atau manual dengan `INSERT` dan
   `POST /api/v1/sql/posts`).
2. Test berbagai kombinasi:

```text
GET http://localhost:4000/api/v1/sql/posts?page=1&limit=5
GET http://localhost:4000/api/v1/sql/posts?page=3&limit=10&published=true
GET http://localhost:4000/api/v1/sql/posts?category=Database&page=2&limit=5
```

3. Untuk melihat efek index (opsional, lebih advanced):

Di `psql`, jalankan:

```sql
EXPLAIN ANALYZE
SELECT
  p.id, p.title, p.created_at
FROM posts p
WHERE p.published = true
ORDER BY p.created_at DESC
LIMIT 10 OFFSET 0;
```

Anda akan melihat query plan; jika index digunakan, biasanya muncul
`Index Scan using idx_posts_created_at ...` atau index lain yang relevan.

---

Dengan Sesi 8 ini, Anda:

- Sudah punya API `GET /api/v1/sql/posts` yang:
  - Mendukung filter (author, category, published).
  - Mendukung pagination dengan `page` dan `limit`.
  - Mengembalikan metadata pagination.

- Mulai menggunakan **index dasar** di PostgreSQL untuk membantu performa query
  `ORDER BY` dan filter yang sering dipakai.

Di sesi berikutnya, kita bisa:

- Membahas singkat **error handling & transaksi** (transaction) di Node +
  PostgreSQL.
- Atau mulai menyentuh topik **migration tools** (seperti `node-pg-migrate` /
  `Prisma` / `Knex`) sebagai jembatan ke tooling database yang lebih
  profesional.
