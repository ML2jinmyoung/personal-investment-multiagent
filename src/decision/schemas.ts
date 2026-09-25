import { z } from "zod";

/** Structured-output shapes for the LLM fallback. Probabilities only, never prose. */
export const ChoiceOutput = z.object({
  choice: z.string(),
  probabilities: z.array(z.object({ option: z.string(), probability: z.number().min(0).max(1) })),
});
export const ScoreOutput = z.object({
  level: z.number().int().min(0),
  probabilities: z.array(z.object({ level: z.number().int().min(0), probability: z.number().min(0).max(1) })),
});
export const ManyOutput = z.object({
  answers: z.array(z.object({ id: z.string(), probability: z.number().min(0).max(1) })),
});
