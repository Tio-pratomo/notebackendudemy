---
title: Recap & Latihan SQL Join
---

Fokus sesi ini murni di **SQL PostgreSQL**, tanpa Node, supaya konsep relasi dan
join kamu benar-benar nempel.

## Materi: Pengetahuan & Konsep (Ringkas)

### 1. JOIN dasar di PostgreSQL

**Bentuk umum JOIN :**

```sql wrap
SELECT kolom_yang_dibutuhkan
FROM table1 t1
JOIN table2 t2 ON t1.fk = t2.pk
WHERE ...;
```

**Di blog DB kita :**

**One-to-many:** `posts.user_id` → `users.id`

```sql wrap
SELECT p.*, u.name AS author_name
FROM posts p
JOIN users u ON p.user_id = u.id;
```

**Many-to-many:** `posts` ↔ `tags` lewat `post_tags`, butuh join 3 tabel.

### 2. Mengubah hasil many-to-many jadi array tags

PostgreSQL punya fungsi agregasi `array_agg()` dan `json_agg()` untuk
menggabungkan banyak baris menjadi array per grup.

**Pola umum :**

```sql wrap
SELECT
  p.id,
  p.title,
  array_agg(t.name ORDER BY t.name) AS tags
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
GROUP BY p.id, p.title;
```

---

## Praktik: Latihan SQL di `blog_db`

**Asumsi :**

Kamu sudah punya database `blog_db` dengan tabel `users`, `posts`, `tags`,
`post_tags` dari sesi-sesi sebelumnya.

Sudah ada beberapa data sample (minimal 2–3 user, beberapa post, dan tags).

**Masuk ke `psql`:**

```bash wrap
psql -h localhost -d blog_db -U blog_user
```

### Latihan 1 – Join One-to-Many: Users ↔ Posts

**Tujuan:** Tampilkan semua post beserta nama author-nya.

#### 1A. Join sederhana

```sql wrap
SELECT
  p.id,
  p.title,
  u.name AS author_name,
  u.email AS author_email,
  p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

Pola ini identik dengan contoh JOIN dasar dari dokumentasi PostgreSQL: gabungkan
dua tabel dengan kondisi ON yang cocok (FK ke PK).

#### 1B. Hanya posts yang sudah published

```sql wrap
SELECT
  p.id,
  p.title,
  u.name AS author_name,
  p.published,
  p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.published = TRUE
ORDER BY p.created_at DESC;
```

#### 1C. Semua user + jumlah post mereka (termasuk yang belum punya post)

```sql wrap
SELECT
  u.id,
  u.name,
  COUNT(p.id) AS total_posts
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name
ORDER BY total_posts DESC, u.name;
```

- `LEFT JOIN` memastikan user tanpa post tetap muncul dengan `total_posts = 0`.

> Coba amati: siapa user dengan jumlah post terbanyak?

---

### Latihan 2 – Join Many-to-Many: Posts ↔ Tags

Skema:

- `posts(id, ...)`
- `tags(id, name, ...)`
- `post_tags(post_id, tag_id)`

#### 2A. Semua baris post + tag (tanpa agregasi)

```sql wrap
SELECT
  p.id AS post_id,
  p.title,
  t.id AS tag_id,
  t.name AS tag_name
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
ORDER BY p.id, t.name;
```

Ini join many-to-many yang paling langsung: satu baris per kombinasi
`(post, tag)`.

#### 2B. Post + array tags (lebih enak buat API)

```sql wrap
SELECT
  p.id,
  p.title,
  COALESCE(
    array_agg(t.name ORDER BY t.name)
      FILTER (WHERE t.name IS NOT NULL),
    '{}'
  ) AS tags
FROM posts p
LEFT JOIN post_tags pt ON pt.post_id = p.id
LEFT JOIN tags t ON t.id = pt.tag_id
GROUP BY p.id, p.title
ORDER BY p.created_at DESC;
```

- `array_agg(t.name)` mengumpulkan nama tag jadi array per post.
- `FILTER (WHERE t.name IS NOT NULL)` mencegah array `[null]` ketika tidak ada
  tag.
- `LEFT JOIN` memastikan post tanpa tag tetap muncul dengan `tags = {}`.

> Latihan: coba ubah `array_agg(t.name)` jadi `array_agg(DISTINCT t.name)` untuk
> mencegah duplikat tag.

---

### Latihan 3 – Filter Posts berdasarkan Tag

**Tujuan:** Cari semua post yang memiliki tag tertentu, misal `"PostgreSQL"`.

#### 3A. Posts dengan satu tag tertentu

```sql wrap
SELECT
  p.id,
  p.title,
  u.name AS author_name,
  t.name AS tag_name
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
WHERE t.name = 'PostgreSQL'
ORDER BY p.created_at DESC;
```

- Pola serupa sering dipakai di implementasi tagging: join melalui tabel
  penghubung, lalu filter di tabel `tags`.

#### 3B. Posts yang punya **lebih dari satu** tag tertentu (misal “PostgreSQL” dan “Node.js”)

Gunakan agregasi + `HAVING`:

```sql wrap
SELECT
  p.id,
  p.title,
  u.name AS author_name,
  array_agg(DISTINCT t.name ORDER BY t.name) AS tags
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
WHERE t.name IN ('PostgreSQL', 'Node.js')
GROUP BY p.id, p.title, u.name
HAVING COUNT(DISTINCT t.name) = 2  -- harus punya kedua tag
ORDER BY p.created_at DESC;
```

- Teknik ini diadaptasi dari pola umum filter many-to-many berdasarkan kombinasi
  tag.

---

### Latihan 4 – Query Rekap (Aggregate) untuk Dashboard

Beberapa contoh query yang nanti kepakai untuk statistik di aplikasi:

#### 4A. Jumlah post per kategori

```sql wrap
SELECT
  category,
  COUNT(*) AS total_posts
FROM posts
GROUP BY category
ORDER BY total_posts DESC;
```

#### 4B. Top 3 author berdasarkan jumlah post published

```sql wrap
SELECT
  u.id,
  u.name,
  COUNT(p.id) AS published_posts
FROM users u
JOIN posts p ON p.user_id = u.id
WHERE p.published = TRUE
GROUP BY u.id, u.name
ORDER BY published_posts DESC
LIMIT 3;
```

#### 4C. Top tags berdasarkan jumlah post

```sql wrap
SELECT
  t.id,
  t.name,
  COUNT(pt.post_id) AS post_count
FROM tags t
JOIN post_tags pt ON pt.tag_id = t.id
GROUP BY t.id, t.name
ORDER BY post_count DESC, t.name;
```

Pola-pola ini mengkombinasikan JOIN + `GROUP BY` + agregasi (`COUNT`,
`array_agg`), sesuai best practice untuk many-to-many di PostgreSQL.

---

Kalau kamu nyaman dengan:

- JOIN one-to-many (`users`–`posts`).
- JOIN many-to-many (`posts`–`tags` via `post_tags`).
- Agregasi tags jadi array (`array_agg`) dan rekap statistik dengan `GROUP BY`,

maka blok “Relasi Tabel & SQL Joins” di PostgreSQL bisa dibilang sudah
**solid**.

Setelah ini, di **Sesi 12** kita bisa:

- Ambil beberapa query favorit di atas,
- Tunjukkan bagaimana query tersebut di-wrap di repository Node.js
- Dan bagaimana query ini dipakai untuk endpoint endpoint “list posts dengan
  filter berat” (by tag, by author, by kategori) di API.
