import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getDb, schema } from "@/db";

export const AGENT_NAMES = ["orchestratorFallback", "portfolio", "evidence", "critic", "synthesizer"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export const ModelConfig = z.object({ provider: z.enum(["openai", "anthropic"]), model: z.string() });
export type ModelConfig = z.infer<typeof ModelConfig>;
export type Provider = ModelConfig["provider"];

/** Defaults come from env; model names are never hardcoded. */
const ENV_DEFAULTS: Record<AgentName, { provider: Provider; env: string }> = {
  orchestratorFallback: { provider: "anthropic", env: "ORCHESTRATOR_MODEL" },
  portfolio: { provider: "anthropic", env: "PORTFOLIO_MODEL" },
  evidence: { provider: "anthropic", env: "EVIDENCE_MODEL" },
  critic: { provider: "anthropic", env: "CRITIC_MODEL" },
  synthesizer: { provider: "anthropic", env: "SYNTHESIZER_MODEL" },
};

export function hasProviderKey(provider: Provider): boolean {
  return Boolean(provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY);
}

export const llmAvailable = () => hasProviderKey("openai") || hasProviderKey("anthropic");

export async function getModelConfigs(): Promise<Record<AgentName, ModelConfig>> {
  const db = await getDb();
  const rows = await db.select().from(schema.modelSettings);
  const out = {} as Record<AgentName, ModelConfig>;
  for (const agent of AGENT_NAMES) {
    const row = rows.find((r) => r.agent === agent);
    const parsed = row ? ModelConfig.safeParse({ provider: row.provider, model: row.model }) : undefined;
    out[agent] = parsed?.success ? parsed.data : { provider: ENV_DEFAULTS[agent].provider, model: process.env[ENV_DEFAULTS[agent].env] ?? "" };
  }
  return out;
}

export async function setModelConfig(agent: AgentName, cfg: ModelConfig): Promise<void> {
  const db = await getDb();
  const row = { agent, provider: cfg.provider, model: cfg.model };
  await db.insert(schema.modelSettings).values(row).onConflictDoUpdate({ target: schema.modelSettings.agent, set: row });
}

export class ModelNotConfiguredError extends Error {}

export function getModel(config: ModelConfig) {
  if (!config.model) throw new ModelNotConfiguredError(`model name not configured for ${config.provider}`);
  if (!hasProviderKey(config.provider)) throw new ModelNotConfiguredError(`${config.provider} API key missing`);
  if (config.provider === "openai") return openai(config.model);
  if (config.provider === "anthropic") return anthropic(config.model);
  throw new Error("Unsupported provider");
}

/** Resolves the model for an agent; falls back to any configured provider when the preferred one has no key. */
export async function modelFor(agent: AgentName): Promise<{ model: ReturnType<typeof getModel>; config: ModelConfig }> {
  const configs = await getModelConfigs();
  let config = configs[agent];
  if (!hasProviderKey(config.provider) || !config.model) {
    const alt = (Object.values(configs) as ModelConfig[]).find((c) => c.model && hasProviderKey(c.provider));
    if (alt) config = alt;
  }
  return { model: getModel(config), config };
}
