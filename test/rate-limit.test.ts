import { describe, expect, it } from "bun:test";
import { TokenBucket } from "../src/http/rate-limit";

describe("TokenBucket", () => {
  it("issues capacity tokens immediately, then queues until refill", async () => {
    let now = 0;
    const sleeps: number[] = [];
    const bucket = new TokenBucket({
      capacity: 2,
      refillPerSecond: 1,
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    });

    await bucket.acquire();
    await bucket.acquire();
    expect(sleeps).toEqual([]);

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

  it("uses an injected sleep when refilling", async () => {
    let now = 0;
    let totalSlept = 0;
    const bucket = new TokenBucket({
      capacity: 1,
      refillPerSecond: 1000,
      now: () => now,
      sleep: async (ms) => {
        totalSlept += ms;
        now += ms;
      },
    });

    await bucket.acquire();
    await bucket.acquire();
    expect(totalSlept).toBeGreaterThan(0);
  });
});
