import type { BaseIssue } from "valibot";

export class WanikaniError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WanikaniError";
  }
}

export class WanikaniApiError extends WanikaniError {
  readonly status: number;
  readonly code: number;
  readonly url: string;

  constructor(status: number, code: number, message: string, url: string) {
    super(`WaniKani API ${status} (${code}) at ${url}: ${message}`);
    this.name = "WanikaniApiError";
    this.status = status;
    this.code = code;
    this.url = url;
  }
}

export class WanikaniRateLimitError extends WanikaniApiError {
  readonly resetAt: Date | null;

  constructor(message: string, url: string, resetAt: Date | null) {
    super(429, 429, message, url);
    this.name = "WanikaniRateLimitError";
    this.resetAt = resetAt;
  }
}

export class WanikaniValidationError extends WanikaniError {
  readonly direction: "input" | "output";
  readonly issues: readonly BaseIssue<unknown>[];

  constructor(direction: "input" | "output", issues: readonly BaseIssue<unknown>[]) {
    const summary = issues
      .slice(0, 3)
      .map((issue) => `${pathToString(issue.path)}: ${issue.message}`)
      .join("; ");
    const more = issues.length > 3 ? ` (+${issues.length - 3} more)` : "";
    super(`WaniKani ${direction} validation failed: ${summary}${more}`);
    this.name = "WanikaniValidationError";
    this.direction = direction;
    this.issues = issues;
  }
}

function pathToString(path: BaseIssue<unknown>["path"]): string {
  if (!path || path.length === 0) return "<root>";
  return path.map((p) => String(p.key)).join(".");
}
