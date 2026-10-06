# Frontend API contract

> ATS checker update: use the new Check ATS compatibility button or POST /api/v1/resumes/ats-check with only a PDF. Rubric 2.0 replaces the previous five-check score with weighted extraction, encoding, contact, section-content, date and page-coverage checks, plus an extracted-text preview. No AI key is needed for this endpoint. See backend/docs/ATS_COMPATIBILITY.md for the full formula, response fields and limitations. Older five-check descriptions below refer to the previous version.


> Current UI: upload only your resume. No target job or job description is required. Results show profile, detected skills, ATS text-readiness checks and improvement suggestions. The job-match UI has been removed. The backend retains optional job comparison for existing API clients. With no job description, requirement lists are empty and match_score.value is null. A readiness score of 100 only means five basic checks passed.


Base URL in development: `http://127.0.0.1:8000`. No authentication is required in this version. API keys must never be sent from a frontend.

## Health

`GET /health` returns HTTP 200:

```json
{"status": "ok"}
```

This is process health, not an LLM provider connectivity or configuration check.

## Extract a resume

`POST /api//resumes/extract`, content type `multipart/form-data`:

| Field | Type | Required |
| --- | --- | --- |
| `file` | PDF upload | Yes |

HTTP 200:

```json
{"text": "Python developer. Built REST APIs.", "page_count": 1}
```

## Analyze a resume

`POST /api//resumes/analyze`, content type `multipart/form-data`:

| Field | Type | Required |
| --- | --- | --- |
| `file` | PDF upload | Yes |
| `job_description` | Optional; omit for resume-only review. Up to 12,000 characters when supplied | No |
| `target_job` | Target job title, 1–200 characters when provided | No |

The target title is returned as `target_job` (null when omitted). It labels the analysis; actual requirements must be supplied in `job_description`. The backend does not invent requirements from a job title.

The response also includes `ats_score`: an application-defined ATS-readiness estimate with `value` (0–100), `label`, `explanation`, `breakdown`, and `improvement_suggestions`. Each breakdown entry has `check`, `passed`, `points`, `max_points`, and `explanation`. Five checks contribute 20 points each: at least 100 extracted characters without Unicode replacement characters, detectable email, Skills heading, Experience or Projects heading, and Education heading. Heading checks use standalone English headings, with optional colons. They do not verify section contents.

This is a transparent application rubric, not an employer ATS score or a parsing guarantee. It cannot inspect visual layout or assess qualifications. It is independent of `match_score`, which measures evidenced alignment with the supplied job description. A missing section may be appropriate for some resumes; suggestions are optional and conditional. Invalid target titles return HTTP 400 with `invalid_target_job`.

Do not manually set the multipart boundary when using browser `FormData`.

Example core analysis fields (the response additionally contains `target_job` and `ats_score` described above):

```json
{
  "resume_summary": "Developer with Python and REST API experience.",
  "detected_skills": ["Python"],
  "matched_requirements": [
    {
      "requirement": "Python",
      "job_evidence": "Python required",
      "kind": "required",
      "status": "matched",
      "evidence": "Python developer.",
      "explanation": "Python is explicitly listed."
    }
  ],
  "missing_requirements": [
    {
      "requirement": "AWS",
      "job_evidence": "AWS required",
      "kind": "required",
      "status": "missing",
      "evidence": null,
      "explanation": "Not evidenced in the resume. Add relevant details only if accurate."
    }
  ],
  "insufficient_evidence_requirements": [
    {
      "requirement": "Five years of REST API experience",
      "job_evidence": "Five years of REST API experience preferred",
      "kind": "preferred",
      "status": "insufficient",
      "evidence": "Built REST APIs.",
      "explanation": "API experience is mentioned, but its duration is not established."
    }
  ],
  "improvement_suggestions": ["If accurate, add the duration of your REST API experience."],
  "match_score": {
    "label": "application-defined match score",
    "value": 40.0,
    "explanation": "100 x matched requirement weights / total requirement weights. Required requirements weigh 2; preferred requirements weigh 1. Only verified, evidenced matches count. Requirement extraction and matching use LLM judgment; this is not an employer ATS score or hiring prediction.",
    "breakdown": {
      "matched_weight": 2,
      "total_weight": 5,
      "required_matched": 1,
      "required_total": 2,
      "preferred_matched": 0,
      "preferred_total": 1
    }
  }
}
```

Each requirement has a label, job-description source excerpt, priority, status, nullable resume excerpt and explanation. Matched and insufficient entries have verified resume excerpts; missing entries have null evidence. Collections may be empty. All numbers in the breakdown are integers; `value` is a number from 0 to 100, or null when no usable requirements were found. Display null as “Not enough job requirements to score,” never as zero. Do not label this as an actual ATS score.

The model's internal canonical keys and supporting summary/skill excerpts are validated on the backend; they are not part of the public response. The full Pydantic schemas are available at `/openapi.json` and `/docs`.

## Errors

Application errors use a consistent envelope without raw provider or document content:

```json
{"error": {"code": "no_extractable_text", "message": "No extractable text found. Scanned or image-only PDFs need OCR, which is not supported in this version."}}
```

| HTTP status | Codes | Meaning |
| --- | --- | --- |
| 400 | `invalid_pdf`, `encrypted_pdf`, `empty_pdf` | Wrong type/signature, malformed, encrypted or empty PDF |
| 400 | `invalid_job_description`, `invalid_input` | Blank job text or malformed multipart/request headers |
| 404 / 405 | `not_found` / `method_not_allowed` | Unknown endpoint or unsupported method |
| 413 | `pdf_too_large`, `request_too_large`, `too_many_pages`, `resume_text_too_long`, `job_description_too_long` | A documented input limit was exceeded |
| 422 | `no_extractable_text` | Blank or image-only PDF; OCR unavailable |
| 422 | `invalid_input` | Required form field missing or invalid |
| 429 | `provider_rate_limited` | Provider quota/rate limit; do not immediately retry in a loop |
| 502 | `provider_failure` | Provider rejected or failed the request |
| 502 | `invalid_model_output` | Refusal, incomplete output, invalid structure or unverified evidence; no score returned |
| 503 | `missing_configuration`, `provider_configuration_error` | Backend key missing or provider access invalid |
| 503 | `provider_unavailable` | Provider connection/timeout failure after bounded retries |
| 500 | `internal_error` | Unexpected internal failure; details are not exposed |

Limits: 5 MiB PDF, 10 pages, 30,000 extracted characters, 12,000 job-description characters, and 5 MiB + 64 KiB total multipart body. The upload is processed for each request; there is no upload ID or server-side file history.

## Detailed AI resume review

Every successful analysis now includes `resume_review` and `ai_quality_score`. No job description is needed for these fields.

- `resume_review.ratings`: clarity, demonstrated_impact, specificity, organization, language. Each has integer `rating` (0?4), `explanation`, and nullable exact resume `evidence`. Positive ratings require verified evidence.
- `strengths` (up to 5) and `issues` (up to 8): `heading`, `explanation`, `evidence`, `action`, and high/medium/low `priority`. Strengths require evidence. Issues about absent information may omit it.
- `sections`: exactly one each for summary, experience, projects, skills, education. Fields: `section`, `status` (strong/needs_detail/not_found), `feedback`, nullable `evidence`, `suggestion`.
- `bullet_rewrites` (up to 4): `original`, `revised`, `reason`. Original text is verified against the resume; new numerical claims are rejected. An empty list means no safe rewrite was suggested.
- `improved_summary`: an AI draft or null if the resume is insufficient. Confirm factual accuracy before using it.
- `ai_quality_score`: `label`, `value` (0?100), `explanation`, `breakdown` (the five ratings). Value is calculated in Python as sum(ratings) ? 5. Ratings are subjective LLM judgments, not an objective hiring or employer ATS assessment.

Detailed text limits are in schemas.py. Gemini receives a simpler wire schema to avoid provider schema-compiler limits; full Pydantic limits still apply on the backend. Unsupported quotes, duplicate sections, and new numbers in rewrites return invalid_model_output. Quote/number validation cannot prove semantic correctness: users must review suggested wording for changes in meaning. The ATS score remains a separate five-check text-readiness heuristic and does not examine visual PDF layout.
