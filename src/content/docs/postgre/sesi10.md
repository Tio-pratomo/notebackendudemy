---
title: Database Migration
---

Kita masuk materi **Database Migration dengan node‑pg‑migrate** – supaya
perubahan schema PostgreSQL kamu rapi, versioned, dan bisa diulang di mesin mana
pun.

## Materi: Pengetahuan & Konsep

### 1. Apa itu database migration?

Migration adalah “skrip perubahan database” yang bisa dijalankan **maju**
(apply) dan **mundur** (rollback) untuk menjaga schema database tetap sinkron
dengan kode aplikasi.

Tanpa migration, kita biasanya:

- Ketik SQL manual di `psql`/DBeaver.
- Susah track versi schema, susah sync antara laptop dev, staging, dan
  production.

Dengan migration:

- Setiap perubahan schema dicatat sebagai file (misal
  `1707280000_create_users.js`).
- Bisa dijalankan di CI/CD, development, staging, production dengan perintah
  yang sama.

### 2. Kenapa pakai node‑pg‑migrate?

`node-pg-migrate` adalah tool migration untuk PostgreSQL yang ditulis dengan
Node.js, cocok dengan stack Express + `pg` yang sudah kamu pakai.

Fitur penting:

- Migration ditulis dalam **JavaScript/TypeScript**, tapi bisa juga isi SQL
  mentah.
- Mendukung `up` dan `down` function di tiap file migration.
- Menyimpan status migration di tabel khusus (default `pgmigrations`) agar tahu
  migration mana yang sudah jalan.

---

## Praktik: Setup node‑pg‑migrate untuk Blog API

Kita akan:

1. Install dan konfigurasi `node-pg-migrate`.
2. Membuat migration awal yang membuat tabel `users`, `posts`, `tags`,
   `post_tags` beserta constraint (PK, FK, CHECK).
3. Menjalankan migration dan menghapus SQL manual yang sebelumnya kita jalankan
   di `psql`.

Semua langkah diatas, dieksekusi di dalam project `blog-api`.

### 1. Install node‑pg‑migrate dan bikin script di package.json

Di root `blog-api`:

```bash
npm install --save-dev node-pg-migrate
```

Update `package.json` bagian scripts:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "db:migrate": "node-pg-migrate",
    "db:migrate:down": "node-pg-migrate down"
  }
}
```

`node-pg-migrate` akan membaca konfigurasi dari CLI args atau
environment/`database.json` sesuai dokumentasi.

### 2. Konfigurasi koneksi untuk node‑pg‑migrate

Cara simpel: pakai **connection string** via env var `DATABASE_URL` yang sudah
kita definisikan.

Di `.env` (blog-api):

```text
DATABASE_URL=postgresql://blog_user:password_dev@localhost:5432/blog_db
```

Lalu buat file `database.json` di root project:

```json
{
  "dev": {
    "databaseUrl": "env:DATABASE_URL",
    "dir": "migrations",
    "direction": "up",
    "count": 1
  }
}
```

- `env:DATABASE_URL` memberi tahu node‑pg‑migrate untuk baca dari environment
  variable.
- `dir`: folder migration (`migrations/`).
- Mode default kita pakai environment `dev`.

Buat folder:

```bash
mkdir migrations
```

### 3. Buat migration awal: create base tables

Jalankan:

```bash
npm run db:migrate create create_base_tables
```

Perintah ini akan membuat file baru di `migrations/` dengan nama seperti:

```text
migrations/
└── 1707280000000_create_base_tables.js
```

Buka file tersebut dan isi dengan migration yang sesuai schema kita:

```javascript
/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // USERS
  pgm.createTable("users", {
    id: {
      type: "integer",
      primaryKey: true,
      notNull: true,
      generated: { identity: "always" }, // GENERATED ALWAYS AS IDENTITY[web:247][web:253]
    },
    name: { type: "varchar(100)", notNull: true },
    email: { type: "varchar(150)", notNull: true, unique: true },
    bio: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // POSTS
  pgm.createTable("posts", {
    id: {
      type: "integer",
      primaryKey: true,
      notNull: true,
      generated: { identity: "always" },
    },
    user_id: { type: "integer", notNull: true },
    title: { type: "varchar(200)", notNull: true },
    content: { type: "text", notNull: true },
    category: { type: "varchar(50)" },
    published: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: { type: "timestamptz" },
  });

  // RELASI users -> posts
  pgm.addConstraint("posts", "fk_posts_user", {
    foreignKeys: {
      columns: "user_id",
      references: "users(id)",
      onDelete: "restrict",
      onUpdate: "cascade",
    },
  });

  // CHECK constraints untuk posts (judul & category)
  pgm.addConstraint("posts", "posts_title_length_check", {
    check: "char_length(trim(title)) >= 5",
  });

  pgm.addConstraint("posts", "posts_category_check", {
    check:
      "category IS NULL OR category IN ('API', 'Database', 'JavaScript', 'DevOps')",
  });

  // TAGS
  pgm.createTable("tags", {
    id: {
      type: "integer",
      primaryKey: true,
      notNull: true,
      generated: { identity: "always" },
    },
    name: { type: "varchar(50)", notNull: true, unique: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // POST_TAGS (tabel penghubung many-to-many)
  pgm.createTable("post_tags", {
    post_id: { type: "integer", notNull: true },
    tag_id: { type: "integer", notNull: true },
  });

  // PRIMARY KEY gabungan (post_id, tag_id)
  pgm.addConstraint("post_tags", "pk_post_tags", {
    primaryKey: ["post_id", "tag_id"],
  });

  // FK ke posts
  pgm.addConstraint("post_tags", "fk_post_tags_post", {
    foreignKeys: {
      columns: "post_id",
      references: "posts(id)",
      onDelete: "cascade",
    },
  });

  // FK ke tags
  pgm.addConstraint("post_tags", "fk_post_tags_tag", {
    foreignKeys: {
      columns: "tag_id",
      references: "tags(id)",
      onDelete: "cascade",
    },
  });

  // INDEX dasar
  pgm.createIndex("posts", "created_at", {
    name: "idx_posts_created_at",
  });
  pgm.createIndex("posts", ["published", "category", "created_at"], {
    name: "idx_posts_published_category_created",
  });
};

exports.down = (pgm) => {
  // Urutan kebalikan dari up
  pgm.dropIndex("posts", "created_at", { ifExists: true });
  pgm.dropIndex("posts", ["published", "category", "created_at"], {
    name: "idx_posts_published_category_created",
    ifExists: true,
  });

  pgm.dropTable("post_tags", { ifExists: true });
  pgm.dropTable("tags", { ifExists: true });
  pgm.dropTable("posts", { ifExists: true });
  pgm.dropTable("users", { ifExists: true });
};
```

API `pgm` di atas mengikuti dokumentasi node‑pg‑migrate untuk `createTable`,
`addConstraint`, dan `createIndex`.

> Catatan
>
> Kalau sebelumnya kamu sudah membuat tabel `users`, `posts`, `tags`,
> `post_tags` secara manual, **drop dulu tabel-tabel itu** sebelum menjalankan
> migration, atau mulai dengan database kosong untuk bagian ini.

### 4. Jalankan migration

Sekarang jalankan:

```bash
npm run db:migrate
```

Ini akan:

- Membaca `database.json` (env `dev`).
- Koneksikan ke `DATABASE_URL`.
- Menjalankan migration `create_base_tables`.
- Mencatat status migration di tabel internal (misalnya `pgmigrations`).

Cek di `psql`:

```sql
\dt
```

Pastikan tabel `users`, `posts`, `tags`, `post_tags`, dan tabel migration sudah
ada.

Kalau mau rollback migration:

```bash
npm run db:migrate:down
```

`down` akan menjalankan `exports.down` dari migration terakhir.

### 5. Sinkronkan kode Node dengan schema dari migration

Karena schema yang dihasilkan migration sama dengan yang kita pakai sebelumnya
(id identity, FK, CHECK, index), kode Node.js/Express yang sudah kamu tulis
(repository, controller, tags, posts) **tidak perlu diubah** – mereka akan
bekerja dengan schema baru yang dibuat oleh migration.

Mulai sekarang, kalau mau:

- Tambah kolom baru (misalnya `slug` di `posts`).
- Tambah tabel baru (misalnya `comments`).

Jangan lagi ketik SQL manual di `psql`, tapi:

1. Buat migration baru:
   ```bash
   npm run db:migrate create add_slug_to_posts
   ```
2. Edit file migration (tambah kolom) di `exports.up` / `exports.down`.
3. Jalankan `npm run db:migrate`.

---

Dengan **Sesi 10**, kamu sudah:

- Mengenal konsep **database migration** dan kenapa penting untuk menjaga schema
  konsisten antar environment.
- Men-setup `node-pg-migrate` di project Express + PostgreSQL kamu.
- Memindahkan definisi schema utama (`users`, `posts`, `tags`, `post_tags`,
  constraints, index) ke migration yang versioned.
