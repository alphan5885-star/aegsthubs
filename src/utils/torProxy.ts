// src/utils/torProxy.ts
/**
 * Tor proxy utility for routing outbound HTTP requests through a SOCKS5 Tor proxy.
 * Uses the built-in fetch API with an agent configured for SOCKS5.
 * The proxy URL is configurable via the TOR_PROXY env variable.
 */
import { SocksProxyAgent } from "socks-proxy-agent";

export interface TorFetchOptions extends RequestInit {}

export async function torFetch(
  input: RequestInfo,
  init?: TorFetchOptions,
): Promise<Response> {
  const proxyUrl = process.env.TOR_PROXY ?? "socks5h://127.0.0.1:9050";
  const agent = new SocksProxyAgent(proxyUrl);
  const enhancedInit: any = { ...init, agent };
  return fetch(input, enhancedInit);
}

// Example usage:
// const response = await torFetch('https://api.example.com/data');
