from app.services.video_service import is_allowed_video_file


def test_allows_supported_video_formats():
    assert is_allowed_video_file('football.mp4', 50 * 1024 * 1024) is True
    assert is_allowed_video_file('clip.AVI', 50 * 1024 * 1024) is True
    assert is_allowed_video_file('move.mov', 50 * 1024 * 1024) is True


def test_rejects_unsupported_video_formats_and_large_files():
    assert is_allowed_video_file('image.jpg', 50 * 1024 * 1024) is False
    assert is_allowed_video_file('video.mp4', 201 * 1024 * 1024) is False
