import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ saveSubjectAction: vi.fn(), deleteSubjectAction: vi.fn() }));
vi.mock("@/lib/subjects/actions", () => actions);

const { SubjectBoard } = await import("./subject-board");

const subjects = [
  { id: "1", name: "Trigonometria", description: "Seno e cosseno", createdAt: "2026-10-01", createdLabel: "01 de out." },
  { id: "2", name: "Inglês", description: null, createdAt: "2026-10-10", createdLabel: "10 de out." },
];

describe("SubjectBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers suggestions when there are no subjects and prefills the form", async () => {
    render(<SubjectBoard subjects={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Gramática" }));

    const dialog = screen.getByRole("dialog", { name: "Novo assunto" });
    expect(within(dialog).getByLabelText("Nome")).toHaveValue("Gramática");
  });

  it("creates a subject and confirms it", async () => {
    actions.saveSubjectAction.mockResolvedValue({ ok: true });
    render(<SubjectBoard subjects={subjects} />);

    await userEvent.click(screen.getByRole("button", { name: "Novo assunto" }));
    const dialog = screen.getByRole("dialog", { name: "Novo assunto" });
    await userEvent.type(within(dialog).getByLabelText("Nome"), "Redação");
    await userEvent.type(within(dialog).getByLabelText(/Descrição/), "Dissertação");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar assunto" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actions.saveSubjectAction).toHaveBeenCalledWith(null, { name: "Redação", description: "Dissertação" });
    expect(screen.getByRole("status")).toHaveTextContent("Assunto “Redação” criado.");
  });

  it("blocks a duplicate name before calling the server", async () => {
    render(<SubjectBoard subjects={subjects} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo assunto" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Nome"), "inglês");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar assunto" }));

    expect(within(dialog).getByText(/já tem um assunto chamado/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Nome")).toHaveFocus();
    expect(actions.saveSubjectAction).not.toHaveBeenCalled();
  });

  it("edits a subject keeping its own name valid", async () => {
    actions.saveSubjectAction.mockResolvedValue({ ok: true });
    render(<SubjectBoard subjects={subjects} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar Inglês" }));

    const dialog = screen.getByRole("dialog", { name: "Editar assunto" });
    await userEvent.type(within(dialog).getByLabelText(/Descrição/), "Verbos");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(actions.saveSubjectAction).toHaveBeenCalledWith("2", { name: "Inglês", description: "Verbos" }));
  });

  it("searches and offers to create what was not found", async () => {
    render(<SubjectBoard subjects={subjects} />);
    await userEvent.type(screen.getByLabelText("Buscar assunto"), "cosseno");
    await waitFor(() => expect(screen.queryByText("Inglês")).not.toBeInTheDocument());
    expect(screen.getByText("Trigonometria")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Buscar assunto"));
    await userEvent.type(screen.getByLabelText("Buscar assunto"), "Química");
    await userEvent.click(await screen.findByRole("button", { name: "Criar “Química”" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Nome")).toHaveValue("Química");
  });

  it("confirms deletion and shows why it failed", async () => {
    actions.deleteSubjectAction.mockResolvedValue({ ok: false, error: "Este assunto está em um plano de estudo." });
    render(<SubjectBoard subjects={subjects} />);
    await userEvent.click(screen.getByRole("button", { name: "Excluir Inglês" }));

    const dialog = screen.getByRole("dialog", { name: "Excluir “Inglês”?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Excluir assunto" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("plano de estudo");
    expect(actions.deleteSubjectAction).toHaveBeenCalledWith("2");
  });
});
