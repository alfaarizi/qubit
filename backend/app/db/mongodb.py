from pymongo import MongoClient
from pymongo.database import Database
from app.core.config import settings

_client: MongoClient = None
_db: Database = None
_db_name: str = None

def get_database() -> Database:
    """get MongoDB database instance"""
    global _client, _db, _db_name
    # determine which database to use based on environment
    db_name = settings.MONGODB_DATABASE
    if settings.ENVIRONMENT == "testing":
        if not db_name.endswith("_test"):
            db_name = f"{db_name}_test"
    
    # recreate connection if database name changed or connection doesn't exist
    if _db is None or _db_name != db_name:
        # close existing connection if database name changed
        if _client:
            _client.close()
        _client = MongoClient(settings.MONGODB_URL)
        _db = _client[db_name]
        _db_name = db_name
        # create indexes
        _db.users.create_index("email", unique=True)
    return _db

def close_database():
    """close MongoDB connection and reset state"""
    global _client, _db, _db_name
    if _client:
        _client.close()
        _client = None
        _db = None
        _db_name = None