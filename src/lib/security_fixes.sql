-- DataBundle Security Fixes SQL
-- Run these in your Supabase SQL Editor to secure the database.

-- 1. Secure the 'profiles' table RLS
-- Users should only be able to view their own profile.
-- Users should NEVER be able to update their own balance or commissions.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own basic info (name, phone)
CREATE POLICY "Users can update own basic info" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 1.1 Protect Sensitive Columns via Trigger
-- Since RLS cannot easily compare OLD/NEW values for specific columns,
-- we use a trigger to prevent any non-admin/non-system update to balance/commissions.
CREATE OR REPLACE FUNCTION public.protect_profile_fields() 
RETURNS trigger AS $$
BEGIN
  IF (OLD.balance IS DISTINCT FROM NEW.balance OR OLD.commissions IS DISTINCT FROM NEW.commissions) THEN
    -- Only allow the service_role or admins to change balances
    -- In Supabase, service_role usually has 'authenticated' or 'service_role' claims.
    -- We'll check if the current user is a service_role (using current_setting) or if they are NOT the profile owner (admin).
    IF (current_setting('role') != 'service_role') THEN
       RAISE EXCEPTION 'Unauthorized: You cannot modify balance or commissions directly.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_update_protect_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_fields();

-- 2. Secure 'transactions' table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = agent_id);

-- Transactions should only be inserted by the system (service_role) 
-- or via a controlled function. We deny direct insert for anon/authenticated.
-- (If you use server actions with service_role, this is already secure).

-- 3. Automatic Profile Creation Trigger
-- This ensures that every time a user signs up via Supabase Auth, 
-- a corresponding profile is created automatically on the server.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, balance, commissions)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.email, 
    new.raw_user_meta_data->>'phone', 
    'AGENT', 
    0.00, 
    0.00
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Atomic Balance Deduction Function (RPC)
-- This allows secure balance deduction from the server/admin.
CREATE OR REPLACE FUNCTION public.deduct_agent_balance(p_agent_id uuid, p_amount decimal)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET balance = balance - p_amount 
  WHERE id = p_agent_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent profile not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Global Settings Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings" 
ON system_settings FOR SELECT 
USING (true);

CREATE POLICY "Only service_role can update settings" 
ON system_settings FOR ALL 
USING (false) 
WITH CHECK (false);
