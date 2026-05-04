from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings


class MongoManager:
    def __init__(self) -> None:
        self.client: AsyncIOMotorClient | None = None
        self.database: AsyncIOMotorDatabase | None = None

    async def connect(self) -> AsyncIOMotorDatabase:
        if self.database is not None:
            return self.database

        settings = get_settings()
        self.client = AsyncIOMotorClient(
            settings.mongodb_url,
            tz_aware=True,
            serverSelectionTimeoutMS=5000,
        )
        await self.client.admin.command("ping")
        self.database = self.client[settings.mongodb_database]
        return self.database

    async def disconnect(self) -> None:
        if self.client is not None:
            self.client.close()
        self.client = None
        self.database = None


mongo_manager = MongoManager()


async def get_database() -> AsyncIOMotorDatabase:
    return await mongo_manager.connect()

