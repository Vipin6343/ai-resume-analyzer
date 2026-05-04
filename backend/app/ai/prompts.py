from typing import Iterable

from app.schemas.resume import ParsedResume


def _format_list(values: Iterable[str]) -> str:
    items = [value.strip() for value in values if value and value.strip()]
    return "\n".join(f"- {item}" for item in items) if items else "- None provided"


def build_analysis_prompt(parsed_resume: ParsedResume, target_job_titles: list[str]) -> str:
    return f"""
You are an expert resume reviewer and ATS consultant.
Analyze the resume below and produce a rigorous, honest evaluation.

Target job titles:
{_format_list(target_job_titles)}

Resume contact summary:
- Name: {parsed_resume.name or "Unknown"}
- Email: {parsed_resume.email or "Unknown"}
- Phone: {parsed_resume.phone or "Unknown"}
- LinkedIn: {parsed_resume.linkedin or "Unknown"}
- Location: {parsed_resume.location or "Unknown"}

Professional summary:
{parsed_resume.summary or "Not clearly stated"}

Skills:
{_format_list(parsed_resume.skills)}

Experience bullets:
{_format_list(parsed_resume.experience)}

Projects:
{_format_list(parsed_resume.projects)}

Education:
{_format_list(parsed_resume.education)}

Certifications:
{_format_list(parsed_resume.certifications)}

Instructions:
- Score the resume from 0 to 100.
- Extract the strongest skills that are actually supported by the resume.
- Identify realistic missing skills for the target roles.
- Provide clear ATS-focused suggestions.
- Keep the output practical and evidence-based.
""".strip()


def build_improvement_prompt(
    parsed_resume: ParsedResume,
    target_job_title: str | None,
    focus_areas: list[str],
    prior_suggestions: list[str],
) -> str:
    return f"""
You are a senior technical resume writer.
Rewrite this resume to be more ATS-friendly, more concise, and more outcome-driven.

Target job title:
{target_job_title or "General software / AI engineering roles"}

Focus areas:
{_format_list(focus_areas)}

Existing improvement suggestions:
{_format_list(prior_suggestions)}

Current summary:
{parsed_resume.summary or "Not available"}

Current skills:
{_format_list(parsed_resume.skills)}

Current experience bullets:
{_format_list(parsed_resume.experience)}

Current project bullets:
{_format_list(parsed_resume.projects)}

Instructions:
- Write a sharper headline and professional summary.
- Rewrite bullets using impact-first language and measurable outcomes where reasonable.
- Improve ATS keyword coverage without fabricating experience.
- Keep recommendations grounded in the source resume.
""".strip()

