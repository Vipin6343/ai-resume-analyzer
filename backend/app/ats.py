"""Versioned, deterministic compatibility checks on extracted PDF text."""

import re

from .schemas import ATSCheck, ATSScore, PDFDiagnostics

HEADINGS = {
    "summary": r"(?:professional\s+)?(?:summary|profile)|objective|about\s+me",
    "skills": r"(?:technical\s+|core\s+)?skills|skills\s*(?:&|and)\s*expertise",
    "experience": r"(?:work\s+|professional\s+|employment\s+)?experience|employment\s+history",
    "projects": r"(?:personal\s+|academic\s+|selected\s+)?projects",
    "education": r"education|academic\s+(?:background|qualifications)",
    "certifications": r"certifications|certificates",
    "other": r"languages|interests|awards|publications|references|volunteering",
}


def parse_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        matched = False
        for name, pattern in HEADINGS.items():
            match = re.fullmatch(rf"(?:{pattern})(?:\s*:\s*(.*))?", line, re.I)
            if match:
                current = name
                sections.setdefault(name, [])
                if match.group(1):
                    sections[name].append(match.group(1))
                matched = True
                break
        if not matched and current and line:
            sections[current].append(line)
    return sections


def calculate_ats_score(text: str, diagnostics: PDFDiagnostics | None = None) -> ATSScore:
    sections = parse_sections(text)
    emails = list(dict.fromkeys(re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)))
    phones = []
    for candidate in re.findall(r"(?<!\w)\+?\d[\d ()-]{5,}\d(?!\w)", text):
        if 7 <= len(re.sub(r"\D", "", candidate)) <= 15 and not re.fullmatch(r"\d{4}\s*-\s*\d{4}", candidate):
            phones.append(candidate)
    relevant = "\n".join(line for name in ("experience", "projects", "education") for line in sections.get(name, []))
    dates = list(dict.fromkeys(re.findall(r"\b(?:19|20)\d{2}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Present|Current)\b", relevant, re.I)))
    words = re.findall(r"[^\W_]+", text, re.UNICODE)
    word_signal = len(words) >= 20
    bad_characters = text.count("\ufffd") + sum(ord(c) < 32 and c not in "\n\r\t" for c in text)
    checks = []

    def add(name, passed, weight, explanation, evidence, suggestion, checked=True):
        checks.append(ATSCheck(
            check=name, passed=bool(passed and checked),
            status=("passed" if passed else "needs_review") if checked else "not_checked",
            points=weight if passed and checked else 0, max_points=weight if checked else 0,
            explanation=explanation, evidence=evidence[:4],
            suggestion=suggestion if checked and not passed else None,
        ))

    add("extractable_content", word_signal, 20,
        f"Detected {len(words)} word-like tokens; this rubric requires at least 20.",
        [f"{len(text)} extracted characters"],
        "Check the extracted-text preview. Export a PDF with selectable text if content is missing.")
    add("text_encoding", word_signal and bad_characters == 0, 10,
        f"Detected {bad_characters} replacement or unexpected control characters.",
        [f"Replacement/control characters: {bad_characters}"],
        "Inspect the preview for broken characters; export again with standard embedded fonts.")
    add("email_contact", bool(emails), 10, "An email-shaped address can be parsed; its validity is not verified.",
        emails, "Include a readable contact email if applicable.")
    add("skills_content", bool(sections.get("skills")), 15,
        "Checks for a recognized Skills heading followed by content, including inline headings.",
        sections.get("skills", []), "Use a clear Skills heading and list only skills you actually have.")
    work = sections.get("experience", []) + sections.get("projects", [])
    add("experience_or_project_content", bool(work), 20,
        "Checks for content under Experience or Projects; projects are sufficient for this check.",
        work, "Place relevant work or projects under a clear heading.")
    add("education_content", bool(sections.get("education")), 10,
        "Checks for content under an Education heading; this does not assess qualification level.",
        sections.get("education", []), "If applicable, give your education details under an Education heading.")
    add("recognizable_dates", bool(dates), 5,
        "Checks for a recognizable year or month in experience, projects or education. Chronology is not inferred.",
        dates, "Use clear month/year or year dates for relevant work, projects or education, if appropriate.")
    pages_ok = diagnostics is not None and not diagnostics.pages_without_text
    add("text_on_each_page", pages_ok, 10,
        ("Pages without extractable text: " + (", ".join(map(str, diagnostics.pages_without_text)) or "none"))
        if diagnostics else "PDF page metadata was not supplied; this check is excluded from scoring.",
        [f"Page {i}: {count} characters" for i, count in enumerate(diagnostics.characters_per_page, 1)] if diagnostics else [],
        "Inspect pages with no text. They may be blank or scanned; OCR is not supported.", checked=diagnostics is not None)
    # Informational signals carry no points: images and phone numbers are not automatically defects.
    add("phone_detection", bool(phones), 0, "Phone-like text detection only; optional and not part of the score.",
        phones, "If you include a phone number, check that it is visible in the extracted text.")
    image_pages = diagnostics.pages_with_images if diagnostics else []
    add("embedded_images", not image_pages, 0,
        ("Direct PDF image objects found on pages: " + (", ".join(map(str, image_pages)) or "none"))
        if diagnostics else "PDF image metadata unavailable.",
        [str(page) for page in image_pages],
        "Images may be decorative. Ensure essential information is also present as selectable text.",
        checked=diagnostics is not None)
    total = sum(c.max_points for c in checks)
    earned = sum(c.points for c in checks)
    return ATSScore(
        value=round(100 * earned / total) if total else 0,
        assessed_points=earned, possible_points=total,
        explanation=(
            "ATS compatibility rubric v2: score = 100 x earned points / assessed possible points. "
            "Checks use PDF extraction and documented text rules, not LLM guesses. "
            "This is not an employer ATS score, parsing guarantee, or hiring prediction. "
            "Phone and image observations carry no points. Unavailable metadata is excluded."
        ),
        breakdown=checks,
        improvement_suggestions=[c.suggestion for c in checks if c.suggestion],
        parsed_fields={"emails": emails, "phone_candidates": phones,
                       "recognized_sections": list(sections), "date_tokens": dates},
        text_preview=text[:5000], preview_truncated=len(text) > 5000,
        limitations=[
            "English heading and date patterns can miss other languages and unconventional headings.",
            "The preview shows this parser's reading order; other ATS parsers may differ.",
            "Visual layout, columns, tables, font size, invisible text and embedded-image meaning are not assessed.",
            "Field detection does not verify contact ownership, chronology or the truth of qualifications.",
            "The rubric is an application design choice, not a validated hiring predictor.",
        ],
    )
