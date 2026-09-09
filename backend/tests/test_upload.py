import io
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_upload_avatar_valid_image():
    # 1x1 transparent PNG image bytes
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("avatar.png", png_bytes, "image/png")}
        response = await ac.post("/api/upload/avatar", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("data:image/png;base64,") or data["url"].startswith("http")


@pytest.mark.asyncio
async def test_upload_avatar_invalid_mime_type():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("malicious.txt", b"plain text content", "text/plain")}
        response = await ac.post("/api/upload/avatar", files=files)

    assert response.status_code == 400
    data = response.json()
    assert "Unsupported image file format" in data["detail"]


@pytest.mark.asyncio
async def test_upload_avatar_empty_file():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("empty.jpg", b"", "image/jpeg")}
        response = await ac.post("/api/upload/avatar", files=files)

    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["detail"]


@pytest.mark.asyncio
async def test_upload_avatar_cloudinary_success():
    png_bytes = b"\x89PNG\r\n\x1a\nfake_image_bytes"

    with patch("app.services.upload.settings") as mock_settings, \
         patch("app.services.upload.cloudinary.uploader.upload") as mock_upload:
        mock_settings.CLOUDINARY_URL = "cloudinary://key:secret@testcloud"
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/testcloud/image/upload/v1234/tripverse/avatars/test.jpg",
            "public_id": "tripverse/avatars/test",
        }

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            files = {"file": ("profile.png", png_bytes, "image/png")}
            response = await ac.post("/api/upload/avatar", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["url"] == "https://res.cloudinary.com/testcloud/image/upload/v1234/tripverse/avatars/test.jpg"
        assert data["public_id"] == "tripverse/avatars/test"
        assert data["provider"] == "cloudinary"
