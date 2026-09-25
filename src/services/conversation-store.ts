import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { AgentAnswer } from "@/domain/agent";

export const DEFAULT_CONVERSATION = "default";
const scopedId = (userId: string, conversationId: string) => `${userId}:${conversationId}`;

export async function ensureConversation(userId = "demo", conversationId = DEFAULT_CONVERSATION) {
  const db = await getDb();
  const id = scopedId(userId, conversationId);
  await db.insert(schema.conversations).values({ id, createdAt: new Date().toISOString() }).onConflictDoNothing();
  return id;
}

export async function addMessage(userId: string, conversationId: string, role: "user" | "assistant", content: string | AgentAnswer, runId?: string) {
  const db = await getDb();
  const id = await ensureConversation(userId, conversationId);
  await db.insert(schema.messages).values({
    id: randomUUID(),
    conversationId: id,
    role,
    content: typeof content === "string" ? content : JSON.stringify(content),
    runId: runId ?? null,
    createdAt: new Date().toISOString(),
  });
}

export type ChatMessage = { id: string; role: "user" | "assistant"; text?: string; answer?: AgentAnswer; runId?: string; createdAt: string };

export function memoryTurns(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.text ?? [m.answer?.summary, m.answer?.recommendation].filter(Boolean).join(" "),
  })).filter((m) => m.content);
}

export async function listMessages(userId = "demo", conversationId = DEFAULT_CONVERSATION, limit = 50): Promise<ChatMessage[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.messages).where(eq(schema.messages.conversationId, scopedId(userId, conversationId))).orderBy(desc(schema.messages.createdAt)).limit(limit);
  rows.reverse();
  return rows.map((r) => {
    const parsed = r.role === "assistant" ? AgentAnswer.safeParse(JSON.parse(r.content)) : undefined;
    return { id: r.id, role: r.role as "user" | "assistant", text: parsed?.success ? undefined : r.content, answer: parsed?.success ? parsed.data : undefined, runId: r.runId ?? undefined, createdAt: r.createdAt };
  });
}
