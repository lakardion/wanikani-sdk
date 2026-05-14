import type { Transport } from "./transport";

export interface PageEnvelope<T> {
  pages: { next_url: string | null; previous_url: string | null; per_page: number };
  total_count: number;
  data: T[];
}

export async function* paginate<TItem, TPage extends PageEnvelope<TItem>>(
  transport: Transport,
  initialPath: string,
  initialQuery: Record<string, unknown> | undefined,
  parsePage: (raw: unknown) => TPage,
): AsyncGenerator<TPage, void, void> {
  let raw = await transport.request<unknown>({
    path: initialPath,
    query: initialQuery as never,
  });
  let page = parsePage(raw);
  yield page;

  while (page.pages.next_url) {
    const nextUrl = new URL(page.pages.next_url);
    const path = `${nextUrl.pathname.replace(/^\/v2\//, "")}${nextUrl.search}`;
    raw = await transport.request<unknown>({ path });
    page = parsePage(raw);
    yield page;
  }
}

export async function collectAll<TItem, TPage extends PageEnvelope<TItem>>(
  transport: Transport,
  initialPath: string,
  initialQuery: Record<string, unknown> | undefined,
  parsePage: (raw: unknown) => TPage,
): Promise<TItem[]> {
  const out: TItem[] = [];
  for await (const page of paginate(transport, initialPath, initialQuery, parsePage)) {
    out.push(...page.data);
  }
  return out;
}
