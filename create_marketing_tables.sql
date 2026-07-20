-- Create marketing_daily_activities table
CREATE TABLE IF NOT EXISTS public.marketing_daily_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    venue_name TEXT,
    submission_date DATE DEFAULT CURRENT_DATE,
    
    -- Menu Ibadah
    dhuha_tadarus BOOLEAN DEFAULT FALSE,
    syukur_text TEXT,
    doa_list JSONB, -- Stores array of strings for names
    
    -- Digital Update
    flyring_desc TEXT,
    flyring_image_url TEXT,
    posting_threads_desc TEXT,
    posting_threads_image_url TEXT,
    live_tiktok_desc TEXT,
    live_tiktok_image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create marketing_leads table
CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    venue_name TEXT,
    
    -- Informasi Dasar
    lead_name TEXT,
    lead_phone TEXT,
    lead_source TEXT,
    
    -- Client Gmeet
    client_gmeet_name TEXT,
    survey_time TIMESTAMPTZ,
    gmeet_time TIMESTAMPTZ,
    client_requirement_attachment_url TEXT,
    
    -- Business Tracking
    tracking_desc TEXT,
    tracking_image_url TEXT,
    maintenance_desc TEXT,
    maintenance_image_url TEXT,
    complain_desc TEXT,
    complain_image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for marketing_daily_activities

ALTER TABLE public.marketing_daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily activities"
ON public.marketing_daily_activities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and Directors can view all daily activities"
ON public.marketing_daily_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Direktor')
  )
);

CREATE POLICY "Users can insert their own daily activities"
ON public.marketing_daily_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily activities"
ON public.marketing_daily_activities
FOR UPDATE
USING (auth.uid() = user_id);


-- RLS Policies for marketing_leads

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leads"
ON public.marketing_leads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and Directors can view all leads"
ON public.marketing_leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Direktor')
  )
);

CREATE POLICY "Users can insert their own leads"
ON public.marketing_leads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
ON public.marketing_leads
FOR UPDATE
USING (auth.uid() = user_id);

-- Storage bucket setup (Pseudo-code as Supabase SQL interface for buckets can vary, but this is the standard approach using storage schema)
-- Ensure a 'marketing-uploads' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-uploads', 'marketing-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access to Marketing Uploads"
ON storage.objects FOR SELECT
USING ( bucket_id = 'marketing-uploads' );

CREATE POLICY "Authenticated users can upload to Marketing Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'marketing-uploads' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own Marketing Uploads"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'marketing-uploads' AND auth.uid() = owner );

