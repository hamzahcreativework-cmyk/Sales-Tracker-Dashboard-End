-- Create laporan_bitrix table
CREATE TABLE IF NOT EXISTS public.laporan_bitrix (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    no_telp TEXT,
    status TEXT, -- Bisa dropdown atau text bebas
    keterangan TEXT,
    submission_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.laporan_bitrix ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own bitrix data"
ON public.laporan_bitrix FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and Directors can view all bitrix data"
ON public.laporan_bitrix FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Direktor', 'Manager')
  )
);

CREATE POLICY "Users can insert their own bitrix data"
ON public.laporan_bitrix FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bitrix data"
ON public.laporan_bitrix FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bitrix data"
ON public.laporan_bitrix FOR DELETE
USING (auth.uid() = user_id);
