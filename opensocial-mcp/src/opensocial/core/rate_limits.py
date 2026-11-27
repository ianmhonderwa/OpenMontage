"""In-process token-bucket rate limiting and YouTube quota accounting.

Platform quotas are also enforced by the platforms themselves; these limits stop a
misbehaving agent before it exhausts a user's quota or trips platform abuse systems.
For multi-instance deployments, put a shared limiter (e.g. at the gateway) in front.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field

from opensocial.core.exceptions import RateLimitExceeded


@dataclass
class Bucket:
    capacity: float
    refill_per_second: float
    tokens: float = field(default=-1.0)
    updated: float = field(default_factory=time.monotonic)

    def __post_init__(self) -> None:
        if self.tokens < 0:
            self.tokens = self.capacity


class RateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._buckets: dict[str, Bucket] = {}
        self._lock = threading.Lock()
        self._clock = clock

    def check(self, key: str, *, capacity: float, per_seconds: float, cost: float = 1.0) -> None:
        with self._lock:
            now = self._clock()
            bucket = self._buckets.get(key)
            if bucket is None:
                bucket = Bucket(capacity=capacity, refill_per_second=capacity / per_seconds, updated=now)
                self._buckets[key] = bucket
            elapsed = max(0.0, now - bucket.updated)
            bucket.tokens = min(bucket.capacity, bucket.tokens + elapsed * bucket.refill_per_second)
            bucket.updated = now
            if bucket.tokens < cost:
                retry = (cost - bucket.tokens) / bucket.refill_per_second
                raise RateLimitExceeded(
                    "Rate limit reached for this operation. Try again later.",
                    details={"retry_after_seconds": round(retry, 1)},
                )
            bucket.tokens -= cost

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


# Per-operation default limits: (capacity, per_seconds).
DEFAULT_LIMITS: dict[str, tuple[float, float]] = {
    "read": (60, 60),
    "analyse": (120, 60),
    "prepare": (60, 60),
    "edit": (20, 3600),
    "publish": (10, 3600),
    "message": (30, 3600),
    "delete": (5, 3600),
}

# YouTube Data API daily quota default is 10,000 units per project. Costs below follow the
# published quota table; verify with Google's quota calculator for your project.
YOUTUBE_QUOTA_COST: dict[str, int] = {
    "youtube_get_channel": 1,
    "youtube_list_videos": 2,
    "youtube_get_video": 1,
    "youtube_list_comments": 1,
    "youtube_list_playlists": 1,
    "youtube_reply_comment": 50,
    "youtube_update_video": 50,
    "youtube_create_playlist": 50,
    "youtube_add_to_playlist": 50,
    "youtube_upload_video": 1600,
}

limiter = RateLimiter()
