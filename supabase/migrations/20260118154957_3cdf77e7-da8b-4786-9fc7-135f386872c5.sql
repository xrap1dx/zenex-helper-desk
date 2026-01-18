-- Drop and recreate with correct schema references
DROP FUNCTION IF EXISTS public.hash_bcrypt_password(text);
DROP FUNCTION IF EXISTS public.verify_bcrypt_password(text, text);

-- Create hash function using unqualified names (pgcrypto installs to public schema)
CREATE OR REPLACE FUNCTION public.hash_bcrypt_password(password_text text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT crypt(password_text, gen_salt('bf', 10));
$$;

-- Create verify function
CREATE OR REPLACE FUNCTION public.verify_bcrypt_password(password_attempt text, password_hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT password_hash = crypt(password_attempt, password_hash);
$$;