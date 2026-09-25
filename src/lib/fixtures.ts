import { readFileSync } from "node:fs";
import path from "node:path";

export function loadFixture<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), "fixtures", rel), "utf8")) as T;
}
