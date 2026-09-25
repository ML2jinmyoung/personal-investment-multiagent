import { DataProviderError } from "@/domain/portfolio";
import { loadFixture } from "@/lib/fixtures";

/**
 * Toss Securities Open API transport.
 * Spec: https://openapi.tossinvest.com/openapi-docs/latest/openapi.json
 * Every response is an envelope `{ result }`; `get` returns the unwrapped result.
 */
export interface TossTransport {
  readonly isLive: boolean;
  get<T>(path: string, params?: Record<string, string>, accountSeq?: number): Promise<T>;
}

export const TOSS_SOURCE = "Toss Securities Open API";

const key = (path: string, params?: Record<string, string>) =>
  params && Object.keys(params).length ? `${path}?${new URLSearchParams(params)}` : path;

/** Demo fallback: recorded responses in fixtures/toss, same shapes as the live API. */
export class FixtureTossTransport implements TossTransport {
  readonly isLive = false;
  private files: Record<string, string> = {
    "/api/v1/accounts": "toss/accounts.json",
    "/api/v1/holdings": "toss/holdings.json",
    "/api/v1/buying-power?currency=KRW": "toss/buying-power-KRW.json",
    "/api/v1/buying-power?currency=USD": "toss/buying-power-USD.json",
    "/api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW": "toss/exchange-rate-USD.json",
    "/api/v1/commissions": "toss/commissions.json",
  };
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const file = this.files[key(path, params)];
    if (!file) throw new DataProviderError("NOT_AVAILABLE", "Toss fixture", key(path, params));
    return loadFixture<{ result: T }>(file).result;
  }
}

/** OAuth 2.0 client-credentials transport. Credentials stay server-side; one token per client is valid at a time. */
export class LiveTossTransport implements TossTransport {
  readonly isLive = true;
  private token?: { value: string; expiresAt: number };
  private tokenRequest?: Promise<string>;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private baseUrl = "https://openapi.tossinvest.com",
  ) {}

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 30_000) return this.token.value;
    if (this.tokenRequest) return this.tokenRequest;
    this.tokenRequest = this.fetchAccessToken();
    try {
      return await this.tokenRequest;
    } finally {
      this.tokenRequest = undefined;
    }
  }

  private async fetchAccessToken(): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.clientId, client_secret: this.clientSecret }),
        cache: "no-store",
      });
    } catch {
      throw new DataProviderError("NETWORK_ERROR", TOSS_SOURCE);
    }
    if (!res.ok) throw new DataProviderError(res.status === 401 || res.status === 403 ? "AUTH_FAILED" : "NETWORK_ERROR", TOSS_SOURCE, `token ${res.status}`);
    const j = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
    return this.token.value;
  }

  async get<T>(path: string, params?: Record<string, string>, accountSeq?: number, retried: { rate?: boolean; auth?: boolean } = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const headers: Record<string, string> = { Authorization: `Bearer ${await this.accessToken()}` };
    if (accountSeq !== undefined) headers["X-Tossinvest-Account"] = String(accountSeq);
    let res: Response;
    try {
      res = await fetch(url, { headers, cache: "no-store" });
    } catch {
      throw new DataProviderError("NETWORK_ERROR", TOSS_SOURCE);
    }
    if (res.status === 429 && !retried.rate) {
      await new Promise((r) => setTimeout(r, Number(res.headers.get("Retry-After") ?? 1) * 1000));
      return this.get<T>(path, params, accountSeq, { ...retried, rate: true });
    }
    if (res.status === 401 && !retried.auth) {
      this.token = undefined;
      return this.get<T>(path, params, accountSeq, { ...retried, auth: true });
    }
    if (res.status === 401) throw new DataProviderError("AUTH_FAILED", TOSS_SOURCE);
    if (res.status === 403) throw new DataProviderError("AUTH_FAILED", TOSS_SOURCE, "forbidden: check allowed IP");
    if (res.status === 429) throw new DataProviderError("RATE_LIMITED", TOSS_SOURCE);
    if (res.status === 404) throw new DataProviderError("NOT_AVAILABLE", TOSS_SOURCE, path);
    if (!res.ok) throw new DataProviderError(res.status >= 500 ? "NETWORK_ERROR" : "UNKNOWN", TOSS_SOURCE, `${res.status} ${path}`);
    return ((await res.json()) as { result: T }).result;
  }
}

let live: LiveTossTransport | null | undefined;
/** Singleton so the single valid token is shared across the process. null when credentials are missing. */
export function liveTossTransport(): LiveTossTransport | null {
  if (live !== undefined) return live;
  const { TOSS_CLIENT_ID, TOSS_CLIENT_SECRET, TOSS_BASE_URL } = process.env;
  live = TOSS_CLIENT_ID && TOSS_CLIENT_SECRET ? new LiveTossTransport(TOSS_CLIENT_ID, TOSS_CLIENT_SECRET, TOSS_BASE_URL || undefined) : null;
  return live;
}
