import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDraft } from "@/lib/exercises/model";

const mocks = vi.hoisted(() => ({
  saveExerciseAction: vi.fn(),
  uploadImage: vi.fn(),
  discardUploadedImage: vi.fn(),
  router: { push: vi.fn() },
}));

vi.mock("@/lib/exercises/actions", () => ({ saveExerciseAction: mocks.saveExerciseAction }));
vi.mock("@/lib/exercises/upload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/exercises/upload")>()),
  uploadImage: mocks.uploadImage,
  discardUploadedImage: mocks.discardUploadedImage,
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));

const { ExerciseEditor } = await import("./exercise-editor");

const subjects = [
  { id: "s1", name: "Trigonometria" },
  { id: "s2", name: "Geometria" },
];

function renderEditor() {
  render(<ExerciseEditor exerciseId={null} initialDraft={emptyDraft()} subjects={subjects} />);
}

describe("ExerciseEditor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("starts as multiple choice with four options", () => {
    renderEditor();
    expect(screen.getByRole("radio", { name: /Múltipla escolha/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("textbox", { name: /^Alternativa [A-D]$/ })).toHaveLength(4);
  });

  it("validates title, empty options and the correct answer before saving", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Criar exercício" }));

    expect(screen.getByText("Dê um título ao exercício.")).toBeInTheDocument();
    expect(screen.getAllByText(/Escreva a alternativa/)).toHaveLength(4);
    expect(screen.getByText("Marque qual alternativa está correta.")).toBeInTheDocument();
    expect(mocks.saveExerciseAction).not.toHaveBeenCalled();
  });

  it("builds a multiple choice exercise with subjects", async () => {
    mocks.saveExerciseAction.mockResolvedValue(undefined);
    renderEditor();

    await userEvent.type(screen.getByLabelText("Título"), "Seno de 30°");
    await userEvent.click(screen.getByRole("button", { name: "Remover alternativa D" }));
    await userEvent.click(screen.getByRole("button", { name: "Remover alternativa C" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Alternativa A" }), "1/2");
    await userEvent.type(screen.getByRole("textbox", { name: "Alternativa B" }), "1");
    await userEvent.click(screen.getAllByRole("button", { name: "Marcar como correta" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Trigonometria" }));
    await userEvent.type(screen.getByLabelText(/Tempo estimado/), "0,5");
    await userEvent.click(screen.getByRole("button", { name: "Criar exercício" }));

    await waitFor(() => expect(mocks.saveExerciseAction).toHaveBeenCalled());
    const [id, draft] = mocks.saveExerciseAction.mock.calls[0];
    expect(id).toBeNull();
    expect(draft).toMatchObject({ title: "Seno de 30°", subjectIds: ["s1"], estimatedHours: "0,5" });
    expect(draft.options.map((option: { text: string; isCorrect: boolean }) => [option.text, option.isCorrect])).toEqual([
      ["1/2", true],
      ["1", false],
    ]);
  });

  it("keeps a minimum of two options", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Remover alternativa D" }));
    await userEvent.click(screen.getByRole("button", { name: "Remover alternativa C" }));
    expect(screen.getByRole("button", { name: "Remover alternativa B" })).toBeDisabled();
  });

  it("reorders options", async () => {
    renderEditor();
    await userEvent.type(screen.getByRole("textbox", { name: "Alternativa A" }), "primeira");
    await userEvent.click(screen.getByRole("button", { name: "Mover A para baixo" }));
    expect(screen.getByRole("textbox", { name: "Alternativa B" })).toHaveValue("primeira");
  });

  it("switches to open answer and asks for the expected answer instead of options", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("radio", { name: /Resposta aberta/ }));
    expect(screen.queryByRole("textbox", { name: "Alternativa A" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Resposta esperada/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: /Múltipla escolha/ }));
    expect(screen.getAllByRole("textbox", { name: /^Alternativa/ })).toHaveLength(4);
  });

  it("uploads statement images and discards them when removed", async () => {
    mocks.uploadImage.mockResolvedValue({ ok: true, image: { imageId: "i1", url: null, name: "grafico.png" } });
    const { container } = render(<ExerciseEditor exerciseId={null} initialDraft={emptyDraft()} subjects={subjects} />);

    const input = container.querySelector<HTMLInputElement>('input[type="file"][multiple]');
    await userEvent.upload(input!, new File(["x"], "grafico.png", { type: "image/png" }));

    expect(await screen.findByText("grafico.png")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover grafico.png" }));
    expect(mocks.discardUploadedImage).toHaveBeenCalledWith("i1");
  });

  it("shows upload errors", async () => {
    mocks.uploadImage.mockResolvedValue({ ok: false, error: "A imagem passa de 5 MB." });
    const { container } = render(<ExerciseEditor exerciseId={null} initialDraft={emptyDraft()} subjects={subjects} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"][multiple]');
    await userEvent.upload(input!, new File(["x"], "big.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("passa de 5 MB");
  });

  it("asks before discarding unsaved changes", async () => {
    renderEditor();
    await userEvent.type(screen.getByLabelText("Título"), "Rascunho");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const dialog = screen.getByRole("dialog", { name: "Descartar alterações?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/exercicios"));
  });
});
