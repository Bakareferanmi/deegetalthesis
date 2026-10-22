CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  thesis_title TEXT NOT NULL,
  class TEXT NOT NULL CHECK (class IN ('SS1', 'SS2')),
  department TEXT NOT NULL
    CHECK (department IN ('Science', 'Art', 'Commercial')),
  reflection TEXT NOT NULL,
  document_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS instructor_login_attempts (
 attempt_key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS instructor_attempt_expiry ON instructor_login_attempts(expires_at);
