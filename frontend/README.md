# ResumeLens frontend

React + Vite workspace with a dark slate/orange theme and four pages, adapted from the local `E:\ai-resume-analyzer` reference project.

## Pages

- **Upload Resume** (`#/upload`): select/drop a PDF, optionally specify a role and job description, run AI analysis or the independent ATS compatibility check. Results include a profile snapshot, skills and extracted-text diagnostics.
- **Dashboard** (`#/dashboard`): full analysis, AI quality and compatibility scores, optional job match, report export, career tools and recent reports.
- **Job Matches** (`#/jobs`): compare the selected PDF against a pasted job posting; inspect matched, missing and insufficiently evidenced requirements. Required requirements carry weight 2 and preferred requirements weight 1.
- **Resume Improvement** (`#/improvement`): prioritized issues, strengths, section reviews, bullet rewrite drafts and an improved summary from the analysis.

Navigation supports browser back/forward and direct hash links. Selected PDF and draft inputs remain available between pages during the session. No job description is needed for a standalone resume analysis.

The UI uses the existing FastAPI API. It does not import the reference project's MongoDB storage, FAISS sample-job search or permanent PDF uploads. Job matching here compares a user-provided job description. Dashboard counts describe actual saved reports and the selected analysis.

## Run in Windows PowerShell

Backend terminal:

```powershell
cd E:\ResumeAnlyser\backend
# First setup only: copy the example and configure your provider key/model.
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --env-file .env
```

Do not overwrite an existing configured `.env`. For a fresh install, follow the backend README's virtual environment and dependency setup first.

Frontend terminal:

```powershell
cd E:\ResumeAnlyser\frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to `http://127.0.0.1:8000`. The backend needs its configured Gemini or OpenAI key for AI features. `POST /api/v1/resumes/ats-check` runs without an LLM.

Optional frontend `.env` settings: `BACKEND_URL` changes the development proxy; `VITE_API_BASE_URL` sets an API origin for deployment. Restart Vite after changes and configure backend CORS for the frontend origin. Keep all provider API keys on the backend, never in `VITE_` variables.

## Privacy and scores

The last five completed AI reports are stored in browser localStorage, including extracted information and feedback. Delete them individually in Recent reports or the upload panel's history list. PDF files are held in memory and are not saved in browser storage. ATS-only checks stay in memory. Refresh clears the selected PDF; reopen a saved report to view previous feedback. Upload and analyze a PDF again to use generation tools with that file.

AI resume quality is subjective. ATS compatibility is the documented application rubric, not an employer's proprietary score. Job matching depends on the supplied posting and LLM interpretation of evidence. See `backend/docs/ATS_COMPATIBILITY.md` for rubric 2.0 and limitations. Cancelling stops the browser request; an already-started backend provider call may continue.

## Build and verification

```powershell
npm run build
```

Static files are generated in `dist/`. Hash navigation works with static hosting. Serve `/api` through a reverse proxy or set `VITE_API_BASE_URL` before building for deployment. This project has not been deployed.

The workspace redesign was checked with the Vite production build. It was not browser-automated or tested with a new live LLM call. Existing backend automated tests mock the provider.
