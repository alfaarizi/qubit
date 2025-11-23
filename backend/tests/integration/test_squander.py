"""squander client connection test"""
import pytest
from app.services.squander_client import SquanderClient, SSHConnectionError
from app.core.config import settings


@pytest.mark.asyncio
@pytest.mark.integration
class TestSquanderConnection:
    """test squander SSH connection"""
    async def test_ssh_connection(self):
        """test SSH connection to squander server"""
        client = SquanderClient()
        try:
            await client.connect()
            assert client.is_connected is True
        except SSHConnectionError as e:
            pytest.skip(f"SSH connection failed: {e}")
        finally:
            await client.disconnect()

    async def test_execute_command(self):
        """test command execution on remote server"""
        client = SquanderClient()
        try:
            await client.connect()
            output, error, code = await client.execute_command("whoami")
            assert code == 0
            assert len(output.strip()) > 0
        except SSHConnectionError as e:
            pytest.skip(f"SSH connection failed: {e}")
        finally:
            await client.disconnect()

    async def test_squander_import(self):
        """test squander python module is available on remote server"""
        client = SquanderClient()
        try:
            await client.connect()
            cmd = f"python3 -c \"import sys; sys.path.insert(0, '{settings.SQUANDER_SSH_PATH}'); from squander import *; print('OK')\""
            output, error, code = await client.execute_command(cmd)
            assert code == 0, f"command failed with code {code}: {error}"
            assert "OK" in output or output.strip() == ""
        except SSHConnectionError as e:
            pytest.skip(f"SSH connection failed: {e}")
        finally:
            await client.disconnect()