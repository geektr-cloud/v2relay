declare global {
  interface CacheStorage {
    readonly default: Cache;
  }
}

const METADATA_HEADER = "x-meta-cache";

class MetaCache {
  constructor(private readonly cache: Cache) {}

  delete(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<boolean> {
    return this.cache.delete(request, options);
  }

  async match<T>(
    request: RequestInfo | URL,
    options?: CacheQueryOptions,
  ): Promise<[Response | undefined, T | undefined]> {
    const cached = await this.cache.match(request, options);
    if (!cached) return [undefined, undefined];

    const raw = cached.headers.get(METADATA_HEADER);
    const metadata = raw ? (JSON.parse(raw) as T) : undefined;

    const headers = new Headers(cached.headers);
    headers.delete(METADATA_HEADER);

    const response = new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });

    return [response, metadata];
  }

  async put<T>(request: RequestInfo | URL, response: Response, metadata: T): Promise<void> {
    const headers = new Headers(response.headers);
    headers.set(METADATA_HEADER, JSON.stringify(metadata));

    const wrapped = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    await this.cache.put(request, wrapped);
  }
}

export const mcache = new MetaCache(caches.default);
