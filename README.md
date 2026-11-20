# Konstruxio AI — Construction Management MVP

Original, voice-first construction project management starter. This is an independently designed implementation, not a copy of another product.

## Included
- Java 21 / Spring Boot 3 modular-monolith backend
- PostgreSQL + Flyway schema (with pgvector for semantic RAG)
- Organization-scoped multi-tenant data model with JWT auth
- **Voice-to-Action Field Agent**: Dictate natural field observations; AI parses daily log, tasks, and site defects with 1-click commit
- **Interactive Blueprints & Floor Plan Pinning**: Spatial issue and task markers pinned directly to 2D architectural drawings
- **Smart Photo Snagging & AI Inspection**: Upload or snap defect photos with automated trade classification, severity rating, and remediation advice
- **Automated Weather Defense & Weekly Owner Reports**: Real-time crane/concrete delay advisories and print-ready executive progress reports
- Projects, tasks, site issues, daily logs, and document intelligence (PDF RAG)
- React + TypeScript + Vite PWA frontend with responsive mobile support

## Prerequisites
- Java 21
- Maven 3.9+
- Node.js 20+
- Docker Desktop / Docker Engine
- (Optional) Ollama installed locally

## Quick start

1. Copy environment defaults:
   ```bash
   cp .env.example .env
   ```
2. Start infrastructure:
   ```bash
   docker compose up -d postgres ollama media-ai
   ```
3. Pull a local model (optional):
   ```bash
   docker exec -it konstruxio-ollama ollama pull llama3.2:3b
   docker exec -it konstruxio-ollama ollama pull nomic-embed-text
   ```
4. Start the backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
5. Start the frontend in another terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Open http://localhost:5173 and register an organization.

Backend: http://localhost:8080  
Health: http://localhost:8080/actuator/health

## OpenAI configuration
Set `AI_PROVIDER=openai` and `OPENAI_API_KEY` in `.env`, then restart the backend.
For local inference use `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3.2:3b`, and `OLLAMA_EMBEDDING_MODEL=nomic-embed-text`. The embedding model must return 768 dimensions. The PostgreSQL container uses the pgvector-enabled image.

The `media-ai` service runs Tesseract OCR and faster-whisper speech recognition at `http://localhost:8090`. Whisper downloads its selected model on first transcription; `small` is the default and can require several hundred MB of disk and memory. For a backend running in Docker, set `OLLAMA_BASE_URL=http://ollama:11434` and `MEDIA_SERVICE_URL=http://media-ai:8090`.

## API overview
All endpoints except `/api/auth/**` and `/actuator/health` require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create organization and first user |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/projects` | List/create projects |
| GET/PATCH | `/api/projects/{id}` | Read/update project |
| GET/POST | `/api/tasks?projectId={id}` | List/create tasks |
| PATCH | `/api/tasks/{id}` | Update task |
| GET/POST | `/api/issues?projectId={id}` | List/create site issues |
| PATCH | `/api/issues/{id}` | Update issue |
| GET/POST | `/api/reports?projectId={id}` | List/create daily reports |
| POST | `/api/ai/chat` | Ask configured LLM |

See `docs/API.md` for request and response examples.

## Security and production hardening
This MVP includes JWT authentication, BCrypt, tenant-scoped queries, server-side validation and CORS configuration. Before production:
- Replace the development JWT secret with a strong secret from a secret manager.
- Enforce HTTPS and secure cookie/token storage policies.
- Add email verification, password reset, rate limiting, account lockout and MFA.
- Add role/permission management beyond the initial organization membership.
- Add malware scanning, file type/size limits and private object storage before enabling uploads.
- Add audit retention policies, backups, monitoring, alerting and disaster recovery.
- Review GDPR data-processing agreements, retention, deletion and data residency.
- Use a dedicated AI gateway, redact personal data where appropriate, and never send sensitive project documents to a provider without customer authorization.
- Add human approval for every AI-proposed write/action.

## Testing
Backend:
```bash
cd backend
mvn test
```
Frontend:
```bash
cd frontend
npm install
npm run build
```

## Current MVP boundaries
- Speech input is represented by a text-chat interface; browser speech recognition and server-side transcription are extension points, not production speech services.
- AI chat is read-only. It does not execute project mutations.
- File upload, plan markup, push notifications, billing, advanced RBAC and offline synchronization are planned extensions.
- The sample integration test uses Spring Boot test infrastructure; run the full suite with Docker available if Testcontainers is enabled.

## License
Add your chosen commercial or open-source license before distribution.

## Voice assistant and document intelligence (extension)

The extended MVP adds:
- Server-side Whisper recording in the AI Assistant. Select German, English, French, Spanish or Hindi, record a note and stop to transcribe with faster-whisper. The transcript appears in an editable text field for review. Optional browser Web Speech input is also available.
- PDF document ingestion under each project. Upload PDFs up to 15 MB and 300 pages. Apache PDFBox extracts page text and renders image-only pages for Tesseract OCR; chunks are stored in PostgreSQL.
- Project-scoped semantic RAG using Ollama `nomic-embed-text` embeddings stored in pgvector (768 dimensions), cosine-distance retrieval, HNSW indexing and filename/page citations.
- Scanned PDF page OCR using PDFBox rendering plus the Tesseract media service; selectable text is extracted directly and image-only pages are OCRed.
- Server-side speech transcription using faster-whisper through the media service. Audio is processed in memory/temp files and is not retained after transcription.
- An explicit task approval UI: users can prepare/edit a task title from a voice/text note and must approve before the task is created. The LLM itself remains read-only.

### New endpoints
- `POST /api/projects/{projectId}/documents` — multipart PDF upload (`file` field)
- `GET /api/projects/{projectId}/documents` — list project documents
- `POST /api/projects/{projectId}/documents/ask` — body `{"question":"..."}`; returns answer and source pages
- `POST /api/voice/transcribe?language=de` — multipart audio upload, returns Whisper transcript

Flyway migrations `V2__document_intelligence.sql` and `V3__semantic_rag.sql` create document metadata/chunks, enable pgvector, add 768-dimensional embeddings and an HNSW cosine index. Existing databases migrate automatically at startup. Ollama must have both the chat model and embedding model pulled before indexing documents.

### Document handling limitations
The MVP stores extracted text chunks, embeddings and document metadata, not original PDF bytes or uploaded audio. OCR is for text-bearing scans, not full engineering drawing interpretation; dimension lines, symbols and complex diagrams still require a dedicated vision/document-understanding pipeline. Validate file content and add malware scanning/private object storage before production use.
