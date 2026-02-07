---
title: CORS & Custom Middleware
---

Setelah membangun struktur modular di Sesi 4, sekarang kita akan belajar dua
topik penting untuk API production-ready: CORS dan Custom Middleware.

## Materi: Pengetahuan & Konsep

### 1. Apa itu CORS (Cross-Origin Resource Sharing)?

CORS adalah mekanisme keamanan browser yang membatasi web page dari satu domain
untuk mengakses resources dari domain lain.

**Skenario Nyata:**

```
Frontend: http://localhost:3000 (React App)
API:      http://localhost:4000 (Express API)

❌ Tanpa CORS: Browser akan BLOCK request dari frontend ke API
✅ Dengan CORS: Browser mengizinkan request cross-origin
```

### 2. Same-Origin Policy - Aturan Browser

Browser menganggap dua URL sebagai "same origin" hanya jika ketiganya sama:

- **Protocol**: http vs https
- **Domain**: localhost vs example.com
- **Port**: 3000 vs 4000

**Contoh:**

```
http://localhost:3000  → http://localhost:4000  ❌ Different port (CORS needed)
http://example.com     → https://example.com    ❌ Different protocol
http://api.example.com → http://example.com     ❌ Different subdomain
http://localhost:3000  → http://localhost:3000  ✅ Same origin (no CORS)
```

### 3. CORS Error yang Sering Muncul

```
Access to fetch at 'http://localhost:4000/api/posts' from origin
'http://localhost:3000' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the
requested resource.
```

Ini adalah error paling umum yang dialami developer pemula!

### 4. Jenis-Jenis CORS Requests

**Simple Request:**

- Method: GET, HEAD, POST
- Headers sederhana saja
- Content-Type: text/plain, application/x-www-form-urlencoded

**Preflight Request (OPTIONS):**

Browser mengirim request OPTIONS terlebih dahulu untuk "bertanya" apakah server
mengizinkan request yang sebenarnya. Ini terjadi jika:

- Method: PUT, PATCH, DELETE
- Custom headers (Authorization, X-Custom-Header)
- Content-Type: application/json

### 5. Custom Middleware - Power Express

Middleware adalah function yang punya akses ke `req`, `res`, dan `next()`. Kita
bisa membuat middleware untuk:

- Logging setiap request
- Authentication/Authorization
- Rate limiting
- Request timing
- Request transformation
- Response formatting

**Struktur Middleware:**

```javascript wrap
function myMiddleware(req, res, next) {
  // Do something
  console.log("Middleware executed");
  next(); // WAJIB dipanggil untuk lanjut ke middleware/route berikutnya
}
```

---

## Praktik

Kita akan tambahkan CORS dan berbagai custom middleware ke Blog API dari Sesi
sebelumnya.

### Langkah 1: Install CORS Package

```bash wrap
cd blog-api
npm install cors
```

### Langkah 2: Buat Custom Middleware (middleware/custom.js)

```javascript wrap
// Request Logger Middleware (lebih detail dari Morgan)
export function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

  // Log request body untuk POST/PUT/PATCH
  if (["POST", "PUT", "PATCH"].includes(method)) {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }

  next();
}

// Request Timing Middleware
export function requestTimer(req, res, next) {
  const startTime = Date.now();

  // Override res.json untuk capture saat response dikirim
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const duration = Date.now() - startTime;
    console.log(`⏱️  Request processed in ${duration}ms`);

    // Tambahkan timing info ke response
    if (data && typeof data === "object") {
      data.meta = {
        ...data.meta,
        processingTime: `${duration}ms`,
      };
    }

    return originalJson(data);
  };

  next();
}

// API Key Middleware (simulasi authentication)
export function apiKeyAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  // Simulasi validasi API key
  const validKeys = [
    process.env.API_KEY || "development-key-123",
    "test-key-456",
  ];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "API key is required",
      hint: "Add 'x-api-key' header to your request",
    });
  }

  if (!validKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      error: "Invalid API key",
    });
  }

  // Attach API key info to request
  req.apiKey = apiKey;
  next();
}

// Request ID Middleware
export function requestId(req, res, next) {
  const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  req.id = id;
  res.setHeader("X-Request-ID", id);
  next();
}

// Response Headers Middleware
export function securityHeaders(req, res, next) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Custom headers
  res.setHeader("X-Powered-By", "Express-Blog-API");

  next();
}

// Conditional Middleware - hanya untuk development
export function devOnly(req, res, next) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({
      success: false,
      error: "This endpoint is only available in development mode",
    });
  }
  next();
}

// Rate Limit Simulation (simple in-memory)
const requestCounts = new Map();

export function simpleRateLimit(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Get or create record for this IP
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, { count: 0, resetTime: now + windowMs });
    }

    const record = requestCounts.get(ip);

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    // Check limit
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", record.resetTime);
      res.setHeader("Retry-After", retryAfter);

      return res.status(429).json({
        success: false,
        error: "Too many requests",
        retryAfter: `${retryAfter} seconds`,
      });
    }

    // Increment counter
    record.count++;

    // Add headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - record.count);
    res.setHeader("X-RateLimit-Reset", record.resetTime);

    next();
  };
}

// Query Parameters Sanitizer
export function sanitizeQuery(req, res, next) {
  const sanitized = {};

  for (let key in req.query) {
    let value = req.query[key];

    // Convert string booleans
    if (value === "true") value = true;
    if (value === "false") value = false;

    // Convert numeric strings
    if (!isNaN(value) && value !== "") {
      value = Number(value);
    }

    // Trim strings
    if (typeof value === "string") {
      value = value.trim();
    }

    sanitized[key] = value;
  }

  req.query = sanitized;
  next();
}
```

### Langkah 3: Update Main Server dengan CORS

```javascript wrap title="index.js"
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";
import {
  notFoundHandler,
  globalErrorHandler,
} from "./middleware/errorHandler.js";
import {
  requestLogger,
  requestTimer,
  requestId,
  securityHeaders,
  sanitizeQuery,
  simpleRateLimit,
} from "./middleware/custom.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const apiVersion = process.env.API_VERSION || "v1";

// ========== CORS CONFIGURATION ==========

// Option 1: Simple CORS (allow all origins)
// app.use(cors());

// Option 2: Specific origins (RECOMMENDED for production)
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000", // React dev server
      "http://localhost:3001", // Alternative frontend
      "http://127.0.0.1:3000",
      "https://myapp.com", // Production frontend
    ];

    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200, // For legacy browsers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-API-Key",
    "X-Request-ID",
  ],
};

app.use(cors(corsOptions));

// ========== MIDDLEWARE STACK ==========
// Order matters! Middleware dieksekusi sesuai urutan

// 1. Security headers (paling awal)
app.use(securityHeaders);

// 2. Request ID generator
app.use(requestId);

// 3. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Logging
app.use(morgan("dev"));
app.use(requestLogger);

// 5. Request timing
app.use(requestTimer);

// 6. Query sanitizer
app.use(sanitizeQuery);

// 7. Rate limiting (global)
app.use(simpleRateLimit(100, 60000)); // 100 requests per minute

// ========== ROUTES ==========

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Blog API with CORS & Custom Middleware",
    version: apiVersion,
    status: "running",
    requestId: req.id,
    timestamp: new Date().toISOString(),
    docs: `http://localhost:${port}/api/${apiVersion}`,
  });
});

// CORS test endpoint
app.get("/cors-test", (req, res) => {
  res.json({
    message: "CORS is working!",
    origin: req.headers.origin || "No origin header",
    method: req.method,
    headers: req.headers,
  });
});

// Mount API routes
app.use(`/api/${apiVersion}`, apiRoutes);

// ========== ERROR HANDLERS ==========
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
app.listen(port, () => {
  console.log("=".repeat(70));
  console.log(`🚀 Blog API - CORS & Middleware Enabled`);
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`📚 API: http://localhost:${port}/api/${apiVersion}`);
  console.log(`🔒 CORS: Enabled for specific origins`);
  console.log(`⏱️  Request timing: Enabled`);
  console.log(`🛡️  Rate limiting: 100 req/min`);
  console.log(`⏰ Started: ${new Date().toLocaleString("id-ID")}`);
  console.log("=".repeat(70));
});
```

### Langkah 4: Protected Routes dengan API Key

Buat file baru untuk demonstrasi protected routes:

```javascript title="routes/protected.routes.js" wrap
import express from "express";
import { apiKeyAuth } from "../middleware/custom.js";

const router = express.Router();

// Semua routes di router ini butuh API key
router.use(apiKeyAuth);

// Protected endpoint
router.get("/secret", (req, res) => {
  res.json({
    success: true,
    message: "You have access to secret data!",
    data: {
      secret: "This is confidential information",
      apiKey: req.apiKey,
      timestamp: new Date().toISOString(),
    },
  });
});

// Protected user data
router.get("/admin/users", (req, res) => {
  res.json({
    success: true,
    message: "Admin-only data",
    data: {
      totalUsers: 1234,
      activeUsers: 567,
      premiumUsers: 89,
    },
  });
});

export default router;
```

### Langkah 5: Update Routes Index

```javascript wrap title="routes/index.js"
import express from "express";
import postsRoutes from "./posts.routes.js";
import jokesRoutes from "./jokes.routes.js";
import protectedRoutes from "./protected.routes.js";

const router = express.Router();

// Public routes
router.use("/posts", postsRoutes);
router.use("/jokes", jokesRoutes);

// Protected routes
router.use("/protected", protectedRoutes);

// API root
router.get("/", (req, res) => {
  res.json({
    message: "Blog API - Modular Structure with Middleware",
    version: "v1",
    requestId: req.id,
    endpoints: {
      posts: "/api/v1/posts",
      jokes: "/api/v1/jokes",
      protected: "/api/v1/protected (requires API key)",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

### Langkah 6: Update .env

```txt
PORT=4000
NODE_ENV=development
API_VERSION=v1
API_KEY=my-secret-api-key-2026
```

### Langkah 7: Test CORS dengan HTML Client

Buat file `test-cors.html` di folder terpisah:

```html wrap title="test-cors.html"
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CORS Test</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
      }
      button {
        padding: 10px 20px;
        margin: 10px 5px;
        cursor: pointer;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 5px;
      }
      #result {
        background: #f5f5f5;
        padding: 20px;
        border-radius: 5px;
        margin-top: 20px;
        white-space: pre-wrap;
      }
      .error {
        color: red;
      }
      .success {
        color: green;
      }
    </style>
  </head>
  <body>
    <h1>CORS Test - Blog API</h1>
    <p>Open browser console (F12) to see requests</p>

    <div>
      <button onclick="testCORS()">Test CORS Endpoint</button>
      <button onclick="fetchPosts()">Fetch Posts (GET)</button>
      <button onclick="createPost()">Create Post (POST)</button>
      <button onclick="testProtected()">Test Protected (with API Key)</button>
      <button onclick="testProtectedFail()">
        Test Protected (without API Key)
      </button>
    </div>

    <div id="result">Results will appear here...</div>

    <script>
      const API_URL = "http://localhost:4000";
      const API_KEY = "my-secret-api-key-2026";

      function displayResult(data, isError = false) {
        const resultDiv = document.getElementById("result");
        resultDiv.className = isError ? "error" : "success";
        resultDiv.textContent = JSON.stringify(data, null, 2);
      }

      async function testCORS() {
        try {
          const response = await fetch(`${API_URL}/cors-test`);
          const data = await response.json();
          displayResult(data);
        } catch (error) {
          displayResult({ error: error.message }, true);
        }
      }

      async function fetchPosts() {
        try {
          const response = await fetch(`${API_URL}/api/v1/posts?limit=3`);
          const data = await response.json();
          displayResult(data);
        } catch (error) {
          displayResult({ error: error.message }, true);
        }
      }

      async function createPost() {
        try {
          const response = await fetch(`${API_URL}/api/v1/posts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "Post from CORS Test",
              content:
                "This post was created from a different origin to test CORS functionality. It demonstrates that our API properly handles cross-origin requests.",
              author: "CORS Tester",
              category: "Technology",
              published: true,
            }),
          });
          const data = await response.json();
          displayResult(data);
        } catch (error) {
          displayResult({ error: error.message }, true);
        }
      }

      async function testProtected() {
        try {
          const response = await fetch(`${API_URL}/api/v1/protected/secret`, {
            headers: {
              "X-API-Key": API_KEY,
            },
          });
          const data = await response.json();
          displayResult(data);
        } catch (error) {
          displayResult({ error: error.message }, true);
        }
      }

      async function testProtectedFail() {
        try {
          const response = await fetch(`${API_URL}/api/v1/protected/secret`);
          const data = await response.json();
          displayResult(data, !data.success);
        } catch (error) {
          displayResult({ error: error.message }, true);
        }
      }
    </script>
  </body>
</html>
```

### Langkah 8: Testing

1. **Jalankan Blog API:**

```bash
npm run dev
```

2. **Test dengan Postman/Thunder Client:**

**Test CORS:**

```
GET http://localhost:4000/cors-test
```

**Test Protected Endpoint (WITH API Key):**

```
GET http://localhost:4000/api/v1/protected/secret
Headers:
  X-API-Key: my-secret-api-key-2026
```

**Test Protected Endpoint (WITHOUT API Key) - Should fail:**

```
GET http://localhost:4000/api/v1/protected/secret
```

**Test Rate Limiting:**

Kirim request berulang kali dengan cepat (gunakan Collection Runner di Postman
atau loop di Thunder Client). Setelah 100 requests, Anda akan dapat error 429.

3. **Test CORS dari Browser:**

Buka `test-cors.html` dengan **Live Server** di VS Code atau buka langsung di
browser:

```
file:///path/to/test-cors.html
```

Atau jalankan dengan **Python simple server**:

```bash
python3 -m http.server 8000
# Akses: http://localhost:8000/test-cors.html
```

Klik semua tombol dan lihat hasilnya!

---

**Headers yang Ditambahkan Middleware:**

Setiap response sekarang punya headers tambahan:

```
X-Request-ID: 1707896400000-abc123
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
X-Powered-By: Express-Blog-API
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1707896460000
Access-Control-Allow-Origin: http://localhost:3000
```

**Console Output dengan Custom Middleware:**

```
[2026-02-03T06:30:00.000Z] GET /api/v1/posts - IP: ::1
⏱️  Request processed in 5ms
```

---

## Best Practices yang Diterapkan:

1. ✅ **CORS dengan whitelist**: Hanya origin tertentu yang diizinkan
2. ✅ **Security Headers**: Melindungi dari XSS, clickjacking
3. ✅ **Rate Limiting**: Mencegah abuse
4. ✅ **Request ID**: Untuk debugging dan tracing
5. ✅ **Request Timing**: Monitor performa API
6. ✅ **API Key Auth**: Simulasi authentication sederhana
7. ✅ **Query Sanitization**: Normalisasi input dari user

**Selamat!** API Anda sekarang punya layer keamanan dan monitoring yang proper.

Di **Sesi 6**, kita akan belajar tentang file upload dan handling
multipart/form-data sebelum masuk ke PostgreSQL.
