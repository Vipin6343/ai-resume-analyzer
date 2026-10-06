"""Exercise grounding recovery through the real HTTP endpoint, with mocked AI."""

from unittest.mock import Mock

import pytest

from app.errors import AppError
from app.routes import get_provider


def request_analysis(client, pdf_factory, job):
    return client.post('/api/v1/resumes/analyze',
        files={'file': ('resume.pdf', pdf_factory(), 'application/pdf')},
        data={'job_description': job})


@pytest.mark.parametrize('source', ['resume', 'job'])
def test_invalid_quote_regenerates_and_revalidates(app, client, pdf_factory, sample_model, job, source):
    invalid = sample_model.model_copy(deep=True)
    if source == 'job':
        # Regression: the old prompt told the model to quote resume text here.
        invalid.requirements[0].job_evidence = 'Python developer.'
    else:
        invalid.requirements[0].evidence = 'Invented expertise'
    provider = Mock(side_effect=[invalid, sample_model])
    app.dependency_overrides[get_provider] = lambda: provider
    response = request_analysis(client, pdf_factory, job)
    assert response.status_code == 200
    assert response.json()['match_score']['value'] == 40
    assert provider.call_count == 2


def test_persistent_invalid_output_stops_after_two_attempts(app, client, pdf_factory, sample_model, job):
    sample_model.requirements[0].evidence = 'Invented expertise'
    provider = Mock(return_value=sample_model)
    app.dependency_overrides[get_provider] = lambda: provider
    response = request_analysis(client, pdf_factory, job)
    assert response.status_code == 502
    assert response.json()['error']['code'] == 'invalid_model_output'
    assert 'Invented expertise' not in response.text
    assert provider.call_count == 2


@pytest.mark.parametrize('code,status', [('provider_rate_limited',429), ('missing_configuration',503), ('provider_unavailable',503)])
def test_provider_errors_are_not_retried_by_analysis(app, client, pdf_factory, job, code, status):
    provider = Mock(side_effect=AppError(status, code, 'Provider unavailable.'))
    app.dependency_overrides[get_provider] = lambda: provider
    assert request_analysis(client, pdf_factory, job).status_code == status
    assert provider.call_count == 1


def test_title_only_with_no_requirements_returns_null(app, client, pdf_factory, sample_model):
    sample_model.requirements = []
    provider = Mock(return_value=sample_model)
    app.dependency_overrides[get_provider] = lambda: provider
    response = request_analysis(client, pdf_factory, 'ai engineer')
    assert response.status_code == 200
    assert response.json()['match_score']['value'] is None
    assert provider.call_count == 1


def test_schema_failure_can_recover(app, client, pdf_factory, sample_model, job):
    provider = Mock(side_effect=[AppError(502, 'invalid_model_output', 'Invalid JSON'), sample_model])
    app.dependency_overrides[get_provider] = lambda: provider
    assert request_analysis(client, pdf_factory, job).status_code == 200
    assert provider.call_count == 2
