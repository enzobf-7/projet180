-- Track last login timestamp per client
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login timestamptz;
