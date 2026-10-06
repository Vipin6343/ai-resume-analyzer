# AI Resume Analyzer

## Job-match evidence recovery

Job requirement quotes must come from the job description; all resume evidence must
come from the resume. A role title alone supplies no explicit requirements and the
model is instructed to return an empty requirements list (null match score).
Paste the actual required/preferred qualifications for a meaningful comparison.

An invalid structured response or failed evidence check triggers at most one fresh
analysis generation. The complete replacement is validated again. This can add one
provider call and its associated latency/cost; each call retains the configured SDK
timeout and bounded transient retries. Rate limits, configuration errors and other
provider failures are not retried by this analysis recovery loop. If both responses
fail validation, the API returns `invalid_model_output` without an unverified score.

This fix passed 109 automated backend tests with mocked providers, including recovery,
retry bounds and rejection of fabricated evidence. No new live LLM test was run for it.

> ATS checker update: use the new Check ATS compatibility button or POST /api/v1/resumes/ats-check with only a PDF. Rubric 2.0 replaces the previous five-check score with weighted extraction, encoding, contact, section-content, date and page-coverage checks, plus an extracted-text preview. No AI key is needed for this endpoint. See backend/docs/ATS_COMPATIBILITY.md for the full formula, response fields and limitations. Older five-check descriptions below refer to the previous version.


The current analysis includes an AI writing-quality score with five explained criteria, evidenced strengths, prioritized issues, five section reviews, conservative bullet rewrites, and an improved-summary draft. The ATS-readiness score remains a transparent text check; it is not an actual employer ATS score. A resume alone is enough. Optional job-comparison and existing career tools remain supported.

The frontend can copy/print the expanded report. Its History feature saves analysis reports locally in the browser; use History deletion controls to remove them. PDF uploads are not saved in that history.

Validation: 96 automated backend tests passed; a live Gemini test on synthetic resume text passed for the expanded review. The production frontend build also passed. This does not verify quality across all real resumes.


> Earlier resume-only UI: upload only your resume. No target job or job description is required. Results show profile, detected skills, ATS text-readiness checks and improvement suggestions. The job-match UI has been removed. The backend retains optional job comparison for existing API clients. With no job description, requirement lists are empty and match_score.value is null. A readiness score of 100 only means five basic checks passed.


Python 3.11+ / FastAPI backend. Upload a resume PDF and a job description to get a summary, detected skills, evidenced matches, gaps, practical suggestions, and a deterministic application-defined match score. No database, authentication, frontend, or vector store is included.

## Windows PowerShell setup

From the workspace root:

```powershell
cd E:\ResumeAnlyser\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

The example selects Gemini. Replace `GEMINI_API_KEY` in `.env` with your Google AI Studio API key. Set `GEMINI_MODEL` to a Gemini model available to your account. To use OpenAI instead, set `LLM_PROVIDER=openai` and configure `OPENAI_API_KEY`. Keep it in the backend. If PowerShell blocks activation, use `.\.venv\Scripts\python.exe` in place of `python` in the commands below; activation is optional.

```powershell
python -m uvicorn app.main:app --reload --env-file .env
```

Uvicorn loads the specified `.env` before importing the application. Existing environment variables take precedence. The application itself reads environment variables; importing it directly does not load `.env`. Extraction and health work without an API key; analysis returns a clear configuration error.

Swagger UI: http://127.0.0.1:8000/docs  
Machine-readable schema: http://127.0.0.1:8000/openapi.json

| Variable | Default | Meaning |
| --- | --- | --- |
| `LLM_PROVIDER` | `openai` (example selects `gemini`) | Provider: `openai` or `gemini` |
| `GEMINI_API_KEY` | Empty | Backend-only Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model supporting structured output |
| `GEMINI_TIMEOUT_SECONDS` | `30` | Timeout per network operation, 1?120 seconds |
| `GEMINI_MAX_RETRIES` | `2` | Transient retries, 0?3 |
| `OPENAI_API_KEY` | Empty | Backend-only OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model supporting Chat Completions structured outputs |
| `OPENAI_TIMEOUT_SECONDS` | `30` | SDK timeout per attempt, between 1 and 120 seconds |
| `OPENAI_MAX_RETRIES` | `2` | Transient-failure retries, between 0 and 3 (plus the initial attempt) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated development origins; empty disables cross-origin access |

Both providers use the OpenAI SDK (Gemini through Google's compatible endpoint)'s bounded retry policy for connection errors, timeouts, and retryable HTTP errors. Authentication errors are not retried. SDK timeouts apply to network operations, not a strict end-to-end deadline; retries and backoff increase total latency. Invalid environment configuration fails startup with a sanitized message.

## API requests

For target-job analysis and both scores, use **POST /api/v1/resumes/analyze** in Swagger. Upload `file`, paste the actual `job_description`, and optionally enter `target_job` (for example, AI Backend Developer; up to 200 characters).

The response includes `match_score` for evidenced job alignment and `ats_score` for an application-defined text-readiness estimate. The ATS estimate gives 20 points each for readable extracted text (100+ characters, no replacement characters), detectable email, Skills heading, Experience/Projects heading, and Education heading. Its breakdown explains every check and offers suggestions. This rubric does not reproduce employer ATS behavior, inspect visual layout, verify section contents, or predict hiring. English heading checks can miss unconventional headings and other languages. The job title labels the analysis; requirements come from the job description.

```powershell
curl.exe http://127.0.0.1:8000/health
curl.exe -F "file=@resume.pdf;type=application/pdf" http://127.0.0.1:8000/api//resumes/extract
curl.exe -F "file=@resume.pdf;type=application/pdf" -F "job_description=Python required. AWS preferred." http://127.0.0.1:8000/api//resumes/analyze
```

Read a longer job description from a local UTF-8 file:

```powershell
curl.exe -F "file=@resume.pdf;type=application/pdf" -F "job_description=<job-description.txt" http://127.0.0.1:8000/api//resumes/analyze
```

See [the frontend API contract](docs/API.md) for full request fields, response examples, score fields, and error codes. Clients should send `FormData` and let the browser set the multipart boundary.

## Structure

```text
app/
  main.py        Application factory, CORS, safe error handlers
  routes.py      Health, extract and analyze routes; provider dependency
  schemas.py     Pydantic model-output and public API schemas
  config.py      Validated environment settings and limits
  pdf.py         Upload validation and PDF extraction in a worker thread
  provider.py    Isolated OpenAI and Gemini structured-output integration
  analysis.py    Source-evidence validation and requirement deduplication
  scoring.py     Deterministic weighting and score breakdown
  middleware.py  Request-size enforcement before multipart parsing
  errors.py      Application error envelope
tests/           PDF, API, analysis, SDK transport, and runtime tests
```

## Limits and PDF behavior

- PDF file: at most 5 MiB (5,242,880 bytes), with actual PDF parsing and a PDF signature check. The filename extension alone is never accepted as proof. MIME type must be `application/pdf` or `application/octet-stream`.
- Complete multipart request: at most 5 MiB plus 64 KiB for the job description, fields and boundaries. Enforced even without a Content-Length header, before temporary upload files are created.
- PDF pages: at most 10.
- Extracted resume text: at most 30,000 characters, including page separators.
- Job description: nonblank, at most 12,000 characters.
- Model response: at most 80 extracted requirements, 100 skills and 15 suggestions, with bounded strings and an 8,000 completion-token budget. Incomplete or invalid output returns an error instead of a partial score.

Malformed, encrypted, zero-byte, and zero-page PDFs have distinct validation paths. A PDF with no extractable text returns an OCR-not-supported message. Image-only/scanned pages are not analyzed; in a mixed PDF, only extractable text contributes. Complex columns or unusual fonts may affect extraction. PDF byte/page limits do not guarantee a fixed parsing time or memory bound for highly compressed documents.

## Evidence and score

Both input documents are treated as untrusted data in the provider prompt. They are encoded together as JSON in a user message, separate from the system instructions. The model supplies source excerpts for requirements, matches, the summary, and skills; Python verifies each excerpt against the appropriate source. Whitespace is normalized to accommodate PDF line wrapping, while words, case, and punctuation are preserved. Invalid evidence rejects the entire analysis.

The model extracts explicit job requirements and marks each required or preferred. Unqualified explicit requirements default to required. Alternatives such as “Python OR Java” remain one requirement. Python merges duplicates by normalized labels or shared canonical concept keys. Required takes precedence when duplicates disagree on priority; the weakest match status wins when duplicate judgments conflict.

Score = `100 * matched requirement weights / total requirement weights`, rounded to two decimals. Required weighs 2; preferred weighs 1. Missing and insufficient evidence contribute zero. If no usable explicit requirements exist, the score is null with an explanation.

This is an **application-defined match score**, not an employer ATS score or a hiring prediction. Requirement extraction, semantic deduplication, and interpreting whether an excerpt proves a requirement still depend on LLM judgment. Verified quotations establish that text exists, not that the interpretation is correct. Prompt instructions reduce injection risk but are not a proof of immunity. Review feedback before using it; suggestions must only describe experience and achievements that are accurate. Missing means “not evidenced in the resume,” not that the applicant lacks the qualification.

## Privacy

The backend does not persist resumes or analysis results. A bounded request buffer and extracted text live in memory; framework upload spools are closed after each request, including errors. PDF parsing and the synchronous provider call run in worker threads. The extracted text and job description are sent to the selected provider (Google for Gemini, OpenAI for OpenAI); the PDF itself is not uploaded to either provider. OpenAI requests specify `store=False`. Gemini requests omit that OpenAI-specific parameter. Each provider's own data-retention policies apply. Provider selection never automatically falls back to the other provider.

Errors are sanitized. The application does not log document contents, filenames, API keys or raw provider responses; potentially sensitive SDK/parser loggers are suppressed. API responses include `Cache-Control: no-store`. Do not add body logging when integrating this backend.

## Tests

```powershell
python -m pytest -q
```

The suite constructs real synthetic PDFs and tests extraction, malformed/encrypted/blank PDFs, limits, cleanup, evidence rejection, duplicates, weighting, null scores, CORS, and the complete API path. Provider tests use the real OpenAI SDK with an HTTP mock transport to exercise structured parsing, refusals, truncation, invalid output, timeouts, authentication, rate limits and bounded retries. No test sends a network request to either provider. Gemini tests verify the Google endpoint, selected model/key, retries and sanitized errors.

Live LLM analysis has not been verified. Automated tests verify application behavior and SDK error handling; they do not establish model accuracy or prompt-injection resistance.

Implementation references: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [OpenAI Python SDK errors, retries and timeouts](https://developers.openai.com/api/reference/python).

Gemini uses Google's [documented OpenAI compatibility API](https://ai.google.dev/gemini-api/docs/openai), including Pydantic structured output. The installed `openai` package is the client library; when Gemini is selected, requests go to Google, and no OpenAI key is required. Fully restart Uvicorn after editing `.env` so the changed provider/key is loaded.
