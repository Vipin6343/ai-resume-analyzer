from __future__ import annotations

import threading
from typing import Iterable

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings


class SentenceEmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._model: SentenceTransformer | None = None
        self._lock = threading.Lock()

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            with self._lock:
                if self._model is None:
                    self._model = SentenceTransformer(self.settings.sentence_transformer_model)
        return self._model

    def encode(self, texts: Iterable[str]) -> np.ndarray:
        model = self._get_model()
        vectors = model.encode(
            list(texts),
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return np.asarray(vectors, dtype="float32")


embedding_service = SentenceEmbeddingService()

