# 🤖 AI Resume Analyzer

An intelligent resume analysis tool that uses AI to evaluate resumes, provide ATS compatibility scores, and give actionable feedback to help job seekers improve their chances.

## ✨ Features

- 📄 **PDF Resume Parsing** – Upload and extract text from PDF resumes
- 🧠 **AI-Powered Analysis** – Deep analysis using LLM providers (Gemini, OpenAI, etc.)
- 📊 **ATS Compatibility Scoring** – Check how well your resume passes Applicant Tracking Systems
- 💡 **Actionable Feedback** – Get specific suggestions to improve your resume
- 🖨️ **Report Printing** – Export and print your analysis report

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Lucide React |
| **Backend** | FastAPI, Python, Uvicorn |
| **AI** | OpenAI-compatible LLMs (Gemini, GPT, etc.) |
| **PDF** | PyPDF |
| **Validation** | Pydantic v2 |

## 📁 Project Structure

```
ai-resume-analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app entry point
│   │   ├── routes.py      # API endpoints
│   │   ├── analysis.py    # Resume analysis logic
│   │   ├── ats.py         # ATS compatibility checks
│   │   ├── scoring.py     # Scoring engine
│   │   ├── pdf.py         # PDF parsing
│   │   ├── provider.py    # LLM provider config
│   │   └── schemas.py     # Pydantic models
│   ├── tests/             # Pytest test suite
│   ├── docs/              # API & ATS docs
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/    # React components
    │   ├── hooks/         # Custom hooks
    │   └── utils/         # Utility functions
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- An LLM API key (Gemini / OpenAI)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API key
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app will be available at `http://localhost:5173`

## 🔑 Environment Variables

### Backend (`.env`)
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-api-key
```

## 🧪 Running Tests

```bash
cd backend
pytest
```

## 📜 License

MIT License
