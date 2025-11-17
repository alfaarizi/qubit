"""health check endpoint integration tests"""
import pytest

@pytest.mark.asyncio
@pytest.mark.integration
class TestHealthEndpoint:
    """test health check endpoint"""
    async def test_health_check_returns_status(self, http_client):
        """test health check returns status with dependencies"""
        response = await http_client.get("/api/v1/health/")
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "unhealthy", "degraded"]

    async def test_health_check_no_auth_required(self, http_client):
        """test that health check doesn't require authentication"""
        response = await http_client.get("/api/v1/health/")
        assert response.status_code not in [401, 403]
