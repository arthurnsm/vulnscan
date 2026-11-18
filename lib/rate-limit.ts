export const ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS = 10;
export const ORCHESTRATOR_RATE_LIMIT_WINDOW_MS = 1000;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  retryAfterMs: number;
}

/**
 * Limitador de taxa global em janela deslizante para chamadas ao orquestrador.
 */
export class GlobalSlidingWindowRateLimiter {
  private readonly timestamps: number[] = [];
  public readonly maxRequests: number;
  public readonly windowMs: number;
  private readonly nowFn: () => number;

  constructor(
    maxRequests: number = ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS,
    windowMs: number = ORCHESTRATOR_RATE_LIMIT_WINDOW_MS,
    nowFn: () => number = () => performance.now()
  ) {
    if (maxRequests < 1) {
      throw new Error("maxRequests deve ser >= 1");
    }
    if (windowMs <= 0) {
      throw new Error("windowMs deve ser > 0");
    }
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.nowFn = nowFn;
  }

  acquire(): RateLimitResult {
    const now = this.nowFn();
    while (this.timestamps.length > 0 && now - this.timestamps[0] >= this.windowMs) {
      this.timestamps.shift();
    }

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const retryAfterMs = Math.max(0, this.windowMs - (now - oldest));
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        retryAfterSeconds,
        retryAfterMs,
      };
    }

    this.timestamps.push(now);
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - this.timestamps.length,
      retryAfterSeconds: 0,
      retryAfterMs: 0,
    };
  }

  reset(): void {
    this.timestamps.length = 0;
  }
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __vulscanOrchestratorRateLimiter?: GlobalSlidingWindowRateLimiter;
};

export const orchestratorRateLimiter =
  globalForRateLimit.__vulscanOrchestratorRateLimiter ??
  (globalForRateLimit.__vulscanOrchestratorRateLimiter =
    new GlobalSlidingWindowRateLimiter(
      ORCHESTRATOR_RATE_LIMIT_MAX_REQUESTS,
      ORCHESTRATOR_RATE_LIMIT_WINDOW_MS
    ));
