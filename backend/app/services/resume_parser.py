import re
from pathlib import Path

import fitz

from app.schemas.resume import ParsedResume


SECTION_ALIASES = {
    "summary": "summary",
    "professional summary": "summary",
    "profile": "summary",
    "skills": "skills",
    "technical skills": "skills",
    "core skills": "skills",
    "experience": "experience",
    "work experience": "experience",
    "professional experience": "experience",
    "projects": "projects",
    "education": "education",
    "certifications": "certifications",
}

KNOWN_SKILLS = {
    "python",
    "fastapi",
    "django",
    "flask",
    "react",
    "tailwind css",
    "tailwind",
    "javascript",
    "typescript",
    "node.js",
    "node",
    "mongodb",
    "postgresql",
    "sql",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "faiss",
    "langchain",
    "llms",
    "prompt engineering",
    "rag",
    "machine learning",
    "deep learning",
    "nlp",
    "transformers",
    "pytorch",
    "tensorflow",
    "pandas",
    "numpy",
    "git",
    "ci/cd",
    "linux",
    "rest api",
    "restful apis",
    "graphql",
    "microservices",
    "system design",
    "testing",
    "pytest",
    "data modeling",
    "dbt",
    "looker",
    "etl",
    "statistics",
    "a/b testing",
}

DISPLAY_OVERRIDES = {
    "aws": "AWS",
    "gcp": "GCP",
    "llms": "LLMs",
    "nlp": "NLP",
    "sql": "SQL",
    "ci/cd": "CI/CD",
    "faiss": "FAISS",
    "rag": "RAG",
    "mongodb": "MongoDB",
    "postgresql": "PostgreSQL",
    "dbt": "dbt",
    "rest api": "REST API",
    "restful apis": "REST APIs",
}


class ResumeParserService:
    def extract_text(self, file_path: str | Path) -> str:
        document = fitz.open(str(file_path))
        try:
            return "\n".join(page.get_text("text") for page in document)
        finally:
            document.close()

    def clean_text(self, raw_text: str) -> str:
        text = raw_text.replace("\u2022", "-").replace("\xa0", " ")
        text = re.sub(r"\r\n?", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        return text.strip()

    def parse(self, file_path: str | Path) -> tuple[str, ParsedResume]:
        cleaned_text = self.clean_text(self.extract_text(file_path))
        lines = [line.strip() for line in cleaned_text.splitlines() if line.strip()]
        sections = self._split_sections(lines)
        parsed = ParsedResume(
            name=self._extract_name(lines),
            email=self._search(cleaned_text, r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE),
            phone=self._search(cleaned_text, r"(\+?\d[\d\-\s()]{8,}\d)"),
            linkedin=self._search(cleaned_text, r"(https?://(?:www\.)?linkedin\.com/[^\s]+)", re.IGNORECASE),
            location=self._extract_location(lines),
            summary=sections.get("summary"),
            skills=self._extract_skills(cleaned_text, sections.get("skills", "")),
            experience=self._extract_entries(sections.get("experience", "")),
            projects=self._extract_entries(sections.get("projects", "")),
            education=self._extract_entries(sections.get("education", "")),
            certifications=self._extract_entries(sections.get("certifications", "")),
            raw_sections=sections,
        )
        return cleaned_text, parsed

    def _split_sections(self, lines: list[str]) -> dict[str, str]:
        sections: dict[str, list[str]] = {"summary": []}
        current_section = "summary"

        for line in lines:
            normalized = line.lower().strip(":").strip()
            if normalized in SECTION_ALIASES:
                current_section = SECTION_ALIASES[normalized]
                sections.setdefault(current_section, [])
                continue
            sections.setdefault(current_section, []).append(line)

        return {key: "\n".join(value).strip() for key, value in sections.items() if value}

    def _extract_name(self, lines: list[str]) -> str | None:
        if not lines:
            return None
        candidate = lines[0]
        if len(candidate.split()) <= 5 and "@" not in candidate and not re.search(r"\d", candidate):
            return candidate
        return None

    def _extract_location(self, lines: list[str]) -> str | None:
        for line in lines[:5]:
            if any(token in line.lower() for token in ("india", "remote", "usa", "uk", "canada")):
                return line
        return None

    def _extract_entries(self, block: str) -> list[str]:
        if not block:
            return []

        lines = [line.strip("- ").strip() for line in block.splitlines() if line.strip()]
        merged: list[str] = []
        for line in lines:
            if len(line) < 4:
                continue
            if merged and len(line.split()) < 4 and not line.endswith("."):
                merged[-1] = f"{merged[-1]} {line}".strip()
            else:
                merged.append(line)
        return merged[:12]

    def _extract_skills(self, full_text: str, skills_block: str) -> list[str]:
        results = set()
        if skills_block:
            for part in re.split(r"[,|/•\n]", skills_block):
                cleaned = part.strip(" -")
                if 1 < len(cleaned) <= 40:
                    results.add(cleaned.title())

        full_text_lower = full_text.lower()
        for skill in KNOWN_SKILLS:
            if skill in full_text_lower:
                results.add(DISPLAY_OVERRIDES.get(skill, skill.title()))

        return sorted(results)

    def _search(self, text: str, pattern: str, flags: int = 0) -> str | None:
        match = re.search(pattern, text, flags)
        return match.group(0).strip() if match else None


resume_parser_service = ResumeParserService()
