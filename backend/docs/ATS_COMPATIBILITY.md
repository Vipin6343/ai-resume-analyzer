# ATS compatibility checker (rubric 2.0)

This checker measures what this application's PDF parser can extract and recognize. It does not reproduce a company's ATS, predict hiring, or claim compatibility with every parser. It runs locally without calling Gemini/OpenAI.

## Usage

POST /api/v1/resumes/ats-check with multipart field `file` (PDF). No job description or provider key is needed. The same report is included as `ats_score` in the full analyze endpoint. The UI has a separate **Check ATS compatibility** button, so a provider outage does not block this check.

## Deterministic rubric

| Check | Points | Rule |
| --- | ---: | --- |
| Extractable content | 20 | At least 20 Unicode word-like tokens |
| Text encoding | 10 | Content threshold met and no replacement/unexpected control characters |
| Email | 10 | At least one email-shaped text match |
| Skills content | 15 | Recognized heading with nonempty content |
| Experience or project content | 20 | At least one of those sections has content |
| Education content | 10 | Recognized heading with nonempty content |
| Dates | 5 | A recognizable English month, year or Present/Current in work/project/education content |
| Page coverage | 10 | Each PDF page has some extractable text |
| Phone detection | 0 | Informational phone-shaped matches; no identity verification |
| Embedded images | 0 | Informational direct PDF image objects per page |

Score = round(100 × earned points / assessed possible points). If PDF diagnostics are unavailable (e.g. a direct text-only service call), page coverage is marked not_checked and excluded from the denominator. Normal PDF endpoint requests assess 100 possible points. Informational checks have no influence on the score.

Section rules accept common English aliases, optional colons and inline headings such as `Skills: Python, SQL`. Empty headings do not pass. They do not determine whether the content really demonstrates competence. Page coverage does not detect partial scanned content on a page with other text.

## Response additions

`ATSScore` now contains `rubric_version`, `assessed_points`, `possible_points`, `parsed_fields` (emails, phone_candidates, recognized_sections, date_tokens), `text_preview` (first 5,000 characters), `preview_truncated`, and `limitations`. Each check includes `status` (passed/needs_review/not_checked), `evidence`, and nullable `suggestion`, as well as the existing points and explanation fields.

The extract endpoint additionally returns `diagnostics`: page_count, characters_per_page, pages_without_text, pages_with_images. All file-size/page/text limits and encrypted/malformed/image-only PDF errors remain in effect. A fully image-only PDF returns the existing OCR-not-supported error, not a fabricated score.

## Interpretation and privacy

The previous five-check score is replaced. Old saved reports should not be compared numerically with this version. A score of 100 means the documented checks pass, not a perfect resume. English heuristics may miss other languages, abbreviated headings or unusual formatting.

Use the extracted-text preview to manually inspect reading order. The checker does not claim to detect visual columns, tables, font sizes, hidden text, or the meaning of images. Dates are detected, not validated for chronology; contact values are candidates, not verified contacts.

Compatibility checks keep the resume on the backend and do not send it to the model. Full AI analysis still sends extracted text to the configured provider. Full reports in frontend History now include the text preview and detected contact fields; use History deletion controls to remove them. Standalone compatibility checks are held in memory and are not automatically added to History.
