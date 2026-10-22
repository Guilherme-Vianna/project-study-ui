import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const removeStudentAction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/invites/actions", () => ({ removeStudentAction }));

const { StudentList } = await import("./student-list");

const students = [
  { id: "1", name: "Bruno Lima", phone: "(27) 99875-1326", phoneHref: "tel:+5527998751326", complete: true },
  { id: "2", name: "Ágata Souza", phone: null, phoneHref: null, complete: false },
];

describe("StudentList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an empty state that points to invites", () => {
    render(<StudentList students={[]} />);
    expect(screen.getByText("Nenhum aluno na turma ainda")).toBeInTheDocument();
  });

  it("filters by search and lets the user clear filters when nothing matches", async () => {
    render(<StudentList students={students} />);
    expect(screen.getByText("2 alunos na turma")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar aluno"), "agata");
    await waitFor(() => expect(screen.getByText("Mostrando 1 de 2 alunos")).toBeInTheDocument());
    expect(screen.queryByText("Bruno Lima")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar aluno"), "zzz");
    expect(await screen.findByText("Nenhum aluno encontrado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByLabelText("Buscar aluno")).toHaveValue("");
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
  });

  it("filters students with incomplete profiles", async () => {
    render(<StudentList students={students} />);
    await userEvent.click(screen.getByRole("button", { name: "Perfil incompleto" }));
    expect(screen.getByRole("button", { name: "Perfil incompleto" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Bruno Lima")).not.toBeInTheDocument();
    expect(screen.getByText("Ágata Souza")).toBeInTheDocument();
  });

  it("asks for confirmation before removing and shows API errors in the dialog", async () => {
    removeStudentAction.mockResolvedValueOnce({ ok: false, error: "Este aluno já não está na sua turma." });
    render(<StudentList students={students} />);

    await userEvent.click(screen.getByRole("button", { name: "Remover Bruno Lima da turma" }));
    const dialog = screen.getByRole("dialog", { name: "Remover Bruno Lima da turma?" });
    expect(dialog).toHaveTextContent("A conta não é apagada");
    expect(removeStudentAction).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Remover da turma" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("já não está na sua turma");
    expect(removeStudentAction).toHaveBeenCalledWith("1");

    removeStudentAction.mockResolvedValueOnce({ ok: true });
    await userEvent.click(within(dialog).getByRole("button", { name: "Remover da turma" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("cancels removal without calling the API", async () => {
    render(<StudentList students={students} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover Bruno Lima da turma" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(removeStudentAction).not.toHaveBeenCalled();
  });
});
