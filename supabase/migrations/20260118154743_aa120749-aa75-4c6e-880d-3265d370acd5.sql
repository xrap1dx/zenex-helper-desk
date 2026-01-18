-- Create pgcrypto extension if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to verify bcrypt passwords using pgcrypto
CREATE OR REPLACE FUNCTION public.verify_bcrypt_password(password_attempt text, password_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- pgcrypto's crypt function can verify bcrypt hashes
  RETURN password_hash = crypt(password_attempt, password_hash);
END;
$$;

-- Function to hash passwords using bcrypt via pgcrypto
CREATE OR REPLACE FUNCTION public.hash_bcrypt_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate bcrypt hash with cost factor 10
  RETURN crypt(password_text, gen_salt('bf', 10));
END;
$$;