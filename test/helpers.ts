import { mock } from "bun:test";

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

export function mockFetch(...responses: Response[]) {
  const queue = [...responses];
  return mock(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const next = queue.shift();
    if (!next) throw new Error("mockFetch: no more queued responses");
    return next;
  });
}

export function mockRejectingFetch(...errors: unknown[]) {
  const queue = [...errors];
  return mock(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const next = queue.shift();
    if (next === undefined) throw new Error("mockRejectingFetch: queue empty");
    throw next;
  });
}
