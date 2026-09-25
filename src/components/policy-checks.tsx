import type { PolicyCheck } from "@/domain/policy";
import { cn } from "@/lib/utils";

const STYLE = {
  ok: ["✓", "text-emerald-600"],
  warning: ["⚠", "text-amber-600"],
  violation: ["✕", "text-red-600"],
  unknown: ["?", "text-muted-foreground"],
} as const;

export function PolicyChecks({ checks }: { checks: PolicyCheck[] }) {
  if (!checks.length) return <p className="text-sm text-muted-foreground">설정된 원칙이 없습니다.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {checks.map((c) => {
        const [icon, color] = STYLE[c.status];
        return (
          <li key={`${c.rule}:${c.subject ?? ""}`} className="flex gap-2">
            <span className={cn("w-4 font-semibold", color)}>{icon}</span>
            <span className="flex-1">
              {c.label}
              {c.subject ? ` · ${c.subject}` : ""}
              {c.note && <span className="block text-xs text-muted-foreground">{c.note}</span>}
            </span>
            {c.after !== undefined && (
              <span className={cn("tabular-nums", color)}>
                {c.before !== undefined && c.before !== c.after ? `${c.before}% → ` : ""}
                {c.after}%{c.limit !== undefined ? ` / ${c.limit}%` : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
