import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptySkillGroupDraft } from "@/lib/skills/model";

const mocks = vi.hoisted(() => ({ saveSkillGroupAction: vi.fn(), router: { push: vi.fn() } }));
vi.mock("@/lib/skills/actions", () => ({ saveSkillGroupAction: mocks.saveSkillGroupAction }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));

const { SkillGroupEditor } = await import("./skill-group-editor");

describe("SkillGroupEditor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("starts with suggested levels and saves reordered levels and skills", async () => {
    mocks.saveSkillGroupAction.mockResolvedValue(undefined);
    render(<SkillGroupEditor groupId={null} initialDraft={emptySkillGroupDraft()} existingNames={[]} />);
    expect(screen.getByLabelText("Nome do nível 1")).toHaveValue("Iniciante");

    await userEvent.type(screen.getByLabelText("Nome do grupo"), "Inglês");
    await userEvent.click(screen.getByRole("button", { name: "Mover Avançado para cima" }));
    await userEvent.type(screen.getByLabelText("Nome da habilidade 1"), "Listening");
    await userEvent.click(screen.getByRole("button", { name: "Criar grupo" }));

    await waitFor(() => expect(mocks.saveSkillGroupAction).toHaveBeenCalled());
    const [, draft] = mocks.saveSkillGroupAction.mock.calls[0];
    expect(draft.levels.map((level: { name: string }) => level.name)).toEqual(["Iniciante", "Avançado", "Intermediário"]);
    expect(draft.skills.map((skill: { name: string }) => skill.name)).toEqual(["Listening"]);
  });

  it("blocks a duplicated group name and keeps the last level", async () => {
    render(<SkillGroupEditor groupId={null} initialDraft={{ ...emptySkillGroupDraft(), levels: emptySkillGroupDraft().levels.slice(0, 1) }} existingNames={["Inglês"]} />);
    expect(screen.getByRole("button", { name: "Remover Iniciante" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Nome do grupo"), "inglês");
    await userEvent.click(screen.getByRole("button", { name: "Criar grupo" }));
    expect(screen.getByText("Você já tem um grupo com esse nome.")).toBeInTheDocument();
    expect(mocks.saveSkillGroupAction).not.toHaveBeenCalled();
  });
});
