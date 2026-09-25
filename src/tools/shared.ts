import type { z } from "zod";
import { describeError } from "@/domain/portfolio";

/** Tool results are validated with Zod; provider failures become a user-meaningful status instead of a raw error. */
export async function safeTool<S extends z.ZodTypeAny>(schema: S, source: string, fn: () => Promise<z.input<S>>): Promise<z.output<S> | { error: string; source: string }> {
  try {
    return schema.parse(await fn()) as z.output<S>;
  } catch (e) {
    return { error: describeError(e), source };
  }
}

export const r1 = (n: number) => Math.round(n * 10) / 10;
