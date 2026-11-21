-- V5: KONSTRUXIO AI Features - RFIs and Time & Material (T&M) Extra Work Tickets
CREATE TABLE IF NOT EXISTS rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  rfi_number VARCHAR(50) NOT NULL,
  title VARCHAR(250) NOT NULL,
  question TEXT NOT NULL,
  discipline VARCHAR(100),
  trade VARCHAR(100),
  drawing_reference VARCHAR(150),
  suggested_solution TEXT,
  schedule_impact BOOLEAN DEFAULT false,
  cost_impact BOOLEAN DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  official_response TEXT,
  created_by UUID NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rfis_org_project ON rfis(organization_id, project_id);

CREATE TABLE IF NOT EXISTS tm_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  ticket_number VARCHAR(50) NOT NULL,
  title VARCHAR(250) NOT NULL,
  client_directive VARCHAR(250),
  trade VARCHAR(100),
  labor_hours TEXT,
  materials_used TEXT,
  estimated_cost NUMERIC(10,2) DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  customer_signature TEXT,
  signed_by VARCHAR(150),
  signed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tm_tickets_org_project ON tm_tickets(organization_id, project_id);
