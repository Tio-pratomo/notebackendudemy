---
title: Perkenalan Database
---

Kita mulai bagian baru **PostgreSQL Database Mastery** dengan fondasi konsep
dulu sebelum masuk instalasi dan coding.

## Materi: Pengetahuan & Konsep

### 1. Apa itu PostgreSQL dan kenapa kita pakai?

**PostgreSQL** adalah sistem manajemen database relasional (RDBMS) open-source
yang sangat kuat, mendukung fitur-fitur canggih seperti transaksi ACID, foreign
key, views, dan stored procedure.

**PostgreSQL** sering dipakai di backend modern (Express, NestJS, Django,
Spring, dll) karena stabil, performa bagus, dan cocok untuk data yang butuh
konsistensi tinggi (misalnya keuangan, sistem transaksi, dsb).

### 2. Database relasional dalam konteks project kita

Selama sesi sebelumnya, data masih disimpan di memory (array) atau di file CSV.
Data hilang jika server restart dan sulit di-query dengan fleksibel.

Dengan **PostgreSQL**, kita akan:

- Menyimpan data di **tables** (tabel) yang terstruktur (kolom/tipe data jelas).
- Menggunakan **SQL** (Structured Query Language) untuk `SELECT`, `INSERT`,
  `UPDATE`, `DELETE` data.
- Menghubungkan tabel lewat **primary key** dan **foreign key** agar relasi
  antar data terjaga dengan aman.

### 3. Konsep dasar yang wajib paham

Kita akan pakai istilah-istilah ini berulang kali:

- **Database**: Kumpulan tabel dalam satu “project” (misalnya `blog_db`,
  `shop_db`).
- **Table (tabel)**: Seperti sheet di Excel – berisi baris (row/record) dan
  kolom (field).
- **Row (record)**: Satu baris data lengkap, misalnya satu user atau satu
  artikel blog.
- **Column (field)**: Satu atribut, misalnya `id`, `title`, `email`,
  `created_at`, masing-masing punya tipe data (integer, text, timestamp, dll).
- **Primary Key (PK)**: Kolom yang **unik** dan **tidak boleh null**, menjadi
  identitas utama tiap baris (contoh: `id SERIAL PRIMARY KEY`).
- **Foreign Key (FK)**: Kolom yang menyimpan nilai primary key dari tabel lain,
  untuk menghubungkan dua tabel dan menjaga **referential integrity** (tidak ada
  data yatim).

Contoh sederhana skema blog yang nanti akan kita buat:

- `users` – menyimpan data user.
- `posts` – menyimpan artikel, punya kolom `user_id` yang **REFERENCES
  users(id)`** (foreign key).

### 4. Tools yang akan kita pakai di bagian PostgreSQL

Selama seri PostgreSQL nanti kita akan pakai beberapa tools:

- **PostgreSQL server**: Database engine utama yang akan dijalankan lokal (via
  `mise` atau package manager OS).
- **psql**: CLI bawaan PostgreSQL untuk menjalankan perintah SQL langsung di
  terminal.
- **DBeaver**: GUI (SQL client) untuk melihat tabel, data, dan menjalankan query
  dengan tampilan visual (mempermudah pemula).
- **Node.js + Express**: Tetap jadi backend utama; kita akan ganti data
  in-memory menjadi data dari PostgreSQL.

---

## Praktik: Mendesain Skema Database Blog Sederhana

Sebelum menyentuh instalasi, kita rancang dulu tabel yang akan dipakai, supaya
nanti saat bikin SQL dan integrasi ke Express Anda tidak bingung.

### 1. Tentukan entitas dan relasi

Untuk melanjutkan mini-project Blog di sesi sebelumnya, kita butuh minimal:

- Entitas **User**: penulis artikel.
- Entitas **Post**: artikel blog.

**Relasinya:**

**satu user bisa punya banyak post** → hubungan **one-to-many** (1 User : N
Post).

### 2. Draft struktur tabel

Kita buat versi awal desain (tanpa SQL dulu, hanya konsep):

**Tabel `users`**

- `id` – primary key, integer auto-increment (`SERIAL` di PostgreSQL).
- `name` – nama lengkap.
- `email` – unik, untuk login nanti.
- `created_at` – waktu dibuat.

**Tabel `posts`**

- `id` – primary key.
- `user_id` – foreign key, mengarah ke `users.id` (penulis).
- `title` – judul artikel.
- `content` – isi artikel (text).
- `category` – misalnya `Technology`, `Database`, dll.
- `published` – boolean, sudah dipublikasikan atau belum.
- `created_at`, `updated_at` – timestamp.

Di sesi berikutnya kita akan ubah desain ini menjadi perintah SQL `CREATE TABLE`
lengkap dan menjalankannya di PostgreSQL, lalu isi datanya dan hubungkan ke
Express.

---

Kalau desain skema ini sudah jelas, kita lanjut dengan:

- Instal PostgreSQL (kita bahas opsi pakai `mise` dan alternatif lain).
- Membuat database pertama.
- Mengakses database dengan `psql` dan DBeaver.
