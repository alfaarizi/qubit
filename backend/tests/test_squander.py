#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.services.squander_client import SquanderClient

async def test_squander():
    client = SquanderClient()
    try:
        await client.connect()
        print("SSH connection successful")

        output, _, _ = await client.execute_command("whoami")
        print(f"Remote user: {output.strip()}")

        cmd = f"python3 -c \"import sys; sys.path.insert(0, '{settings.SQUANDER_SSH_PATH}'); from squander import *; print('OK')\""
        output, _, code = await client.execute_command(cmd)

        if code == 0:
            print("SQUANDER Python API available")
            return True
        else:
            print("SQUANDER import failed")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        await client.disconnect()

if __name__ == "__main__":
    result = asyncio.run(test_squander())
    sys.exit(0 if result else 1)