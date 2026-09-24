CREATE TABLE IF NOT EXISTS incidents (
  id          UUID PRIMARY KEY,
  date        DATE        NOT NULL,
  day         VARCHAR(16) NOT NULL,
  time        TIME        NOT NULL,
  severity    VARCHAR(16) NOT NULL,
  ambulance   BOOLEAN     NOT NULL DEFAULT FALSE,
  comments    TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      VARCHAR(16) NOT NULL DEFAULT 'reportado',
  reviewer_id TEXT,
  reviewed_at TIMESTAMPTZ,
  created_by  TEXT,
  owner_token TEXT
);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents (date);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','reviewer','user')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);