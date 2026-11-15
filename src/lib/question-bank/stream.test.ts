import { describe, expect, it } from "vitest";
import { ADJUSTMENT_STEPS, advance, GENERATION_STEPS, initialProgress, parseEvents, type ProgressEvent } from "./stream";

describe("parseEvents", () => {
  it("parses complete events and keeps the partial tail", () => {
    const { events, rest } = parseEvents('event: progress\ndata: {"node":"retrieve"}\n\nevent: result\ndata: {"id"');
    expect(events).toEqual([{ event: "progress", data: { node: "retrieve" } }]);
    expect(rest).toBe('event: result\ndata: {"id"');
  });
});

function run(events: ProgressEvent[], steps = GENERATION_STEPS) {
  return events.reduce((state, event) => advance(state, steps, event), initialProgress(steps));
}

describe("advance", () => {
  it("walks the generation steps", () => {
    expect(run([{ node: "start", statuses: {} }]).active).toBe("retrieve");
    expect(run([{ node: "retrieve", statuses: {} }]).active).toBe("generate");
    const verifying = run([
      { node: "retrieve", statuses: {} },
      { node: "generate", statuses: { pending: 3 } },
    ]);
    expect(verifying.active).toBe("verify");
    expect(verifying.completed).toEqual(["retrieve", "generate"]);
  });

  it("shows a fix round when the reviewer rejects questions", () => {
    const state = run([
      { node: "retrieve", statuses: {} },
      { node: "generate", statuses: { pending: 2 } },
      { node: "verify", statuses: { ready: 1, needs_revision: 1 } },
    ]);
    expect(state.active).toBe("fix");
    expect(state.rounds).toBe(1);
    const done = advance(
      advance(state, GENERATION_STEPS, { node: "generate", statuses: { pending: 1, ready: 1 } }),
      GENERATION_STEPS,
      { node: "verify", statuses: { ready: 2 } },
    );
    expect(done.active).toBe("done");
    expect(done.percent).toBe(100);
  });

  it("restarts adjustments at the rewrite step after review", () => {
    const state = run([{ node: "review", statuses: { needs_revision: 1 } }], ADJUSTMENT_STEPS);
    expect(state.active).toBe("generate");
    expect(state.percent).toBeLessThan(100);
  });
});
