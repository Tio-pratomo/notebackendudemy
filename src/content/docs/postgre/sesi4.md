---
title: Relasi Antar Tabel & Constraint
---

## Materi: Pengetahuan & Konsep

### 1. Tipe-tipe relasi di database relasional

Dalam database relasional seperti PostgreSQL, ada tiga pola relasi utama:

- **One-to-One**: Satu baris di tabel A berhubungan dengan **maksimal satu**
  baris di tabel B, dan sebaliknya (contoh: `users` ↔ `user_profiles`).

- **One-to-Many / Many-to-One**:
  - Satu baris di tabel A bisa punya **banyak** baris terkait di tabel B.
  - Contoh: satu `user` punya banyak `posts` (yang sudah kita buat di Sesi 3).
  - Implementasi: foreign key di tabel “many” (`posts.user_id` references
    `users.id`).

- **Many-to-Many**: Banyak baris di A bisa terkait dengan banyak baris di B
  (contoh: `posts` dan `tags`).
  - Implementasi: **tabel penghubung** (junction table) seperti `post_tags` yang
    berisi `post_id` dan `tag_id`.

**Di project blog kita :**

- Sekarang sudah punya **one-to-many**: `users (1)` – `posts (N)`.
- Nanti bisa tambahkan **many-to-many**: `posts` – `tags` lewat `post_tags`.

### 2. Constraint lanjutan: CHECK & NOT NULL

PostgreSQL menyediakan beberapa jenis constraint penting:

- **NOT NULL**: kolom wajib diisi (tidak boleh `NULL`).
- **UNIQUE**: nilai di kolom (atau kombinasi kolom) tidak boleh duplikat.
- **CHECK**: kondisi boolean yang harus selalu benar untuk setiap baris.
  - Contoh: `CHECK (published IN (true, false))` atau
    `CHECK (length(title) >= 5)`.
  - Jika insert/update melanggar kondisi ini, PostgreSQL akan menolak data
    tersebut.

Di tabel `posts`, misalnya kita ingin:

- `title` minimal 5 karakter.
- `category` hanya boleh beberapa nilai tertentu (misalnya `'API'`,
  `'Database'`, `'JavaScript'`, `'DevOps'`).

Itu semua bisa kita enforce di level database menggunakan CHECK constraint.

### 3. Manfaat mendesain relasi & constraint dengan benar

- **Data konsisten**: foreign key mencegah referensi ke user yang tidak ada;
  CHECK mencegah category aneh yang tidak valid.
- **Lebih aman dari bug aplikasi**: walaupun ada bug di kode Node.js, database
  tetap menjaga integritas dengan menolak data yang salah.
- **Query lebih mudah & cepat**: relasi yang jelas memudahkan JOIN antar tabel,
  dan constraint bisa membantu optimizer.

---

## Praktik: Tambah Constraint dan Rancang Relasi Many-to-Many `tags`

Kita lanjutkan database `blog_db` yang sudah punya tabel `users` dan `posts`.

### 1. Tambahkan CHECK constraint di `posts`

Masuk ke `blog_db` via `psql`:

```bash wrap
psql -h localhost -d blog_db -U blog_user
```

#### A. Validasi panjang judul minimal 5 karakter

```sql wrap
ALTER TABLE posts
ADD CONSTRAINT posts_title_length_check
CHECK (char_length(trim(title)) >= 5);
```

- `char_length(trim(title)) >= 5` memastikan judul tidak kosong dan minimal 5
  karakter setelah di-trim.
- Jika Anda coba insert post dengan title `''` atau `abc`, akan gagal dengan
  error constraint.

#### B. Batasi nilai `category` ke daftar tertentu

Misalnya kita mau category hanya dari set berikut: `API`, `Database`,
`JavaScript`, `DevOps`.

```sql wrap
ALTER TABLE posts
ADD CONSTRAINT posts_category_check
CHECK (
  category IS NULL
  OR category IN ('API', 'Database', 'JavaScript', 'DevOps')
);
```

- `category IS NULL` mengizinkan category kosong.
- Jika diisi, harus salah satu dari empat nilai di atas; kalau tidak, PostgreSQL
  akan menolak.

Anda bisa uji:

```sql wrap
-- Seharusnya OK
INSERT INTO posts (user_id, title, content, category, published)
VALUES (1, 'Belajar PostgreSQL', 'Isi...', 'Database', TRUE);

-- Seharusnya ERROR (category tidak valid)
INSERT INTO posts (user_id, title, content, category, published)
VALUES (1, 'Judul Valid', 'Isi...', 'RandomCategory', TRUE);
```

### 2. Desain Many-to-Many: `posts` ↔ `tags`

Kita ingin:

- Satu post bisa punya banyak tag: `["API", "Express", "PostgreSQL"]`.
- Satu tag bisa dipakai di banyak post.

Pola yang dipakai hampir di semua database relasional:

1. Tabel `tags` (daftar tag).
2. Tabel penghubung `post_tags`:
   - `post_id` → FK ke `posts.id`.
   - `tag_id` → FK ke `tags.id`.
   - Kombinasi (`post_id`, `tag_id`) dibuat UNIQUE/PK supaya tidak ada duplikasi
     relasi.

#### A. Buat tabel `tags`

```sql wrap
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `name` unik, jadi tidak ada dua tag dengan nama sama (case-sensitive, nanti
  bisa kita refine kalau perlu).

#### B. Buat tabel penghubung `post_tags`

```sql wrap
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,

  -- Primary key gabungan, mencegah (post_id, tag_id) duplikat
  CONSTRAINT pk_post_tags PRIMARY KEY (post_id, tag_id),

  -- Foreign key ke posts
  CONSTRAINT fk_post_tags_post
    FOREIGN KEY (post_id)
    REFERENCES posts(id)
    ON DELETE CASCADE,

  -- Foreign key ke tags
  CONSTRAINT fk_post_tags_tag
    FOREIGN KEY (tag_id)
    REFERENCES tags(id)
    ON DELETE CASCADE
);
```

Catatan:

- Many-to-many **selalu** pakai tabel penghubung seperti ini di PostgreSQL.
- `ON DELETE CASCADE` di sini artinya:
  - Kalau sebuah post dihapus → semua relasi di `post_tags` ikut hilang.
  - Kalau sebuah tag dihapus → relasi ke post juga dibersihkan.
- `PRIMARY KEY (post_id, tag_id)` mencegah satu post punya tag yang sama lebih
  dari sekali.

### 3. Insert data sample untuk tags & post_tags

#### A. Tambah beberapa tag

```sql wrap
INSERT INTO tags (name)
VALUES
  ('API'),
  ('Express'),
  ('PostgreSQL'),
  ('JavaScript'),
  ('Backend');
```

Lihat hasil:

```sql wrap
SELECT * FROM tags;
```

Catat `id` masing-masing tag (misal: 1=API, 2=Express, dst).

#### B. Hubungkan post dengan tags

Misal:

- Post dengan `id = 1` → tags: `API`, `Express`.
- Post dengan `id = 2` → tags: `PostgreSQL`, `Backend`.

```sql wrap
-- Asumsikan id tag sesuai insert sebelumnya
INSERT INTO post_tags (post_id, tag_id)
VALUES
  (1, 1), -- post 1 - API
  (1, 2), -- post 1 - Express
  (2, 3), -- post 2 - PostgreSQL
  (2, 5); -- post 2 - Backend
```

Kalau Anda coba:

```sql wrap
INSERT INTO post_tags (post_id, tag_id)
VALUES (999, 1);
```

dan tidak ada `posts.id = 999`, maka akan gagal karena foreign key.

### 4. Query join untuk melihat tags per post

A. List semua post dengan author & tags (agregasi sederhana pakai `string_agg`):

```sql wrap
SELECT
  p.id AS post_id,
  p.title,
  u.name AS author_name,
  COALESCE(string_agg(t.name, ', ' ORDER BY t.name), '') AS tags
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN post_tags pt ON pt.post_id = p.id
LEFT JOIN tags t ON t.id = pt.tag_id
GROUP BY p.id, p.title, u.name
ORDER BY p.created_at DESC;
```

- `LEFT JOIN` memastikan post tanpa tag tetap muncul.
- `string_agg` menggabungkan nama tag jadi satu string per post (fitur umum di
  PostgreSQL).

B. Cari semua post yang punya tag tertentu, misalnya `PostgreSQL`:

```sql wrap
SELECT
  p.id,
  p.title,
  u.name AS author_name
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
WHERE t.name = 'PostgreSQL'
ORDER BY p.created_at DESC;
```

Ini contoh tipikal query yang akan nanti kita bungkus dalam endpoint REST di
Express.

---

Dengan Sesi 4, Anda sudah:

- Memperkuat pemahaman **one-to-many** yang sudah dibuat (`users`–`posts`).
- Mendesain dan mengimplementasikan relasi **many-to-many** dengan tabel
  penghubung `post_tags`.
- Menggunakan **CHECK constraint** untuk memvalidasi data di level database
  (panjang title, kategori).

Di **Sesi 5**, kita mulai bridging serius ke backend:

- Install library **node-postgres (`pg`)**.
- Setup koneksi Express ↔ PostgreSQL pakai environment variables dan connection
  pool.
- Menulis fungsi repository pertama untuk baca/tulis data `users` dan `posts`
  dari Node.js.
