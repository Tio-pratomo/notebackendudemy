---
title: Koneksi Express Dengan PostgreSQL
---

Di **Sesi 5** kita mulai menghubungkan **Express** ke **PostgreSQL** menggunakan
library `pg` (node-postgres) dengan pola yang rapi dan siap production.

## Materi: Pengetahuan & Konsep

### 1. node-postgres (`pg`) dan connection pool

`pg` adalah koleksi module Node.js untuk koneksi ke PostgreSQL (library standar
di ekosistem Node).

Untuk aplikasi web (banyak request), best practice adalah pakai **`Pool`**
(connection pool), bukan membuat koneksi baru di setiap request.

`Pool` akan:

- Menjaga sejumlah koneksi aktif ke database.
- Membagikan koneksi ke setiap query (reuse).
- Menutup koneksi idle sesuai konfigurasi (`idleTimeoutMillis`, dll.).

### 2. Konfigurasi koneksi via environment variables

`pg.Pool` bisa membaca konfigurasi dari environment variables standar PostgreSQL
(`PGHOST`, `PGUSER`, dll.) atau dari connection string
`postgresql://user:pass@host:port/db`.

Ini membuat kode Anda sama antara development dan production. Yang beda, hanya
**nilai env** yang diset di `.env` / server.

### 3. Pola akses database yang rapi

**Kita akan pakai pola:**

- `db/pool.js` – inisialisasi `Pool` dan helper `query`.
- `repositories/*.repository.js` – fungsi CRUD SQL per tabel (misalnya
  `users.repository.js`, `posts.repository.js`).
- `controllers` – memanggil repository, lalu mengembalikan response Express.

Ini menjaga separation of concerns dan memudahkan testing.

---

## Praktik: Integrasi Express + PostgreSQL (`pg`) di Blog API

Kita lanjut di project backend utama (misalnya `blog-api/`), yang nantinya akan
mengganti in-memory data.

### 1. Install `pg` dan `dotenv`

Di folder project Express (bukan di `countries-api`):

```bash wrap
cd blog-api
npm install pg dotenv
```

Pastikan `blog-api` sudah pakai `type: "module"` di `package.json` agar bisa
menggunakan `import`.

### 2. Setup environment variables untuk DB

Update atau buat `.env` di `blog-api`:

```text wrap
PORT=4000
NODE_ENV=development
API_VERSION=v1

DB_HOST=localhost
DB_PORT=5432
DB_USER=blog_user
DB_PASSWORD=password_dev
DB_NAME=blog_db

# Opsional: connection string penuh, bisa dipakai di production
# DATABASE_URL=postgresql://blog_user:password_dev@localhost:5432/blog_db
```

`pg` bisa memakai environment variables ini langsung jika kita tidak memberi
konfigurasi eksplisit pada `Pool`.

### 3. Buat modul koneksi database

Buat folder `db/` di root `blog-api` lalu file `db/pool.js`:

```javascript wrap title="db/pool.js"
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Opsi 1: pakai DATABASE_URL kalau ada (cocok untuk production seperti Heroku)
const connectionString = process.env.DATABASE_URL;

// Konfigurasi dasar pool
const pool = connectionString
  ? new Pool({
      connectionString,
      // opsi ssl dsb bisa ditambah nanti untuk production
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "blog_user",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "blog_db",
      max: 10, // maksimal koneksi dalam pool
      idleTimeoutMillis: 30000, // 30 detik
      connectionTimeoutMillis: 2000, // 2 detik
    }); // konfigurasi ini mengikuti pola resmi node-postgres.[web:182][web:186][web:192]

// Helper untuk query sederhana
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.log("DB QUERY:", { text, duration, rows: res.rowCount });
  }

  return res;
}

// Untuk transaksi kompleks, bisa pakai client manual (nanti)
export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Graceful shutdown (opsional, misal untuk testing)
export async function closePool() {
  await pool.end();
}
```

`Pool` di atas sesuai dengan dokumentasi `pg` dan menggunakan env vars untuk
konfigurasi koneksi.

### 4. Buat repository untuk `users` dan `posts`

```javascript title="repositories/users.repository.js" wrap
import { query } from "../db/pool.js";

// Dapatkan semua user
export async function getAllUsers() {
  const sql = `
    SELECT id, name, email, bio, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  const result = await query(sql);
  return result.rows;
}

// Dapatkan user by id
export async function getUserById(id) {
  const sql = `
    SELECT id, name, email, bio, created_at
    FROM users
    WHERE id = $1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

// Create user baru
export async function createUser({ name, email, bio }) {
  const sql = `
    INSERT INTO users (name, email, bio)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, bio, created_at
  `;
  const params = [name, email, bio || null];
  const result = await query(sql, params);
  return result.rows[0];
}
```

Query di atas mengikuti gaya `pg`: query text + parameter array (`$1`, `$2`,
...).

```javascript title="repositories/posts.repository.js" wrap
import { query } from "../db/pool.js";

// Ambil semua posts dengan author
export async function getAllPosts() {
  const sql = `
    SELECT
      p.id,
      p.title,
      p.category,
      p.published,
      p.created_at,
      u.id AS author_id,
      u.name AS author_name,
      u.email AS author_email
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `;
  const result = await query(sql);
  return result.rows;
}

// Ambil 1 post by id
export async function getPostById(id) {
  const sql = `
    SELECT
      p.id,
      p.title,
      p.content,
      p.category,
      p.published,
      p.created_at,
      p.updated_at,
      u.id AS author_id,
      u.name AS author_name,
      u.email AS author_email
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = $1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

// Create post baru
export async function createPost({
  user_id,
  title,
  content,
  category,
  published,
}) {
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
  const result = await query(sql, params);
  return result.rows[0];
}
```

Nanti bisa ditambah fungsi `updatePost`, `deletePost`, dll., tetapi untuk sesi
ini cukup dulu yang fundamental.

### 5. Hubungkan repository dengan Express controller

Contoh: kita buat controller baru yang pakai repository ini (bisa ganti /
paralel dengan in-memory controller lama).

```javascript title="controllers/users.sql.controller.js" wrap
import * as UsersRepo from "../repositories/users.repository.js";

export async function getUsers(req, res) {
  try {
    const users = await UsersRepo.getAllUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("getUsers error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
}

export async function getUser(req, res) {
  try {
    const user = await UsersRepo.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("getUser error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
    });
  }
}

export async function createUser(req, res) {
  try {
    const { name, email, bio } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "Name and email are required",
      });
    }

    const newUser = await UsersRepo.createUser({ name, email, bio });

    res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    console.error("createUser error:", error);

    // Tangani duplikat email (unique constraint)
    if (error.code === "23505") {
      // kode error unique_violation di PostgreSQL.[web:178]
      return res.status(409).json({
        success: false,
        error: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
}
```

```javascript title="routes/users.sql.routes.js" wrap
import express from "express";
import * as UsersSqlController from "../controllers/users.sql.controller.js";

const router = express.Router();

router.get("/", UsersSqlController.getUsers);
router.get("/:id", UsersSqlController.getUser);
router.post("/", UsersSqlController.createUser);

export default router;
```

Lalu di `routes/index.js` tambahkan:

```javascript title="routes/index.js" wrap
import usersSqlRoutes from "./users.sql.routes.js";

router.use("/sql/users", usersSqlRoutes);
```

Sehingga Anda punya endpoint:

- `GET /api/v1/sql/users`
- `GET /api/v1/sql/users/:id`
- `POST /api/v1/sql/users`

yang benar-benar membaca/menulis ke PostgreSQL.

### 6. Testing koneksi dan endpoint

1. Jalankan server Express:

```bash
npm run dev
```

2. Test koneksi dasar via sebuah route sederhana yang query `SELECT NOW()`:

Tambah route cepat di `index.js` (opsional untuk diagnosis):

```javascript title="index.js" wrap
import { query as dbQuery } from "./db/pool.js";

app.get("/db-health", async (req, res) => {
  try {
    const result = await dbQuery("SELECT NOW() AS now");
    res.json({
      success: true,
      dbTime: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Database connection failed",
      details: error.message,
    });
  }
});
```

Cek di browser/Postman:

```text
GET http://localhost:4000/db-health
```

Harus mengembalikan timestamp dari database (bukan dari Node).

3. Test endpoint `users`:

- `GET http://localhost:4000/api/v1/sql/users`
- `POST http://localhost:4000/api/v1/sql/users` dengan body JSON:

  ```json
  {
    "name": "User dari API",
    "email": "apiuser@example.com",
    "bio": "Dibuat lewat endpoint Express yang terhubung PostgreSQL."
  }
  ```

Kalau berhasil, Anda akan melihat row baru muncul di tabel `users` saat
di-`SELECT` via `psql`/DBeaver.

---

Dengan Sesi 5 ini, Anda sudah:

- Mengkonfigurasi `pg.Pool` dengan env vars dan connection string (pola standar
  node-postgres).
- Membuat layer repository untuk mengakses tabel `users` dan `posts`.
- Menghubungkan repository ke Express controller sehingga REST API benar-benar
  menyimpan data di PostgreSQL, bukan lagi in-memory.

Selanjutnya, kita bisa:

- Lengkapi full CRUD untuk `posts` (create, list, detail, update, delete).
- Tambah endpoint filter (by author, by category, by tag) dengan query SQL yang
  memanfaatkan relasi yang sudah kita desain.
