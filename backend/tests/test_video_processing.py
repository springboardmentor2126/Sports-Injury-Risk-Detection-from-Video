from app.services.video_service import select_sampled_frame_numbers


def test_select_sampled_frame_numbers_keeps_short_videos_intact():
    assert select_sampled_frame_numbers(10, max_frames=60) == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]


def test_select_sampled_frame_numbers_limits_long_videos():
    sampled = select_sampled_frame_numbers(1000, max_frames=60)

    assert len(sampled) == 60
    assert sampled[0] == 1
    assert sampled[-1] == 1000


def test_select_sampled_frame_numbers_with_sample_interval():
    sampled = select_sampled_frame_numbers(100, sample_interval=5, max_frames=10)

    assert sampled[0] == 1
    assert sampled[-1] == 96
    assert len(sampled) == 10
    assert sampled == [1, 11, 21, 31, 41, 56, 66, 76, 86, 96]
