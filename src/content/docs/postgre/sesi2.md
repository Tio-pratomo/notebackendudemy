---
title: Instalasi
---

## Materi: Pengetahuan & Konsep

### 1. Komponen yang akan kita install

- **PostgreSQL Server**: mesin database utama yang menyimpan data dan
  menjalankan query SQL.
- **psql**: command-line client untuk menjalankan perintah SQL langsung di
  terminal (akan sering kita pakai di sesi-sesi berikutnya).
- **GUI Client (DBeaver / pgAdmin)**: tool visual untuk melihat tabel, data, dan
  menjalankan query tanpa harus selalu di terminal.

### 2. Pilihan cara install (overview)

- **Windows**: pakai installer resmi PostgreSQL (EnterpriseDB) dari website
  `postgresql.org` – sudah termasuk server, psql, dan pgAdmin.
- **Ubuntu/Linux**: pakai `apt install postgresql postgresql-contrib` dari
  repository distro atau repo resmi PostgreSQL.
- **Dev-setup lintas OS**: bisa juga pakai **mise/asdf plugin postgres** untuk
  mengelola beberapa versi PostgreSQL di mesin dev.

Di bawah ini saya susun langkah-langkah. Pilih yang sesuai OS Anda.

---

## Praktik: Instalasi PostgreSQL + Buat Database `blog_db`

### 1. Instal PostgreSQL

#### A. Jika Anda pakai Windows 10/11

1. Buka: `https://www.postgresql.org/download/windows/`.
2. Klik “Download the installer” (akan diarahkan ke EnterpriseDB), lalu pilih
   versi terbaru (misal PostgreSQL 16) dan download `.exe`.
3. Jalankan installer:
   - Klik Next beberapa kali, biarkan komponen default: PostgreSQL Server,
     pgAdmin, Command Line Tools.
   - Set **password** untuk superuser `postgres` (catat, ini penting!).
   - Port: biarkan default `5432`.
   - Sisa opsi biarkan default, lalu klik Install sampai selesai.

Setelah selesai, service PostgreSQL otomatis jalan sebagai Windows Service.

#### B. Jika Anda pakai Ubuntu/Debian (termasuk WSL2)

Di terminal:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

Perintah di atas menginstall PostgreSQL dan paket tambahan resmi. Setelah
selesai, service biasanya langsung aktif; cek:

```bash
sudo systemctl status postgresql
```

Status harus `active` (running).

#### C. (Opsional) Pakai mise/asdf untuk dev environment

Kalau Anda sudah pakai **mise** sebagai version manager, cukup lakukan ini di
root project backend Anda (misal `blog-api/`):

```bash
cd blog-api   # atau folder project Anda

# 1. Deklarasikan Postgres 18.1 untuk project ini
mise use postgres@18.1

# 2. Install versi yang dideklarasikan (jika belum ada)
mise install
```

Jika anda ingin lebih memahami tool `mise` ini, bisa kunjungi :

https://tooldev-alpha.vercel.app/mise/bagian1/sesi1/

**Penjelasan singkat:**

`mise use postgres@18.1` akan:

- Menambahkan entri tool `postgres = "18.1"` ke konfigurasi project (biasanya
  `.mise.toml` di root project).
- Menandai bahwa saat Anda berada di folder ini, PATH akan pakai Postgres versi
  18 dari mise (bukan yang lain di sistem).

`mise install` akan men-download dan meng-install Postgres 18 ke direktori
internal mise jika belum tersedia.

Plugin Postgres untuk mise (berbasis ekosistem asdf) menangani build/binary dan
menyediakan tool standar seperti `psql`, `initdb`, dan `pg_ctl` di PATH ketika
aktif.

Setelah dua langkah di atas:

Anda bisa langsung pakai `psql`, `createdb`, `initdb`, dll dari terminal project
(mise yang mengatur versinya).

---

### 2. Test koneksi dengan `psql`

#### A. Windows (installer EnterpriseDB)

Cari aplikasi **SQL Shell (psql)** di Start Menu, lalu jalankan. Ikuti prompt:

- Server: tekan Enter (pakai `localhost`).
- Database: Enter (default = `postgres`).
- Port: Enter (5432).
- Username: Enter (default = `postgres`).
- Password: ketik password yang tadi Anda set (tidak akan terlihat saat
  diketik), lalu Enter.

Jika sukses, Anda akan melihat prompt seperti:

```text
postgres=#
```

#### B. Ubuntu / WSL2

Biasanya dibuat user OS dan role DB bernama `postgres`. Jalankan:

```bash
sudo -u postgres psql
```

Jika berhasil, muncul prompt:

```text
postgres=#
```

Untuk keluar dari `psql`:

```sql
\q
```

---

### 3. Buat database dan user untuk project

Sekarang kita buat database khusus untuk aplikasi blog (supaya tidak pakai
database `postgres` default).

Masuk ke `psql` seperti di langkah sebelumnya, lalu jalankan perintah:

```sql
-- 1. Buat database
CREATE DATABASE blog_db;

-- 2. Buat user (role) khusus app
CREATE USER blog_user WITH PASSWORD 'password_aman_anda';

-- 3. Beri hak ke user untuk mengelola blog_db
GRANT ALL PRIVILEGES ON DATABASE blog_db TO blog_user;
```

Pada **PostgreSQL** versi baru, nanti kita juga akan atur hak akses tabel, tapi
untuk sekarang cukup di level database.

Test koneksi sebagai `blog_user`:

- Keluar dulu dengan `\q`.
- Masuk lagi:
  - **Windows (SQL Shell):**
    - Database: ketik `blog_db`.
    - Username: `blog_user`.
    - Password: password yang barusan Anda buat.
  - **Ubuntu:**

    ```bash
    psql -h localhost -d blog_db -U blog_user
    ```

Jika berhasil, prompt akan seperti:

```text
blog_db=>
```

---

### 4. Install DBeaver dan koneksi ke PostgreSQL

Langkah ini opsional tapi sangat direkomendasikan.

1. Download DBeaver Community dari `https://dbeaver.io` lalu install.
   Dokumentasinya punya panduan driver PostgreSQL built-in.
2. Buka DBeaver → menu **Database → New Database Connection**.
3. Pilih **PostgreSQL** dari daftar driver (DBeaver sudah menyertakan driver
   ini).
4. Isi parameter koneksi:
   - Host: `localhost`
   - Port: `5432`
   - Database: `blog_db`
   - Username: `blog_user`
   - Password: (isi yang tadi Anda buat)
5. Klik **Test Connection** → harus “Connected successfully”, lalu klik
   **Finish**.

Sekarang Anda bisa melihat database `blog_db` di panel kiri, expand untuk
melihat **Schemas → public → Tables** (saat ini masih kosong, tabel akan kita
buat di sesi berikutnya).

---

Mulai sesi ini, environment yang kita asumsikan:

- PostgreSQL server jalan di `localhost:5432`.
- Ada database `blog_db`.
- Ada user `blog_user` dengan password yang Anda pilih, dan punya hak penuh di
  `blog_db`.

Selanjutnya, kita akan:

- Menulis SQL `CREATE TABLE` untuk tabel `users` dan `posts`.
- Insert data sample.
- Query dengan `SELECT`, `UPDATE`, `DELETE` memakai `psql` dan/atau DBeaver.
