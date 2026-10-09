CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE complaints (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  title          text NOT NULL,
  description    text NOT NULL,
  category       text NOT NULL CHECK (category IN ('roads', 'lighting', 'waste', 'water', 'parks', 'safety', 'other')),
  status         text NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('submitted', 'triaged', 'assigned', 'in_progress', 'resolved', 'rejected')),
  location       geography(Point, 4326) NOT NULL,
  location_label text,
  ai_triage      jsonb,
  letter_draft   text,
  assigned_to    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX complaints_location_idx ON complaints USING GIST (location);
CREATE INDEX complaints_status_created_idx ON complaints (status, created_at DESC);
CREATE INDEX complaints_reporter_idx ON complaints (reporter_id, created_at DESC);
CREATE INDEX complaints_assigned_idx ON complaints (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE TABLE complaint_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  ai_analysis  jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX complaint_images_complaint_idx ON complaint_images (complaint_id);

CREATE TABLE complaint_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  payload      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX complaint_events_complaint_idx ON complaint_events (complaint_id, created_at);

CREATE TABLE refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_hash_idx ON refresh_tokens (token_hash);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_set_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
