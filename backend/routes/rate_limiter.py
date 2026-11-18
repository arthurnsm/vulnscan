from collections import deque
from dataclasses import dataclass
import math
import threading
import time
from typing import Callable, Deque, Dict

ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS = 10
ORCHESTRATOR_RATE_LIMIT_WINDOW_SECONDS = 1.0


@dataclass(frozen=True, slots=True)
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    retry_after_seconds: int
    retry_after_exact: float


class GlobalSlidingWindowRateLimiter:
    """Limitador de taxa global em janela deslizante para chamadas ao orquestrador."""

    def __init__(
        self,
        max_requests: int = ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS,
        window_seconds: float = ORCHESTRATOR_RATE_LIMIT_WINDOW_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if max_requests < 1:
            raise ValueError("max_requests deve ser >= 1")
        if window_seconds <= 0:
            raise ValueError("window_seconds deve ser > 0")

        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clock = clock
        self._timestamps: Deque[float] = deque()
        self._lock = threading.Lock()

    def acquire(self) -> RateLimitResult:
        with self._lock:
            now = self._clock()
            while self._timestamps and (now - self._timestamps[0]) >= self.window_seconds:
                self._timestamps.popleft()

            if len(self._timestamps) >= self.max_requests:
                oldest = self._timestamps[0]
                wait_exact = max(0.0, self.window_seconds - (now - oldest))
                retry_after_seconds = max(1, math.ceil(wait_exact))
                return RateLimitResult(
                    allowed=False,
                    limit=self.max_requests,
                    remaining=0,
                    retry_after_seconds=retry_after_seconds,
                    retry_after_exact=wait_exact,
                )

            self._timestamps.append(now)
            remaining = self.max_requests - len(self._timestamps)
            return RateLimitResult(
                allowed=True,
                limit=self.max_requests,
                remaining=remaining,
                retry_after_seconds=0,
                retry_after_exact=0.0,
            )

    def reset(self) -> None:
        with self._lock:
            self._timestamps.clear()


def build_rate_limit_headers(result: RateLimitResult) -> Dict[str, str]:
    headers = {
        "X-RateLimit-Limit": str(result.limit),
        "X-RateLimit-Remaining": str(result.remaining),
    }
    if not result.allowed:
        headers["Retry-After"] = str(result.retry_after_seconds)
    return headers


orchestrator_rate_limiter = GlobalSlidingWindowRateLimiter(
    max_requests=ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS,
    window_seconds=ORCHESTRATOR_RATE_LIMIT_WINDOW_SECONDS,
)
