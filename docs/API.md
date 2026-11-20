# Konstruxio API contracts

Base URL: `http://localhost:8080`. JSON requests. Protected endpoints require `Authorization: Bearer <token>`.

## Register
`POST /api/auth/register`
```json
{"organizationName":"North Build GmbH","fullName":"Alex Meyer","email":"alex@example.com","password":"a-long-password"}
```
Returns `token`, `tokenType`, `userId`, `organizationId`, `fullName`, `email`, `role`.

## Login
`POST /api/auth/login`
```json
{"email":"alex@example.com","password":"a-long-password"}
```

## Projects
`POST /api/projects`
```json
{"name":"Berlin Office Renovation","description":"Interior renovation","location":"Berlin","startDate":"2026-12-01","endDate":"2027-03-30"}
```
`GET /api/projects` lists only the authenticated user's organization projects. `GET /api/projects/{id}` reads one project. `PATCH /api/projects/{id}` accepts the same fields as create.

## Tasks
`POST /api/tasks`
```json
{"projectId":"00000000-0000-0000-0000-000000000000","title":"Inspect cable routing","description":"Check second-floor installation","priority":"HIGH","dueDate":"2026-12-02"}
```
`GET /api/tasks?projectId={uuid}`  
`PATCH /api/tasks/{id}` body example: `{"status":"IN_PROGRESS","priority":"HIGH"}`

Statuses suggested: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

## Site issues
`POST /api/issues`
```json
{"projectId":"00000000-0000-0000-0000-000000000000","title":"Damaged cable conduit","description":"Conduit damaged near stairwell","severity":"HIGH","locationReference":"Floor 2 / Stairwell B"}
```
`GET /api/issues?projectId={uuid}`  
`PATCH /api/issues/{id}` body example: `{"status":"RESOLVED"}`

## Daily reports
`POST /api/reports`
```json
{"projectId":"00000000-0000-0000-0000-000000000000","reportDate":"2026-11-20","weather":"Cloudy","workersCount":8,"workCompleted":"Installed cable trays on floor 2","blockers":"Awaiting inspection","materials":"Cable trays, brackets","safetyNotes":"No incidents"}
```
`GET /api/reports?projectId={uuid}`

## AI chat
`POST /api/ai/chat`
```json
{"message":"Help me turn these notes into a clear daily site report: 8 workers, cable trays installed, inspection pending."}
```
Returns `{ "provider":"ollama", "model":"llama3.2:3b", "answer":"..." }`.

AI chat is deliberately read-only in this MVP. It cannot create tasks, issues or reports. Add an explicit preview-and-confirm workflow before enabling AI-triggered mutations.

## Project document intelligence
Upload PDF (maximum 15 MB):
`POST /api/projects/{projectId}/documents` with `multipart/form-data`, field `file`.

List project documents: `GET /api/projects/{projectId}/documents`.

Ask a question: `POST /api/projects/{projectId}/documents/ask`
```json
{"question":"What inspection requirements are listed for the electrical installation?"}
```
The pipeline extracts selectable text with PDFBox, OCRs image-only pages through Tesseract, chunks page text, embeds each chunk with Ollama `nomic-embed-text`, stores vectors in pgvector, and retrieves the six nearest passages using cosine distance. Responses include filename/page citations. Tenant and project filters are applied before retrieval.

## Whisper voice transcription
`POST /api/voice/transcribe?language=de` with `multipart/form-data`, field `file` (maximum 25 MB). Language accepts an ISO-639-1 code such as `en`, `de`, `fr`, `es`, `hi`, or `auto`. The API forwards audio to the private media service running faster-whisper and returns transcript, detected language and model metadata. Audio is held temporarily for processing and deleted afterward.

## Voice input
The React PWA provides server-side Whisper recording and optional browser Web Speech recognition. Whisper transcripts are inserted into the editable chat field; the user reviews and submits them. Raw audio is not persisted by the Konstruxio API or media service after processing.
