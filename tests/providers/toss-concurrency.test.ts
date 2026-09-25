import { afterEach, describe, expect, it, vi } from "vitest";
import { TossPortfolioProvider } from "@/providers/finance/toss";
import { FixtureTossTransport, LiveTossTransport } from "@/providers/finance/toss-api";

afterEach(() => vi.unstubAllGlobals());

describe("Toss rate-limit guards", () => {
  it("shares one account lookup between account and position reads", async () => {
    const transport = new FixtureTossTransport();
    const get = vi.spyOn(transport, "get");
    const provider = new TossPortfolioProvider(transport);
    await provider.getAccounts();
    await provider.getPositions();
    expect(get.mock.calls.filter(([path]) => path === "/api/v1/accounts")).toHaveLength(1);
  });

  it("shares one OAuth token request across concurrent API calls", async () => {
    let tokens = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/oauth2/token")) {
        tokens++;
        return Response.json({ access_token: "token", expires_in: 3600 });
      }
      return Response.json({ result: { ok: true } });
    }));
    const transport = new LiveTossTransport("id", "secret", "https://example.test");
    await Promise.all([transport.get("/one"), transport.get("/two")]);
    expect(tokens).toBe(1);
  });

  it("refreshes a revoked token once on 401", async () => {
    let tokens = 0;
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith("/oauth2/token")) return Response.json({ access_token: `token-${++tokens}`, expires_in: 3600 });
      return ++calls === 1 ? new Response(null, { status: 401 }) : Response.json({ result: { ok: true } });
    }));
    await new LiveTossTransport("id", "secret", "https://example.test").get("/holdings");
    expect({ tokens, calls }).toEqual({ tokens: 2, calls: 2 });
  });
});
