import pytest
from contextlib import asynccontextmanager
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport

from app.core.config import settings
from app.main import app

TEST_API_KEY = settings.api_key


@pytest.fixture
async def client():
    with patch("app.main.start_scheduler"), \
         patch("app.main.run_full_ingestion", new=AsyncMock()), \
         patch("app.main.scheduler") as mock_sched:
        mock_sched.shutdown = MagicMock()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c


@pytest.fixture
def auth():
    return {"X-API-Key": TEST_API_KEY}
