---
title: Nodemon & Environment Variables
---

Sampai saat ini kita harus restart server manual setiap kali ada perubahan kode.
Sangat tidak efisien!

Di sesi ini kita akan belajar tools yang membuat development jauh lebih
produktif.

## Materi: Pengetahuan & Konsep

### 1. Masalah Development Manual

Setiap kali Anda mengubah kode di file `.js`, Anda harus:

- Stop server dengan `Ctrl+C`
- Jalankan lagi `node index.js`
- Refresh browser

Bayangkan melakukan ini puluhan kali per jam! Sangat membuang waktu dan
mengganggu fokus.

### 2. Mengenal Nodemon

Nodemon adalah tool yang secara otomatis merestart server Node.js ketika
mendeteksi perubahan file.

Ini adalah standar industri untuk development environment. Ketika Anda save
file, nodemon akan otomatis restart server dalam hitungan milidetik.

### 3. Environment Variables - Mengapa Penting?

Environment variables adalah cara menyimpan konfigurasi yang berbeda untuk
setiap lingkungan (development, testing, production).

Contoh data yang harus disimpan di environment variables:

- Port server
- Database credentials (username, password)
- API keys dari layanan pihak ketiga
- Secret keys untuk session/JWT

Jangan pernah hardcode nilai-nilai sensitif seperti password di kode! Ini adalah
security risk besar jika kode Anda di-upload ke GitHub.

### 4. Package dotenv

`dotenv` adalah library untuk memuat environment variables dari file `.env` ke
dalam `process.env`.

File `.env` harus ditambahkan ke `.gitignore` agar tidak terupload ke repository
public.

---

## Praktik

### Langkah 1: Instalasi Nodemon sebagai Dev Dependency

```bash wrap
npm install --save-dev nodemon
```

`--save-dev` artinya package ini hanya dibutuhkan saat development, tidak perlu
di production.

### Langkah 2: Instalasi dotenv

```bash wrap
npm install dotenv
```

### Langkah 3: Update package.json dengan Scripts

```json wrap
{
  "name": "belajar-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"No tests yet\""
  },
  "dependencies": {
    "dotenv": "^16.4.0",
    "ejs": "^3.1.9",
    "express": "^4.18.2",
    "express-ejs-layouts": "^2.5.1",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Langkah 4: Buat File .env

Buat file `.env` di root project (sejajar dengan `index.js`):

```text wrap
# Server Configuration
PORT=3000
NODE_ENV=development

# Application Settings
APP_NAME=Belajar Backend
APP_VERSION=1.0.0

# Database Configuration (akan digunakan di sesi PostgreSQL nanti)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_dev
DB_USER=postgres
DB_PASSWORD=your_secret_password

# API Keys (contoh untuk nanti)
WEATHER_API_KEY=your_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id

# Session Secret (untuk authentication nanti)
SESSION_SECRET=super_secret_key_2026
```

### Langkah 5: Buat File .env.example

File ini adalah template yang aman di-share ke GitHub:

```txt wrap
# Server Configuration
PORT=3000
NODE_ENV=development

# Application Settings
APP_NAME=Your App Name
APP_VERSION=1.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# API Keys
WEATHER_API_KEY=your_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id

# Session Secret
SESSION_SECRET=generate_random_string_here
```

### Langkah 6: Buat File .gitignore

```
# Dependencies
node_modules/

# Environment Variables
.env

# Logs
*.log

# OS Files
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/

# Build files (untuk nanti)
dist/
build/
```

### Langkah 7: Update Server untuk Menggunakan Environment Variables

```javascript wrap
import express from "express";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import dotenv from "dotenv";

// Load environment variables dari file .env
dotenv.config();

const app = express();

// Gunakan environment variables
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || "development";
const appName = process.env.APP_NAME || "Express App";

// Middleware
// Gunakan different morgan format berdasarkan environment
if (nodeEnv === "development") {
  app.use(morgan("dev")); // Colorful dan detailed untuk dev
} else {
  app.use(morgan("combined")); // Standard Apache format untuk production
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// EJS
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Global variables
app.use((req, res, next) => {
  res.locals.siteName = appName;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  res.locals.nodeEnv = nodeEnv; // Expose ke views
  next();
});

// Routes
app.get("/", (req, res) => {
  res.render("pages/home", {
    pageTitle: "Beranda",
  });
});

// Route untuk melihat environment info (JANGAN LAKUKAN INI DI PRODUCTION!)
app.get("/debug/env", (req, res) => {
  if (nodeEnv === "production") {
    return res.status(403).send("Access denied in production");
  }

  res.json({
    port: port,
    nodeEnv: nodeEnv,
    appName: appName,
    appVersion: process.env.APP_VERSION,
    // JANGAN expose data sensitif seperti password atau API keys!
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbName: process.env.DB_NAME,
    // dbPassword: "HIDDEN FOR SECURITY", // Jangan tampilkan!
  });
});

// Config route untuk melihat konfigurasi aplikasi
app.get("/config", (req, res) => {
  res.render("pages/config", {
    pageTitle: "Konfigurasi Aplikasi",
    config: {
      port: port,
      environment: nodeEnv,
      appName: appName,
      version: process.env.APP_VERSION,
      isDevelopment: nodeEnv === "development",
      isProduction: nodeEnv === "production",
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Tampilkan detail error hanya di development
  if (nodeEnv === "development") {
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Di production, jangan expose detail error
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong",
    });
  }
});

app.listen(port, () => {
  console.log("=".repeat(50));
  console.log(`🚀 ${appName} v${process.env.APP_VERSION}`);
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`🔧 Environment: ${nodeEnv}`);
  console.log(`⏰ Started: ${new Date().toLocaleString("id-ID")}`);
  console.log("=".repeat(50));
});
```

### Langkah 8: Buat Config Page

```html wrap title="views/pages/config.ejs" wrap
<section class="container mt-3">
  <h2><%= pageTitle %></h2>

  <div class="config-card">
    <h3>📊 Server Information</h3>
    <table class="config-table">
      <tr>
        <td><strong>Application Name:</strong></td>
        <td><%= config.appName %></td>
      </tr>
      <tr>
        <td><strong>Version:</strong></td>
        <td><%= config.version %></td>
      </tr>
      <tr>
        <td><strong>Port:</strong></td>
        <td><%= config.port %></td>
      </tr>
      <tr>
        <td><strong>Environment:</strong></td>
        <td>
          <span
            class="badge <%= config.isDevelopment ? 'badge-dev' : 'badge-prod' %>"
          >
            <%= config.environment.toUpperCase() %>
          </span>
        </td>
      </tr>
      <tr>
        <td><strong>Node.js Version:</strong></td>
        <td><%= process.version %></td>
      </tr>
    </table>
  </div>

  <% if (config.isDevelopment) { %>
  <div class="alert alert-warning mt-2">
    ⚠️ <strong>Development Mode:</strong> Detailed errors are enabled. Don't use
    this in production!
  </div>

  <div class="config-card mt-2">
    <h3>🔍 Debug Info</h3>
    <p><a href="/debug/env" target="_blank">View Environment Variables</a></p>
    <p class="text-secondary">
      <small>This endpoint is disabled in production mode.</small>
    </p>
  </div>
  <% } %>
</section>

<style>
  .config-card {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .config-table {
    width: 100%;
    margin-top: 20px;
  }

  .config-table td {
    padding: 12px 0;
    border-bottom: 1px solid #eee;
  }

  .badge {
    padding: 5px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }

  .badge-dev {
    background: #3498db;
    color: white;
  }

  .badge-prod {
    background: #e74c3c;
    color: white;
  }

  .alert-warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    padding: 15px;
    border-radius: 8px;
  }
</style>
```

### Langkah 9: Testing Nodemon

1. **Jalankan dengan nodemon:**

```bash wrap
npm run dev
```

2. **Test auto-restart:**
   - Ubah `APP_NAME` di `.env` menjadi "Super App"
   - Save file
   - Lihat terminal - server otomatis restart!
   - Refresh browser dan lihat perubahan

3. **Test dengan kode JavaScript:**
   - Tambahkan route baru di `index.js`:

   ```javascript wrap
   app.get("/test", (req, res) => {
     res.send("Route baru!");
   });
   ```

   - Save file
   - Nodemon auto-restart
   - Langsung akses `/test` tanpa restart manual

**Langkah 10: Menjalankan Mode Production**

```bash wrap
# Set environment ke production dan jalankan
NODE_ENV=production npm start
```

Atau di Windows PowerShell:

```powershell wrap
$env:NODE_ENV="production"; npm start
```

**Best Practices:**

- Jangan pernah commit file `.env` ke Git
- Gunakan `.env.example` sebagai template untuk tim
- Di production, set environment variables via server config (Heroku, AWS, dll)
- Gunakan `npm run dev` untuk development
- Gunakan `npm start` untuk production
- Generate random string untuk `SESSION_SECRET` (bisa pakai online generator)

**Security Tips:**

- Jangan expose `/debug/env` di production
- Jangan tampilkan password atau API keys bahkan di development
- Rotate API keys secara berkala
- Gunakan secrets manager di production (AWS Secrets Manager, HashiCorp Vault)

Selamat! Anda sekarang punya development workflow yang profesional dengan
auto-reload dan environment management yang aman!
