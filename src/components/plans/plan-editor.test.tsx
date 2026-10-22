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
  { id: "e1", title: "Seno de 30°", type: "multiple_choice", estimatedHours: 0.5, subjects: [subjects[0]] },
  { id: "e2", title: "Redação", type: "open_answer", estimatedHours: null, subjects: [subjects[1]] },
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

  it("picks existing exercises and suggests adding their subjects", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Escolher exercícios" }));
    const dialog = screen.getByRole("dialog", { name: "Escolher exercícios" });
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Seno de 30°/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Adicionar 1 ao plano" }));

    expect(screen.getByText("Seno de 30°")).toBeInTheDocument();
    expect(screen.getByText("Padrão do exercício: 30 min")).toBeInTheDocument();
    expect(screen.getByText(/usam um assunto que não está aqui/)).toHaveTextContent("Trigonometria");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar ao plano" }));
    expect(screen.getByLabelText("Horas por semana de Trigonometria")).toBeInTheDocument();
  });

  it("asks for hours on an exercise without an estimate", async () => {
    renderEditor();
    await userEvent.type(screen.getByLabelText("Nome do plano"), "ENEM");
    await userEvent.click(screen.getByRole("button", { name: "Escolher exercícios" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Redação/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Adicionar 1 ao plano" }));
    await userEvent.click(screen.getByRole("button", { name: "Criar plano" }));
    expect(screen.getByText(/não tem tempo estimado/)).toBeInTheDocument();
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
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar e adicionar ao plano" }));

    await waitFor(() => expect(mocks.saveExerciseAction).toHaveBeenCalledWith(null, expect.anything(), { stay: true }));
    expect(await screen.findByText(/Exercício “Cosseno de 60°” criado e adicionado/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tirar Cosseno de 60° do plano" })).toBeInTheDocument();
  });

  it("shows the estimated duration from the weekly goal", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Trigonometria" }));
    await userEvent.type(screen.getByLabelText("Horas por semana de Trigonometria"), "0,5");
    await userEvent.click(screen.getByRole("button", { name: "Escolher exercícios" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Seno/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Adicionar 1 ao plano" }));
    expect(screen.getByText(/os exercícios levam cerca de/)).toHaveTextContent("1 semana");
  });
});
