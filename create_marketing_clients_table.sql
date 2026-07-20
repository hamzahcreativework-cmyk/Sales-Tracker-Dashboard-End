
-- Create marketing_clients_status table
CREATE TABLE IF NOT EXISTS public.marketing_clients_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('bank_database', 'referal', 'venue_only_ph')),
    client_name TEXT NOT NULL,
    client_phone TEXT,
    vendor_name TEXT, -- For Venue Only Public Holiday
    status TEXT CHECK (status IN ('Prospek', 'Tidak Prospek')),
    submission_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.marketing_clients_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients status"
ON public.marketing_clients_status
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and Directors can view all clients status"
ON public.marketing_clients_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Direktor', 'Manager')
  )
);

CREATE POLICY "Users can insert their own clients status"
ON public.marketing_clients_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients status"
ON public.marketing_clients_status
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients status"
ON public.marketing_clients_status
FOR DELETE
USING (auth.uid() = user_id);

-- NOTE: Jika Anda sudah membuat tabel ini sebelumnya tanpa kolom vendor_name, jalankan perintah berikut:
-- ALTER TABLE public.marketing_clients_status ADD COLUMN IF NOT EXISTS vendor_name TEXT;
