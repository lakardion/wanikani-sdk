export interface RateLimiter {
  acquire(): Promise<void>;
}

export interface TokenBucketOptions {
  capacity: number;
  refillPerSecond: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export class TokenBucket implements RateLimiter {
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private tokens: number;
  private lastRefill: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.refillPerMs = options.refillPerSecond / 1000;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? defaultSleep;
    this.tokens = options.capacity;
    this.lastRefill = this.now();
  }

  acquire(): Promise<void> {
    const next = this.queue.then(() => this.take());
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async take(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const needed = 1 - this.tokens;
    const waitMs = Math.ceil(needed / this.refillPerMs);
    await this.sleep(waitMs);
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  private refill(): void {
    const t = this.now();
    const elapsed = t - this.lastRefill;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefill = t;
  }
}

export class NullRateLimiter implements RateLimiter {
  acquire(): Promise<void> {
    return Promise.resolve();
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
