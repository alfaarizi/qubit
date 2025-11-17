"""database connection and operations integration tests"""
import pytest
from app.core.config import settings

@pytest.mark.integration
class TestMongoDBConnection:
    """test MongoDB connection"""
    def test_connection(self, mongo_client):
        """test MongoDB server connection"""
        mongo_client.admin.command('ping')

    def test_server_info(self, mongo_client):
        """test MongoDB server info retrieval"""
        server_info = mongo_client.server_info()
        assert 'version' in server_info
        assert server_info['version'] is not None

    def test_database_access(self, mongo_client):
        """test database access"""
        db = mongo_client[settings.MONGODB_DATABASE]
        assert db is not None
        collections = db.list_collection_names()
        assert isinstance(collections, list)

@pytest.mark.integration
class TestMongoDBOperations:
    """test MongoDB CRUD operations"""
    def test_insert_and_read(self, mongo_client):
        """test insert and read operations"""
        db = mongo_client[settings.MONGODB_DATABASE]
        collection = db['test_collection']
        test_doc = {'test': True, 'message': 'test document'}
        result = collection.insert_one(test_doc)
        assert result.inserted_id is not None
        doc = collection.find_one({'_id': result.inserted_id})
        assert doc is not None
        assert doc['test'] is True
        assert doc['message'] == 'test document'

    def test_update_operation(self, mongo_client):
        """test update operation"""
        db = mongo_client[settings.MONGODB_DATABASE]
        collection = db['test_collection']
        result = collection.insert_one({'counter': 0})
        collection.update_one(
            {'_id': result.inserted_id},
            {'$set': {'counter': 1}}
        )
        doc = collection.find_one({'_id': result.inserted_id})
        assert doc['counter'] == 1

    def test_delete_operation(self, mongo_client):
        """test delete operation"""
        db = mongo_client[settings.MONGODB_DATABASE]
        collection = db['test_collection']
        result = collection.insert_one({'to_delete': True})
        delete_result = collection.delete_one({'_id': result.inserted_id})
        assert delete_result.deleted_count == 1
        doc = collection.find_one({'_id': result.inserted_id})
        assert doc is None
