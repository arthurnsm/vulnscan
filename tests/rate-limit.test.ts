import assert from "node:assert/strict";
import test from "node:test";
import {
  GlobalSlidingWindowRateLimiter,
  ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS,
  ORCHESTRATOR_RATE_LIMIT_WINDOW_MS,
  buildRateLimitHeaders,
  orchestratorRateLimiter,
} from "../lib/rate-limit";
import { POST as scanStreamPost } from "../app/api/scan/stream/route";

test("permite até 10 requisições por segundo, bloqueia a 11ª e libera após 1s", () => {
  let now = 1000;
  const limiter = new GlobalSlidingWindowRateLimiter(
    ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS,
    ORCHESTRATOR_RATE_LIMIT_WINDOW_MS,
    () => now
  );

  for (let i = 0; i < 10; i++) {
    const res = limiter.acquire();
    assert.equal(res.allowed, true);
    assert.equal(res.limit, 10);
    assert.equal(res.remaining, 9 - i);
  }

  const blocked = limiter.acquire();
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 1);

  const headers = buildRateLimitHeaders(blocked);
  assert.equal(headers["Retry-After"], "1");
  assert.equal(headers["X-RateLimit-Limit"], "10");
  assert.equal(headers["X-RateLimit-Remaining"], "0");

  now = 2000;
  const afterWindow = limiter.acquire();
  assert.equal(afterWindow.allowed, true);
  assert.equal(afterWindow.remaining, 9);
});

test("janela deslizante libera slots gradualmente conforme o tempo avança", () => {
  let now = 0;
  const limiter = new GlobalSlidingWindowRateLimiter(10, 1000, () => now);

  // 5 requisições em t=0ms
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.acquire().allowed, true);
  }

  // 5 requisições em t=600ms
  now = 600;
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.acquire().allowed, true);
  }

  // 11ª requisição em t=800ms deve ser rejeitada
  now = 800;
  assert.equal(limiter.acquire().allowed, false);

  // Em t=1000ms as 5 requisições de t=0 expiram, liberando exatamente 5 slots
  now = 1000;
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.acquire().allowed, true);
  }
  assert.equal(limiter.acquire().allowed, false);

  // Em t=1600ms as 5 requisições de t=600ms expiram
  now = 1600;
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.acquire().allowed, true);
  }
});

test("POST /api/scan/stream aplica limite global de 10 req/s e retorna 429 com Retry-After", async () => {
  const originalFetch = globalThis.fetch;
  orchestratorRateLimiter.reset();

  globalThis.fetch = async () =>
    new Response('data: {"etapa":"ping","status":"running"}\n\n', {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

  try {
    for (let i = 0; i < 10; i++) {
      const req = new Request("http://localhost:3000/api/scan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alvoUrl: "localhost", isDeepScan: false }),
      });
      const res = await scanStreamPost(req);
      assert.equal(res.status, 200, `Requisição ${i + 1} deveria passar`);
      assert.equal(res.headers.get("X-RateLimit-Limit"), "10");
      await res.body?.cancel();
    }

    const blockedReq = new Request("http://localhost:3000/api/scan/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alvoUrl: "localhost", isDeepScan: false }),
    });
    const blockedRes = await scanStreamPost(blockedReq);
    assert.equal(blockedRes.status, 429);
    assert.equal(blockedRes.headers.get("Retry-After"), "1");
    assert.equal(blockedRes.headers.get("X-RateLimit-Limit"), "10");
    assert.equal(blockedRes.headers.get("X-RateLimit-Remaining"), "0");

    const payload = (await blockedRes.json()) as { status: string; erro: string };
    assert.equal(payload.status, "erro");
    assert.match(payload.erro, /10/);
  } finally {
    globalThis.fetch = originalFetch;
    orchestratorRateLimiter.reset();
  }
});

test("POST /api/scan/stream propaga 429 do FastAPI sem acionar fallback Python", async () => {
  const originalFetch = globalThis.fetch;
  orchestratorRateLimiter.reset();

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "erro",
        erro: "Limite de requisições excedido no FastAPI.",
        retry_after: 1,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "1",
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );

  try {
    const req = new Request("http://localhost:3000/api/scan/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alvoUrl: "localhost", isDeepScan: false }),
    });
    const res = await scanStreamPost(req);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("Retry-After"), "1");
    assert.equal(res.headers.get("X-RateLimit-Remaining"), "0");
    const payload = (await res.json()) as { status: string; erro: string };
    assert.equal(payload.status, "erro");
    assert.match(payload.erro, /FastAPI/);
  } finally {
    globalThis.fetch = originalFetch;
    orchestratorRateLimiter.reset();
  }
});
