"use client";

import { useEffect, useRef, useState } from "react";
import { AnswerCard } from "@/components/answer-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RunFlow, type StepState } from "@/components/run-flow";
import type { AgentAnswer, AgentStreamEvent, RoutingDecision } from "@/domain/agent";
import type { ChatMessage } from "@/services/conversation-store";

type Progress = { runId?: string; routing?: RoutingDecision; steps: StepState[]; done?: boolean };

export function AgentChat({ initialMessages, initialQuestion, showTrace }: { initialMessages: ChatMessage[]; initialQuestion?: string; showTrace: boolean }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progress]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || (progress && !progress.done)) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: message, createdAt: new Date().toISOString() }]);
    setProgress({ steps: [] });
    const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    if (!res.ok || !res.body) {
      setError("요청에 실패했습니다.");
      setProgress(null);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let runId: string | undefined;
    let answer: AgentAnswer | undefined;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const ev = JSON.parse(line.slice(6)) as AgentStreamEvent;
        if (ev.type === "run") runId = ev.runId;
        if (ev.type === "routing") setProgress((p) => ({ ...p!, runId, routing: ev.routing }));
        if (ev.type === "step") setProgress((p) => ({ ...p!, steps: [...p!.steps.filter((s) => s.name !== ev.name), ev] }));
        if (ev.type === "answer") answer = ev.answer;
        if (ev.type === "error") setError(ev.message);
      }
    }
    if (answer) setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", answer, runId, createdAt: new Date().toISOString() }]);
    setProgress((p) => (p ? { ...p, done: true } : null));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">예) NVDA 500만원 더 살까? · 내가 가장 많이 가진 종목은? · 환율이 10% 떨어지면?</p>}
        {messages.map((m) =>
          m.role === "user" ? (
            <p key={m.id} className="ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              {m.text}
            </p>
          ) : m.answer ? (
            <AnswerCard key={m.id} answer={m.answer} runId={m.runId} showTrace={showTrace} />
          ) : (
            <p key={m.id} className="text-sm">
              {m.text}
            </p>
          ),
        )}
        {progress && !progress.done && (
          <section aria-live="polite" className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">분석 중</p>
            <RunFlow steps={progress.steps} routing={progress.routing} />
          </section>
        )}
        {progress?.done && (
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">실행 경로 보기</summary>
            <div className="pt-2">
              <RunFlow steps={progress.steps} routing={progress.routing} />
            </div>
          </details>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-20 flex gap-2 bg-background py-2"
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your PB…" disabled={Boolean(progress && !progress.done)} />
        <Button type="submit" disabled={Boolean(progress && !progress.done) || !input.trim()}>
          질문
        </Button>
      </form>
    </div>
  );
}
