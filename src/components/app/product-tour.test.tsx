import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ pathname: "/inicio" }));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

const { ProductTour } = await import("./product-tour");
const { startTour, TOUR_STEPS } = await import("@/lib/tour/steps");

const SEEN_KEY = "project-study:tour-seen:uid-1";

function renderTour(role: "teacher" | "student" = "teacher") {
  render(
    <>
      <span data-tour="nav:/alunos">Alunos</span>
      <ProductTour accountId="uid-1" role={role} />
    </>,
  );
}

async function waitForAutoStart() {
  await act(() => vi.advanceTimersByTimeAsync(500));
}

describe("ProductTour", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.clear();
    mocks.pathname = "/inicio";
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("starts automatically on the first visit to the home page", async () => {
    renderTour();
    await waitForAutoStart();

    expect(screen.getByRole("dialog", { name: "Boas-vindas ao Project Study!" })).toBeInTheDocument();
    expect(screen.getByText(`1 de ${TOUR_STEPS.teacher.length}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vamos lá" })).toHaveFocus();
  });

  it("does not start again once seen", async () => {
    window.localStorage.setItem(SEEN_KEY, "2026-10-22");
    renderTour();
    await waitForAutoStart();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not start automatically on other pages", async () => {
    mocks.pathname = "/convite/abc";
    renderTour();
    await waitForAutoStart();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("walks through the steps, highlighting the nav item, and remembers when finished", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTour();
    await waitForAutoStart();

    await user.click(screen.getByRole("button", { name: "Vamos lá" }));
    expect(screen.getByRole("dialog", { name: "Seus alunos" })).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("dialog", { name: "Boas-vindas ao Project Study!" })).toBeInTheDocument();

    for (let step = 1; step < TOUR_STEPS.teacher.length; step++) {
      await user.click(screen.getByRole("button", { name: /Vamos lá|Próximo/ }));
    }
    expect(screen.queryByRole("button", { name: "Pular tour" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SEEN_KEY)).not.toBeNull();
  });

  it("can be skipped with Escape and replayed on demand", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTour("student");
    await waitForAutoStart();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SEEN_KEY)).not.toBeNull();

    act(() => startTour());
    expect(screen.getByText(`1 de ${TOUR_STEPS.student.length}`)).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Meu plano" })).toBeInTheDocument();
  });
});
