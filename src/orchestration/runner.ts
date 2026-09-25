/** Runs independent nodes in parallel; a failed node yields undefined plus an error note instead of failing the run. */
export async function runParallel<T extends Record<string, () => Promise<unknown>>>(
  tasks: T,
): Promise<{ results: { [K in keyof T]?: Awaited<ReturnType<T[K]>> }; errors: string[] }> {
  const keys = Object.keys(tasks) as (keyof T)[];
  const settled = await Promise.allSettled(keys.map((k) => tasks[k]()));
  const results: { [K in keyof T]?: Awaited<ReturnType<T[K]>> } = {};
  const errors: string[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") results[keys[i]] = s.value as Awaited<ReturnType<T[keyof T]>>;
    else errors.push(`${String(keys[i])}: ${(s.reason as Error).message}`);
  });
  return { results, errors };
}
