import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from api.main import app  # noqa: E402
from routes.rate_limiter import (  # noqa: E402
    GlobalSlidingWindowRateLimiter,
    build_rate_limit_headers,
    orchestrator_rate_limiter,
)


class FakeClock:
    def __init__(self, initial: float = 0.0) -> None:
        self.now = initial

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class SlidingWindowRateLimiterUnitTest(unittest.TestCase):
    def test_allows_ten_requests_per_second_and_rejects_eleventh(self) -> None:
        clock = FakeClock(100.0)
        limiter = GlobalSlidingWindowRateLimiter(max_requests=10, window_seconds=1.0, clock=clock)

        for idx in range(10):
            res = limiter.acquire()
            self.assertTrue(res.allowed, f"Requisição {idx + 1} deveria ser permitida")
            self.assertEqual(res.limit, 10)
            self.assertEqual(res.remaining, 9 - idx)

        blocked = limiter.acquire()
        self.assertFalse(blocked.allowed)
        self.assertEqual(blocked.remaining, 0)
        self.assertEqual(blocked.retry_after_seconds, 1)

        headers = build_rate_limit_headers(blocked)
        self.assertEqual(headers["Retry-After"], "1")
        self.assertEqual(headers["X-RateLimit-Limit"], "10")
        self.assertEqual(headers["X-RateLimit-Remaining"], "0")

    def test_sliding_window_releases_slots_gradually(self) -> None:
        clock = FakeClock(0.0)
        limiter = GlobalSlidingWindowRateLimiter(max_requests=10, window_seconds=1.0, clock=clock)

        # 5 requisições em t=0.0
        for _ in range(5):
            self.assertTrue(limiter.acquire().allowed)

        # 5 requisições em t=0.6
        clock.advance(0.6)
        for _ in range(5):
            self.assertTrue(limiter.acquire().allowed)

        # 11ª em t=0.8 deve ser bloqueada
        clock.advance(0.2)
        self.assertFalse(limiter.acquire().allowed)

        # Em t=1.0 as 5 requisições de t=0.0 expiram, mas as 5 de t=0.6 continuam na janela
        clock.advance(0.2)
        for _ in range(5):
            self.assertTrue(limiter.acquire().allowed)
        self.assertFalse(limiter.acquire().allowed)

        # Em t=1.6 as 5 de t=0.6 expiram
        clock.advance(0.6)
        for _ in range(5):
            self.assertTrue(limiter.acquire().allowed)


class FastAPIOrchestratorRateLimitIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        orchestrator_rate_limiter.reset()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        orchestrator_rate_limiter.reset()

    def test_global_limit_shared_across_scan_and_stream_endpoints(self) -> None:
        async def fake_fast_orchestrator(url: str):
            return {"status": "sucesso", "alvo": url, "tipo": "fast_scan"}

        async def fake_stream_orchestrator(url: str, is_deep: bool = False):
            yield 'data: {"etapa": "consolidacao", "status": "completed"}\n\n'

        with (
            patch("api.main.FastOrquestrator", side_effect=fake_fast_orchestrator),
            patch("api.main.StreamScanOrquestrator", side_effect=fake_stream_orchestrator),
        ):
            # 6 chamadas ao /api/scan
            for i in range(6):
                resp = self.client.post("/api/scan", json={"alvoUrl": "localhost", "isDeepScan": False})
                self.assertEqual(resp.status_code, 200, f"Chamada {i + 1} falhou")
                self.assertEqual(resp.headers.get("X-RateLimit-Limit"), "10")

            # 4 chamadas ao /api/scan/stream (total = 10)
            for i in range(4):
                resp = self.client.post("/api/scan/stream", json={"alvoUrl": "localhost", "isDeepScan": False})
                self.assertEqual(resp.status_code, 200, f"Chamada stream {i + 1} falhou")
                self.assertIn("consolidacao", resp.text)

            # 11ª chamada dentro de 1s deve retornar 429 com Retry-After e CORS
            blocked = self.client.post(
                "/api/scan",
                json={"alvoUrl": "localhost", "isDeepScan": False},
                headers={"Origin": "http://localhost:3000"},
            )
            self.assertEqual(blocked.status_code, 429)
            self.assertEqual(blocked.headers.get("Retry-After"), "1")
            self.assertEqual(blocked.headers.get("X-RateLimit-Limit"), "10")
            self.assertEqual(blocked.headers.get("X-RateLimit-Remaining"), "0")
            self.assertEqual(blocked.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")
            self.assertIn("Retry-After", blocked.headers.get("Access-Control-Expose-Headers", ""))
            body = blocked.json()
            self.assertEqual(body["status"], "erro")
            self.assertIn("10", body["erro"])

            # 12ª chamada no /api/scan/stream também deve retornar 429
            blocked_stream = self.client.post(
                "/api/scan/stream",
                json={"alvoUrl": "localhost", "isDeepScan": False},
            )
            self.assertEqual(blocked_stream.status_code, 429)
            self.assertEqual(blocked_stream.headers.get("Retry-After"), "1")

    def test_ping_and_options_do_not_consume_orchestrator_quota(self) -> None:
        with (
            patch("api.main.ping_host", new=AsyncMock(return_value={"ativo": True, "host": "localhost"})),
            patch("api.main.FastOrquestrator", new=AsyncMock(return_value={"status": "sucesso"})),
        ):
            for _ in range(15):
                ping_resp = self.client.post("/api/ping", json={"alvoUrl": "localhost"})
                self.assertEqual(ping_resp.status_code, 200)

            opt_resp = self.client.options(
                "/api/scan",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "POST",
                },
            )
            self.assertIn(opt_resp.status_code, (200, 204))

            # Todas as 10 requisições ao orquestrador continuam disponíveis
            for _ in range(10):
                scan_resp = self.client.post("/api/scan", json={"alvoUrl": "localhost"})
                self.assertEqual(scan_resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
