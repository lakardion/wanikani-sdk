import { describe, expect, it } from "bun:test";
import { WanikaniClient } from "../src";
import { WanikaniApiError, WanikaniValidationError } from "../src/http/errors";

const apiKey = process.env.WANIKANI_API_KEY;

describe.skipIf(!apiKey)("integration: real WaniKani API", () => {
  it("GET /user returns either a parsed envelope or a structured error", async () => {
    const client = new WanikaniClient({ apiKey });
    try {
      const me = await client.user.get();
      expect(me.object).toBe("user");
      expect(typeof me.data.username).toBe("string");
      expect(typeof me.data.level).toBe("number");
    } catch (err) {
      if (err instanceof WanikaniApiError && err.status === 403) {
        expect(err.message).toMatch(/hibernating|forbidden/i);
        return;
      }
      if (err instanceof WanikaniValidationError) {
        throw new Error(`Schema drift detected against the live API: ${err.message}`, {
          cause: err,
        });
      }
      throw err;
    }
  }, 15_000);
});
