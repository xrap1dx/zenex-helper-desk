-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Recreate the hash function to use the extension properly
CREATE OR REPLACE FUNCTION public.hash_bcrypt_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.crypt(password_text, public.gen_salt('bf', 10));
END;
$$;

-- Recreate verify function too
CREATE OR REPLACE FUNCTION public.verify_bcrypt_password(password_attempt text, password_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN password_hash = public.crypt(password_attempt, password_hash);
END;
$$;