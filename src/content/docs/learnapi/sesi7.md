---
title: Fake Database dengan CSV – Countries API
---

Di sesi ini kita membangun REST API yang mengambil data dari file CSV (bukan
database), sebagai jembatan sebelum masuk ke PostgreSQL di sesi berikutnya.

## Materi: Pengetahuan & Konsep

### 1. CSV sebagai fake database

CSV (Comma Separated Values) adalah format teks sederhana untuk menyimpan data
tabel: tiap baris adalah record, tiap kolom dipisah koma.

File `countries.csv`, `capitals.csv`, dan `flags.csv` berisi daftar negara,
kode, ibukota, dan nama bendera yang bisa kita anggap sebagai sumber data
sementara.

Dalam project kecil, membaca CSV ke memory lalu mengaksesnya lewat REST API
sudah cukup sebelum memakai database sungguhan.

### 2. Membaca CSV di Node.js

Node menyediakan module `fs` untuk membaca file, lalu kita gunakan library
`csv-parse` agar parsing CSV jadi robust (support header, skip empty lines,
dll).

Contoh pola umum dengan API sync-nya: baca seluruh isi file sebagai string, lalu
panggil `parse(input, { columns: true, skip_empty_lines: true })` untuk
mendapatkan array of objects yang enak dipakai di JavaScript.

### 3. Load sekali, reuse di semua request

Untuk file CSV yang ukurannya kecil–sedang, pola yang baik adalah: baca dan
parse CSV sekali saat server start, simpan hasilnya di memory (array/objek), dan
gunakan array itu di setiap request.

Ini jauh lebih efisien daripada membaca file lagi di setiap request dan akan
terasa mirip dengan konsep “data di database yang sudah di-load” yang nanti kita
terapkan dengan PostgreSQL.

### 4. Menggabungkan beberapa sumber data

Kita punya tiga file: negara, ibukota, dan nama bendera; API yang bagus akan
menggabungkannya sehingga client cukup memanggil satu endpoint.

Di JavaScript, ini bisa dilakukan dengan membuat map (object/dictionary)
berdasarkan key tertentu (misalnya nama negara), lalu saat iterate daftar negara
kita tambahkan properti `capital` dan `flagName` dari map tersebut jika cocok.

---

## Praktik

Kita akan membuat `countries-api` dengan endpoint utama:

- `GET /api/v1/countries` – list semua negara (support query `search`)
- `GET /api/v1/countries/:code` – detail negara berdasar `countrycode`

### 1. Setup project

```bash wrap
mkdir countries-api
cd countries-api
npm init -y

npm install express morgan dotenv csv-parse
npm install --save-dev nodemon
```

`package.json` (bagian penting saja):

```json
{
  "name": "countries-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "csv-parse": "^6.1.0",
    "dotenv": "^16.4.0",
    "express": "^4.18.2",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

Buat struktur folder:

```text
countries-api/
├── data/
│   ├── countries.csv   # dari space
│   ├── capitals.csv    # dari space
│   ├── flags.csv       # dari space
│   └── countries.data.js
├── controllers/
│   └── countries.controller.js
├── routes/
│   ├── countries.routes.js
│   └── index.js
├── .env
├── index.js
└── package.json
```

Buat file **`.env`**:

```text
PORT=4001
NODE_ENV=development
API_VERSION=v1
```

Salin tiga file CSV yang sudah ada (`countries.csv`, `capitals.csv`,
`flags.csv`) ke folder `data/` dengan nama yang sama.

### 2. Data loader dari CSV

Kita baca ketiga CSV saat server start, lalu gabungkan jadi satu array
`countries`.

```javascript title="data/countries.data.js" wrap
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync"; // API sync untuk parse cepat.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readCsv(fileName) {
  const filePath = path.join(__dirname, fileName);
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
}

// Load raw data
const countriesRaw = readCsv("countries.csv"); // id, countrycode, countryname.[file:46]
const capitalsRaw = readCsv("capitals.csv"); // id, country, capital.[file:45]
const flagsRaw = readCsv("flags.csv"); // id, name, flag.[file:47]

// Buat map untuk capitals dan flags berdasarkan nama negara
const capitalByCountry = new Map();
capitalsRaw.forEach((row) => {
  // Standarkan spasi
  capitalByCountry.set(row.country.trim(), row.capital.trim());
});

const flagByCountry = new Map();
flagsRaw.forEach((row) => {
  flagByCountry.set(row.name.trim(), row.flag?.trim() || null);
});

// Gabungkan ke satu struktur
export const countries = countriesRaw.map((row) => {
  const name = row.countryname.trim();
  const code = row.countrycode.trim();

  return {
    id: Number(row.id),
    code,
    name,
    capital: capitalByCountry.get(name) || null,
    flagName: flagByCountry.get(name) || null,
  };
});

// Helper untuk mencari
export function findAll({ search } = {}) {
  let result = [...countries];

  if (search && search.trim() !== "") {
    const term = search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        (c.capital && c.capital.toLowerCase().includes(term))
    );
  }

  // Sort by name asc
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

export function findByCode(code) {
  if (!code) return null;
  const upper = code.toUpperCase();
  return countries.find((c) => c.code.toUpperCase() === upper) || null;
}
```

Catatan: karena data CSV tidak selalu 100% konsisten, bisa saja ada negara yang
tidak punya capital atau flag; kita tangani dengan `null`.

### 3. Countries controller

```javascript wrap title="controllers/countries.controller.js"
import { findAll, findByCode } from "../data/countries.data.js";

export async function getAllCountries(req, res) {
  const { search } = req.query;
  const data = findAll({ search });

  res.json({
    success: true,
    count: data.length,
    data,
    meta: {
      search: search || null,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function getCountryByCode(req, res) {
  const { code } = req.params;
  const country = findByCode(code);

  if (!country) {
    return res.status(404).json({
      success: false,
      error: "Country not found",
      code,
    });
  }

  res.json({
    success: true,
    data: country,
  });
}
```

### 4. Routes

```javascript title="routes/countries.routes.js dan routes/index.js" wrap
import express from "express";
import {
  getAllCountries,
  getCountryByCode,
} from "../controllers/countries.controller.js";

const router = express.Router();

// GET /api/v1/countries
router.get("/", getAllCountries);

// GET /api/v1/countries/:code
router.get("/:code", getCountryByCode);

export default router;
```

```javascript title="routes/index.js" wrap
import express from "express";
import countriesRoutes from "./countries.routes.js";

const router = express.Router();

router.use("/countries", countriesRoutes);

router.get("/", (req, res) => {
  res.json({
    message: "Countries API",
    version: "v1",
    endpoints: {
      list: "/api/v1/countries",
      detail: "/api/v1/countries/:code",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

### 5. Entry point server

```javascript title="index.js" wrap
import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;
const apiVersion = process.env.API_VERSION || "v1";

// Middleware dasar
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Countries API with CSV",
    version: apiVersion,
    status: "running",
    docs: `http://localhost:${port}/api/${apiVersion}`,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use(`/api/${apiVersion}`, apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

app.listen(port, () => {
  console.log("=".repeat(60));
  console.log(`Countries API running at http://localhost:${port}`);
  console.log(`GET /api/${apiVersion}/countries`);
  console.log(`GET /api/${apiVersion}/countries/:code`);
  console.log("=".repeat(60));
});
```

### 6. Cara testing

Jalankan server:

```bash
npm run dev
```

Coba beberapa request (Postman/Thunder Client atau browser):

1. List semua negara (default sorted by name):

```text
GET http://localhost:4001/api/v1/countries
```

2. Cari dengan query `search`:

```text
GET http://localhost:4001/api/v1/countries?search=indo
```

3. Ambil detail negara berdasarkan `countrycode`:

```text
GET http://localhost:4001/api/v1/countries/ID   # Indonesia
GET http://localhost:4001/api/v1/countries/US   # United States
GET http://localhost:4001/api/v1/countries/JP   # Japan
```

Anda akan melihat kombinasi `name`, `code`, `capital`, dan `flagName` yang
diambil dari tiga file CSV sekaligus.

Dengan Sesi 20 ini, Anda sudah:

- Menggunakan file CSV sebagai sumber data API.
- Menerapkan kembali konsep routing, params, dan query di Express.
- Menyiapkan pola “load data ke memory, expose lewat REST API” yang sangat mirip
  dengan cara kita akan memakai PostgreSQL nanti.

Kalau sudah nyaman dengan ini, sesi berikutnya kita mulai masuk ke
**PostgreSQL** sebagai database sungguhan.
