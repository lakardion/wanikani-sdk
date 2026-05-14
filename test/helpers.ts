import { vi } from "vitest";

export interface MockResponseInit {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export function mockResponse(init: MockResponseInit = {}): Response {
  const status = init.status ?? 200;
  const headers = new Headers(init.headers ?? {});
  const body =
    init.body === undefined
      ? null
      : typeof init.body === "string"
        ? init.body
        : JSON.stringify(init.body);
  return new Response(body, { status, headers });
}

export function mockFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  return fn;
}
