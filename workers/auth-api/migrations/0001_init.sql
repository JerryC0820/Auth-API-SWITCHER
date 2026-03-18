CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role_label TEXT NOT NULL DEFAULT '已登录账号',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  fingerprint_hash TEXT NOT NULL UNIQUE,
  fingerprint_summary TEXT NOT NULL,
  host_label TEXT NOT NULL,
  platform_label TEXT NOT NULL,
  machine_name TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  license_type_label TEXT NOT NULL,
  duration_key TEXT,
  expires_at TEXT,
  permanent INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  source_label TEXT NOT NULL,
  stage_label TEXT NOT NULL,
  activated_at TEXT,
  last_validated_at TEXT,
  rollback_detected INTEGER NOT NULL DEFAULT 0,
  grace_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  redeemed_at TEXT,
  redeemed_by_user_id TEXT,
  redeemed_by_device_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_user_id ON invite_codes(user_id);

CREATE TABLE IF NOT EXISTS invite_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  target_device_id TEXT NOT NULL,
  target_label TEXT NOT NULL,
  result TEXT NOT NULL,
  reward_label TEXT NOT NULL,
  stage INTEGER NOT NULL,
  status TEXT NOT NULL,
  by_current_user INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invite_records_user_id ON invite_records(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_records_status ON invite_records(status);

CREATE TABLE IF NOT EXISTS reward_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  code TEXT NOT NULL,
  result TEXT NOT NULL,
  reward_label TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reward_records_user_id ON reward_records(user_id);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  consumed_at TEXT,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
