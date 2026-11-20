# Security notes

## Implemented in this MVP
- Stateless JWT access token, HMAC signing, expiration.
- BCrypt password hashing (work factor 12).
- Protected API routes and CORS allow-list.
- Organization-scoped project, task, issue and report queries.
- Request validation on key write endpoints.
- AI chat is read-only and the system prompt explicitly prohibits claims of performing mutations.

## Important limitations
- The registration endpoint creates an organization administrator; there is no invitation flow or granular RBAC yet.
- JWT is stored in browser localStorage in this demo. For production, prefer secure, HttpOnly, SameSite cookies with CSRF protections or a carefully designed BFF.
- No rate limiting, MFA, email verification, refresh-token rotation or password-reset workflow.
- No upload endpoint is enabled. Do not expose arbitrary file upload without MIME validation, size limits, malware scanning and private object storage.
- Never place production secrets in source control.
- LLM prompts are not a security boundary. Validate every model output and require human confirmation before any write operation.

## Voice and document intelligence
- Browser speech recognition may process audio using the browser vendor's speech service. Tell users which browser capability is used, obtain appropriate consent, and provide typed input as an alternative.
- PDF upload is limited to 15 MB and checks the declared content type, filename extension and PDF parser validity. This is not a substitute for malware scanning or robust content inspection.
- Original PDF bytes are not retained by this MVP; extracted text chunks are stored in the database. Treat extracted text as confidential project data.
- Retrieval is tenant- and project-scoped. Retrieved passages are passed to the LLM as untrusted evidence, not instructions. Semantic vectors are stored in pgvector and are subject to the same organization/project filters. The AI chat endpoint remains read-only.
- OCR and Whisper run in a separate media service. Uploaded audio is size-limited and written to a temporary file only during inference, then deleted. Restrict this service to the backend network in production; do not expose it publicly.
- OCR does not reliably interpret drawing symbols, dimensions, legends or complex diagrams. Require human review before using extracted construction data for safety, cost, compliance or execution decisions.
- The task approval UI creates a task only after the authenticated user explicitly clicks approval. Do not remove this approval boundary when adding agent tools.
