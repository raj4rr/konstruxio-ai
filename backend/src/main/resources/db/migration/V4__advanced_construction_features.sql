-- V4: Advanced Construction Management Features
-- 1. Drawing Sheets and Blueprint Pinning
CREATE TABLE IF NOT EXISTS drawing_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  title VARCHAR(200) NOT NULL,
  sheet_number VARCHAR(50),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_org_project ON drawing_sheets(organization_id, project_id);

CREATE TABLE IF NOT EXISTS drawing_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  drawing_id UUID NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  x_percent DOUBLE PRECISION NOT NULL,
  y_percent DOUBLE PRECISION NOT NULL,
  title VARCHAR(220) NOT NULL,
  pin_type VARCHAR(30) NOT NULL DEFAULT 'ISSUE',
  severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  trade VARCHAR(80),
  description TEXT,
  created_by UUID NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_drawing ON drawing_pins(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_org_project ON drawing_pins(organization_id, project_id);

-- 2. Enhanced Site Issues with Photos, Trades, and AI Recommendations
ALTER TABLE site_issues ADD COLUMN IF NOT EXISTS photo_data TEXT;
ALTER TABLE site_issues ADD COLUMN IF NOT EXISTS trade VARCHAR(80);
ALTER TABLE site_issues ADD COLUMN IF NOT EXISTS ai_suggestion TEXT;
ALTER TABLE site_issues ADD COLUMN IF NOT EXISTS resolved_photo_data TEXT;

-- 3. Project Coordinates & Weather Advisory
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 48.137154;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 11.576124;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS weather_notes TEXT;
