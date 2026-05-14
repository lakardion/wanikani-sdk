import { describe, expect, it, vi } from "vitest";
import { TokenBucket } from "../src/http/rate-limit";

describe("TokenBucket", () => {
  it("issues capacity tokens immediately, then queues until refill", async () => {
    let now = 0;
    const sleeps: number[] = [];
    const bucket = new TokenBucket({
      capacity: 2,
      refillPerSecond: 1, // 1 token/sec
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    });

    await bucket.acquire();
    await bucket.acquire();
    expect(sleeps).toEqual([]);

    // Third acquire must wait for the bucket to refill 1 token at 1/sec → ~1000ms.
    await bucket.acquire();
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]!).toBeGreaterThanOrEqual(900);
  });

  it("serializes concurrent acquires", async () => {
    let now = 0;
    const bucket = new TokenBucket({
      capacity: 1,
      refillPerSecond: 1,
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    const order: number[] = [];
    const tasks = [0, 1, 2].map(async (i) => {
      await bucket.acquire();
      order.push(i);
    });
    await Promise.all(tasks);
    expect(order).toEqual([0, 1, 2]);
  });

  it("uses default sleep when none provided", async () => {
    vi.useFakeTimers();
    const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 1000 });
    await bucket.acquire();
    const pending = bucket.acquire();
    await vi.advanceTimersByTimeAsync(2);
    await pending;
    vi.useRealTimers();
  });
});
