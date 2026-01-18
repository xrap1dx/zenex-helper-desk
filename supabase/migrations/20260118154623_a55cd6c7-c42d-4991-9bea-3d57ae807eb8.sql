-- Create password hashing function using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash passwords
CREATE OR REPLACE FUNCTION public.crypt_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(password_text, gen_salt('bf', 10));
END;
$$;

-- Update is_valid_staff_login to use pgcrypto for comparison
CREATE OR REPLACE FUNCTION public.is_valid_staff_login(p_username text, p_password_hash text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  role text,
  department_id uuid,
  is_online boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.username,
    s.display_name,
    s.role::text,
    s.department_id,
    s.is_online
  FROM staff s
  WHERE s.username = p_username 
    AND s.password_hash = crypt(p_password_hash, s.password_hash);
END;
$$;