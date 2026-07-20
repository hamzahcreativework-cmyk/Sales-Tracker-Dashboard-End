-- PENTING: Jalankan script ini di SQL Editor Supabase untuk memperbaiki error "tidak bisa save"
-- Script ini akan menambahkan kolom 'vendor_name' yang hilang.

ALTER TABLE public.marketing_clients_status ADD COLUMN IF NOT EXISTS vendor_name TEXT;
