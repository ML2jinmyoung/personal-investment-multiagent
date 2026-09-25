export function flag(name: string, def = false): boolean {
  const v = process.env[name];
  return v === undefined || v === "" ? def : v === "true" || v === "1";
}
