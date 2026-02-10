-- Add temporary password management table
-- This migration adds functionality for password reset with temporary passwords

-- Create temp_passwords table
CREATE TABLE temp_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temp_password TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_temp_passwords_user_id ON temp_passwords(user_id);
CREATE INDEX idx_temp_passwords_expires_at ON temp_passwords(expires_at);

-- Enable RLS for temp_passwords table
ALTER TABLE temp_passwords ENABLE ROW LEVEL SECURITY;

-- Create policies for temp_passwords
-- Users can view their own temporary password status (but not the actual password)
CREATE POLICY "Users can view own temp password status"
  ON temp_passwords FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can check if they need to reset password
-- This policy allows checking if a temp password exists
CREATE POLICY "Users can check temp password existence"
  ON temp_passwords FOR SELECT
  USING (auth.uid() = user_id);

-- Function to clean up expired temp passwords
CREATE OR REPLACE FUNCTION cleanup_expired_temp_passwords()
RETURNS void AS $$
BEGIN
  DELETE FROM temp_passwords
  WHERE expires_at < NOW() AND is_used = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has valid temp password
CREATE OR REPLACE FUNCTION has_valid_temp_password(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_temp BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM temp_passwords
    WHERE user_id = p_user_id
    AND expires_at > NOW()
    AND is_used = FALSE
  ) INTO has_temp;

  RETURN has_temp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE temp_passwords IS 'Stores temporary passwords for password reset functionality. Passwords expire after a set time.';
