# AI Resume Analyzer and Job Matcher

A production-style full-stack project that uploads PDF resumes, parses them into structured data, analyzes them with Gemini, matches them against a FAISS-backed local vector index, and generates ATS-focused resume improvements.

## 1. Folder Structure

```text
AiResume/
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- api/
|   |   |-- services/
|   |   |-- ai/
|   |   |-- db/
|   |   |-- schemas/
|   |   `-- core/
|   |-- requirements.txt
|   |-- .env
|   `-- .env.example
|-- data/
|   |-- faiss_index/
|   |-- resumes/
|   `-- jobs.json
|-- frontend/
|   |-- public/
|   `-- src/
|       |-- components/
|       |-- pages/
|       `-- services/
|-- requirements.txt
`-- README.md
```

## 2. Backend Implementation

### Features

- `POST /resume/upload`
  - Accepts a PDF resume.
  - Extracts text with PyMuPDF.
  - Structures resume data into skills, experience, projects, education, and certifications.
  - Stores the resume and metadata in MongoDB.

- `POST /resume/analyze`
  - Uses Gemini structured output mode to score the resume.
  - Returns extracted skills, missing skills, ATS readiness, strengths, and section feedback.
  - Caches repeated AI analysis requests.

- `POST /jobs/match`
  - Loads sample jobs into MongoDB.
  - Embeds jobs and resumes with `all-MiniLM-L6-v2`.
  - Uses a local FAISS index for similarity search.
  - Returns the top matches with skill gaps and priority skills.

- `POST /resume/improve`
  - Uses Gemini to generate a sharper headline, improved summary, stronger bullets, and ATS keywords.

- `GET /dashboard`
  - Aggregates the latest resume, analysis, matches, improvements, and activity history.

### Run the Backend

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Copy the backend environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

4. Start MongoDB locally.
5. Add your Gemini API key to `backend/.env`.
6. Run the API:

```bash
cd backend
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`.

### Render Deployment Note

- Render services created on or after `2026-02-11` default to Python `3.14.3`.
- This repository pins Python `3.11` in `.python-version` because the current backend dependency set, especially `pydantic==2.9.2` and `pydantic-core==2.23.4`, is packaged for Python `3.8` through `3.13`, not Python `3.14`.
- The backend also requires `faiss-cpu`, which is included in [backend/requirements.txt](backend/requirements.txt).
- For a Render web service, use build command `pip install -r requirements.txt`.
- Use start command `python backend/render_start.py`.
- Do not use `--reload` on Render.

## 3. AI Layer

### Gemini

- The project uses the official Google GenAI Python SDK.
- Structured output is enforced with Pydantic-backed JSON schema.
- AI responses are stored and cached to avoid repeat calls for the same resume context.

### Embeddings and Matching

- Sentence embeddings are generated with `all-MiniLM-L6-v2`.
- Job vectors are stored in a local FAISS index at `data/faiss_index/jobs.index`.
- Similarity search uses normalized embeddings with `IndexFlatIP`.

## 4. Frontend Implementation

### Pages

- `Upload Resume`
- `Dashboard`
- `Job Matches`
- `Resume Improvement`

### Frontend Stack

- React + Vite
- Tailwind CSS
- Axios
- React Router

### Run the Frontend

1. Copy the frontend environment file:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

2. Install dependencies:

```bash
cd frontend
npm install
```

3. Start the dev server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## 5. Integration Notes

- Backend base URL for the frontend is controlled through `VITE_API_BASE_URL`.
- The default demo flow uses `demo-user` as the user id since authentication is out of scope for this project.
- Sample job data is stored in [data/jobs.json](data/jobs.json).
- Uploaded PDFs are stored in `data/resumes`.
- FAISS artifacts are stored in `data/faiss_index`.

## Environment Variables

### Backend

- `APP_NAME`
- `APP_DEBUG`
- `APP_CORS_ORIGINS`
- `MONGODB_URL`
- `MONGODB_DATABASE`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `SENTENCE_TRANSFORMER_MODEL`
- `TOP_K_MATCHES`
- `AI_CACHE_TTL_SECONDS`
- `MAX_UPLOAD_SIZE_MB`

### Frontend

- `VITE_API_BASE_URL`

## Suggested Next Improvements

- Add authentication and per-user resume libraries.
- Expand job ingestion beyond sample JSON into external connectors.
- Add background workers for large-file processing and scheduled re-indexing.
- Add tests for parser heuristics and API contract validation.
