# Setup: Tambahkan Kolom ID Bitrix ke Database

## 🎯 Tujuan
Menambahkan kolom `id_bitrix` ke tabel `laporan_bitrix` di Supabase untuk menyimpan ID dari Bitrix24.

## ⚠️ Masalah
Saat ini, kolom `id_bitrix` belum ada di tabel `laporan_bitrix`, sehingga data ID Bitrix yang di-fetch tidak bisa disimpan ke database.

## 🔧 Solusi

### Option 1: Menggunakan Supabase Dashboard (Recommended - Mudah)

1. Buka https://app.supabase.com
2. Login dengan akun Supabase Anda
3. Buka project Anda
4. Pergi ke **SQL Editor**
5. Klik **New Query**
6. Paste query ini:

```sql
-- Tambah kolom id_bitrix ke tabel laporan_bitrix
ALTER TABLE public.laporan_bitrix
ADD COLUMN IF NOT EXISTS id_bitrix TEXT;

-- Buat index untuk faster lookups
CREATE INDEX IF NOT EXISTS idx_laporan_bitrix_id_bitrix ON laporan_bitrix(id_bitrix);

-- Display hasil
SELECT 'Column id_bitrix added/verified successfully' as result;
```

7. Klik **Run** (atau Ctrl+Enter)
8. Tunggu sampai selesai ✅

### Option 2: Menggunakan Query Aman (Dengan Error Handling)

Jika Anda ingin lebih detail, gunakan:

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'laporan_bitrix' AND column_name = 'id_bitrix'
    ) THEN
        ALTER TABLE public.laporan_bitrix
        ADD COLUMN id_bitrix TEXT;
        
        CREATE INDEX idx_laporan_bitrix_id_bitrix ON laporan_bitrix(id_bitrix);
        
        RAISE NOTICE 'Column id_bitrix added successfully';
    ELSE
        RAISE NOTICE 'Column id_bitrix already exists';
    END IF;
END $$;
```

## ✅ Verifikasi

Setelah menjalankan query, lakukan ini untuk memastikan kolom sudah ada:

1. Di Supabase Dashboard, pergi ke **Table Editor**
2. Pilih tabel `laporan_bitrix`
3. Cek apakah ada kolom `id_bitrix` (TEXT type)
4. Refresh aplikasi React di browser

## 📝 Catatan

- Kolom `id_bitrix` adalah TEXT type, dapat null
- Data lama tidak akan punya id_bitrix, hanya data baru dari Bitrix24
- Kolom sudah memiliki index untuk performa query yang lebih baik

## 🚀 Setelah Selesai

1. **Refresh aplikasi**: Buka ulang aplikasi di browser (F5 atau Ctrl+R)
2. **Test sync**: Klik "Sinkronisasi dari Bitrix24"
3. **Verifikasi data**: ID Bitrix harus muncul di kolom list

