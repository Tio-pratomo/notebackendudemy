---
title: Dasar SQL
---

## Materi: Pengetahuan & Konsep

### 1. SQL dan perintah utama yang kita pakai

Di PostgreSQL, kita berinteraksi lewat bahasa SQL (Structured QueryLanguage).

Untuk mulai, kita fokus 4 perintah:

- `CREATE TABLE` – membuat struktur tabel baru (kolom, tipe, constraint).
- `INSERT INTO` – memasukkan baris data baru.
- `SELECT` – membaca data.
- `UPDATE`, `DELETE` – mengubah dan menghapus data.

### 2. Primary Key & Identity Column

**Primary Key** adalah kolom unik yang mengidentifikasi setiap baris dan tidak
boleh `NULL`.

Di PostgreSQL modern, best practice untuk kolom auto-increment adalah pakai
**identity column**

```sql wrap
id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY
```

Ini lebih standar dibanding `SERIAL` dan direkomendasikan untuk aplikasi baru.

### 3. Foreign Key & Relasi One-to-Many

**Foreign Key** menghubungkan satu tabel ke tabel lain dengan memastikan nilai
di kolom child ada di kolom PK parent.

**Contoh di blog sederhana:**

- `users.id` – primary key user.
- `posts.user_id` – foreign key yang **REFERENCES users(id)**.

**Dengan FK, database otomatis mencegah:**

- Insert post dengan `user_id` yang tidak ada di `users`.
- Menghapus user yang masih dipakai di `posts` (kecuali kita set aksi khusus
  seperti `ON DELETE CASCADE`).

### 4. Konvensi penamaan tabel & kolom

- Nama tabel: **jamak**, **snake_case** → `users`, `posts`.
- Primary key: biasanya `id`.
- Foreign key: `<nama_tabel_sumber>_id` → `user_id`.
- Timestamp: `created_at`, `updated_at`.

---

## Praktik: Buat Tabel `users` dan `posts` di `blog_db`

Asumsi dari Sesi sebelumnya:

- PostgreSQL sudah jalan (via installer atau mise).
- Database `blog_db` dan user `blog_user` sudah ada.

### 1. Masuk ke database `blog_db`

#### A. Via `psql`

Jika pakai superuser `postgres`:

```bash wrap
psql -h localhost -d blog_db -U postgres
```

Jika pakai user app `blog_user`:

```bash wrap
psql -h localhost -d blog_db -U blog_user
```

Kalau diminta password, masukkan yang Anda set di Sesi sebelumnya.

Prompt akan terlihat seperti:

```text
blog_db=>
```

### 2. Buat tabel `users`

Di prompt `psql`, jalankan:

```sql wrap
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Penjelasan singkat:

- `GENERATED ALWAYS AS IDENTITY` membuat kolom `id` auto-increment dan jadi PK.
- `email` diberi `UNIQUE` agar tidak ada dua user dengan email yang sama.
- `TIMESTAMPTZ` = timestamp dengan timezone, `DEFAULT NOW()` otomatis mengisi
  waktu insert.

Cek struktur tabel:

```sql
\d users
```

Anda akan melihat daftar kolom dan constraint, termasuk primary key.

### 3. Buat tabel `posts` dengan foreign key ke `users`

Masih di `psql`, jalankan:

```sql wrap
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
```

Penjelasan:

- `user_id` bertipe `INTEGER` karena mereferensikan `users.id` (juga integer).
- `FOREIGN KEY (user_id) REFERENCES users(id)` membuat relasi: **satu user punya
  banyak posts** (one-to-many).
- `ON DELETE RESTRICT`: kalau masih ada post, user tidak bisa dihapus (aman
  untuk blog).
- `ON UPDATE CASCADE`: kalau entah kenapa `users.id` berubah, `posts.user_id`
  ikut diperbarui.

Cek struktur tabel:

```sql
\d posts
```

Dan cek foreign key di bagian `Foreign-key constraints`.

### 4. Insert data sample

#### A. Tambah beberapa user

```sql wrap
INSERT INTO users (name, email, bio)
VALUES
  ('Budi Santoso', 'budi@example.com', 'Backend developer dan penulis tech blog.'),
  ('Ani Wijaya', 'ani@example.com', 'Fullstack developer yang hobi ngoprek database.'),
  ('Citra Dewi', 'citra@example.com', 'Frontend engineer, kadang nulis artikel tentang UI/UX.');
```

Lihat hasilnya:

```sql wrap
SELECT * FROM users;
```

Anda akan melihat `id` otomatis terisi (1, 2, 3, ...).

#### B. Tambah beberapa post terkait user

Contoh: pakai `user_id` yang baru saja dibuat (cek dari hasil
`SELECT * FROM users;`):

```sql wrap
INSERT INTO posts (user_id, title, content, category, published)
VALUES
  (
    1,
    'Pengenalan REST API',
    'REST adalah arsitektur untuk membangun API yang scalable dan mudah di-maintain...',
    'API',
    TRUE
  ),
  (
    2,
    'Kenapa Harus Pakai PostgreSQL untuk Aplikasi Production?',
    'PostgreSQL menawarkan fitur ACID, foreign key, dan kemampuan scaling yang baik...',
    'Database',
    TRUE
  ),
  (
    2,
    'Mengenal Index di PostgreSQL',
    'Index dapat mempercepat query, tapi juga punya trade-off pada penulisan data...',
    'Database',
    FALSE
  );
```

Cek data posts:

```sql
SELECT * FROM posts;
```

Jika Anda coba insert `user_id` yang tidak ada, misalnya 999:

```sql wrap
INSERT INTO posts (user_id, title, content)
VALUES (999, 'Invalid User', 'Seharusnya gagal...');
```

Database akan menolak karena **foreign key** menjaga integritas data.

### 5. Query join sederhana (user + post)

Masih di `psql`:

```sql wrap
SELECT
  p.id AS post_id,
  p.title,
  p.category,
  p.published,
  u.name AS author_name,
  u.email AS author_email
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

Query ini menggabungkan data dari `posts` dan `users` dengan memanfaatkan relasi
foreign key, persis seperti use case API blog kita nanti.

---

Dengan Sesi 3 ini, Anda sudah:

- Membuat dua tabel relasional di PostgreSQL (`users`, `posts`) dengan **primary
  key** dan **foreign key** yang benar.
- Meng-insert data sample dan melakukan query join dasar.

Selanjutnya, kita akan:

- Bahas sedikit lebih dalam tentang berbagai tipe relasi (one-to-many,
  many-to-many).
- Tambah constraint lain (NOT NULL, CHECK, default).
- Mulai bridging ke Express: menyiapkan struktur koneksi Node → PostgreSQL.
