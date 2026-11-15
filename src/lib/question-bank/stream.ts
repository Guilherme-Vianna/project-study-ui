import type { GenerationSession } from "./model";

export type GraphNode = "start" | "retrieve" | "generate" | "verify" | "review";
export type ProgressEvent = { node: GraphNode; statuses: Partial<Record<string, number>> };

export type StepKey = "retrieve" | "generate" | "verify" | "fix" | "done";
export type Step = { key: StepKey; label: string };

export const GENERATION_STEPS: Step[] = [
  { key: "retrieve", label: "Buscando questões de referência no banco" },
  { key: "generate", label: "Escrevendo as questões novas" },
  { key: "verify", label: "Conferindo as respostas com outro modelo" },
  { key: "fix", label: "Corrigindo o que o revisor apontou" },
  { key: "done", label: "Pronto para revisão" },
];

export const ADJUSTMENT_STEPS: Step[] = [
  { key: "generate", label: "Refazendo com o seu pedido" },
  { key: "verify", label: "Conferindo a nova versão" },
  { key: "fix", label: "Corrigindo o que o revisor apontou" },
  { key: "done", label: "Pronto" },
];

export type ProgressState = { active: StepKey; completed: StepKey[]; rounds: number; percent: number };

export function initialProgress(steps: Step[]): ProgressState {
  return { active: steps[0].key, completed: [], rounds: 0, percent: 4 };
}

function percentFor(steps: Step[], active: StepKey, rounds: number) {
  if (active === "done") return 100;
  const index = steps.findIndex((step) => step.key === active);
  const base = ((index + 0.5) / steps.length) * 100;
  return Math.min(95, Math.round(base + rounds * 4));
}

export function advance(state: ProgressState, steps: Step[], event: ProgressEvent): ProgressState {
  const completed = new Set(state.completed);
  let active = state.active;
  let rounds = state.rounds;
  const needsFix = (event.statuses.needs_revision ?? 0) > 0;
  if (event.node === "retrieve") {
    completed.add("retrieve");
    active = "generate";
  } else if (event.node === "generate") {
    completed.add(state.active === "fix" ? "fix" : "generate");
    active = "verify";
  } else if (event.node === "verify") {
    completed.add("verify");
    if (needsFix) {
      rounds += 1;
      completed.delete("fix");
      active = "fix";
    } else {
      active = "done";
    }
  } else if (event.node === "review") {
    active = steps[0].key;
  }
  if (active === "done") completed.add("fix");
  return { active, completed: [...completed], rounds, percent: percentFor(steps, active, rounds) };
}

export class GenerationStreamError extends Error {}

const STATUS_MESSAGES: Record<number, string> = {
  409: "Não foi possível continuar esta geração. Gere de novo.",
  502: "A IA não conseguiu concluir desta vez. Tente de novo.",
  503: "A geração com IA não está disponível no momento.",
};

export function parseEvents(buffer: string): { events: { event: string; data: unknown }[]; rest: string } {
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  const events = blocks
    .map((block) => {
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      return data ? { event, data: JSON.parse(data) as unknown } : null;
    })
    .filter((item): item is { event: string; data: unknown } => item !== null);
  return { events, rest };
}

export async function streamGeneration(
  url: string,
  body: unknown,
  onProgress: (event: ProgressEvent) => void,
): Promise<GenerationSession> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GenerationStreamError("Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }
  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new GenerationStreamError(payload?.error ?? "Não foi possível gerar agora. Tente de novo.");
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseEvents(buffer + value);
    buffer = parsed.rest;
    for (const { event, data } of parsed.events) {
      if (event === "progress") onProgress(data as ProgressEvent);
      if (event === "result") return data as GenerationSession;
      if (event === "error") {
        const status = (data as { status?: number }).status ?? 500;
        throw new GenerationStreamError(STATUS_MESSAGES[status] ?? "A geração falhou. Tente de novo.");
      }
    }
  }
  throw new GenerationStreamError("A conexão caiu antes do fim da geração. Tente de novo.");
}
