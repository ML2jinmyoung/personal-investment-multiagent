import type { Account } from "@/domain/portfolio";
import { Badge } from "@/components/ui/badge";

export function SourceBadge({ account }: { account: Pick<Account, "isLive" | "channel"> }) {
  if (account.isLive) return <Badge>LIVE</Badge>;
  return <Badge variant="outline">DEMO{account.channel === "mydata" ? " · MyData" : ""}</Badge>;
}
