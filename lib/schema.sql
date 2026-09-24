CREATE TABLE IF NOT EXISTS incidents (
  id         UUID PRIMARY KEY,
  date       DATE        NOT NULL,
  day        VARCHAR(16) NOT NULL,
  time       TIME        NOT NULL,
  severity   VARCHAR(16) NOT NULL,
  ambulance  BOOLEAN     NOT NULL DEFAULT FALSE,
  comments   TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents (date);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);