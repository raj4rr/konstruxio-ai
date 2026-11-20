# Data model

- `organizations`: tenant root.
- `app_users`: users belong to exactly one organization in this MVP.
- `projects`: construction projects owned by an organization.
- `tasks`: project work items, optionally assigned to a user.
- `site_issues`: reported defects or site problems.
- `daily_reports`: one report per project and date.

Every tenant-owned table stores `organization_id`. Every read/update path must scope by the authenticated organization. A project ID supplied by the client is verified against that organization before child records are accessed.

## Planned extensions
Add organization memberships and role grants for multi-organization users; attachments and object-storage metadata; comments; activity/audit events; invitations; project locations and drawing revisions; AI prompt/response provenance; data-retention metadata.
