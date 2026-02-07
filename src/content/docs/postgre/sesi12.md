---
title: JOIN di Node‑Postgres
---

Di **Sesi 12** kita akan bawa query JOIN dari Sesi sebelumnya masuk ke **layer
Node.js/Express**, jadi kamu lihat jelas hubungan:

**SQL → Repository → Controller → Endpoint API**.

## Materi: Pengetahuan & Konsep (Singkat)

### 1. JOIN di Node‑Postgres tetap JOIN biasa

- Di `pg`, kamu tetap menulis SQL yang sama seperti di `psql`; bedanya, kamu
  memakai parameter `$1, $2, ...` untuk nilai dinamis, lalu memproses
  `result.rows` di Node.
- Hasil `array_agg` akan datang ke Node sebagai array JavaScript biasa (misalnya
  `["API","PostgreSQL"]`), jadi sangat nyaman dipakai di JSON response.

### 2. Endpoint “join-heavy” yang umum di aplikasi blog

Beberapa endpoint yang memanfaatkan JOIN:

- `GET /posts/:id` → 1 post + author + tags.
- `GET /posts?tag=PostgreSQL` → list post yang punya tag tertentu.
- `GET /stats/overview` → ringkasan: total posts, total users, top tags, dst.

---

## Praktik: Repository & Endpoint JOIN di Blog API

Kita lanjut di project `blog-api` dengan struktur `db/`, `repositories/`,
`controllers/`, `routes/` yang sudah ada.

### 1. Endpoint: Detail Post Lengkap (author + tags)

Repository sudah kita punya (`getPostWithTags` di Sesi 7). Kita ulang ringkas
dan sedikit refine.

#### 1A. Pastikan repository `getPostWithTags` sudah seperti ini

`repositories/posts.repository.js`:

```javascript wrap title="repositories/posts.repository.js"
import { query } from "../db/pool.js";

// ...

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

Pola JOIN + `array_agg` ini identik dengan praktik umum untuk many-to-many
(posts–tags) yang dipakai banyak orang di PostgreSQL.

#### 1B. Controller `GET /posts/:id` sudah pakai `getPostWithTags`

`controllers/posts.sql.controller.js` (bagian `getPost`):

```javascript title="controllers/posts.sql.controller.js" wrap
import * as PostsRepo from "../repositories/posts.repository.js";

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

Route `routes/posts.sql.routes.js`:

```javascript title="routes/posts.sql.routes.js" wrap
router.get("/:id", PostsSqlController.getPost);
```

Coba di Postman:

```text
GET http://localhost:4000/api/v1/sql/posts/1
```

Hasilnya akan berupa satu objek dengan field `author_name`, `author_email`, dan
`tags` (array string).

---

### 2. Endpoint: List Posts by Tag (filter many-to-many)

Kita buat endpoint:

```text
GET /api/v1/sql/posts/by-tag/:tagName
```

#### 2A. Repository query by tag

Tambahkan di `repositories/posts.repository.js`:

```javascript title="repositories/posts.repository.js" wrap
export async function getPostsByTag(tagName, { page = 1, limit = 10 } = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  const sql = `
    SELECT
      p.id,
      p.title,
      p.category,
      p.published,
      p.created_at,
      u.id AS author_id,
      u.name AS author_name,
      COALESCE(
        array_agg(DISTINCT t2.name ORDER BY t2.name)
          FILTER (WHERE t2.name IS NOT NULL),
        '{}'
      ) AS tags
    FROM posts p
    JOIN users u ON p.user_id = u.id
    JOIN post_tags pt ON pt.post_id = p.id
    JOIN tags t ON t.id = pt.tag_id
    LEFT JOIN post_tags pt2 ON pt2.post_id = p.id
    LEFT JOIN tags t2 ON t2.id = pt2.tag_id
    WHERE t.name = $1
    GROUP BY
      p.id,
      u.id,
      u.name
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const rowsResult = await query(sql, [tagName, Number(limit), offset]);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM posts p
    JOIN post_tags pt ON pt.post_id = p.id
    JOIN tags t ON t.id = pt.tag_id
    WHERE t.name = $1
  `;
  const countResult = await query(countSql, [tagName]);
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

**Di sini :**

- Bagian `WHERE t.name = $1` adalah filter utama berdasarkan satu tag.
- `LEFT JOIN post_tags pt2 / tags t2` + `array_agg(DISTINCT t2.name)` dipakai
  untuk menampilkan **semua tags** yang dimiliki setiap post, bukan hanya tag
  filter utama.

#### 2B. Controller & route

Di `controllers/posts.sql.controller.js`, tambah fungsi:

```javascript title="controllers/posts.sql.controller.js" wrap
export async function getPostsByTag(req, res) {
  try {
    const tagName = req.params.tagName;
    const { page = 1, limit = 10 } = req.query;

    if (!tagName || tagName.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "tagName is required",
      });
    }

    const result = await PostsRepo.getPostsByTag(tagName.trim(), {
      page,
      limit,
    });

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      pagination: result.pagination,
      filter: {
        tag: tagName.trim(),
      },
    });
  } catch (error) {
    console.error("getPostsByTag error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch posts by tag",
    });
  }
}
```

Di `routes/posts.sql.routes.js` tambahkan sebelum `/:id`:

```javascript title="routes/posts.sql.routes.js" wrap
router.get("/by-tag/:tagName", PostsSqlController.getPostsByTag);
```

Coba:

```text
GET http://localhost:4000/api/v1/sql/posts/by-tag/PostgreSQL
GET http://localhost:4000/api/v1/sql/posts/by-tag/Node.js?page=2&limit=5
```

---

### 3. Endpoint: Stats Overview (JOIN + Aggregate)

Kita buat endpoint statistik kecil:

```text
GET /api/v1/sql/stats/overview
```

Yang mengembalikan:

- Total users, total posts, total tags.
- Top kategori & top tags.
- Top author by published posts.

#### 3A. Repository `stats.repository.js`

Buat `repositories/stats.repository.js`:

```javascript title="repositories/stats.repository.js" wrap
import { query } from "../db/pool.js";

export async function getOverviewStats() {
  // 1. Hitung total
  const totalSql = `
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM posts) AS total_posts,
      (SELECT COUNT(*) FROM tags) AS total_tags
  `;
  const totalResult = await query(totalSql);
  const totals = totalResult.rows[0];

  // 2. Top categories
  const categoriesSql = `
    SELECT
      category,
      COUNT(*) AS total_posts
    FROM posts
    GROUP BY category
    ORDER BY total_posts DESC
    LIMIT 5
  `;
  const categoriesResult = await query(categoriesSql);

  // 3. Top tags
  const tagsSql = `
    SELECT
      t.id,
      t.name,
      COUNT(pt.post_id) AS post_count
    FROM tags t
    JOIN post_tags pt ON pt.tag_id = t.id
    GROUP BY t.id, t.name
    ORDER BY post_count DESC, t.name
    LIMIT 5
  `;
  const tagsResult = await query(tagsSql);

  // 4. Top authors by published posts
  const authorsSql = `
    SELECT
      u.id,
      u.name,
      COUNT(p.id) AS published_posts
    FROM users u
    JOIN posts p ON p.user_id = u.id
    WHERE p.published = TRUE
    GROUP BY u.id, u.name
    ORDER BY published_posts DESC, u.name
    LIMIT 5
  `;
  const authorsResult = await query(authorsSql);

  return {
    totals: {
      totalUsers: Number(totals.total_users),
      totalPosts: Number(totals.total_posts),
      totalTags: Number(totals.total_tags),
    },
    topCategories: categoriesResult.rows,
    topTags: tagsResult.rows,
    topAuthors: authorsResult.rows,
  };
}
```

Semua query di atas adalah bentuk langsung dari latihan aggregate/joins di Sesi
11, sekarang dikemas jadi satu fungsi repository.

#### 3B. Controller & routes

Buat `controllers/stats.sql.controller.js`:

```javascript title="controllers/stats.sql.controller.js" wrap
import * as StatsRepo from "../repositories/stats.repository.js";

export async function getOverview(req, res) {
  try {
    const stats = await StatsRepo.getOverviewStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("getOverview error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch overview stats",
    });
  }
}
```

Buat route `routes/stats.sql.routes.js`:

```javascript title="routes/stats.sql.routes.js" wrap
import express from "express";
import * as StatsSqlController from "../controllers/stats.sql.controller.js";

const router = express.Router();

router.get("/overview", StatsSqlController.getOverview);

export default router;
```

Di `routes/index.js`:

```javascript title="routes/index.js" wrap
import statsSqlRoutes from "./stats.sql.routes.js";

// ...

router.use("/sql/stats", statsSqlRoutes);
```

Coba:

```text
GET http://localhost:4000/api/v1/sql/stats/overview
```

Respons akan berisi JSON seperti:

```json wrap
{
  "success": true,
  "data": {
    "totals": {
      "totalUsers": 3,
      "totalPosts": 10,
      "totalTags": 7
    },
    "topCategories": [
      { "category": "Database", "total_posts": "5" },
      { "category": "API", "total_posts": "3" }
    ],
    "topTags": [{ "id": 3, "name": "PostgreSQL", "post_count": "4" }],
    "topAuthors": [{ "id": 1, "name": "Budi Santoso", "published_posts": "6" }]
  }
}
```

---

Dengan **Sesi 12** ini, kamu sudah:

- Melihat secara lengkap bagaimana **SQL JOIN & agregasi** dari Sesi sebelumnya
  diterapkan di Node‑Postgres & Express.
- Punya endpoint “realistic” yang memanfaatkan relasi one‑to‑many dan
  many‑to‑many:
  - Detail post lengkap (author + tags).
  - List posts by tag (dengan tags lengkap di setiap post).
  - Endpoint statistik untuk dashboard.

Ini menutup materi **“Relasi Tabel & SQL Joins”** di level **database + API**.

Di sesi selanjutnya, kita bisa fokus memantapkan bagian **Integrasi Node.js +
PostgreSQL & Data Persistence** (error handling, testing, seeding, dan review
final PostgreSQL sebelum masuk ke Bagian 4 tentang Authentication & Security).
