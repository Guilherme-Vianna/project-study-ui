import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssignableStudent } from "./assign-student-button";

const assignPlanAction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/plans/actions", () => ({ assignPlanAction }));

const { AssignStudentButton } = await import("./assign-student-button");

const students: AssignableStudent[] = [
  { id: "1", name: "Bruno Lima", phone: "(27) 99875-1326", status: "free", otherPlanTitle: null },
  { id: "2", name: "Ágata Souza", phone: null, status: "free", otherPlanTitle: null },
  { id: "3", name: "Caio Prado", phone: null, status: "other-plan", otherPlanTitle: "Inglês básico" },
  { id: "4", name: "Dani Rocha", phone: null, status: "this-plan", otherPlanTitle: null },
];

function openPicker() {
  render(<AssignStudentButton planId="p1" planTitle="ENEM" students={students} />);
  return userEvent.click(screen.getByRole("button", { name: "Atribuir plano" }));
}

describe("AssignStudentButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("opens a modal listing students and explains who cannot be selected", async () => {
    await openPicker();
    const dialog = screen.getByRole("dialog", { name: "Atribuir plano" });
    expect(within(dialog).getByText(/Segue “Inglês básico”/)).toBeInTheDocument();
    expect(within(dialog).getByText("Já segue este plano")).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /Caio Prado/ })).toBeDisabled();
    expect(within(dialog).getByRole("checkbox", { name: /Dani Rocha/ })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Atribuir plano" })).toBeDisabled();
  });

  it("filters by name", async () => {
    await openPicker();
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Buscar aluno"), "agata");
    expect(within(dialog).queryByText("Bruno Lima")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Ágata Souza")).toBeInTheDocument();
  });

  it("assigns several students at once and confirms", async () => {
    assignPlanAction.mockResolvedValue({ ok: true });
    await openPicker();
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Selecionar todos" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Atribuir a 2 alunos" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(assignPlanAction.mock.calls.map((call) => call[1]).sort()).toEqual(["1", "2"]);
    expect(screen.getByRole("status")).toHaveTextContent("2 alunos agora seguem este plano.");
  });

  it("keeps the modal open and lists students that failed", async () => {
    assignPlanAction.mockImplementation(async (_plan: string, id: string) =>
      id === "1" ? { ok: true } : { ok: false, error: "Este aluno já tem um plano ativo." },
    );
    await openPicker();
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Bruno Lima/ }));
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Ágata Souza/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Atribuir a 2 alunos" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Ágata Souza: Este aluno já tem um plano ativo.");
    expect(within(dialog).getByRole("checkbox", { name: /Ágata Souza/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /Bruno Lima/ })).not.toBeChecked();
  });

  it("points to invites when there are no students", () => {
    render(<AssignStudentButton planId="p1" planTitle="ENEM" students={[]} />);
    expect(screen.getByRole("link", { name: "Convidar alunos" })).toHaveAttribute("href", "/alunos");
  });
});
