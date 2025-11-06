from pymongo import AsyncMongoClient
from pymongo.server_api import ServerApi
from typing import Optional
import os

class MongoDB:
    client: Optional[AsyncMongoClient] = None
    database = None

    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB"""
        mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        cls.client = AsyncMongoClient(mongodb_url, server_api=ServerApi('1'))
        # Get database name from URL or use default
        db_name = os.getenv("MONGODB_DATABASE", "qubitkit")
        cls.database = cls.client[db_name]
        # Test connection
        await cls.client.admin.command('ping')
        print(f"✅ Connected to MongoDB: {db_name}")

    @classmethod
    async def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            print("❌ Closed MongoDB connection")

    @classmethod
    def get_db(cls):
        """Get database instance"""
        return cls.database

# Collections
def get_projects_collection():
    return MongoDB.get_db()["projects"]

def get_project_shares_collection():
    return MongoDB.get_db()["project_shares"]

def get_collaborators_collection():
    return MongoDB.get_db()["collaborators"]
