from pymongo import MongoClient
from pymongo.database import Database
from app.core.config import settings

_client: MongoClient = None
_db: Database = None

def get_database() -> Database:
    """get MongoDB database instance"""
    global _client, _db
    if _db is None:
        _client = MongoClient(settings.MONGODB_URL)
        _db = _client[settings.MONGODB_DATABASE]
        # create indexes
        _db.users.create_index("email", unique=True)
    return _db

def close_database():
    """close MongoDB connection"""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None