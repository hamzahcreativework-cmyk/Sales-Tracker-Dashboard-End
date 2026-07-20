-- =======================================================
-- SCRIPT SETUP LENGKAP FITUR LAPORAN BITRIX
-- =======================================================
-- Silakan jalankan script ini di SQL Editor Supabase untuk
-- membuat tabel dan mengatur hak akses (RLS).

-- 1. Membuat Tabel Laporan Bitrix
CREATE TABLE IF NOT EXISTS public.laporan_bitrix (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    no_telp TEXT,
    status TEXT,
    keterangan TEXT,
    submission_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.laporan_bitrix ENABLE ROW LEVEL SECURITY;

-- 3. Membuat Helper Function untuk menampilkan Nama User (khusus view Direktor)
-- Fungsi ini diperlukan agar kolom "Diinput Oleh" bisa membaca nama user
CREATE OR REPLACE FUNCTION public.get_user_names()
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    au.id, 
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as name 
  FROM auth.users au;
END;
$$;

-- Beri akses execute
GRANT EXECUTE ON FUNCTION public.get_user_names() TO authenticated;


-- 4. Membuat Kebijakan Akses (Policies)
-- Hapus policy lama jika ada untuk pembaruan yang bersih
DROP POLICY IF EXISTS "Users can view their own bitrix data" ON public.laporan_bitrix;
DROP POLICY IF EXISTS "Admins and Directors can view all bitrix data" ON public.laporan_bitrix;
DROP POLICY IF EXISTS "Users can insert their own bitrix data" ON public.laporan_bitrix;
DROP POLICY IF EXISTS "Users can update their own bitrix data" ON public.laporan_bitrix;
DROP POLICY IF EXISTS "Users can delete their own bitrix data" ON public.laporan_bitrix;

-- User biasa HANYA bisa melihat datanya sendiri
CREATE POLICY "Users can view their own bitrix data"
ON public.laporan_bitrix FOR SELECT
USING (auth.uid() = user_id);

-- Admin, Direktor, Manager, IT bisa melihat SEMUA data
CREATE POLICY "Admins and Directors can view all bitrix data"
ON public.laporan_bitrix FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Direktor', 'Manager', 'IT')
  )
);

-- User bisa insert data (otomatis user_id sesuai login)
CREATE POLICY "Users can insert their own bitrix data"
ON public.laporan_bitrix FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User bisa update datanya sendiri
CREATE POLICY "Users can update their own bitrix data"
ON public.laporan_bitrix FOR UPDATE
USING (auth.uid() = user_id);

-- User bisa hapus datanya sendiri
CREATE POLICY "Users can delete their own bitrix data"
ON public.laporan_bitrix FOR DELETE
USING (auth.uid() = user_id);
