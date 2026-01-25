import { ProxyAgent } from 'undici';

type ProxyFetchInit = RequestInit & { dispatcher?: unknown };

let cachedProxyUrl: string | null = null;
let cachedProxyAgent: ProxyAgent | null = null;
let fetchWrapped = false;

function resolveProxyUrl(): string | null {
  return (
    process.env.DEV_HTTP_PROXY ||
    process.env.FETCH_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    null
  );
}

function getProxyDispatcher(): ProxyAgent | null {
  const proxyUrl = resolveProxyUrl();
  if (!proxyUrl) return null;

  if (cachedProxyAgent && cachedProxyUrl === proxyUrl) {
    return cachedProxyAgent;
  }

  cachedProxyUrl = proxyUrl;
  cachedProxyAgent = new ProxyAgent(proxyUrl);
  return cachedProxyAgent;
}

export function ensureProxyFetch(): void {
  if (fetchWrapped) return;

  const dispatcher = getProxyDispatcher();
  if (!dispatcher || typeof globalThis.fetch !== 'function') {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const nextInit: ProxyFetchInit = { ...(init || {}), dispatcher };
    return originalFetch(input, nextInit);
  };

  fetchWrapped = true;
}
