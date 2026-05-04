from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

from motor.motor_asyncio import AsyncIOMotorDatabase


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_document(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if not document:
        return None
    normalized = {**document}
    if "_id" in normalized and "id" not in normalized:
        normalized["id"] = normalized["_id"]
    normalized.pop("_id", None)
    return normalized


class UserRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["users"]

    async def ensure_user(self, user_id: str) -> None:
        await self.collection.update_one(
            {"_id": user_id},
            {"$setOnInsert": {"created_at": utc_now()}},
            upsert=True,
        )


class ResumeRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["resumes"]

    async def create(self, document: dict[str, Any]) -> None:
        await self.collection.replace_one({"_id": document["_id"]}, document, upsert=True)

    async def get_by_id(self, resume_id: str) -> dict[str, Any] | None:
        return _normalize_document(await self.collection.find_one({"_id": resume_id}))

    async def get_latest(self, user_id: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"user_id": user_id}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def list_by_user(self, user_id: str) -> list[dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id})
        return [_normalize_document(document) async for document in cursor]

    async def delete_by_user(self, user_id: str) -> None:
        await self.collection.delete_many({"user_id": user_id})

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})


class AnalysisRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["analysis_results"]

    async def create(self, document: dict[str, Any]) -> None:
        await self.collection.replace_one({"_id": document["_id"]}, document, upsert=True)

    async def get_latest_for_resume(self, resume_id: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"resume_id": resume_id}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def get_by_cache_key(self, cache_key: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"cache_key": cache_key}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def get_latest_for_user(self, user_id: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"user_id": user_id}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def delete_by_user(self, user_id: str) -> None:
        await self.collection.delete_many({"user_id": user_id})

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})


class MatchRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["job_matches"]

    async def create(self, document: dict[str, Any]) -> None:
        await self.collection.replace_one({"_id": document["_id"]}, document, upsert=True)

    async def get_latest_for_resume(self, resume_id: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"resume_id": resume_id}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def get_by_cache_key(self, cache_key: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"cache_key": cache_key}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def get_latest_for_user(self, user_id: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"user_id": user_id}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def delete_by_user(self, user_id: str) -> None:
        await self.collection.delete_many({"user_id": user_id})

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})


class ImprovementRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["resume_improvements"]

    async def create(self, document: dict[str, Any]) -> None:
        await self.collection.replace_one({"_id": document["_id"]}, document, upsert=True)

    async def get_by_cache_key(self, cache_key: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"cache_key": cache_key}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def get_latest_for_user(self, user_id: str) -> dict[str, Any] | None:
        document = await self.collection.find_one({"user_id": user_id}, sort=[("created_at", -1)])
        return _normalize_document(document)

    async def delete_by_user(self, user_id: str) -> None:
        await self.collection.delete_many({"user_id": user_id})

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})


class HistoryRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["history"]

    async def create(self, document: dict[str, Any]) -> None:
        await self.collection.insert_one(document)

    async def list_recent(self, user_id: str, limit: int = 8) -> list[dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        return [_normalize_document(document) async for document in cursor]

    async def delete_by_user(self, user_id: str) -> None:
        await self.collection.delete_many({"user_id": user_id})


class AICacheRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["ai_cache"]

    async def get(self, cache_key: str) -> dict[str, Any] | None:
        document = await self.collection.find_one(
            {"_id": cache_key, "expires_at": {"$gt": utc_now()}},
        )
        return _normalize_document(document)

    async def set(self, cache_key: str, payload: dict[str, Any], ttl_seconds: int) -> None:
        await self.collection.replace_one(
            {"_id": cache_key},
            {
                "_id": cache_key,
                "payload": payload,
                "expires_at": utc_now() + timedelta(seconds=ttl_seconds),
                "created_at": utc_now(),
            },
            upsert=True,
        )


class JobRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["jobs"]

    async def upsert_many(self, jobs: Iterable[dict[str, Any]]) -> None:
        for job in jobs:
            await self.collection.replace_one({"_id": job["_id"]}, job, upsert=True)

    async def list_all(self) -> list[dict[str, Any]]:
        cursor = self.collection.find({}).sort("title", 1)
        return [_normalize_document(document) async for document in cursor]

    async def get_many_by_ids(self, job_ids: list[str]) -> list[dict[str, Any]]:
        cursor = self.collection.find({"_id": {"$in": job_ids}})
        documents = [_normalize_document(document) async for document in cursor]
        order = {job_id: index for index, job_id in enumerate(job_ids)}
        return sorted(documents, key=lambda item: order.get(item["id"], 9999))

    async def count(self) -> int:
        return await self.collection.count_documents({})


async def ensure_indexes(database: AsyncIOMotorDatabase) -> None:
    await database["resumes"].create_index([("user_id", 1), ("created_at", -1)])
    await database["analysis_results"].create_index([("user_id", 1), ("created_at", -1)])
    await database["analysis_results"].create_index("cache_key")
    await database["job_matches"].create_index([("user_id", 1), ("created_at", -1)])
    await database["job_matches"].create_index("cache_key")
    await database["resume_improvements"].create_index([("user_id", 1), ("created_at", -1)])
    await database["resume_improvements"].create_index("cache_key")
    await database["history"].create_index([("user_id", 1), ("created_at", -1)])
    await database["ai_cache"].create_index("expires_at", expireAfterSeconds=0)
    await database["jobs"].create_index("title")
