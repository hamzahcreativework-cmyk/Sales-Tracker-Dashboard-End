# 🔐 Konfigurasi dengan Environment Variables

Untuk keamanan lebih baik, gunakan environment variables agar credentials tidak tersimpan di git.

## 📝 Setup Steps

### 1. Buat file `.env.local` di root project

```env
# File: .env.local
VITE_BITRIX_URL=https://yourdomain.bitrix24.com/rest/
VITE_BITRIX_WEBHOOK_KEY=YOUR_WEBHOOK_KEY_HERE/1/YOUR_KEY_STRING
```

### 2. Update `bitrixClient.ts`

Ganti baris konfigurasi dengan environment variables:

```typescript
// ❌ SEBELUM (Hard-coded)
const BITRIX_API_URL = 'https://yourdomain.bitrix24.com/rest/';
const BITRIX_WEBHOOK_KEY = '12345/1/a1b2c3d4e5f6g7h8i9j0';

// ✅ SESUDAH (Environment variables)
const BITRIX_API_URL = import.meta.env.VITE_BITRIX_URL || 'https://PLACEHOLDER_BITRIX_URL/rest/';
const BITRIX_WEBHOOK_KEY = import.meta.env.VITE_BITRIX_WEBHOOK_KEY || 'PLACEHOLDER_WEBHOOK_KEY';
```

### 3. Contoh file lengkap setelah update:

```typescript
/**
 * Bitrix24 REST API Client
 * Documentation: https://apidocs.bitrix24.com/
 */

// ============== CONFIGURATION ==============
const BITRIX_API_URL = import.meta.env.VITE_BITRIX_URL || 'https://PLACEHOLDER_BITRIX_URL/rest/';
const BITRIX_WEBHOOK_KEY = import.meta.env.VITE_BITRIX_WEBHOOK_KEY || 'PLACEHOLDER_WEBHOOK_KEY';

// Validasi konfigurasi
if (BITRIX_API_URL.includes('PLACEHOLDER') || BITRIX_WEBHOOK_KEY.includes('PLACEHOLDER')) {
    console.warn('⚠️ Bitrix24 credentials belum dikonfigurasi!');
    console.warn('Buat file .env.local dengan:');
    console.warn('VITE_BITRIX_URL=https://yourdomain.bitrix24.com/rest/');
    console.warn('VITE_BITRIX_WEBHOOK_KEY=YOUR_KEY/1/YOUR_STRING');
}

// ... rest of the code
```

---

## 🔒 Keamanan Best Practices

### ✅ DO:
- ✓ Gunakan environment variables untuk credentials
- ✓ Add `.env.local` ke `.gitignore`
- ✓ Jangan commit credentials ke git
- ✓ Rotate webhook key secara berkala
- ✓ Gunakan different keys untuk dev/prod

### ❌ DON'T:
- ✗ Jangan hard-code credentials
- ✗ Jangan share `.env` files
- ✗ Jangan commit credentials ke git
- ✗ Jangan expose API keys di browser console

---

## 📦 `.gitignore` Configuration

Pastikan `.gitignore` sudah include file environment:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
node_modules/
```

---

## 🚀 Deployment to Production

### Option 1: Hosted Platform (Vercel, Netlify)

Tambahkan environment variables di platform settings:

**Vercel:**
- Settings → Environment Variables
- Add: `VITE_BITRIX_URL` dan `VITE_BITRIX_WEBHOOK_KEY`

**Netlify:**
- Site settings → Build & Deploy → Environment
- Add: `VITE_BITRIX_URL` dan `VITE_BITRIX_WEBHOOK_KEY`

### Option 2: Self-Hosted Server

Create `.env.production` atau `.env` di server:

```bash
# SSH ke server
ssh user@server

# Edit environment file
nano .env

# Add:
VITE_BITRIX_URL=https://yourdomain.bitrix24.com/rest/
VITE_BITRIX_WEBHOOK_KEY=YOUR_WEBHOOK_KEY/1/YOUR_STRING

# Reload aplikasi
npm run build
npm run preview
```

---

## 🧪 Test Environment Variables

### Verify at Build Time
```bash
# Check if env vars are loaded
npm run dev

# Look for console messages:
# "⚠️ Bitrix24 credentials belum dikonfigurasi!" = NOT configured
# "✓ Bitrix24 Terhubung" = Successfully configured
```

### Debug in Browser Console
```javascript
// Check current values (safe - hanya menampilkan placeholder)
console.log(import.meta.env.VITE_BITRIX_URL);
console.log(import.meta.env.VITE_BITRIX_WEBHOOK_KEY);
```

---

## 📋 Checklist

- [ ] Buat `.env.local` file
- [ ] Copy webhook key dari Bitrix24
- [ ] Masukkan URL dan key ke `.env.local`
- [ ] Add `.env.local` ke `.gitignore`
- [ ] Test dengan `npm run dev`
- [ ] Verify "✓ Bitrix24 Terhubung" di UI
- [ ] Setup env vars di production platform

---

**Note:** Environment variables dengan prefix `VITE_` akan di-expose ke client-side JavaScript. Ini aman untuk public credentials (webhook URLs), tapi jangan gunakan untuk secret keys.
