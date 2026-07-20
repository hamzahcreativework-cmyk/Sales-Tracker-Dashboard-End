-- Create a secure function to fetch user names from auth.users
-- This allows the Director view to show real names instead of IDs without needing full admin access

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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_names() TO authenticated;
