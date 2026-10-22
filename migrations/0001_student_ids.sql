-- Existing submissions remain intact. New submissions receive a unique student ID.
ALTER TABLE submissions ADD COLUMN student_id TEXT;
CREATE UNIQUE INDEX submissions_student_id_unique ON submissions(student_id);
