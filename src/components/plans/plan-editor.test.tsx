import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPlanDraft, type ExerciseOption } from "@/lib/plans/model";

const mocks = vi.hoisted(() => ({
  savePlanAction: vi.fn(),
  saveSubjectAction: vi.fn(),
  saveExerciseAction: vi.fn(),
  router: { push: vi.fn() },
}));

vi.mock("@/lib/plans/actions", () => ({ savePlanAction: mocks.savePlanAction }));
vi.mock("@/lib/subjects/actions", () => ({ saveSubjectAction: mocks.saveSubjectAction }));
vi.mock("@/lib/exercises/actions", () => ({ saveExerciseAction: mocks.saveExerciseAction }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));

const { PlanEditor } = await import("./plan-editor");

const subjects = [
  { id: "s1", name: "Trigonometria" },
  { id: "s2", name: "Gramática" },
];
const exercises: ExerciseOption[] = [
  { id: "e1", title: "Seno de 30°", subjects: [subjects[0]] },
  { id: "e2", title: "Redação", subjects: [subjects[1]] },
];

function renderEditor() {
  render(<PlanEditor planId={null} initialDraft={emptyPlanDraft()} subjects={subjects} exercises={exercises} cancelHref="/planos" />);
}

describe("PlanEditor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("adds a subject with a weekly goal and suggested days", async () => {
    mocks.savePlanAction.mockResolvedValue(undefined);
    renderEditor();
    await userEvent.type(screen.getByLabelText("Nome do plano"), "ENEM");
    await userEvent.click(screen.getByRole("button", { name: "Trigonometria" }));
    await userEvent.type(screen.getByLabelText("Horas por semana de Trigonometria"), "3");
    await userEvent.click(within(screen.getByRole("group", { name: "Dias sugeridos para Trigonometria" })).getByRole("button", { name: "Segunda" }));

    expect(screen.getByText("3h")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Criar plano" }));
    await waitFor(() => expect(mocks.savePlanAction).toHaveBeenCalled());
    expect(mocks.savePlanAction.mock.calls[0][1].subjects).toEqual([{ subjectId: "s1", weeklyHours: "3", weekdays: ["monday"] }]);
  });

  it("requires a weekly goal before saving", async () => {
    renderEditor();
    await userEvent.type(screen.getByLabelText("Nome do plano"), "ENEM");
    await userEvent.click(screen.getByRole("button", { name: "Trigonometria" }));
    await userEvent.click(screen.getByRole("button", { name: "Criar plano" }));
    expect(screen.getByText("Informe as horas.")).toBeInTheDocument();
    expect(screen.getByLabelText("Horas por semana de Trigonometria")).toHaveFocus();
    expect(mocks.savePlanAction).not.toHaveBeenCalled();
  });

  it("creates a subject without leaving the plan and adds it", async () => {
    mocks.saveSubjectAction.mockResolvedValue({ ok: true, subject: { id: "s9", name: "Inglês" } });
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Novo assunto" }));
    const dialog = screen.getByRole("dialog", { name: "Novo assunto" });
    await userEvent.type(within(dialog).getByLabelText("Nome"), "Inglês");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar assunto" }));

    expect(await screen.findByText(/Assunto “Inglês” criado e adicionado ao plano/)).toBeInTheDocument();
    expect(screen.getByLabelText("Horas por semana de Inglês")).toBeInTheDocument();
  });

  it("shows the exercises that join the plan through its subjects", async () => {
    renderEditor();
    expect(screen.getByText(/Escolha os assuntos para ver quais exercícios entram/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Trigonometria" }));
    expect(screen.getByText(/exercício disponível/)).toBeInTheDocument();
    expect(screen.getByText("Seno de 30°")).toBeInTheDocument();
    expect(screen.queryByText("Redação")).not.toBeInTheDocument();
  });

  it("creates an exercise inside the plan", async () => {
    mocks.saveExerciseAction.mockResolvedValue({
      ok: true,
      exercise: { id: "e9", title: "Cosseno de 60°", type: "open_answer", estimatedHours: 1, subjects: [] },
    });
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Criar exercício" }));
    const dialog = screen.getByRole("dialog", { name: "Novo exercício" });
    await userEvent.click(within(dialog).getByRole("radio", { name: /Resposta aberta/ }));
    await userEvent.type(within(dialog).getByLabelText("Título"), "Cosseno de 60°");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar exercício" }));

    await waitFor(() => expect(mocks.saveExerciseAction).toHaveBeenCalledWith(null, expect.anything(), { stay: true }));
    expect(await screen.findByText(/sem nenhum assunto do plano/)).toBeInTheDocument();
  });
});
