# ⚡ Quick Start - Konfigurasi Bitrix24

## 🎯 3 Langkah Setup Cepat

### 1️⃣ Dapatkan Webhook Key dari Bitrix24
```
Login → Settings → Integration → Webhooks → Copy Incoming Webhook Key
Format: xxxxx/1/xxxxxxxxxxxxxxxxx
```

### 2️⃣ Update `bitrixClient.ts`
Buka file dan ganti 2 baris ini:

```typescript
// ❌ SEBELUM
const BITRIX_API_URL = 'https://PLACEHOLDER_BITRIX_URL/rest/';
const BITRIX_WEBHOOK_KEY = 'PLACEHOLDER_WEBHOOK_KEY';

// ✅ SESUDAH
const BITRIX_API_URL = 'https://yourdomain.bitrix24.com/rest/';
const BITRIX_WEBHOOK_KEY = 'xxxxx/1/xxxxxxxxxxxxxxxxx';
```

**Contoh Lengkap:**
```typescript
const BITRIX_API_URL = 'https://kediaman-corp.bitrix24.com/rest/';
const BITRIX_WEBHOOK_KEY = '12345/1/a1b2c3d4e5f6g7h8i9j0';
```

### 3️⃣ Test & Use
- Buka halaman "Laporan Data Bitrix24"
- Klik "Tes Koneksi" 
- Jika hijau ✓, klik "Ambil Data dari Bitrix24"

---

## 📍 Dimana Menemukan URL & Key Anda?

### URL Bitrix24:
- URL Anda: `https://[COMPANY_NAME].bitrix24.com/`
- Gunakan di config: `https://[COMPANY_NAME].bitrix24.com/rest/`

**Contoh:**
```
URL Anda di browser: https://kediaman-corp.bitrix24.com/crm/
URL untuk config:    https://kediaman-corp.bitrix24.com/rest/
```

### Webhook Key:
- Path: Settings → Integration → Webhooks
- Cari section "Incoming webhooks"
- Copy format lengkap: `xxxxxxx/1/yyyyyyyyyyyyyy`

---

## 🔄 Fitur Integrasi

| Fitur | Deskripsi |
|-------|-----------|
| ✓ Tes Koneksi | Validasi API connection |
| 📥 Ambil Data | Sinkronisasi deals dari Bitrix24 |
| 📊 Auto-Map | Mapping ID Bitrix → Nama → Status |
| 💾 Simpan Local | Data tersimpan di database lokal |

---

## ❓ Troubleshooting Cepat

| Problem | Solution |
|---------|----------|
| ✗ Connection Failed | Periksa URL & Webhook Key |
| 📋 Tidak Ada Data | Pastikan ada deals di Bitrix24 |
| ⏱️ Timeout | Cek koneksi internet |

---

**Sudah Siap? Buka aplikasi dan lihat status Bitrix24 di halaman Laporan! 🚀**
